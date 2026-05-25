export interface RiskInput {
  assessmentId?: string;
  organizationId: string;
  categoryScores?: Record<string, number>;
  factors?: RiskFactor[];
  historicalData?: HistoricalEntry[];
  orgProfile?: {
    userCount?: number;
    assessmentCount?: number;
    incidentCount?: number;
    protocolCount?: number;
    avgResponseTime?: number;
    turnoverRate?: number;
    communicationScore?: number;
  };
}

export interface RiskFactor {
  name: string;
  severity: number;
  description: string;
  category: RiskCategory;
  weight?: number;
}

export type RiskCategory = 'operational' | 'financial' | 'security' | 'human' | 'geopolitical' | 'reputational' | 'strategic' | 'compliance';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAnalysis {
  riskScore: number;
  riskLevel: RiskLevel;
  category: RiskCategory;
  factors: RiskFactor[];
  confidence: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  timestamp: string;
}

export interface RiskAssessmentResult {
  overallScore: number;
  overallLevel: RiskLevel;
  invisibleRiskIndex: number;
  organizationalFragility: number;
  categories: Record<string, RiskAnalysis>;
  factors: RiskFactor[];
  recommendations: Recommendation[];
  correlations: CrossCategoryCorrelation[];
  confidence: number;
  benchmark: BenchmarkComparison;
  timestamp: string;
}

export interface Recommendation {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: RiskCategory;
  message: string;
  impact: number;
}

export interface CrossCategoryCorrelation {
  source: RiskCategory;
  target: RiskCategory;
  correlation: number;
  description: string;
}

export interface BenchmarkComparison {
  vsIndustry: number;
  vsPeriod: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'deteriorating';
}

export interface HistoricalEntry {
  date: string;
  score: number;
  category: RiskCategory;
}

export class RiskEngine {
  private readonly DEFAULT_WEIGHTS: Record<RiskCategory, number> = {
    operational: 0.18,
    financial: 0.14,
    security: 0.22,
    human: 0.12,
    geopolitical: 0.08,
    reputational: 0.10,
    strategic: 0.08,
    compliance: 0.08,
  };

  calculateScore(input: RiskInput): RiskAssessmentResult {
    const categories = this.evaluateCategories(input);
    const allFactors = Object.values(categories).flatMap((c) => c.factors);
    const overallScore = this.computeOverallScore(categories);
    const overallLevel = this.scoreToLevel(overallScore);
    const invisibleRiskIndex = this.computeInvisibleRiskIndex(input, categories);
    const organizationalFragility = this.computeFragilityIndex(input, categories);
    const correlations = this.computeCrossCorrelations(categories);
    const recommendations = this.generateRecommendations(categories, overallLevel, invisibleRiskIndex);
    const confidence = this.computeConfidence(input, categories);

    const benchmark = {
      vsIndustry: Math.round(overallScore * 0.85 + 8),
      vsPeriod: Math.round(overallScore * (1 + (Math.random() - 0.5) * 0.1)),
      percentile: Math.round(100 - overallScore * 0.7),
      trend: this.computeBenchmarkTrend(categories),
    } as BenchmarkComparison;

    return {
      overallScore,
      overallLevel,
      invisibleRiskIndex,
      organizationalFragility,
      categories,
      factors: allFactors,
      recommendations,
      correlations,
      confidence,
      benchmark,
      timestamp: new Date().toISOString(),
    };
  }

  private evaluateCategories(input: RiskInput): Record<string, RiskAnalysis> {
    const categoryKeys: RiskCategory[] = ['operational', 'financial', 'security', 'human', 'geopolitical', 'reputational', 'strategic', 'compliance'];
    const result = {} as Record<string, RiskAnalysis>;

    for (const cat of categoryKeys) {
      const catFactors = (input.factors || []).filter((f) => f.category === cat);
      const catScore = input.categoryScores?.[cat] ?? this.computeCategoryScore(catFactors, input);

      // Compute trend from historical data
      const histScores = (input.historicalData || []).filter((h) => h.category === cat);
      const trend = this.computeTrend(histScores);

      result[cat] = {
        riskScore: catScore,
        riskLevel: this.scoreToLevel(catScore),
        category: cat,
        factors: catFactors,
        confidence: catFactors.length > 0 ? 75 + Math.min(20, catFactors.length * 2) : 40,
        trend,
        timestamp: new Date().toISOString(),
      };
    }

    return result;
  }

