import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZeroTrustService } from '../zero-trust.service';
import { AnomalyService } from '../anomaly/anomaly.service';
import { ImmutableAuditService } from '../audit/immutable-audit.service';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private prisma: PrismaService,
    private zt: ZeroTrustService,
    private anomaly: AnomalyService,
    private audit: ImmutableAuditService,
  ) {}

  private requireSuperAdmin(user: any) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admin can access security dashboard');
    }
  }

  async getDashboard(user: any) {
    this.requireSuperAdmin(user);

    const [eventStats, activeSessions, blockedUsers, totalUsers, recentEvents] = await Promise.all([
      this.prisma.$queryRawUnsafe< any[] >(
        `SELECT type, severity, COUNT(*) as count FROM "SecurityEvent" WHERE "timestamp" > NOW() - INTERVAL '24 hours' GROUP BY type, severity ORDER BY count DESC`
      ),
      this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "UserSession" WHERE "isActive" = true AND "revokedAt" IS NULL AND "expiresAt" > NOW()`
      ),
      this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "User" WHERE "lockedUntil" > NOW()`
      ),
      this.prisma.user.count(),
      this.prisma.$queryRawUnsafe< any[] >(
        `SELECT se.*, u.email, u.name FROM "SecurityEvent" se LEFT JOIN "User" u ON se."userId" = u.id ORDER BY se."timestamp" DESC LIMIT 20`
      ),
    ]);

    const eventCounts = (eventStats || []).reduce((acc: any, e: any) => {
      acc[e.type] = (acc[e.type] || 0) + Number(e.count);
      return acc;
    }, {});

    return {
      stats: {
        totalUsers,
        activeSessions: Number(activeSessions?.[0]?.count || 0),
        blockedAccounts: Number(blockedUsers?.[0]?.count || 0),
        events24h: (eventStats || []).reduce((sum: number, e: any) => sum + Number(e.count), 0),
        failedLogins: eventCounts['failed_login'] || 0,
        anomalyBlocks: eventCounts['anomaly_blocked'] || 0,
        geoBlocks: eventCounts['geo_blocked'] || 0,
      },
      eventsByType: eventStats || [],
      recentEvents: recentEvents || [],
    };
  }

  async getEvents(user: any, options: { type?: string; severity?: string; limit?: number; offset?: number }) {
    this.requireSuperAdmin(user);
    return this.audit.getTrail(options);
  }

  async getUserRiskProfiles(user: any, specificUserId?: string) {
    this.requireSuperAdmin(user);

    const users = specificUserId
      ? await this.prisma.user.findMany({ where: { id: specificUserId }, take: 1 })
      : await this.prisma.user.findMany({ take: 100, orderBy: { createdAt: 'desc' } });

    const profiles = await Promise.all(
      users.map(async (u) => {
        const risk = await this.anomaly.getUserRiskProfile(u.id);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          mfaEnabled: u.mfaEnabled,
          lastLoginAt: u.lastLoginAt,
          ...risk,
        };
      }),
    );

    return { users: profiles, total: profiles.length };
  }

  async verifyAuditChain(user: any) {
    this.requireSuperAdmin(user);
    return this.audit.verifyChain();
  }

  async getActiveSessions(user: any) {
    this.requireSuperAdmin(user);

    const sessions = await this.prisma.$queryRawUnsafe< any[] >(
      `SELECT s.id, s."ipAddress", s."userAgent", s."deviceInfo", s."lastActivityAt", s."createdAt", s."expiresAt", u.email, u.name, u.role
       FROM "UserSession" s JOIN "User" u ON s."userId" = u.id
       WHERE s."isActive" = true AND s."revokedAt" IS NULL AND s."expiresAt" > NOW()
       ORDER BY s."lastActivityAt" DESC
       LIMIT 100`
    );

    return { sessions: sessions || [], total: sessions?.length || 0 };
  }

  async revokeSession(user: any, sessionId: string) {
    this.requireSuperAdmin(user);
    await this.zt.revokeSession(sessionId);
    await this.audit.log({
      userId: user.id,
      type: 'session_revoked',
      severity: 'warning',
      metadata: { targetSessionId: sessionId },
    });
    return { ok: true };
  }

  async lockUser(user: any, targetUserId: string, reason?: string) {
    this.requireSuperAdmin(user);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
    });
    await this.zt.revokeAllSessions(targetUserId);
    await this.audit.log({
      userId: user.id,
      type: 'user_locked',
      severity: 'critical',
      metadata: { targetUserId, reason: reason || 'No reason provided' },
    });
    return { ok: true };
  }

  async unlockUser(user: any, targetUserId: string) {
    this.requireSuperAdmin(user);
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.audit.log({
      userId: user.id,
      type: 'user_unlocked',
      severity: 'warning',
      metadata: { targetUserId },
    });
    return { ok: true };
  }
}
