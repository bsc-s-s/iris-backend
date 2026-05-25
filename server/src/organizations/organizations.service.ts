import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, facilities: true, assessments: true } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(id: string, data: { name?: string; plan?: string; settings?: any; logoUrl?: string }) {
    if (data.name) {
      data['slug'] = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    return this.prisma.organization.update({ where: { id }, data });
  }

  async getStats(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, facilities: true, assessments: true, assets: true, protocols: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const recent = await this.prisma.assessment.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, scores: true, createdAt: true },
    });
    const byStatus = await this.prisma.assessment.groupBy({
      by: ['status'],
      where: { organizationId: id },
      _count: true,
    });
    return { stats: org._count, recentAssessments: recent, byStatus };
  }
}
