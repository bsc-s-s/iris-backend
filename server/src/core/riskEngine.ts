export interface RiskInput {
  assessmentId?: string;
  organizationId: string;
  categoryScores?: Record<string, number>;
  factors?: RiskFactor[];
  historicalData?: HistoricalEntry[];
}

export interface RiskFactor {
  name: string;
  severity: number;
  description: string;
  category: RiskCategory;
}

export type RiskCategory = 'operational' | 'financial' | 'security' | 'human' | 'geopolitical';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAnalysis {
  riskScore: number;
  riskLevel: RiskLevel;
  category: RiskCategory;
  factors: RiskFactor[];
  timestamp: string;
}

export interface RiskAssessmentResult {
  overallScore: number;
  overallLevel: RiskLevel;
  categories: Record<RiskCategory, RiskAnalysis>;
  factors: RiskFactor[];
  recommendations: string[];
}

export interface HistoricalEntry {
  date: string;
  score: number;
  category: RiskCategory;
}

export class RiskEngine {
  private readonly CATEGORY_WEIGHTS: Record<RiskCategory, number> = {
    operational: 0.25,
    financial: 0.20,
    security: 0.30,
    human: 0.15,
    geopolitical: 0.10,
  };

  private readonly SEVERITY_MAP: Record<string, RiskLevel> = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW',
  };

  calculateScore(input: RiskInput): RiskAssessmentResult {
    const categories = this.evaluateCategories(input);
    const allFactors = Object.values(categories).flatMap((c) => c.factors);
    const overallScore = this.computeOverallScore(categories);
    const overallLevel = this.scoreToLevel(overallScore);
    const recommendations = this.generateRecommendations(categories, overallLevel);

    return {
      overallScore,
      overallLevel,
      categories,
      factors: allFactors,
      recommendations,
    };
  }

  private evaluateCategories(input: RiskInput): Record<RiskCategory, RiskAnalysis> {
    const categoryKeys: RiskCategory[] = ['operational', 'financial', 'security', 'human', 'geopolitical'];
    const result = {} as Record<RiskCategory, RiskAnalysis>;

    for (const cat of categoryKeys) {
      const catFactors = (input.factors || []).filter((f) => f.category === cat);
      const catScore = input.categoryScores?.[cat] ?? this.computeCategoryScore(catFactors);
      const level = this.scoreToLevel(catScore);

      result[cat] = {
        riskScore: catScore,
        riskLevel: level,
        category: cat,
        factors: catFactors,
        timestamp: new Date().toISOString(),
      };
    }

    return result;
  }

  private computeCategoryScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 25;
    return Math.min(
      100,
      Math.round(factors.reduce((sum, f) => sum + f.severity, 0) / factors.length * 25),
    );
  }

  private computeOverallScore(categories: Record<RiskCategory, RiskAnalysis>): number {
    let weighted = 0;
    for (const [cat, analysis] of Object.entries(categories)) {
      weighted += analysis.riskScore * (this.CATEGORY_WEIGHTS[cat as RiskCategory] || 0.15);
    }
    return Math.min(100, Math.round(weighted));
  }

  scoreToLevel(score: number): RiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MEDIUM';
    return 'LOW';
  }

  levelToScore(level: RiskLevel): number {
    const map: Record<RiskLevel, number> = { LOW: 15, MEDIUM: 45, HIGH: 70, CRITICAL: 90 };
    return map[level];
  }

  private generateRecommendations(
    categories: Record<RiskCategory, RiskAnalysis>,
    level: RiskLevel,
  ): string[] {
    const recs: string[] = [];
    for (const [cat, analysis] of Object.entries(categories)) {
      if (analysis.riskScore >= 60) {
        recs.push(`Intervención urgente requerida en riesgo ${cat}: score ${analysis.riskScore}`);
      } else if (analysis.riskScore >= 35) {
        recs.push(`Monitoreo requerido en riesgo ${cat}: score ${analysis.riskScore}`);
      }
    }
    if (level === 'CRITICAL') {
      recs.push('Se requiere revisión ejecutiva inmediata del perfil de riesgo');
    }
    if (recs.length === 0) {
      recs.push('Perfil de riesgo dentro de parámetros aceptables. Continuar monitoreo rutinario.');
    }
    return recs;
  }
}
