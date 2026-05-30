import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ==================== DPO (Data Protection Officer) ====================

  async getDpo(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { dpoName: true, dpoEmail: true, dpoPhone: true, dpoTitle: true, dpoAppointedAt: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org.dpoName ? org : null;
  }

  async setDpo(orgId: string, data: { dpoName: string; dpoEmail: string; dpoPhone?: string; dpoTitle?: string }, userId: string) {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { dpoName: data.dpoName, dpoEmail: data.dpoEmail, dpoPhone: data.dpoPhone, dpoTitle: data.dpoTitle, dpoAppointedAt: new Date() },
    });
    await this.audit.log({ action: 'dpo.update', entity: 'organization', entityId: orgId, description: `DPO actualizado: ${data.dpoName}`, userId, organizationId: orgId, metadata: { dpoEmail: data.dpoEmail }, result: 'success' });
    return org;
  }

  async removeDpo(orgId: string, userId: string) {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { dpoName: null, dpoEmail: null, dpoPhone: null, dpoTitle: null, dpoAppointedAt: null },
    });
    await this.audit.log({ action: 'dpo.remove', entity: 'organization', entityId: orgId, description: 'DPO removido', userId, organizationId: orgId, result: 'success' });
    return org;
  }

  // ==================== DPIA (Data Processing Impact Assessment) ====================

  async createDpia(orgId: string, data: {
    title: string; description: string; dataCategories: string[]; dataSubjects: string[];
    processingPurpose: string; legalBasis: string; riskLevel?: string;
    risks?: any[]; mitigations?: any[]; aiImpact?: boolean; aiDescription?: string;
    processors?: any[]; internationalTransfers?: boolean; transferSafeguards?: string;
    createdById: string;
  }) {
    const dpia = await this.prisma.dataProcessingRecord.create({
      data: { ...data, organizationId: orgId, dataCategories: data.dataCategories, dataSubjects: data.dataSubjects, risks: data.risks || [], mitigations: data.mitigations || [], processors: data.processors || [], aiImpact: data.aiImpact || false, internationalTransfers: data.internationalTransfers || false, createdById: data.createdById },
    });
    await this.audit.log({ action: 'dpia.create', entity: 'dataProcessingRecord', entityId: dpia.id, description: `DPIA creada: ${data.title}`, userId: data.createdById, organizationId: orgId, result: 'success' });
    return dpia;
  }

  async listDpias(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return this.prisma.dataProcessingRecord.findMany({ where, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } } });
  }

  async getDpia(id: string, orgId: string) {
    const dpia = await this.prisma.dataProcessingRecord.findFirst({ where: { id, organizationId: orgId }, include: { createdBy: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } } });
    if (!dpia) throw new NotFoundException('DPIA not found');
    return dpia;
  }

  async updateDpia(id: string, orgId: string, data: any, userId: string) {
    const existing = await this.getDpia(id, orgId);
    const dpia = await this.prisma.dataProcessingRecord.update({ where: { id }, data });
    await this.audit.log({ action: 'dpia.update', entity: 'dataProcessingRecord', entityId: id, description: `DPIA actualizada: ${dpia.title}`, userId, organizationId: orgId, result: 'success' });
    return dpia;
  }

  async reviewDpia(id: string, orgId: string, data: { status: string; reviewNotes?: string; reviewedById: string }) {
    const existing = await this.getDpia(id, orgId);
    const dpia = await this.prisma.dataProcessingRecord.update({
      where: { id },
      data: { status: data.status, reviewNotes: data.reviewNotes, reviewedById: data.reviewedById, reviewedAt: new Date() },
    });
    await this.audit.log({ action: 'dpia.review', entity: 'dataProcessingRecord', entityId: id, description: `DPIA revisada: ${dpia.title} -> ${data.status}`, userId: data.reviewedById, organizationId: orgId, metadata: { status: data.status }, result: 'success' });
    return dpia;
  }

  async deleteDpia(id: string, orgId: string, userId: string) {
    const existing = await this.getDpia(id, orgId);
    await this.prisma.dataProcessingRecord.delete({ where: { id } });
    await this.audit.log({ action: 'dpia.delete', entity: 'dataProcessingRecord', entityId: id, description: `DPIA eliminada: ${existing.title}`, userId, organizationId: orgId, result: 'success' });
  }

  // ==================== Data Portability (GDPR Art 20) ====================

  async exportUserData(userId: string, orgId: string, format: string, scope: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId: orgId } });
    if (!user) throw new NotFoundException('User not found');

    const exportData: any = { user: { id: user.id, email: user.email, name: user.name, role: user.role, title: user.title, createdAt: user.createdAt } };

    if (scope === 'all' || scope === 'assessments') {
      exportData.assessments = await this.prisma.assessment.findMany({ where: { organizationId: orgId, createdById: userId }, include: { responses: true, vulnerabilities: true } });
    }
    if (scope === 'all' || scope === 'audit') {
      exportData.auditLogs = await this.prisma.auditLog.findMany({ where: { organizationId: orgId, userId }, orderBy: { createdAt: 'desc' } });
    }
    if (scope === 'all' || scope === 'consent') {
      exportData.consentRecords = await this.prisma.consentRecord.findMany({ where: { organizationId: orgId, userId } });
      exportData.userConsents = await this.prisma.userConsent.findMany({ where: { organizationId: orgId, userId } });
    }
    if (scope === 'all') {
      exportData.dataSubjectRequests = await this.prisma.dataSubjectRequest.findMany({ where: { userId, organizationId: orgId } });
    }
    if (scope === 'all' || scope === 'profile') {
      exportData.organization = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, plan: true, createdAt: true } });
    }

    const record = await this.prisma.dataExport.create({
      data: { format, scope, status: 'completed', completedAt: new Date(), organizationId: orgId, requestedById: userId },
    });

    await this.audit.log({ action: 'data.export', entity: 'dataExport', entityId: record.id, description: `Exportación de datos: ${scope} (${format})`, userId, organizationId: orgId, metadata: { format, scope }, result: 'success' });

    return { exportId: record.id, format, scope, data: exportData };
  }

  async listExports(orgId: string) {
    return this.prisma.dataExport.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, include: { requestedBy: { select: { id: true, name: true } } } });
  }

  // ==================== Consent Management (GDPR Art 7) ====================

  async recordConsent(data: { userId: string; organizationId: string; type: string; status: string; ipAddress?: string; userAgent?: string }) {
    const consent = await this.prisma.consentRecord.create({ data });
    if (data.status === 'granted') {
      await this.prisma.user.update({ where: { id: data.userId }, data: { consentGiven: true, consentGivenAt: new Date() } });
    }
    return consent;
  }

  async withdrawConsent(id: string, orgId: string) {
    const consent = await this.prisma.consentRecord.findFirst({ where: { id, organizationId: orgId } });
    if (!consent) throw new NotFoundException('Consent record not found');
    return this.prisma.consentRecord.update({ where: { id }, data: { status: 'withdrawn', withdrawnAt: new Date() } });
  }

  async listConsents(orgId: string, userId?: string) {
    const where: any = { organizationId: orgId };
    if (userId) where.userId = userId;
    return this.prisma.consentRecord.findMany({ where, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } });
  }

  async getUserConsents(userId: string, orgId: string) {
    return this.prisma.userConsent.findMany({ where: { userId, organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async acceptUserConsent(data: { userId: string; organizationId: string; type: string; version: string; ipAddress?: string; userAgent?: string }) {
    const existing = await this.prisma.userConsent.findUnique({ where: { userId_type_version: { userId: data.userId, type: data.type, version: data.version } } });
    if (existing) throw new BadRequestException('Consent already recorded for this version');
    const consent = await this.prisma.userConsent.create({ data: { ...data, accepted: true, acceptedAt: new Date() } });

    if (data.type === 'privacy_policy') {
      await this.prisma.user.update({ where: { id: data.userId }, data: { privacyAccepted: true, privacyAcceptedAt: new Date() } });
    } else if (data.type === 'data_processing') {
      await this.prisma.user.update({ where: { id: data.userId }, data: { dataProcessingConsent: true, dataProcessingConsentAt: new Date() } });
    } else if (data.type === 'marketing') {
      await this.prisma.user.update({ where: { id: data.userId }, data: { marketingConsent: true, marketingConsentAt: new Date() } });
    }

    return consent;
  }

  // ==================== International Transfers (GDPR Art 44-49) ====================

  async createTransfer(orgId: string, data: { thirdParty: string; country: string; purpose: string; dataCategories: string[]; legalMechanism: string; safeguards?: any[]; riskLevel?: string }) {
    const transfer = await this.prisma.internationalTransfer.create({ data: { ...data, organizationId: orgId, dataCategories: data.dataCategories, safeguards: data.safeguards || [] } });
    await this.audit.log({ action: 'transfer.create', entity: 'internationalTransfer', entityId: transfer.id, description: `Transferencia internacional: ${data.thirdParty} (${data.country})`, organizationId: orgId, result: 'success' });
    return transfer;
  }

  async listTransfers(orgId: string) {
    return this.prisma.internationalTransfer.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async updateTransfer(id: string, orgId: string, data: any) {
    const existing = await this.prisma.internationalTransfer.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Transfer not found');
    return this.prisma.internationalTransfer.update({ where: { id }, data });
  }

  async deleteTransfer(id: string, orgId: string, userId: string) {
    const existing = await this.prisma.internationalTransfer.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Transfer not found');
    await this.prisma.internationalTransfer.delete({ where: { id } });
    await this.audit.log({ action: 'transfer.delete', entity: 'internationalTransfer', entityId: id, description: `Transferencia eliminada: ${existing.thirdParty}`, userId, organizationId: orgId, result: 'success' });
  }

  // ==================== Data Subject Requests (GDPR Rights) ====================

  async createDataSubjectRequest(data: { userId: string; organizationId: string; type: string; description?: string }) {
    const request = await this.prisma.dataSubjectRequest.create({ data });
    await this.audit.log({ action: 'dsr.create', entity: 'dataSubjectRequest', entityId: request.id, description: `Solicitud de derechos: ${data.type}`, userId: data.userId, organizationId: data.organizationId, result: 'success' });
    return request;
  }

  async listDataSubjectRequests(orgId: string, status?: string) {
    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    return this.prisma.dataSubjectRequest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } }, reviewedBy: { select: { id: true, name: true } } } });
  }

  async processDataSubjectRequest(id: string, orgId: string, data: { status: string; rejectionReason?: string; reviewedById: string }) {
    const request = await this.prisma.dataSubjectRequest.findFirst({ where: { id, organizationId: orgId } });
    if (!request) throw new NotFoundException('Request not found');

    const updateData: any = { status: data.status, reviewedById: data.reviewedById };
    if (data.status === 'completed') updateData.completedAt = new Date();
    if (data.status === 'rejected') updateData.rejectionReason = data.rejectionReason;

    if (data.status === 'completed' && request.type === 'erasure') {
      await this.anonymizeUserData(request.userId, orgId);
    }

    return this.prisma.dataSubjectRequest.update({ where: { id }, data: updateData });
  }

  private async anonymizeUserData(userId: string, orgId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { email: `redacted-${userId}@anonymized.local`, name: 'Redacted User', passwordHash: 'REDACTED', isActive: false } });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  // ==================== Privacy Policy ====================

  async createPrivacyPolicy(orgId: string, data: { version: string; title: string; content: string; effectiveDate: string }) {
    return this.prisma.privacyPolicy.create({ data: { ...data, effectiveDate: new Date(data.effectiveDate), organizationId: orgId } });
  }

  async getPrivacyPolicy(orgId: string, version?: string) {
    if (version) return this.prisma.privacyPolicy.findUnique({ where: { organizationId_version: { organizationId: orgId, version } } });
    return this.prisma.privacyPolicy.findFirst({ where: { organizationId: orgId }, orderBy: { effectiveDate: 'desc' } });
  }

  async listPrivacyPolicies(orgId: string) {
    return this.prisma.privacyPolicy.findMany({ where: { organizationId: orgId }, orderBy: { effectiveDate: 'desc' } });
  }

  // ==================== Privacy Settings ====================

  async getPrivacySettings(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { dataRetentionDays: true, privacyPolicyUrl: true, privacyPolicyVersion: true, privacyPolicyAcceptedAt: true, encryptionEnabled: true } });
    return org;
  }

  async updatePrivacySettings(orgId: string, data: { dataRetentionDays?: number; privacyPolicyUrl?: string }, userId: string) {
    const org = await this.prisma.organization.update({ where: { id: orgId }, data });
    await this.audit.log({ action: 'privacy.settings.update', entity: 'organization', entityId: orgId, description: 'Configuración de privacidad actualizada', userId, organizationId: orgId, result: 'success' });
    return org;
  }

  // ==================== Data Retention ====================

  async getRetentionPolicies(orgId: string) {
    return this.prisma.dataRetentionPolicy.findMany({ where: { organizationId: orgId } });
  }

  async upsertRetentionPolicy(orgId: string, data: { dataCategory: string; retentionDays: number; action: string; legalHold?: boolean; description?: string }) {
    return this.prisma.dataRetentionPolicy.upsert({
      where: { organizationId_dataCategory: { organizationId: orgId, dataCategory: data.dataCategory } },
      create: { ...data, organizationId: orgId },
      update: { retentionDays: data.retentionDays, action: data.action, legalHold: data.legalHold, description: data.description },
    });
  }

  // ==================== GDPR Dashboard ====================

  async getGdprDashboard(orgId: string) {
    try {
      const [org, dpiaList, exportRequests, consentList, transfers, dsrList, policies, retentionPolicies, acceptedConsents] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: orgId }, select: { dpoName: true, dpoEmail: true, dpoAppointedAt: true, dataRetentionDays: true, encryptionEnabled: true } }),
        this.prisma.dataProcessingRecord.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        this.prisma.dataExport.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        this.prisma.consentRecord.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        this.prisma.internationalTransfer.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 10 }),
        this.prisma.dataSubjectRequest.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true, email: true } } } }),
        this.prisma.privacyPolicy.findFirst({ where: { organizationId: orgId }, orderBy: { effectiveDate: 'desc' } }),
        this.prisma.dataRetentionPolicy.findMany({ where: { organizationId: orgId } }).catch(() => []),
        this.prisma.userConsent.count({ where: { organizationId: orgId, accepted: true } }).catch(() => 0),
      ]);

      return {
        dpo: { appointed: !!org?.dpoName, name: org?.dpoName, email: org?.dpoEmail, appointedAt: org?.dpoAppointedAt },
        dpiaList: (dpiaList || []).map(d => ({
          id: d.id, title: d.title, status: d.status,
          department: (d as any).department || '', riskLevel: d.riskLevel, description: d.description,
          createdAt: d.createdAt,
        })),
        consentList: (consentList || []).map(c => ({
          id: c.id, userId: c.userId || '', email: '', type: c.type,
          active: c.status === 'granted', status: c.status,
          createdAt: c.createdAt,
        })),
        transfers: (transfers || []).map(t => ({
          id: t.id, country: t.country, purpose: t.purpose,
          dpf: t.legalMechanism === 'adequacy_decision',
          status: t.status, riskLevel: t.riskLevel, thirdParty: t.thirdParty,
          createdAt: t.createdAt,
        })),
        dsrList: (dsrList || []).map(r => ({
          id: r.id, requesterName: (r as any).user?.name || r.userId, requesterEmail: (r as any).user?.email || '',
          requestType: r.type, status: r.status, description: r.description,
          deadline: (r as any).deadline || null,
          createdAt: r.createdAt,
        })),
        exportRequests: (exportRequests || []).map(e => ({
          id: e.id, userId: e.requestedById || '', email: '',
          status: e.status, format: e.format,
          createdAt: e.createdAt,
        })),
        retentionPolicies: (retentionPolicies || []).map(p => ({
          id: p.id, category: (p as any).dataCategory || (p as any).category || '',
          retentionPeriod: String((p as any).retentionDays || ''), action: (p as any).action || 'archive',
          active: !((p as any).legalHold === false),
          description: (p as any).description || '',
        })),
        dataRetentionDays: org?.dataRetentionDays,
        encryptionEnabled: org?.encryptionEnabled,
        recentDsrs: dsrList || [],
        currentPrivacyPolicy: policies || null,
        privacyPolicies: policies ? [policies] : [],
      };
    } catch (e: any) {
      this.logger.warn(`GDPR dashboard error: ${e.message?.slice(0, 200)}`);
      return {
        dpo: {}, dpiaList: [], consentList: [], transfers: [], dsrList: [],
        exportRequests: [], retentionPolicies: [],
        dataRetentionDays: null, encryptionEnabled: null,
        recentDsrs: [], currentPrivacyPolicy: null, privacyPolicies: [],
      };
    }
  }
}
