import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaService } from '../modules/mfa/mfa.service';
import { ZeroTrustService } from '../zero-trust/zero-trust.service';
import { AnomalyService } from '../zero-trust/anomaly/anomaly.service';
import { ImmutableAuditService } from '../zero-trust/audit/immutable-audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mfa: MfaService,
    private zt: ZeroTrustService,
    private anomaly: AnomalyService,
    private audit: ImmutableAuditService,
  ) {}

  private readonly userSelect = {
    id: true, email: true, name: true, role: true, title: true,
    passwordHash: true, isActive: true, lastLoginAt: true,
    organizationId: true, createdAt: true, mfaEnabled: true,
    securityLevel: true, failedLoginAttempts: true, lockedUntil: true,
  } as const;

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw new ConflictException('Email already registered');

    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        slug: dto.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuid().slice(0, 8),
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: 'admin',
        organizationId: org.id,
        securityLevel: 'standard',
      },
      select: { id: true, email: true, name: true, role: true, title: true, organizationId: true, mfaEnabled: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, org.id);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: { id: org.id, name: org.name, slug: org.slug },
      ...tokens,
    };
  }

  async login(dto: LoginDto, extras?: {
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
    country?: string;
    mfaToken?: string;
  }) {
    const ipAddress = extras?.ipAddress || '';
    const deviceId = extras?.deviceId || '';
    const userAgent = extras?.userAgent || '';
    const country = extras?.country || '';
    const mfaToken = extras?.mfaToken;

    // Check account lockout
    const locked = await this.zt.isAccountLocked(dto.email);
    if (locked) {
      this.logger.warn(`Login attempt on locked account: ${dto.email}`);
      throw new UnauthorizedException('Account temporarily locked due to multiple failed attempts. Try again in 15 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true, email: true, name: true, role: true, title: true,
        passwordHash: true, isActive: true, organizationId: true, mfaEnabled: true,
        mfaSecret: true, securityLevel: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });

    if (!user || !user.isActive) {
      const userLookup = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
      if (userLookup) {
        await this.zt.incrementFailedLogins(dto.email);
        await this.audit.log({ userId: userLookup.id, type: 'failed_login', severity: 'warning', ipAddress, deviceId, userAgent, country, metadata: { reason: 'Account inactive' } });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      const attempts = await this.zt.incrementFailedLogins(dto.email);
      await this.audit.log({ userId: user.id, type: 'failed_login', severity: 'warning', ipAddress, deviceId, userAgent, country, metadata: { attempts } });
      throw new UnauthorizedException('Invalid credentials');
    }

    // MFA check — required for super_admin and admin
    if (user.mfaEnabled) {
      if (!mfaToken) {
        await this.audit.log({ userId: user.id, type: 'mfa_attempt', severity: 'warning', ipAddress, deviceId, userAgent, country, metadata: { reason: 'MFA token missing' } });
        throw new UnauthorizedException('MFA code required');
      }
      const mfaValid = await this.mfa.verify(user.id, mfaToken);
      if (!mfaValid) {
        await this.audit.log({ userId: user.id, type: 'mfa_attempt', severity: 'warning', ipAddress, deviceId, userAgent, country, metadata: { reason: 'Invalid MFA token' } });
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Reset failed login counter on success
    await this.zt.resetFailedLogins(user.id);

    // Revoke previous sessions (single active session policy)
    const existingSessionCount = await this.zt.getActiveSessions(user.id);
    if (existingSessionCount > 0) {
      await this.zt.revokeAllSessions(user.id);
    }

    // Create new session
    const sessionId = await this.zt.createSession(user.id, ipAddress, userAgent, deviceId);

    // Register device
    if (deviceId) {
      await this.zt.registerDevice(user.id, deviceId, userAgent, ipAddress);
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastDeviceId: deviceId || undefined },
    });

    // Log successful login to immutable audit
    await this.audit.log({ userId: user.id, type: 'login', severity: 'info', ipAddress, deviceId, userAgent, country, metadata: { sessionId } });

    // Generate tokens with session ID in payload
    const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId, sessionId);

    this.logger.log(`Login successful: ${user.email} from ${ipAddress} [${country}]`);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, title: user.title, mfaEnabled: user.mfaEnabled, securityLevel: user.securityLevel },
      organization: { id: user.organization.id, name: user.organization.name, slug: user.organization.slug, plan: user.organization.plan },
      sessionId,
      ...tokens,
    };
  }

  async loginStep1(dto: LoginDto, extras?: {
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
    country?: string;
  }): Promise<{ mfaRequired: boolean; userId: string; email: string }> {
    const ipAddress = extras?.ipAddress || '';

    const locked = await this.zt.isAccountLocked(dto.email);
    if (locked) throw new UnauthorizedException('Account temporarily locked');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, passwordHash: true, isActive: true, mfaEnabled: true, role: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.zt.incrementFailedLogins(dto.email);
      await this.audit.log({ userId: user.id, type: 'failed_login', severity: 'warning', ipAddress, metadata: { reason: 'Invalid password' } });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.zt.resetFailedLogins(user.id);

    const mfaRequired = user.mfaEnabled || (['super_admin', 'admin'].includes(user.role) && process.env.MFA_REQUIRED !== 'false');

    return { mfaRequired, userId: user.id, email: user.email };
  }

  async loginStep2(data: {
    userId: string;
    mfaToken: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
    country?: string;
  }) {
    const { userId, mfaToken, ipAddress, deviceId, userAgent, country } = data;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, title: true, isActive: true, organizationId: true, mfaEnabled: true, mfaSecret: true, securityLevel: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    const mfaValid = await this.mfa.verify(user.id, mfaToken);
    if (!mfaValid) {
      await this.audit.log({ userId: user.id, type: 'mfa_attempt', severity: 'warning', ipAddress, deviceId, userAgent, country, metadata: { reason: 'Invalid MFA token' } });
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Revoke old sessions
    await this.zt.revokeAllSessions(user.id);

    // Create session
    const sessionId = await this.zt.createSession(user.id, ipAddress, userAgent, deviceId);

    // Register device
    if (deviceId) {
      await this.zt.registerDevice(user.id, deviceId, userAgent, ipAddress);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastDeviceId: deviceId || undefined },
    });

    await this.audit.log({ userId: user.id, type: 'login', severity: 'info', ipAddress, deviceId, userAgent, country, metadata: { sessionId } });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.organizationId, sessionId);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, title: user.title, mfaEnabled: user.mfaEnabled, securityLevel: user.securityLevel },
      organization: { id: user.organization.id, name: user.organization.name, slug: user.organization.slug, plan: user.organization.plan },
      sessionId,
      ...tokens,
    };
  }

  async refresh(refreshToken: string, extras?: { ipAddress?: string; deviceId?: string }) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User not found');

    // Device consistency check
    if (extras?.deviceId && user.lastDeviceId && user.lastDeviceId !== extras.deviceId) {
      this.logger.warn(`Device mismatch during token refresh for user ${user.id}`);
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    return this.generateTokens(user.id, user.email, user.role, user.organizationId);
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.zt.revokeSession(sessionId);
    } else {
      await this.zt.revokeAllSessions(userId);
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.audit.log({ userId, type: 'logout', severity: 'info', metadata: { sessionId } });
  }

  async validateUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true, title: true,
        passwordHash: true, isActive: true, mfaEnabled: true,
        securityLevel: true, lastDeviceId: true, lockedIp: true,
        allowedCountries: true, lockedUntil: true, failedLoginAttempts: true,
        organizationId: true, createdAt: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
  }

  async getMfaStatus(userId: string) {
    return this.mfa.status(userId);
  }

  async setupMfa(userId: string) {
    return this.mfa.generateSecret(userId);
  }

  async verifyMfa(userId: string, token: string) {
    return this.mfa.verifyAndEnable(userId, token);
  }

  async disableMfa(userId: string) {
    return this.mfa.disable(userId);
  }

  private async generateTokens(userId: string, email: string, role: string, organizationId: string, sessionId?: string) {
    const payload: any = { sub: userId, email, role, organizationId };
    if (sessionId) payload.sessionId = sessionId;

    const accessToken = this.jwt.sign(payload, { expiresIn: (process.env.JWT_EXPIRATION || '15m') as any });
    const refreshToken = uuid();

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }
}
