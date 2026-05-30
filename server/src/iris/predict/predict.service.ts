import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PredictService {
  private readonly logger = new Logger(PredictService.name);

  constructor(private prisma: PrismaService) {}

  async runAllPredictions(orgId: string) {
    const [latestScore, signals, scans] = await Promise.all([
      this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
      this.prisma.riskSignal.findMany({ where: { organizationId: orgId, acknowledgedAt: null }, orderBy: { detectedAt: 'desc' } }),
      this.prisma.irisScan.findMany({ where: { organizationId: orgId }, include: { responses: { include: { question: true } } }, orderBy: { startedAt: 'desc' }, take: 5 }),
    ]);

    const models = [
      this.predictOperationalCrisis(orgId, latestScore, signals, scans),
      this.predictTalentLoss(orgId, latestScore, signals, scans),
      this.predictKnowledgeCollapse(orgId, latestScore, signals, scans),
      this.predictGovernanceFailure(orgId, latestScore, signals, scans),
      this.predictBurnout(orgId, latestScore, signals, scans),
    ];

    return Promise.all(models);
  }

  async getPredictions(orgId: string, model?: string) {
    const where: any = { organizationId: orgId };
    if (model) where.model = model;
    return this.prisma.prediction.findMany({ where, orderBy: { calculatedAt: 'desc' }, take: 10 });
  }

  private async savePrediction(orgId: string, data: {
    model: string; probability: number; impact: string; timeHorizon: string;
    causalFactors: any; recommendations: any; score?: number;
  }) {
    return this.prisma.prediction.create({
      data: { ...data, organizationId: orgId,
        causalFactors: data.causalFactors || [],
        recommendations: data.recommendations || [],
      },
    });
  }

  private async predictOperationalCrisis(orgId: string, score: any, signals: any[], scans: any[]) {
    let probability = 0.15;
    const factors: string[] = [];
    const recs: string[] = [];

    if (score) {
      if (score.fragility < 40) { probability += 0.2; factors.push('High operational fragility'); }
      if (score.resilience < 30) { probability += 0.15; factors.push('Low resilience capacity'); }
      if (score.dependency > 70) { probability += 0.15; factors.push('High dependency risk'); }
      if (score.governance < 35) { probability += 0.1; factors.push('Weak governance framework'); }
    }

    const criticalSignals = signals.filter(s => s.severity === 'critical' || s.severity === 'high');
    if (criticalSignals.length > 5) { probability += 0.1; factors.push(`${criticalSignals.length} unresolved critical signals`); }

    const weakProtocolScans = scans.filter(s =>
      s.responses.some((r: any) => r.question?.category === 'protocol_erosion' && (r.response as any)?.value <= 2)
    );
    if (weakProtocolScans.length > 0) { probability += 0.1; factors.push('Protocol erosion detected across scans'); }

    if (probability > 0.5) recs.push('Conduct immediate operational resilience assessment');
    if (probability > 0.3) recs.push('Implement 24/7 monitoring of critical processes');
    recs.push('Develop contingency plans for top 5 operational risks');

    probability = Math.min(probability, 0.95);
    return this.savePrediction(orgId, {
      model: 'operational_crisis', probability, impact: probability > 0.5 ? 'high' : probability > 0.3 ? 'medium' : 'low',
      timeHorizon: '90d', causalFactors: factors, recommendations: recs, score: Math.round(probability * 100),
    });
  }

  private async predictTalentLoss(orgId: string, score: any, signals: any[], scans: any[]) {
    let probability = 0.1;
    const factors: string[] = [];
    const recs: string[] = [];

    if (score) {
      if (score.culture < 35) { probability += 0.25; factors.push('Poor culture score indicates retention risk'); }
      if (score.dependency > 60) { probability += 0.15; factors.push('High dependency on specific individuals'); }
    }

    const cultureSignals = signals.filter(s => s.category === 'cultural_degradation');
    if (cultureSignals.length > 2) { probability += 0.15; factors.push(`${cultureSignals.length} cultural degradation signals`); }

    const weakCultureResponses = scans.flatMap(s =>
      s.responses.filter((r: any) => r.question?.category === 'cultural_degradation' && (r.response as any)?.value <= 2)
    );
    if (weakCultureResponses.length > 3) { probability += 0.1; factors.push('Consistently low culture scores'); }

    if (probability > 0.4) recs.push('Launch retention analysis and engagement survey');
    if (probability > 0.3) recs.push('Implement stay interviews for critical roles');
    recs.push('Document knowledge transfer plans for key positions');

    probability = Math.min(probability, 0.9);
    return this.savePrediction(orgId, {
      model: 'talent_loss', probability, impact: probability > 0.5 ? 'high' : probability > 0.3 ? 'medium' : 'low',
      timeHorizon: '90d', causalFactors: factors, recommendations: recs, score: Math.round(probability * 100),
    });
  }

  private async predictKnowledgeCollapse(orgId: string, score: any, signals: any[], scans: any[]) {
    let probability = 0.08;
    const factors: string[] = [];
    const recs: string[] = [];

    if (score) {
      if (score.invisibility > 60) { probability += 0.2; factors.push('High invisibility — undocumented knowledge'); }
      if (score.dependency > 65) { probability += 0.2; factors.push('Critical dependencies on key individuals'); }
    }

    const knowledgeSignals = signals.filter(s => s.category === 'dependency' || s.title.toLowerCase().includes('knowledge'));
    if (knowledgeSignals.length > 2) { probability += 0.15; factors.push(`${knowledgeSignals.length} knowledge concentration signals`); }

    const keyPersonResponses = scans.flatMap(s =>
      s.responses.filter((r: any) => r.question?.category === 'key_person' && (r.response as any)?.value >= 4)
    );
    if (keyPersonResponses.length > 2) { probability += 0.15; factors.push('Multiple key person dependencies identified'); }

    if (probability > 0.3) recs.push('Implement organization-wide knowledge management system');
    if (probability > 0.4) recs.push('Conduct bus-factor analysis and mitigation');
    recs.push('Establish cross-training programs for critical roles');

    probability = Math.min(probability, 0.9);
    return this.savePrediction(orgId, {
      model: 'knowledge_collapse', probability, impact: probability > 0.5 ? 'high' : probability > 0.3 ? 'medium' : 'low',
      timeHorizon: '6m', causalFactors: factors, recommendations: recs, score: Math.round(probability * 100),
    });
  }

  private async predictGovernanceFailure(orgId: string, score: any, signals: any[], scans: any[]) {
    let probability = 0.1;
    const factors: string[] = [];
    const recs: string[] = [];

    if (score) {
      if (score.governance < 30) { probability += 0.25; factors.push('Critically weak governance score'); }
      if (score.fragility > 60) { probability += 0.1; factors.push('High fragility without governance controls'); }
    }

    const governanceSignals = signals.filter(s => s.category === 'governance');
    if (governanceSignals.length > 2) { probability += 0.15; factors.push(`${governanceSignals.length} governance risk signals`); }

    const overconfident = signals.filter(s => s.category === 'overconfidence');
    if (overconfident.length > 0) { probability += 0.1; factors.push('Overconfidence patterns may indicate governance blind spots'); }

    if (probability > 0.4) recs.push('Schedule governance framework review');
    if (probability > 0.3) recs.push('Strengthen compliance monitoring and reporting');
    recs.push('Review and update policies and controls');

    probability = Math.min(probability, 0.9);
    return this.savePrediction(orgId, {
      model: 'governance_failure', probability, impact: probability > 0.5 ? 'high' : probability > 0.3 ? 'medium' : 'low',
      timeHorizon: '12m', causalFactors: factors, recommendations: recs, score: Math.round(probability * 100),
    });
  }

  private async predictBurnout(orgId: string, score: any, signals: any[], scans: any[]) {
    let probability = 0.12;
    const factors: string[] = [];
    const recs: string[] = [];

    if (score) {
      if (score.culture < 30) { probability += 0.2; factors.push('Critically low culture score — burnout risk'); }
      if (score.fragility > 50) { probability += 0.1; factors.push('Operational fragility increasing pressure'); }
    }

    const keyPersonSignals = signals.filter(s => s.category === 'key_person' && s.severity === 'critical');
    if (keyPersonSignals.length > 1) { probability += 0.15; factors.push('Critical key person dependencies — burnout risk for key staff'); }

    const fastResponses = scans.flatMap(s =>
      s.responses.filter((r: any) => r.latency && r.latency < 2000)
    );
    if (fastResponses.length > scans.length * 3) { probability += 0.1; factors.push('Rushed response patterns — possible time pressure'); }

    if (probability > 0.35) recs.push('Conduct wellness and workload assessment');
    if (probability > 0.25) recs.push('Review resource allocation and team capacity');
    recs.push('Implement workload monitoring and early burnout detection');

    probability = Math.min(probability, 0.85);
    return this.savePrediction(orgId, {
      model: 'burnout', probability, impact: probability > 0.5 ? 'high' : probability > 0.3 ? 'medium' : 'low',
      timeHorizon: '60d', causalFactors: factors, recommendations: recs, score: Math.round(probability * 100),
    });
  }
}
