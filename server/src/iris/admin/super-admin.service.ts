import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScanEngine } from '../scan/scan.service';
import * as crypto from 'crypto';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(private prisma: PrismaService, private scanEngine: ScanEngine) {}

  async createInvitation(email: string, role: string = 'member', organizationId?: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000);

    return this.prisma.invitation.create({
      data: { email, token, role, expiresAt, organizationId: organizationId || null },
    });
  }

  async listInvitations() {
    return this.prisma.invitation.findMany({ orderBy: { createdAt: 'desc' }, include: { organization: { select: { name: true } }, invitedBy: { select: { email: true } } } });
  }

  async revokeInvitation(id: string) {
    return this.prisma.invitation.update({ where: { id }, data: { status: 'revoked' } });
  }

  async assignLicense(organizationId: string, plan: string) {
    const plans: Record<string, { maxUsers: number; maxAssessments: number; maxScans: number; benchmarking: boolean; monitoring: boolean; aiEnabled: boolean; apiAccess: boolean; customBranding: boolean; supportLevel: string }> = {
      starter: { maxUsers: 10, maxAssessments: 50, maxScans: 10, benchmarking: false, monitoring: false, aiEnabled: true, apiAccess: false, customBranding: false, supportLevel: 'standard' },
      professional: { maxUsers: 25, maxAssessments: 200, maxScans: 50, benchmarking: true, monitoring: true, aiEnabled: true, apiAccess: true, customBranding: false, supportLevel: 'priority' },
      enterprise: { maxUsers: 100, maxAssessments: 1000, maxScans: 200, benchmarking: true, monitoring: true, aiEnabled: true, apiAccess: true, customBranding: true, supportLevel: 'dedicated' },
      enterprise_plus: { maxUsers: 9999, maxAssessments: 99999, maxScans: -1, benchmarking: true, monitoring: true, aiEnabled: true, apiAccess: true, customBranding: true, supportLevel: 'dedicated' },
    };

    const config = plans[plan];
    if (!config) throw new NotFoundException('Invalid plan');

    return this.prisma.license.upsert({
      where: { organizationId },
      update: { plan, status: 'active', ...config, expiresAt: plan === 'starter' ? new Date(Date.now() + 365 * 86400000) : null },
      create: { plan, status: 'active', ...config, organizationId },
    });
  }

  async listLicenses() {
    return this.prisma.license.findMany({ include: { organization: { select: { name: true } } } });
  }

  async listOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        _count: { select: { users: true, irisScans: true } },
        license: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganizationDetail(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } },
        license: true,
        _count: { select: { irisScans: true, riskSignals: true, alerts: true, benchmarkData: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, organizationId: true, organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async suspendUser(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }

  async getSystemHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', database: 'connected', version: process.env.npm_package_version || '1.0.0', uptime: process.uptime(), timestamp: new Date().toISOString() };
    } catch {
      return { status: 'degraded', database: 'disconnected', version: process.env.npm_package_version || '1.0.0', uptime: process.uptime(), timestamp: new Date().toISOString() };
    }
  }

  async getPlatformStats() {
    const [orgs, users, scans, scores, signals, alerts, predictions, reports] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.irisScan.count(),
      this.prisma.irisOrgScore.count(),
      this.prisma.riskSignal.count(),
      this.prisma.alert.count(),
      this.prisma.prediction.count(),
      this.prisma.report.count(),
    ]);

    const avgScore = await this.prisma.irisOrgScore.aggregate({ _avg: { overallScore: true } });

    return {
      organizations: orgs,
      users,
      scans,
      scores,
      signals,
      alerts,
      predictions,
      reports,
      averageScore: avgScore._avg.overallScore || 0,
    };
  }

  async seedIrisQuestions() {
    return this.scanEngine.seedQuestions();
  }
}