  private computeCategoryScore(factors: RiskFactor[], input: RiskInput): number {
    if (factors.length === 0) {
      return this.baseScoreFromProfile(input);
    }

    const totalWeight = factors.reduce((sum, f) => sum + (f.weight || 1), 0);
    const weightedSum = factors.reduce((sum, f) => sum + f.severity * (f.weight || 1), 0);
    const base = Math.round((weightedSum / totalWeight) * 25);

    // Apply cross-category impact modifier
    const modifier = this.computeCrossCategoryModifier(factors[0]?.category, input);
    return Math.min(100, Math.max(0, base + modifier));
  }

  private baseScoreFromProfile(input: RiskInput): number {
    const p = input.orgProfile;
    if (!p) return 25;

    let score = 15;
    if (p.incidentCount && p.incidentCount > 3) score += 10;
    if (p.assessmentCount && p.assessmentCount === 0) score += 15;
    if (p.protocolCount && p.protocolCount < 3) score += 10;
    if (p.turnoverRate && p.turnoverRate > 20) score += 8;
    if (p.communicationScore && p.communicationScore < 50) score += 12;

    return Math.min(100, score);
  }

  private computeCrossCategoryModifier(category: RiskCategory | undefined, input: RiskInput): number {
    if (!category || !input.categoryScores) return 0;

    let modifier = 0;
    for (const [cat, score] of Object.entries(input.categoryScores)) {
      if (cat === category) continue;
      // High risk in one category amplifies others
      if (score >= 70) modifier += 3;
      else if (score >= 50) modifier += 1.5;
    }

    return Math.round(modifier);
  }

  private computeOverallScore(categories: Record<string, RiskAnalysis>): number {
    let weighted = 0;
    let totalWeight = 0;

    for (const [cat, analysis] of Object.entries(categories)) {
      const w = this.DEFAULT_WEIGHTS[cat as RiskCategory] || 0.1;
      weighted += analysis.riskScore * w;
      totalWeight += w;
    }

    return Math.min(100, Math.round(weighted / (totalWeight || 1)));
  }

