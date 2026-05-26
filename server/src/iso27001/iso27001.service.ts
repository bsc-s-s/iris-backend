import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class Iso27001Service {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ==================== Business Continuity - Backup Config ====================

  async getBackupConfig(orgId: string) {
    const config = await this.prisma.backupConfig.findUnique({ where: { organizationId: orgId } });
    return config || this.getDefaultBackupConfig(orgId);
  }

  async upsertBackupConfig(orgId: string, data: {
    enabled?: boolean; frequency?: string; retentionDays?: number; encryptionEnabled?: boolean;
    encryptionAlgorithm?: string; storageLocation?: string; storageBucket?: string; storageRegion?: string;
    backupTypes?: string[]; pointInTimeRecovery?: boolean;
  }, userId: string) {
    const config = await this.prisma.backupConfig.upsert({
      where: { organizationId: orgId },
      create: { ...data, organizationId: orgId, backupTypes: data.backupTypes || ['full'] },
      update: data,
    });
    await this.audit.log({ action: 'backup.config.update', entity: 'backupConfig', entityId: config.id, description: 'Configuración de backup actualizada', userId, organizationId: orgId, result: 'success' });
    return config;
  }

  async recordBackup(orgId: string, data: { status: string; size?: number }) {
    const config = await this.prisma.backupConfig.findUnique({ where: { organizationId: orgId } });
    if (!config) throw new NotFoundException('Backup config not found. Configure backup first.');
    return this.prisma.backupConfig.update({
      where: { organizationId: orgId },
      data: { lastBackupAt: new Date(), lastBackupSize: data.size, lastBackupStatus: data.status, nextBackupAt: this.calculateNextBackup(config.frequency) },
    });
  }

  // ==================== Disaster Recovery Plan ====================

  async getDrp(orgId: string) {
    return this.prisma.disasterRecoveryPlan.findUnique({ where: { organizationId: orgId } });
  }

  async upsertDrp(orgId: string, data: {
    name: string; description?: string; rto: number; rpo: number; priority?: string;
    scope?: any; procedures?: any[]; contacts?: any[];
  }, userId: string) {
    const drp = await this.prisma.disasterRecoveryPlan.upsert({
      where: { organizationId: orgId },
      create: { ...data, organizationId: orgId, scope: data.scope || {}, procedures: data.procedures || [], contacts: data.contacts || [] },
      update: data,
    });
    await this.audit.log({ action: 'drp.update', entity: 'disasterRecoveryPlan', entityId: drp.id, description: `DRP actualizado: ${data.name}`, userId, organizationId: orgId, result: 'success' });
    return drp;
  }

  async testDrp(orgId: string, results: any, userId: string) {
    const drp = await this.prisma.disasterRecoveryPlan.findUnique({ where: { organizationId: orgId } });
    if (!drp) throw new NotFoundException('DRP not configured');
    const updated = await this.prisma.disasterRecoveryPlan.update({
      where: { organizationId: orgId },
      data: { lastTestedAt: new Date(), testResults: results },
    });
    await this.audit.log({ action: 'drp.test', entity: 'disasterRecoveryPlan', entityId: drp.id, description: 'DRP probado', userId, organizationId: orgId, metadata: { results }, result: 'success' });
    return updated;
  }

  // ==================== Cloud Provider Registry ====================

  async listProviders(orgId: string) {
    return this.prisma.cloudProvider.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async createProvider(orgId: string, data: {
    name: string; providerType: string; description?: string; serviceUrl?: string;
    dataCenters?: any[]; certifications?: string[]; euDataBoundary?: boolean;
    contractSigned?: boolean; status?: string; riskLevel?: string;
  }, userId: string) {
    const provider = await this.prisma.cloudProvider.create({
      data: { ...data, organizationId: orgId, dataCenters: data.dataCenters || [], certifications: data.certifications || [] },
    });
    await this.audit.log({ action: 'provider.create', entity: 'cloudProvider', entityId: provider.id, description: `Proveedor registrado: ${data.name}`, userId, organizationId: orgId, result: 'success' });
    return provider;
  }

  async updateProvider(id: string, orgId: string, data: any, userId: string) {
    const existing = await this.prisma.cloudProvider.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Provider not found');
    const provider = await this.prisma.cloudProvider.update({ where: { id }, data });
    await this.audit.log({ action: 'provider.update', entity: 'cloudProvider', entityId: id, description: `Proveedor actualizado: ${existing.name}`, userId, organizationId: orgId, result: 'success' });
    return provider;
  }

  async deleteProvider(id: string, orgId: string, userId: string) {
    const existing = await this.prisma.cloudProvider.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Provider not found');
    await this.prisma.cloudProvider.delete({ where: { id } });
    await this.audit.log({ action: 'provider.delete', entity: 'cloudProvider', entityId: id, description: `Proveedor eliminado: ${existing.name}`, userId, organizationId: orgId, result: 'success' });
  }

  // ==================== Encryption Key Management ====================

  async listKeys(orgId: string) {
    return this.prisma.encryptionKey.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async createKey(orgId: string, data: { name: string; algorithm?: string; purpose: string; expiresAt?: string }, userId: string) {
    const keyId = `key-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    const key = await this.prisma.encryptionKey.create({
      data: { ...data, keyId, organizationId: orgId, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined },
    });
    await this.audit.log({ action: 'encryption.key.create', entity: 'encryptionKey', entityId: key.id, description: `Clave de cifrado creada: ${data.name}`, userId, organizationId: orgId, result: 'success' });
    return key;
  }

  async rotateKey(id: string, orgId: string, userId: string) {
    const existing = await this.prisma.encryptionKey.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Encryption key not found');
    const newKeyId = `key-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
    const newKey = await this.prisma.encryptionKey.create({
      data: { name: `${existing.name} (rotated)`, algorithm: existing.algorithm, keyId: newKeyId, purpose: existing.purpose, organizationId: orgId, rotatedFromId: existing.id },
    });
    await this.prisma.encryptionKey.update({ where: { id }, data: { status: 'rotated', rotatedAt: new Date() } });
    await this.audit.log({ action: 'encryption.key.rotate', entity: 'encryptionKey', entityId: id, description: `Clave rotada: ${existing.name}`, userId, organizationId: orgId, result: 'success' });
    return newKey;
  }

  async revokeKey(id: string, orgId: string, userId: string) {
    const existing = await this.prisma.encryptionKey.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Encryption key not found');
    await this.prisma.encryptionKey.update({ where: { id }, data: { status: 'revoked' } });
    await this.audit.log({ action: 'encryption.key.revoke', entity: 'encryptionKey', entityId: id, description: `Clave revocada: ${existing.name}`, userId, organizationId: orgId, result: 'success' });
  }

  // ==================== Sensitive Fields Registry ====================

  async listSensitiveFields(orgId: string) {
    return this.prisma.sensitiveField.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } });
  }

  async upsertSensitiveField(orgId: string, data: {
    entity: string; field: string; dataType: string; classification: string;
    encryption?: boolean; masking?: boolean; retentionDays?: number; justification?: string;
  }) {
    return this.prisma.sensitiveField.upsert({
      where: { organizationId_entity_field: { organizationId: orgId, entity: data.entity, field: data.field } },
      create: { ...data, organizationId: orgId },
      update: data,
    });
  }

  async deleteSensitiveField(id: string, orgId: string) {
    const existing = await this.prisma.sensitiveField.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw new NotFoundException('Sensitive field not found');
    await this.prisma.sensitiveField.delete({ where: { id } });
  }

  // ==================== ISO 27001 Dashboard ====================

  async getIsoDashboard(orgId: string) {
    const [backup, drp, providers, keys, fields, users] = await Promise.all([
      this.getBackupConfig(orgId),
      this.getDrp(orgId),
      this.prisma.cloudProvider.count({ where: { organizationId: orgId } }),
      this.prisma.encryptionKey.count({ where: { organizationId: orgId, status: 'active' } }),
      this.prisma.sensitiveField.count({ where: { organizationId: orgId } }),
      this.prisma.user.count({ where: { organizationId: orgId, isActive: true } }),
    ]);

    return {
      backupConfig: backup ? { enabled: backup.enabled, frequency: backup.frequency, retentionDays: backup.retentionDays, encryptionEnabled: backup.encryptionEnabled, lastBackupStatus: backup.lastBackupStatus, lastBackupAt: backup.lastBackupAt } : null,
      drp: drp ? { name: drp.name, status: drp.status, rto: drp.rto, rpo: drp.rpo, lastTestedAt: drp.lastTestedAt } : null,
      providers: { total: providers },
      encryptionKeys: { active: keys },
      sensitiveFields: { total: fields },
      activeUsers: users,
    };
  }

  // ==================== Helpers ====================

  private getDefaultBackupConfig(orgId: string) {
    return {
      id: 'default',
      enabled: false,
      frequency: 'daily',
      retentionDays: 30,
      encryptionEnabled: true,
      encryptionAlgorithm: 'AES-256-GCM',
      storageLocation: 's3',
      storageBucket: null,
      storageRegion: null,
      lastBackupAt: null,
      lastBackupSize: null,
      lastBackupStatus: null,
      nextBackupAt: null,
      backupTypes: ['full'],
      pointInTimeRecovery: false,
      organizationId: orgId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private calculateNextBackup(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'hourly': return new Date(now.setHours(now.getHours() + 1));
      case 'daily': return new Date(now.setDate(now.getDate() + 1));
      case 'weekly': return new Date(now.setDate(now.getDate() + 7));
      case 'monthly': return new Date(now.setMonth(now.getMonth() + 1));
      default: return new Date(now.setDate(now.getDate() + 1));
    }
  }
}
