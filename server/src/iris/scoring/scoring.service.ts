import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface DimensionScore {
  dimension: string;
  value: number;
  weight: number;
  trend: 'improving' | 'stable' | 'declining';
}

@Injectable()
export class ScoringEngine {
  private readonly logger = new Logger(ScoringEngine.name);

  constructor(private prisma: PrismaService) {}

  async calculateAllScores(orgId: string, scanId?: string) {
    const scans = await this.prisma.irisScan.findMany({
      where: { organizationId: orgId, status: 'completed' },
      include: { responses: { include: { question: true } }, scores: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    const currentResponses = scanId
      ? await this.prisma.irisResponse.findMany({ where: { scanId }, include: { question: true } })
      : scans[0]?.responses || [];

    if (currentResponses.length === 0) {
      throw new Error('No responses available for scoring');
    }

    const previousScore = await this.prisma.irisOrgScore.findFirst({
      where: { organizationId: orgId },
      orderBy: { calculatedAt: 'desc' },
    });

    const dimensions: DimensionScore[] = [
      { dimension: 'anticipation', value: this.calculateAnticipation(currentResponses), weight: 1.0, trend: 'stable' },
      { dimension: 'resilience', value: this.calculateResilience(currentResponses), weight: 1.2, trend: 'stable' },
      { dimension: 'exposure', value: this.calculateExposure(currentResponses), weight: 1.1, trend: 'stable' },
      { dimension: 'invisibility', value: this.calculateInvisibility(currentResponses), weight: 0.9, trend: 'stable' },
      { dimension: 'dependency', value: this.calculateDependency(currentResponses), weight: 1.1, trend: 'stable' },
      { dimension: 'culture', value: this.calculateCulture(currentResponses), weight: 1.0, trend: 'stable' },
      { dimension: 'governance', value: this.calculateGovernance(currentResponses), weight: 1.1, trend: 'stable' },
      { dimension: 'fragility', value: this.calculateFragility(currentResponses), weight: 1.0, trend: 'stable' },
      { dimension: 'operationalHealth', value: this.calculateOperationalHealth(currentResponses), weight: 1.0, trend: 'stable' },
      { dimension: 'strategicAlignment', value: this.calculateStrategicAlignment(currentResponses), weight: 0.9, trend: 'stable' },
    ];

    const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
    const overallScore = Math.round(dimensions.reduce((s, d) => s + d.value * d.weight, 0) / totalWeight);
    const classification = this.classify(overallScore);

    const withTrends = dimensions.map(d => ({
      ...d,
      trend: this.determineTrend(d.value, previousScore ? previousScore[d.dimension as keyof typeof previousScore] as number : undefined),
    }));

    const obj: any = {};
    for (const d of withTrends) {
      obj[d.dimension] = Math.round(d.value);
    }

    const orgScore = await this.prisma.irisOrgScore.create({
      data: {
        overallScore,
        classification,
        confidence: 0.85,
        organizationId: orgId,
        ...obj,
      },
    });

    await this.prisma.irisScore.createMany({
      data: withTrends.map(d => ({
        dimension: d.dimension,
        value: Math.round(d.value),
        weight: d.weight,
        trend: d.trend,
        delta: previousScore ? Math.round(d.value - (previousScore[d.dimension as keyof typeof previousScore] as number || 0)) : null,
        organizationId: orgId,
        scanId: scanId || undefined,
      })),
    });

    await this.prisma.activity.create({
      data: {
        type: 'score_changed',
        title: `IRIS Score Updated: ${overallScore}/100`,
        description: `Organizational Intelligence Score updated to ${overallScore}/100 — ${classification.replace('_', ' ')}`,
        severity: overallScore < 40 ? 'high' : overallScore < 60 ? 'medium' : 'info',
        organizationId: orgId,
        metadata: { overallScore, classification, dimensions: withTrends },
      },
    });

    return orgScore;
  }

  async getScoreHistory(orgId: string, days: number = 90) {
    const since = new Date(Date.now() - days * 86400000);
    const scores = await this.prisma.irisOrgScore.findMany({
      where: { organizationId: orgId, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'asc' },
    });
    const dimensionScores = await this.prisma.irisScore.findMany({
      where: { organizationId: orgId, calculatedAt: { gte: since } },
      orderBy: { calculatedAt: 'asc' },
    });
    return { overall: scores, dimensions: dimensionScores };
  }

  async getLatestScores(orgId: string) {
    return this.prisma.irisOrgScore.findFirst({
      where: { organizationId: orgId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async getAllDimensionScores(orgId: string) {
    const scores = await this.prisma.irisScore.findMany({
      where: { organizationId: orgId },
      orderBy: { calculatedAt: 'desc' },
      take: 10,
    });

    const latest = new Map<string, any>();
    for (const s of scores) {
      if (!latest.has(s.dimension)) latest.set(s.dimension, s);
    }
    return Array.from(latest.values());
  }

  private calculateAnticipation(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['blind_spot', 'resilience_capacity']);
    return this.scoreFromResponses(relevant, true);
  }

  private calculateResilience(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['resilience_capacity', 'protocol_erosion', 'operational_fragility']);
    return this.scoreFromResponses(relevant, true);
  }

  private calculateExposure(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['blind_spot', 'key_person', 'operational_fragility']);
    return 100 - this.scoreFromResponses(relevant, true); // Inverted — higher exposure = worse
  }

  private calculateInvisibility(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['blind_spot', 'overconfidence']);
    const score = this.scoreFromResponses(relevant, true);
    return Math.max(0, 100 - score * 1.2);
  }

  private calculateDependency(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['key_person', 'knowledge_concentration']);
    const score = this.scoreFromResponses(relevant, true);
    return 100 - score; // Inverted
  }

  private calculateCulture(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['cultural_degradation', 'key_person']);
    return this.scoreFromResponses(relevant, true);
  }

  private calculateGovernance(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['governance_weakness', 'protocol_erosion', 'overconfidence']);
    return this.scoreFromResponses(relevant, true);
  }

  private calculateFragility(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['operational_fragility', 'key_person', 'knowledge_concentration']);
    return 100 - this.scoreFromResponses(relevant, true);
  }

  private calculateOperationalHealth(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['protocol_erosion', 'operational_fragility', 'governance_weakness']);
    return this.scoreFromResponses(relevant, true);
  }

  private calculateStrategicAlignment(responses: any[]) {
    const relevant = this.filterByCategory(responses, ['strategic_misalignment', 'overconfidence', 'governance_weakness']);
    return this.scoreFromResponses(relevant, true);
  }

  private filterByCategory(responses: any[], categories: string[]) {
    return responses.filter((r: any) => categories.includes(r.question?.category));
  }

  private scoreFromResponses(responses: any[], invert: boolean = false) {
    if (responses.length === 0) return 50;
    const values = responses
      .filter((r: any) => typeof r.response?.value === 'number')
      .map((r: any) => r.response.value);
    if (values.length === 0) return 50;
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const scaled = ((avg - 1) / 4) * 100;
    return invert ? scaled : scaled;
  }

  private classify(score: number): string {
    if (score >= 80) return 'resilient';
    if (score >= 60) return 'stable';
    if (score >= 40) return 'moderate_risk';
    if (score >= 20) return 'high_risk';
    return 'critical';
  }

  private determineTrend(current: number, previous?: number): 'improving' | 'stable' | 'declining' {
    if (previous == null) return 'stable';
    const diff = current - previous;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }
}