  private computeInvisibleRiskIndex(input: RiskInput, categories: Record<string, RiskAnalysis>): number {
    let index = 20;

    // Based on weak signals accumulation
    const p = input.orgProfile;
    if (p) {
      if (p.turnoverRate && p.turnoverRate > 15) index += 8;
      if (p.communicationScore && p.communicationScore < 60) index += 10;
      if (p.avgResponseTime && p.avgResponseTime > 48) index += 7;
      if (p.incidentCount && p.incidentCount > 0 && p.incidentCount < 5) index += 5;
    }

    // Cross-category variance indicates hidden risks
    const scores = Object.values(categories).map((c) => c.riskScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    if (variance > 300) index += 10;
    if (variance > 600) index += 15;

    // Low confidence areas
    const lowConf = Object.values(categories).filter((c) => c.confidence < 50);
    index += lowConf.length * 5;

    return Math.min(100, index);
  }

  private computeFragilityIndex(input: RiskInput, categories: Record<string, RiskAnalysis>): number {
    let fragility = 15;

    const p = input.orgProfile;
    if (p) {
      if (p.protocolCount && p.protocolCount < 5) fragility += 10;
      if (p.assessmentCount && p.assessmentCount < 3) fragility += 8;
      if (p.turnoverRate && p.turnoverRate > 20) fragility += 12;
    }

    // High score in security + low in human = fragile
    const security = categories['security']?.riskScore || 0;
    const human = categories['human']?.riskScore || 0;
    if (security > 50 && human < 30) fragility += 15;

    const operational = categories['operational']?.riskScore || 0;
    if (operational > 60) fragility += 10;

    return Math.min(100, fragility);
  }

  private computeCrossCorrelations(categories: Record<string, RiskAnalysis>): CrossCategoryCorrelation[] {
    const correlations: CrossCategoryCorrelation[] = [];
    const pairs = [
      { s: 'security' as RiskCategory, t: 'operational' as RiskCategory, d: 'Brechas de seguridad impactan operaciones' },
      { s: 'human' as RiskCategory, t: 'operational' as RiskCategory, d: 'Rotación de personal afecta continuidad operativa' },
      { s: 'financial' as RiskCategory, t: 'strategic' as RiskCategory, d: 'Riesgo financiero limita capacidad estratégica' },
      { s: 'compliance' as RiskCategory, t: 'reputational' as RiskCategory, d: 'Incumplimiento normativo daña reputación' },
    ];

    for (const { s, t, d } of pairs) {
      const src = categories[s]?.riskScore || 0;
      const trg = categories[t]?.riskScore || 0;
      const baseCorrelation = src > 0 && trg > 0 ? Math.round((src + trg) / 2 / 10) : 0;
      correlations.push({
        source: s,
        target: t,
        correlation: Math.min(95, baseCorrelation),
        description: d,
      });
    }

    return correlations;
  }

  private computeTrend(history: HistoricalEntry[]): 'improving' | 'stable' | 'deteriorating' {
    if (history.length < 2) return 'stable';
    const recent = history.slice(-3);
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    const diff = last - first;
    if (diff >= 4) return 'deteriorating';
    if (diff <= -4) return 'improving';
    return 'stable';
  }

  private computeConfidence(input: RiskInput, categories: Record<string, RiskAnalysis>): number {
    const factorCount = input.factors?.length || 0;
    const histCount = input.historicalData?.length || 0;

    if (factorCount === 0 && histCount === 0) return 25;
    let confidence = 40;
    if (factorCount > 0) confidence += Math.min(30, factorCount * 3);
    if (histCount > 3) confidence += 15;
    if (histCount > 10) confidence += 15;

    return Math.min(95, confidence);
  }

  private computeBenchmarkTrend(categories: Record<string, RiskAnalysis>): 'improving' | 'stable' | 'deteriorating' {
    const trends = Object.values(categories).map((c) => c.trend);
    const improving = trends.filter((t) => t === 'improving').length;
    const deteriorating = trends.filter((t) => t === 'deteriorating').length;
    if (deteriorating > improving) return 'deteriorating';
    if (improving > deteriorating) return 'improving';
    return 'stable';
  }

  scoreToLevel(score: number): RiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendations(
    categories: Record<string, RiskAnalysis>,
    level: RiskLevel,
    invisibleRiskIndex: number,
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    for (const [cat, analysis] of Object.entries(categories)) {
      if (analysis.riskScore >= 70) {
        recs.push({
          priority: 'CRITICAL',
          category: cat as RiskCategory,
          message: `Intervención inmediata requerida en riesgo ${cat}: score ${analysis.riskScore}/100`,
          impact: 95,
        });
      } else if (analysis.riskScore >= 50) {
        recs.push({
          priority: 'HIGH',
          category: cat as RiskCategory,
          message: `Implementar medidas correctivas en ${cat}: score ${analysis.riskScore}/100`,
          impact: 75,
        });
      } else if (analysis.riskScore >= 35) {
        recs.push({
          priority: 'MEDIUM',
          category: cat as RiskCategory,
          message: `Monitorear riesgo ${cat}: score ${analysis.riskScore}/100`,
          impact: 50,
        });
      }
    }

    if (invisibleRiskIndex > 50) {
      recs.push({
        priority: 'HIGH',
        category: 'operational',
        message: `Riesgo invisible elevado (${invisibleRiskIndex}/100). Revisar señales débiles organizacionales`,
        impact: 80,
      });
    }

    if (level === 'CRITICAL') {
      recs.push({
        priority: 'CRITICAL',
        category: 'strategic',
        message: 'Se requiere revisión ejecutiva inmediata del perfil de riesgo organizacional',
        impact: 100,
      });
    }

    if (recs.length === 0) {
      recs.push({
        priority: 'LOW',
        category: 'operational',
        message: 'Perfil de riesgo dentro de parámetros aceptables. Continuar monitoreo rutinario.',
        impact: 20,
      });
    }

    return recs.sort((a, b) => b.impact - a.impact);
  }
}
