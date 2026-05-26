import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceEvaluator } from '../modules/compliance/compliance.service';

@Injectable()
export class EnterpriseComplianceService {
  private evaluator = new ComplianceEvaluator();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getUnifiedDashboard(orgId: string) {
    const [
      complianceHealth,
      gdprDashboard,
      isoDashboard,
      totalDpias,
      totalDsrs,
      totalExports,
      totalConsents,
      totalProviders,
      totalKeys,
      totalBackups,
      recentAuditLogs,
    ] = await Promise.all([
      this.evaluateOrgCompliance(orgId),
      this.getGdprMetrics(orgId),
      this.getIsoMetrics(orgId),
      this.prisma.dataProcessingRecord.count({ where: { organizationId: orgId } }),
      this.prisma.dataSubjectRequest.count({ where: { organizationId: orgId } }),
      this.prisma.dataExport.count({ where: { organizationId: orgId } }),
      this.prisma.consentRecord.count({ where: { organizationId: orgId } }),
      this.prisma.cloudProvider.count({ where: { organizationId: orgId } }),
      this.prisma.encryptionKey.count({ where: { organizationId: orgId } }),
      this.prisma.backupConfig.count({ where: { organizationId: orgId, enabled: true } }),
      this.prisma.auditLog.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { name: true, email: true } } } }),
    ]);

    return {
      overallScore: complianceHealth.overallScore,
      overallStatus: complianceHealth.overallStatus,
      auditReadiness: complianceHealth.auditReadiness,
      maturityLevel: complianceHealth.maturityLevel,
      frameworks: complianceHealth.frameworks,
      gapAnalysis: complianceHealth.gapAnalysis,
      gdpr: gdprDashboard,
      iso: isoDashboard,
      metrics: {
        dpias: totalDpias,
        dataSubjectRequests: totalDsrs,
        dataExports: totalExports,
        consents: totalConsents,
        cloudProviders: totalProviders,
        encryptionKeys: totalKeys,
        backupConfigured: totalBackups > 0,
      },
      criticalFindings: complianceHealth.criticalFindings,
      recommendations: complianceHealth.recommendations,
      recentAuditLogs,
      timestamp: new Date().toISOString(),
    };
  }

  async evaluateOrgCompliance(orgId: string) {
    const [assessments, protocols, incidents, users] = await Promise.all([
      this.prisma.assessment.findMany({ where: { organizationId: orgId } }),
      this.prisma.securityProtocol.findMany({ where: { organizationId: orgId } }),
      this.prisma.incident.findMany({ where: { assessment: { organizationId: orgId } } }),
      this.prisma.user.count({ where: { organizationId: orgId } }),
    ]);

    const completedAssessments = assessments.filter(a => a.status === 'completed').length;
    const avgScores = assessments
      .filter(a => a.scores && typeof a.scores === 'object')
      .map(a => {
        const s = a.scores as any;
        const vals = Object.values(s).filter(v => typeof v === 'number') as number[];
        return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
    const overallScore = avgScores.length > 0 ? Math.round(avgScores.reduce((a, b) => a + b, 0) / avgScores.length) : 35;

    const estimatedControls = this.evaluator.estimateControls({
      userCount: users,
      assessmentCount: assessments.length,
      protocolCount: protocols.length,
      incidentCount: incidents.length,
      completedAssessments,
      overallScore,
    });

    return this.evaluator.evaluateAll(estimatedControls);
  }

  async getGdprMetrics(orgId: string) {
    const [org, dpias, exports, consents, dsrs, policies] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { dpoName: true, dpoEmail: true, dataRetentionDays: true, encryptionEnabled: true } }),
      this.prisma.dataProcessingRecord.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.dataExport.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.consentRecord.count({ where: { organizationId: orgId } }),
      this.prisma.dataSubjectRequest.count({ where: { organizationId: orgId } }),
      this.prisma.privacyPolicy.count({ where: { organizationId: orgId } }),
    ]);

    const dpoAssigned = !!org?.dpoName;
    const allGdprCounts = [dpoAssigned, policies > 0, dpias.length > 0, exports.length > 0].filter(Boolean).length;
    const gdprScore = Math.round((allGdprCounts / 4) * 100);

    return { score: gdprScore, dpoAssigned, dpoEmail: org?.dpoEmail, dataRetentionDays: org?.dataRetentionDays, encryptionEnabled: org?.encryptionEnabled, recentDpias: dpias, recentExports: exports, consentCount: consents, dsrCount: dsrs, privacyPolicyCount: policies };
  }

  async getIsoMetrics(orgId: string) {
    const [backup, drp, providers, keys, fields] = await Promise.all([
      this.prisma.backupConfig.findUnique({ where: { organizationId: orgId } }),
      this.prisma.disasterRecoveryPlan.findUnique({ where: { organizationId: orgId } }),
      this.prisma.cloudProvider.count({ where: { organizationId: orgId } }),
      this.prisma.encryptionKey.count({ where: { organizationId: orgId, status: 'active' } }),
      this.prisma.sensitiveField.count({ where: { organizationId: orgId } }),
    ]);

    const indicators = [!!backup?.enabled, !!drp, providers > 0, keys > 0, fields > 0].filter(Boolean).length;
    const isoScore = Math.round((indicators / 5) * 100);

    return { score: isoScore, backupEnabled: backup?.enabled || false, backupFrequency: backup?.frequency, drpConfigured: !!drp, drpStatus: drp?.status, drpRto: drp?.rto, drpRpo: drp?.rpo, providersCount: providers, activeKeys: keys, sensitiveFields: fields };
  }

  async getAuditTrail(orgId: string, filters?: { userId?: string; entity?: string; action?: string; limit?: number; offset?: number }) {
    const where: any = { organizationId: orgId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.action) where.action = filters.action;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, take: filters?.limit || 50, skip: filters?.offset || 0,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, limit: filters?.limit || 50, offset: filters?.offset || 0 };
  }

  async getComplianceSummary(orgId: string) {
    const health = await this.evaluateOrgCompliance(orgId);
    return {
      overallScore: health.overallScore,
      overallStatus: health.overallStatus,
      frameworkCount: health.frameworks.length,
      frameworks: health.frameworks.map(f => ({ name: f.framework, score: f.score, status: f.status, maturity: f.maturity, auditReadiness: f.auditReadiness, criticalGaps: f.criticalGaps.length })),
      gapAnalysis: health.gapAnalysis,
      criticalFindings: health.criticalFindings,
      recommendations: health.recommendations.slice(0, 5),
    };
  }
}
