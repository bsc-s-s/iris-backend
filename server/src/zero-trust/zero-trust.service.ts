import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ZeroTrustService {
  private readonly logger = new Logger(ZeroTrustService.name);

  constructor(private prisma: PrismaService) {}

  async validateDevice(userId: string, deviceId: string): Promise<boolean> {
    if (!deviceId) return false;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, devices: true },
      });
      if (!user) return false;
      const devices: any[] = (user.devices as any[]) || [];
      return devices.some((d) => d.deviceId === deviceId && d.trusted !== false);
    } catch {
      return false;
    }
  }

  async registerDevice(userId: string, deviceId: string, userAgent?: string, ipAddress?: string) {
    if (!deviceId) return;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, devices: true },
      });
      const devices: any[] = (user?.devices as any[]) || [];
      const existing = devices.findIndex((d) => d.deviceId === deviceId);
      if (existing >= 0) {
        devices[existing].lastSeen = new Date().toISOString();
        devices[existing].lastIp = ipAddress;
      } else {
        devices.push({
          deviceId,
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          lastIp: ipAddress,
          userAgent: userAgent || '',
          trusted: true,
        });
      }
      try {
        await this.prisma.user.update({
          where: { id: userId },
          data: { devices: JSON.parse(JSON.stringify(devices)) },
        });
      } catch {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "User" SET devices = $1::jsonb WHERE id = $2`,
          JSON.stringify(devices),
          userId,
        );
      }
    } catch (e: any) {
      this.logger.warn(`Device registration error: ${e.message?.substring(0, 100)}`);
    }
  }

  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    if (!sessionId) return false;
    try {
      const session = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT id, "isActive", "expiresAt", "revokedAt" FROM "UserSession" WHERE id = $1 AND "userId" = $2`,
        sessionId,
        userId,
      );
      if (!session || session.length === 0) return false;
      const s = session[0];
      if (!s.isActive || s.revokedAt) return false;
      if (new Date(s.expiresAt) < new Date()) return false;
      await this.prisma.$executeRawUnsafe(
        `UPDATE "UserSession" SET "lastActivityAt" = NOW() WHERE id = $1`,
        sessionId,
      );
      return true;
    } catch {
      return false;
    }
  }

  async createSession(userId: string, ipAddress?: string, userAgent?: string, deviceInfo?: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "UserSession" (id, token, "ipAddress", "userAgent", "deviceInfo", "isActive", "expiresAt", "createdAt", "lastActivityAt", "userId") VALUES ($1, $1, $2, $3, $4, true, $5, NOW(), NOW(), $6)`,
        sessionId,
        ipAddress || '',
        userAgent || '',
        deviceInfo || '',
        expiresAt,
        userId,
      );
    } catch (e: any) {
      this.logger.warn(`Session creation error: ${e.message?.substring(0, 100)}`);
    }
    return sessionId;
  }

  async revokeSession(sessionId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "UserSession" SET "isActive" = false, "revokedAt" = NOW(), "revokedReason" = 'logout' WHERE id = $1`,
        sessionId,
      );
    } catch {}
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string) {
    try {
      if (exceptSessionId) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "UserSession" SET "isActive" = false, "revokedAt" = NOW(), "revokedReason" = 'new_login' WHERE "userId" = $1 AND id != $2 AND "isActive" = true`,
          userId,
          exceptSessionId,
        );
      } else {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "UserSession" SET "isActive" = false, "revokedAt" = NOW(), "revokedReason" = 'logout' WHERE "userId" = $1 AND "isActive" = true`,
          userId,
        );
      }
    } catch {}
  }

  async recordLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress?: string,
    deviceId?: string,
    userAgent?: string,
    country?: string,
  ) {
    try {
      const hash = crypto.randomBytes(8).toString('hex');
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SecurityEvent" (id, type, severity, "userId", "ipAddress", "deviceId", country, "userAgent", metadata, hash, "timestamp", "organizationId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
        crypto.randomUUID(),
        success ? 'login' : 'failed_login',
        success ? 'info' : 'warning',
        userId,
        ipAddress || '',
        deviceId || '',
        country || '',
        userAgent || '',
        JSON.stringify({ success }),
        hash,
        '',
      );
    } catch (e: any) {
      this.logger.warn(`Login record error: ${e.message?.substring(0, 100)}`);
    }
  }

  async checkGeoRestriction(userId: string, country: string): Promise<boolean> {
    if (!country) return true;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { allowedCountries: true },
      });
      if (!user) return false;
      const allowed = (user.allowedCountries as string[]) || [];
      if (allowed.length === 0) return true;
      return allowed.includes(country);
    } catch {
      return true;
    }
  }

  async checkIpLock(userId: string, ipAddress: string): Promise<boolean> {
    if (!ipAddress) return true;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lockedIp: true },
      });
      if (!user || !user.lockedIp) return true;
      return user.lockedIp === ipAddress;
    } catch {
      return true;
    }
  }

  async incrementFailedLogins(email: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, failedLoginAttempts: true } });
      if (!user) return 0;
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockUntil,
        },
      });
      if (lockUntil) {
        this.logger.warn(`Account locked for ${email} due to ${attempts} failed attempts`);
      }
      return attempts;
    } catch {
      return 0;
    }
  }

  async resetFailedLogins(userId: string) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    } catch {}
  }

  async isAccountLocked(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email }, select: { lockedUntil: true } });
      if (!user || !user.lockedUntil) return false;
      return new Date(user.lockedUntil) > new Date();
    } catch {
      return false;
    }
  }

  async getActiveSessions(userId: string): Promise<number> {
    try {
      const sessions = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "UserSession" WHERE "userId" = $1 AND "isActive" = true AND "revokedAt" IS NULL AND "expiresAt" > NOW()`,
        userId,
      );
      return Number(sessions?.[0]?.count || 0);
    } catch {
      return 0;
    }
  }

  async getSecurityEvents(organizationId: string, limit = 50): Promise<any[]> {
    try {
      return await this.prisma.$queryRawUnsafe(
        `SELECT * FROM "SecurityEvent" WHERE "organizationId" = $1 ORDER BY "timestamp" DESC LIMIT $2`,
        organizationId,
        limit,
      );
    } catch {
      return [];
    }
  }

  async getSecurityStats(organizationId: string): Promise<any> {
    try {
      const events = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT type, severity, COUNT(*) as count FROM "SecurityEvent" WHERE "organizationId" = $1 AND "timestamp" > NOW() - INTERVAL '24 hours' GROUP BY type, severity ORDER BY count DESC`,
        organizationId,
      );
      const activeSessions = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "UserSession" s JOIN "User" u ON s."userId" = u.id WHERE u."organizationId" = $1 AND s."isActive" = true AND s."revokedAt" IS NULL AND s."expiresAt" > NOW()`,
        organizationId,
      );
      const blocked = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "User" WHERE "organizationId" = $1 AND "lockedUntil" > NOW()`,
        organizationId,
      );
      return {
        events24h: events,
        activeSessions: Number(activeSessions?.[0]?.count || 0),
        blockedAccounts: Number(blocked?.[0]?.count || 0),
      };
    } catch {
      return { events24h: [], activeSessions: 0, blockedAccounts: 0 };
    }
  }
}
