import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportEngine {
  private readonly logger = new Logger(ReportEngine.name);

  constructor(private prisma: PrismaService) {}

  async generate(orgId: string, userId: string, type: string, title?: string) {
    const [latestScore, scoreHistory, signals, predictions, scans] = await Promise.all([
      this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
      this.prisma.irisOrgScore.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'asc' }, take: 12 }),
      this.prisma.riskSignal.findMany({ where: { organizationId: orgId }, orderBy: { detectedAt: 'desc' }, take: 30 }),
      this.prisma.prediction.findMany({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' }, take: 6 }),
      this.prisma.irisScan.findMany({ where: { organizationId: orgId }, orderBy: { startedAt: 'desc' }, take: 5 }),
    ]);

    const reportTemplates: Record<string, (s: any, h: any, sig: any, pred: any, sc: any) => any> = {
      executive: this.buildExecutiveReport,
      board: this.buildBoardReport,
      compliance: this.buildComplianceReport,
      risk_assessment: this.buildRiskAssessmentReport,
    };

    const builder = reportTemplates[type] || reportTemplates.executive;
    const content = builder(latestScore, scoreHistory, signals, predictions, scans);

    const report = await this.prisma.report.create({
      data: {
        title: title || `${type.replace('_', ' ')} Report - ${new Date().toLocaleDateString()}`,
        type,
        format: 'json',
        status: 'completed',
        content,
        sections: Object.keys(content),
        completedAt: new Date(),
        organizationId: orgId,
        createdById: userId,
      },
    });

    await this.prisma.activity.create({
      data: {
        type: 'report_generated',
        title: `${type.replace('_', ' ')} report generated`,
        description: `IRIS ${type.replace('_', ' ')} report generated with ${signals.length} risk signals and ${predictions.length} predictions`,
        organizationId: orgId,
        userId,
        metadata: { reportId: report.id, type },
      },
    });

    return report;
  }

  async list(orgId: string) {
    return this.prisma.report.findMany({
      where: { organizationId: orgId },
      orderBy: { generatedAt: 'desc' },
      select: { id: true, title: true, type: true, format: true, status: true, generatedAt: true, completedAt: true },
    });
  }

  async get(id: string, orgId: string) {
    const report = await this.prisma.report.findFirst({ where: { id, organizationId: orgId } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  private buildExecutiveReport(score: any, history: any[], signals: any[], predictions: any[], scans: any[]) {
    return {
      type: 'Executive Summary',
      generatedAt: new Date().toISOString(),
      classification: score?.classification || 'not_evaluated',
      overallScore: score?.overallScore || 0,
      confidence: score?.confidence || 0,
      dimensions: score ? {
        anticipation: score.anticipation,
        resilience: score.resilience,
        exposure: score.exposure,
        invisibility: score.invisibility,
        dependency: score.dependency,
        culture: score.culture,
        governance: score.governance,
        fragility: score.fragility,
        operationalHealth: score.operationalHealth,
        strategicAlignment: score.strategicAlignment,
      } : null,
      scoreTrend: history.length >= 2 ? {
        direction: history[history.length - 1].overallScore > history[0].overallScore ? 'improving' : 'declining',
        change: history[history.length - 1].overallScore - history[0].overallScore,
      } : null,
      criticalSignals: signals.filter(s => s.severity === 'critical').length,
      highSignals: signals.filter(s => s.severity === 'high').length,
      totalSignals: signals.length,
      topPredictions: predictions.slice(0, 3).map(p => ({
        model: p.model, probability: p.probability, impact: p.impact, timeHorizon: p.timeHorizon,
      })),
      totalScans: scans.length,
      recommendations: this.generateRecommendations(score, signals, predictions),
    };
  }

  private buildBoardReport(score: any, history: any[], signals: any[], predictions: any[], scans: any[]) {
    return {
      type: 'Board Presentation',
      generatedAt: new Date().toISOString(),
      classification: score?.classification || 'not_evaluated',
      overallScore: score?.overallScore || 0,
      riskExposure: {
        critical: signals.filter(s => s.severity === 'critical').length,
        high: signals.filter(s => s.severity === 'high').length,
        medium: signals.filter(s => s.severity === 'medium').length,
        low: signals.filter(s => s.severity === 'low').length,
      },
      top3Risks: signals.filter(s => s.severity === 'critical' || s.severity === 'high').slice(0, 3).map(s => ({
        title: s.title, category: s.category, confidence: s.confidence,
      })),
      futureOutlook: predictions.slice(0, 3).map(p => ({
        scenario: p.model.replace('_', ' '), probability: `${Math.round(p.probability * 100)}%`, horizon: p.timeHorizon,
      })),
      keyMetrics: {
        scansCompleted: scans.filter(s => s.status === 'completed').length,
        monitorCyclesCompleted: 0,
        signalsTracked: signals.length,
        scoreChange: history.length >= 2 ? history[history.length - 1].overallScore - history[0].overallScore : 0,
      },
      strategicRecommendations: this.generateBoardRecommendations(score, signals, predictions),
    };
  }

  private buildComplianceReport(score: any, history: any[], signals: any[], predictions: any[], scans: any[]) {
    return {
      type: 'Compliance & Governance',
      generatedAt: new Date().toISOString(),
      governanceScore: score?.governance || 0,
      complianceGaps: signals.filter(s => s.category === 'governance' || s.category === 'protocol_erosion').map(s => ({
        title: s.title, severity: s.severity, confidence: s.confidence,
      })),
      protocolAdherence: this.calculateProtocolAdherence(scans),
      regulatoryRisks: predictions.filter(p => p.model === 'governance_failure').map(p => ({
        probability: p.probability, impact: p.impact, timeHorizon: p.timeHorizon,
      })),
      recommendations: [
        'Review and update compliance framework',
        'Conduct gap analysis against regulatory requirements',
        'Implement continuous compliance monitoring',
        'Schedule compliance training for key personnel',
      ],
    };
  }

  private buildRiskAssessmentReport(score: any, history: any[], signals: any[], predictions: any[], scans: any[]) {
    return {
      type: 'Risk Assessment',
      generatedAt: new Date().toISOString(),
      overallRiskLevel: score?.classification || 'unknown',
      scoreBreakdown: score ? {
        anticipation: score.anticipation,
        resilience: score.resilience,
        exposure: score.exposure,
        invisibility: score.invisibility,
        dependency: score.dependency,
      } : null,
      identifiedRisks: signals.map(s => ({
        title: s.title, category: s.category, severity: s.severity, confidence: s.confidence,
      })),
      predictiveRisks: predictions.map(p => ({
        model: p.model, probability: p.probability, impact: p.impact, horizon: p.timeHorizon,
      })),
      riskHeatmap: this.buildRiskHeatmap(signals),
      mitigationPlan: this.buildMitigationPlan(signals, predictions),
    };
  }

  private generateRecommendations(score: any, signals: any[], predictions: any[]) {
    const recs: string[] = [];
    if (!score) return ['Complete an IRIS Scan to baseline organizational intelligence'];
    if (score.overallScore < 40) recs.push('Immediate organizational intervention required — critical risk levels detected');
    if (score.fragility < 40) recs.push('Strengthen operational resilience and reduce single points of failure');
    if (score.dependency > 60) recs.push('Implement knowledge transfer and succession planning programs');
    if (score.culture < 40) recs.push('Address organizational culture degradation through structured interventions');
    if (score.governance < 40) recs.push('Review and strengthen governance framework and compliance controls');
    if (predictions.some(p => p.probability > 0.5)) recs.push('Address high-probability risk predictions through proactive mitigation');
    if (signals.filter(s => s.severity === 'critical').length > 0) recs.push('Triage and address critical risk signals immediately');
    recs.push('Schedule regular IRIS Monitor cycles to track organizational health trends');
    return recs;
  }

  private generateBoardRecommendations(score: any, signals: any[], predictions: any[]) {
    return [
      score && score.overallScore < 50 ? 'Appoint organizational resilience as a board-level priority' : null,
      signals.filter(s => s.severity === 'critical').length > 0 ? 'Review critical risk signals and allocate resources' : null,
      predictions.filter(p => p.probability > 0.4).length > 0 ? 'Establish risk mitigation task force for high-probability scenarios' : null,
      'Implement quarterly organizational intelligence reviews',
      'Invest in knowledge management and succession planning',
      'Strengthen governance and compliance monitoring',
    ].filter(Boolean);
  }

  private calculateProtocolAdherence(scans: any[]) {
    const protocolResponses = scans.flatMap(s =>
      s.responses?.filter((r: any) => r.question?.category === 'protocol_erosion') || []
    );
    if (protocolResponses.length === 0) return 'insufficient_data';
    const avg = protocolResponses.reduce((a: number, r: any) => a + ((r.response as any)?.value || 3), 0) / protocolResponses.length;
    return avg >= 4 ? 'strong' : avg >= 2.5 ? 'moderate' : 'weak';
  }

  private buildRiskHeatmap(signals: any[]) {
    const categories = [...new Set(signals.map(s => s.category))];
    return categories.map(cat => {
      const items = signals.filter(s => s.category === cat);
      const maxSeverity = items.reduce((m, s) => {
        const order: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
        return Math.max(m, order[s.severity] || 0);
      }, 0);
      return { category: cat, count: items.length, maxSeverity: ['info', 'low', 'medium', 'high', 'critical'][maxSeverity] };
    });
  }

  private buildMitigationPlan(signals: any[], predictions: any[]) {
    const plan: any[] = [];
    const immediate = signals.filter(s => s.severity === 'critical').slice(0, 5);
    for (const s of immediate) {
      plan.push({ priority: 'immediate', risk: s.title, action: `Investigate and mitigate: ${s.title}`, owner: 'Risk Management', timeline: '7 days' });
    }
    const high = signals.filter(s => s.severity === 'high').slice(0, 5);
    for (const s of high) {
      plan.push({ priority: 'short_term', risk: s.title, action: `Address: ${s.title}`, owner: 'Department Lead', timeline: '30 days' });
    }
    for (const p of predictions.filter(p => p.probability > 0.4)) {
      plan.push({ priority: 'medium_term', risk: p.model.replace('_', ' '), action: `Mitigate ${p.model.replace('_', ' ')} risk (${Math.round(p.probability * 100)}% probability)`, owner: 'Executive Team', timeline: '90 days' });
    }
    return plan;
  }
}
