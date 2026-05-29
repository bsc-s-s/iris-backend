import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_ZERO_TRUST_KEY } from '../decorators/skip-zero-trust.decorator';
import { ZeroTrustService } from '../zero-trust.service';
import { AnomalyService } from '../anomaly/anomaly.service';
import { ImmutableAuditService } from '../audit/immutable-audit.service';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  private readonly logger = new Logger(ZeroTrustGuard.name);

  constructor(
    private reflector: Reflector,
    private zt: ZeroTrustService,
    private anomaly: AnomalyService,
    private audit: ImmutableAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ZERO_TRUST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || skip) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true; // JWT AuthGuard hasn't run yet — skip Zero Trust, it will auth later

    const ipAddress = request.ip || request.connection?.remoteAddress || '';
    const deviceId = request.headers['x-device-id'] as string || '';
    const userAgent = request.headers['user-agent'] as string || '';
    const country = request.headers['cf-ipcountry'] as string || request.headers['x-country'] as string || '';

    // Layer 1: Account active check
    if (!user.isActive) {
      await this.audit.log({
        userId: user.id,
        type: 'access_denied',
        severity: 'critical',
        ipAddress,
        deviceId,
        userAgent,
        country,
        metadata: { reason: 'Account disabled' },
      });
      throw new ForbiddenException('Account is disabled');
    }

    // Layer 2: IP lock check
    if (user.lockedIp && user.lockedIp !== ipAddress) {
      await this.audit.log({
        userId: user.id,
        type: 'ip_mismatch',
        severity: 'critical',
        ipAddress,
        deviceId,
        userAgent,
        country,
        metadata: { expectedIp: user.lockedIp, actualIp: ipAddress },
      });
      throw new ForbiddenException('Access from this IP is not allowed');
    }

    // Layer 3: Device validation (skip for OPTIONS)
    if (request.method !== 'OPTIONS' && deviceId) {
      const deviceValid = await this.zt.validateDevice(user.id, deviceId);
      if (!deviceValid) {
        this.logger.warn(`Device mismatch for user ${user.id}: ${deviceId}`);
      }
    }

    // Layer 4: Geo validation
    if (country) {
      const geoOk = await this.zt.checkGeoRestriction(user.id, country);
      if (!geoOk) {
        await this.audit.log({
          userId: user.id,
          type: 'geo_blocked',
          severity: 'warning',
          ipAddress,
          deviceId,
          userAgent,
          country,
          metadata: { country },
        });
        throw new ForbiddenException(`Access from ${country} is not allowed`);
      }
    }

    // Layer 5: Anomaly detection
    const anomalyScore = await this.anomaly.evaluateRequest({
      userId: user.id,
      ipAddress,
      deviceId,
      userAgent,
      country,
      path: request.path,
      method: request.method,
    });

    if (anomalyScore >= 70) {
      await this.audit.log({
        userId: user.id,
        type: 'anomaly_blocked',
        severity: 'critical',
        ipAddress,
        deviceId,
        userAgent,
        country,
        metadata: { anomalyScore, path: request.path },
      });
      throw new ForbiddenException('Suspicious activity detected. Access blocked.');
    }

    if (anomalyScore >= 40) {
      await this.audit.log({
        userId: user.id,
        type: 'anomaly_warning',
        severity: 'warning',
        ipAddress,
        deviceId,
        userAgent,
        country,
        metadata: { anomalyScore, path: request.path },
      });
    }

    // Log access to immutable audit
    await this.audit.log({
      userId: user.id,
      type: 'access',
      severity: 'info',
      ipAddress,
      deviceId,
      userAgent,
      country,
      metadata: { path: request.path, method: request.method },
    });

    return true;
  }
}
