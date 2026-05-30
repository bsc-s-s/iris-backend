import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveEngine } from './engine/cognitive-engine.service';

@Injectable()
export class IrisService {
  private readonly logger = new Logger(IrisService.name);

  constructor(
    private prisma: PrismaService,
    private cognitive: CognitiveEngine,
  ) {}

  async getOrganizationalIntelligence(orgId: string) {
    try {
      const [latestScore, signals, alerts, activeScans, recentPredictions] = await Promise.all([
        this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
        this.prisma.riskSignal.findMany({ where: { organizationId: orgId, acknowledgedAt: null }, orderBy: { detectedAt: 'desc' }, take: 20 }),
        this.prisma.alert.findMany({ where: { organizationId: orgId, read: false }, orderBy: { createdAt: 'desc' }, take: 10 }),
        this.prisma.irisScan.findMany({ where: { organizationId: orgId, status: 'in_progress' }, orderBy: { startedAt: 'desc' }, take: 5 }),
        this.prisma.prediction.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' }, take: 10 }),
      ]);

      return {
        score: latestScore || null,
        signals,
        alerts,
        activeScans,
        predictions: recentPredictions,
        timestamp: new Date().toISOString(),
      };
    } catch (e: any) {
      this.logger.warn(`Intelligence error: ${e.message?.slice(0, 200)}`);
      return { score: null, signals: [], alerts: [], activeScans: [], predictions: [], timestamp: new Date().toISOString() };
    }
  }

  async getRiskSignals(orgId: string, filters?: { severity?: string; type?: string }) {
    const where: any = { organizationId: orgId };
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.type) where.type = filters.type;
    return this.prisma.riskSignal.findMany({ where, orderBy: { detectedAt: 'desc' }, take: 50 });
  }

  async acknowledgeSignal(id: string, userId: string, orgId: string) {
    return this.prisma.riskSignal.update({
      where: { id },
      data: { acknowledgedAt: new Date(), acknowledgedById: userId },
    });
  }

  async getActiveAlerts(orgId: string) {
    return this.prisma.alert.findMany({ where: { organizationId: orgId, read: false }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async dismissAlert(id: string, orgId: string) {
    return this.prisma.alert.update({ where: { id }, data: { read: true, dismissedAt: new Date() } });
  }

  async getTimeline(orgId: string, days: number = 90) {
    const since = new Date(Date.now() - days * 86400000);
    const [activities, scores, alerts, scans] = await Promise.all([
      this.prisma.activity.findMany({ where: { organizationId: orgId, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.irisOrgScore.findMany({ where: { organizationId: orgId, calculatedAt: { gte: since } }, orderBy: { calculatedAt: 'asc' } }),
      this.prisma.alert.findMany({ where: { organizationId: orgId, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.irisScan.findMany({ where: { organizationId: orgId, startedAt: { gte: since } }, orderBy: { startedAt: 'desc' }, take: 20 }),
    ]);

    return { activities, scoreHistory: scores, alerts, scans, since };
  }

  async getExecutiveDashboard(orgId: string) {
    try {
      const [latestScore, scoreHistory, signals, alerts, activeScans, predictions, benchmarks] = await Promise.all([
        this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
        this.prisma.irisOrgScore.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'asc' }, take: 24 }),
        this.prisma.riskSignal.findMany({ where: { organizationId: orgId, acknowledgedAt: null }, orderBy: { detectedAt: 'desc' }, take: 10 }),
        this.prisma.alert.findMany({ where: { organizationId: orgId, read: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
        this.prisma.irisScan.findMany({ where: { organizationId: orgId }, orderBy: { startedAt: 'desc' }, take: 5 }),
        this.prisma.prediction.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' }, take: 6 }),
        this.prisma.benchmarkData.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' }, take: 1 }),
      ]);

      const score = latestScore || {
        overallScore: 0, classification: 'not_evaluated', anticipation: 0, resilience: 0,
        exposure: 0, invisibility: 0, dependency: 0, culture: 0, governance: 0,
        fragility: 0, operationalHealth: 0, strategicAlignment: 0, confidence: 0,
      };

      const radar = latestScore ? [
        { dimension: 'Anticipation', value: latestScore.anticipation },
        { dimension: 'Resilience', value: latestScore.resilience },
        { dimension: 'Exposure', value: latestScore.exposure },
        { dimension: 'Invisibility', value: latestScore.invisibility },
        { dimension: 'Dependency', value: latestScore.dependency },
        { dimension: 'Culture', value: latestScore.culture },
        { dimension: 'Governance', value: latestScore.governance },
        { dimension: 'Fragility', value: latestScore.fragility },
        { dimension: 'Operational Health', value: latestScore.operationalHealth },
        { dimension: 'Strategic Alignment', value: latestScore.strategicAlignment },
      ] : [];

      return {
        score,
        radar,
        scoreHistory: scoreHistory.map(s => ({ date: s.calculatedAt, score: s.overallScore })),
        signals,
        alerts,
        recentScans: activeScans,
        predictions,
        benchmarkPosition: benchmarks[0] || null,
        classification: score.classification,
      };
    } catch (e: any) {
      this.logger.warn(`Dashboard error: ${e.message?.slice(0, 200)}`);
      return { score: null, radar: [], scoreHistory: [], signals: [], alerts: [], recentScans: [], predictions: [], benchmarkPosition: null, classification: 'unknown' };
    }
  }

  async analyzeDocument(orgId: string, userId: string, data: { fileName: string; content: string; fileType: string }) {
    try {
      const signals = await this.cognitive.analyzeText(data.content);
      const insight = await this.prisma.documentInsight.create({
        data: {
          fileName: data.fileName,
          fileType: data.fileType,
          content: data.content.slice(0, 50000),
          summary: signals.slice(0, 3).map(s => s.title).join('; ') || 'No significant signals detected',
          riskSignals: signals,
          organizationId: orgId,
          uploadedById: userId,
        },
      });

      for (const signal of signals.slice(0, 10)) {
        await this.prisma.riskSignal.create({
          data: {
            type: 'pattern',
            category: signal.category || 'anomaly',
            title: signal.title,
            description: signal.description,
            severity: signal.severity || 'medium',
            confidence: signal.confidence || 0.6,
            source: 'document',
            metadata: { documentId: insight.id, fileName: data.fileName },
            organizationId: orgId,
          },
        });
      }

      return insight;
    } catch (e: any) {
      this.logger.warn(`Document analysis error: ${e.message?.slice(0, 200)}`);
      throw e;
    }
  }
}
