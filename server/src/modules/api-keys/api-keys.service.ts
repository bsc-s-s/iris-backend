import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, data: { name: string; scopes?: string; rateLimit?: number }) {
    const prefix = 'iris_' + crypto.randomBytes(3).toString('hex');
    const secret = crypto.randomBytes(24).toString('hex');
    const key = `${prefix}_${secret}`;
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: data.name,
        key: hashedKey,
        prefix,
        scopes: data.scopes || 'read',
        rateLimit: data.rateLimit || 100,
        organizationId: orgId,
      },
    });

    return { id: apiKey.id, name: apiKey.name, prefix, key, scopes: apiKey.scopes, rateLimit: apiKey.rateLimit, createdAt: apiKey.createdAt };
  }

  async list(orgId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, prefix: true, scopes: true, rateLimit: true,
        enabled: true, usageCount: true, lastUsedAt: true, expiresAt: true, createdAt: true,
      },
    });
    return keys;
  }

  async revoke(orgId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, organizationId: orgId } });
    if (!key) throw new NotFoundException('API Key not found');
    return this.prisma.apiKey.update({ where: { id: keyId }, data: { enabled: false } });
  }

  async delete(orgId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id: keyId, organizationId: orgId } });
    if (!key) throw new NotFoundException('API Key not found');
    return this.prisma.apiKey.delete({ where: { id: keyId } });
  }

  async validate(key: string): Promise<{ valid: boolean; organizationId?: string; scopes?: string; rateLimit?: number }> {
    const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.prisma.apiKey.findUnique({ where: { key: hashedKey } });

    if (!apiKey || !apiKey.enabled) return { valid: false };
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return { valid: false };

    // Update usage tracking
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    });

    return { valid: true, organizationId: apiKey.organizationId, scopes: apiKey.scopes, rateLimit: apiKey.rateLimit };
  }
}
