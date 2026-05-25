import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'] as string;

    if (!apiKeyHeader) return true;

    const hashedKey = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const key = await this.prisma.apiKey.findUnique({ where: { key: hashedKey } });

    if (!key || !key.enabled) {
      throw new HttpException('Invalid or disabled API key', HttpStatus.UNAUTHORIZED);
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new HttpException('API key expired', HttpStatus.UNAUTHORIZED);
    }

    // In-memory rate limiting
    const now = Date.now();
    const windowMs = (key.rateLimitWindow || 60) * 1000;
    const storeKey = key.id;
    let entry = this.rateLimitStore.get(storeKey);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      this.rateLimitStore.set(storeKey, entry);
    }

    entry.count++;
    if (entry.count > key.rateLimit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    request.organizationId = key.organizationId;
    request.apiKeyScopes = key.scopes;

    // Track usage async
    this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date(), usageCount: { increment: 1 } },
    }).catch(() => {});

    return true;
  }
}
