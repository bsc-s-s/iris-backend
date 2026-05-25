import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    action: string;
    entity: string;
    entityId?: string;
    description?: string;
    metadata?: any;
    ipAddress?: string;
    userId?: string;
    organizationId: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(organizationId: string, options?: { userId?: string; entity?: string; action?: string; limit?: number; offset?: number }) {
    const where: any = { organizationId };
    if (options?.userId) where.userId = options.userId;
    if (options?.entity) where.entity = options.entity;
    if (options?.action) where.action = options.action;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, limit: options?.limit || 50, offset: options?.offset || 0 };
  }

  async getStats(organizationId: string) {
    const [total, byAction, byEntity, recent] = await Promise.all([
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { organizationId },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where: { organizationId },
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
    ]);

    return { total, byAction, byEntity, recent };
  }
}
