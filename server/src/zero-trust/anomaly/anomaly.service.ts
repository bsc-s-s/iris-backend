import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface RequestContext {
  userId: string;
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  country: string;
  path: string;
  method: string;
}

@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);
  private readonly requestCache = new Map<string, { count: number; firstSeen: number }>();

  constructor(private prisma: PrismaService) {}

  async evaluateRequest(ctx: RequestContext): Promise<number> {
    let score = 0;

    // Factor 1: Rapid requests (potential brute force / scraping)
    const cacheKey = `${ctx.userId}:${ctx.ipAddress}`;
    const now = Date.now();
    const cached = this.requestCache.get(cacheKey);
    if (cached) {
      cached.count++;
      if (now - cached.firstSeen < 2000 && cached.count > 20) {
        score += 25;
      }
      if (now - cached.firstSeen < 10000 && cached.count > 100) {
        score += 25;
      }
    } else {
      this.requestCache.set(cacheKey, { count: 1, firstSeen: now });
    }

    // Clean cache periodically
    if (this.requestCache.size > 1000) {
      const cutoff = now - 30000;
      for (const [key, val] of this.requestCache) {
        if (val.firstSeen < cutoff) this.requestCache.delete(key);
      }
    }

    // Factor 2: New device
    if (ctx.deviceId) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { devices: true },
        });
        const devices: any[] = (user?.devices as any[]) || [];
        if (devices.length > 0 && !devices.some((d) => d.deviceId === ctx.deviceId)) {
          score += 20;
        }
      } catch {}
    }

    // Factor 3: VPN / datacenter IP detection via country change
    if (ctx.country) {
      try {
        const events = await this.prisma.$queryRawUnsafe< any[] >(
          `SELECT country FROM "SecurityEvent" WHERE "userId" = $1 AND country IS NOT NULL AND country != '' ORDER BY "timestamp" DESC LIMIT 1`,
          ctx.userId,
        );
        if (events.length > 0 && events[0].country !== ctx.country) {
          score += 15;
        }
      } catch {}
    }

    // Factor 4: Sensitive path access (data export, bulk operations)
    const sensitivePaths = ['/api/gdpr/export', '/api/users', '/api/audit', '/api/gdpr/dpia'];
    if (sensitivePaths.some((p) => ctx.path.startsWith(p)) && ctx.method !== 'GET') {
      score += 10;
    }

    // Factor 5: Missing or unusual headers
    if (!ctx.userAgent || ctx.userAgent.length < 10) {
      score += 10;
    }

    // Factor 6: Suspicious paths (admin panels, config access)
    const suspiciousPaths = ['/admin', '/config', '/.env', '/wp-admin', '/debug'];
    if (suspiciousPaths.some((p) => ctx.path.toLowerCase().includes(p))) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  async getUserRiskProfile(userId: string): Promise<{
    riskScore: number;
    flags: string[];
    recentEvents: number;
  }> {
    const flags: string[] = [];
    let riskScore = 0;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          failedLoginAttempts: true,
          devices: true,
          lockedUntil: true,
          mfaEnabled: true,
          role: true,
        },
      });

      if (!user) return { riskScore: 0, flags: [], recentEvents: 0 };

      if (user.failedLoginAttempts > 3) {
        flags.push(`Failed logins: ${user.failedLoginAttempts}`);
        riskScore += 20;
      }

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        flags.push('Account temporarily locked');
        riskScore += 40;
      }

      const devices: any[] = (user.devices as any[]) || [];
      if (devices.length > 3) {
        flags.push(`Multiple devices (${devices.length})`);
        riskScore += 10;
      }

      if (!user.mfaEnabled && user.role === 'admin') {
        flags.push('MFA not enabled (admin)');
        riskScore += 15;
      }

      const recentEvents = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT COUNT(*) as count FROM "SecurityEvent" WHERE "userId" = $1 AND "timestamp" > NOW() - INTERVAL '24 hours' AND severity IN ('warning', 'critical')`,
        userId,
      );
      const eventCount = Number(recentEvents?.[0]?.count || 0);
      if (eventCount > 10) {
        flags.push(`High event count (${eventCount}/24h)`);
        riskScore += 25;
      }

      return { riskScore: Math.min(riskScore, 100), flags, recentEvents: eventCount };
    } catch {
      return { riskScore: 0, flags: [], recentEvents: 0 };
    }
  }
}
