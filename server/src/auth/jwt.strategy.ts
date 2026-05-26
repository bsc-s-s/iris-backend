import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'iris-jwt-secret-change-in-production',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; organizationId: string; sessionId?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true, email: true, name: true, role: true,
        organizationId: true, isActive: true,
        mfaEnabled: true, securityLevel: true,
        lastDeviceId: true, lockedIp: true,
        allowedCountries: true, lockedUntil: true, failedLoginAttempts: true,
      },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('User not found or inactive');

    // Return full user context for Zero Trust guard
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      name: user.email,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      securityLevel: user.securityLevel,
      lastDeviceId: user.lastDeviceId,
      lockedIp: user.lockedIp,
      allowedCountries: user.allowedCountries,
      lockedUntil: user.lockedUntil,
      failedLoginAttempts: user.failedLoginAttempts,
      sessionId: payload.sessionId,
    };
  }
}
