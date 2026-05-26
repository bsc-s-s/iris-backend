import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ImmutableAuditService {
  private readonly logger = new Logger(ImmutableAuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: {
    userId?: string;
    type: string;
    severity?: string;
    ipAddress?: string;
    deviceId?: string;
    userAgent?: string;
    country?: string;
    metadata?: any;
  }) {
    try {
      const previousHash = await this.getLastHash();
      const timestamp = new Date().toISOString();
      const hashInput = `${previousHash}|${timestamp}|${data.userId || ''}|${data.type}|${JSON.stringify(data.metadata || {})}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

      const organizationId = await this.getUserOrganization(data.userId);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SecurityEvent" (id, type, severity, "userId", "ipAddress", "deviceId", country, "userAgent", metadata, hash, "previousHash", "timestamp", "organizationId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::timestamp, $13)`,
        crypto.randomUUID(),
        data.type,
        data.severity || 'info',
        data.userId || null,
        data.ipAddress || '',
        data.deviceId || '',
        data.country || '',
        data.userAgent || '',
        JSON.stringify(data.metadata || {}),
        hash,
        previousHash || null,
        timestamp,
        organizationId,
      );

      return hash;
    } catch (e: any) {
      this.logger.warn(`Immutable audit error: ${e.message?.substring(0, 100)}`);
      return null;
    }
  }

  private async getLastHash(): Promise<string | null> {
    try {
      const result = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT hash FROM "SecurityEvent" ORDER BY "timestamp" DESC LIMIT 1`,
      );
      return result.length > 0 ? result[0].hash : null;
    } catch {
      return null;
    }
  }

  private async getUserOrganization(userId?: string): Promise<string> {
    if (!userId) return '';
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      return user?.organizationId || '';
    } catch {
      return '';
    }
  }

  async verifyChain(): Promise<{ valid: boolean; brokenAt?: string }> {
    try {
      const events = await this.prisma.$queryRawUnsafe< any[] >(
        `SELECT id, hash, "previousHash", "timestamp", type FROM "SecurityEvent" ORDER BY "timestamp" ASC`,
      );
      let previousHash: string | null = null;
      for (const event of events) {
        if (event.previousHash !== previousHash) {
          return { valid: false, brokenAt: event.id };
        }
        previousHash = event.hash;
      }
      return { valid: true };
    } catch {
      return { valid: false };
    }
  }

  async getTrail(options?: { userId?: string; type?: string; severity?: string; limit?: number; offset?: number }) {
    try {
      let query = `SELECT * FROM "SecurityEvent" WHERE 1=1`;
      const params: any[] = [];
      let paramIndex = 1;

      if (options?.userId) {
        query += ` AND "userId" = $${paramIndex++}`;
        params.push(options.userId);
      }
      if (options?.type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(options.type);
      }
      if (options?.severity) {
        query += ` AND severity = $${paramIndex++}`;
        params.push(options.severity);
      }

      query += ` ORDER BY "timestamp" DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(options?.limit || 50, options?.offset || 0);

      return await this.prisma.$queryRawUnsafe(query, ...params);
    } catch {
      return [];
    }
  }
}
