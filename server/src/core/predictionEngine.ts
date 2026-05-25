export interface ForecastInput {
  historicalScores: HistoricalScore[];
  organizationId: string;
  category?: string;
  orgProfile?: {
    incidentTrend?: number;
    vulnerabilityCount?: number;
    protocolCoverage?: number;
    assessmentFrequency?: number;
  };
}

export interface HistoricalScore {
  date: string;
  score: number;
  category?: string;
}

export interface ForecastResult {
  riskForecast: {
    days_30: number;
    days_60: number;
    days_90: number;
  };
  trend: 'improving' | 'stable' | 'deteriorating';
  confidence: number;
  incidentProbability: {
    days_30: number;
    days_60: number;
    days_90: number;
  };
  earlyWarnings: EarlyWarning[];
  insights: string[];
  timestamp: string;
}

export interface EarlyWarning {
  type: 'threshold_breach' | 'acceleration' | 'volatility' | 'pattern_match';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  daysToEvent: number;
  probability: number;
}

export class PredictionEngine {
  private readonly TREND_WINDOW = 7;
  private readonly VOLATILITY_THRESHOLD = 0.15;

  forecast(input: ForecastInput): ForecastResult {
    const scores = input.historicalScores;
    const trend = this.analyzeTrend(scores);
    const { alpha, beta } = this.computeTrendLine(scores);
    const confidence = this.computeConfidence(scores);
    const volatility = this.computeVolatility(scores);

    const days30 = this.predict(scores, alpha, beta, 30, volatility);
    const days60 = this.predict(scores, alpha, beta, 60, volatility);
    const days90 = this.predict(scores, alpha, beta, 90, volatility);

    const incidentProbability = {
      days_30: this.computeIncidentProbability(scores, 30, days30),
      days_60: this.computeIncidentProbability(scores, 60, days60),
      days_90: this.computeIncidentProbability(scores, 90, days90),
    };

    const earlyWarnings = this.generateEarlyWarnings(scores, days30, days60, days90, volatility, input);
    const insights = this.generateInsights(scores, trend, { days_30: days30, days_60: days60, days_90: days90 }, earlyWarnings);

    return {
      riskForecast: { days_30: days30, days_60: days60, days_90: days90 },
      trend,
      confidence,
      incidentProbability,
      earlyWarnings,
      insights,
      timestamp: new Date().toISOString(),
    };
  }

  private predict(scores: HistoricalScore[], alpha: number, beta: number, daysAhead: number, volatility: number): number {
    if (scores.length === 0) return 50;
    const lastScore = scores[scores.length - 1].score;

    // Weighted prediction: linear trend + mean reversion
    const meanScore = scores.reduce((a, b) => a + b.score, 0) / scores.length;
    const trendComponent = lastScore + beta * daysAhead;
    const reversionComponent = meanScore * 0.1;
    const volatilityAdjustment = volatility * daysAhead * 0.5;

    let predicted = Math.round(trendComponent + reversionComponent + volatilityAdjustment);
    return Math.min(100, Math.max(0, predicted));
  }

  private analyzeTrend(scores: HistoricalScore[]): 'improving' | 'stable' | 'deteriorating' {
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-this.TREND_WINDOW);
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    const diff = last - first;

    // Weighted recent trend
    const weights = recent.map((_, i) => (i + 1) / recent.length);
    const weightedDiff = recent.slice(1).reduce((sum, s, i) => {
      return sum + (s.score - recent[i].score) * weights[i + 1];
    }, 0);

    if (weightedDiff >= 3) return 'deteriorating';
    if (weightedDiff <= -3) return 'improving';
    return 'stable';
  }

  private computeTrendLine(scores: HistoricalScore[]): { alpha: number; beta: number } {
    if (scores.length < 2) return { alpha: 0.5, beta: 0 };

    const n = scores.length;
    const indices = scores.map((_, i) => i + 1);
    const values = scores.map((s) => s.score);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const beta = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const alpha = (sumY - beta * sumX) / n;

    return { alpha: isNaN(alpha) ? 0.5 : alpha, beta: isNaN(beta) ? 0 : beta };
  }

  private computeConfidence(scores: HistoricalScore[]): number {
    if (scores.length < 3) return 30;
    if (scores.length < 7) return 50;
    if (scores.length < 14) return 70;
    if (scores.length < 30) return 82;
    return 90;
  }

  private computeVolatility(scores: HistoricalScore[]): number {
    if (scores.length < 3) return 0.1;

    const values = scores.map((s) => s.score);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev / (mean || 1);

    return Math.min(0.5, volatility);
  }

  private computeIncidentProbability(scores: HistoricalScore[], daysAhead: number, forecastScore: number): number {
    if (scores.length < 2) return 15;

    const recentScores = scores.slice(-5);
    const avgScore = recentScores.reduce((a, b) => a + b.score, 0) / recentScores.length;
    const trend = forecastScore - avgScore;

    // Higher score + positive trend = higher probability
    let probability = forecastScore * 0.3 + Math.max(0, trend) * 0.5;
    probability = probability * (1 + daysAhead * 0.01);

    return Math.min(95, Math.round(probability));
  }

  private generateEarlyWarnings(
    scores: HistoricalScore[],
    days30: number,
    days60: number,
    days90: number,
    volatility: number,
    input: ForecastInput,
  ): EarlyWarning[] {
    const warnings: EarlyWarning[] = [];

    // Threshold breach warnings
    if (days30 >= 70) {
      warnings.push({
        type: 'threshold_breach',
        severity: days30 >= 85 ? 'CRITICAL' : 'HIGH',
        message: `Riesgo proyectado superará umbral crítico (${days30}) en 30 días`,
        daysToEvent: 30,
        probability: Math.min(90, 60 + days30 * 0.3),
      });
    } else if (days60 >= 70) {
      warnings.push({
        type: 'threshold_breach',
        severity: 'HIGH',
        message: `Riesgo proyectado superará umbral crítico (${days60}) en 60 días`,
        daysToEvent: 60,
        probability: Math.min(85, 50 + days60 * 0.3),
      });
    }

    // Acceleration warning - trend is steepening
    if (scores.length >= 4) {
      const recent4 = scores.slice(-4);
      const firstHalf = (recent4[0].score + recent4[1].score) / 2;
      const secondHalf = (recent4[2].score + recent4[3].score) / 2;
      if (secondHalf - firstHalf > 10) {
        warnings.push({
          type: 'acceleration',
          severity: 'HIGH',
          message: 'Deterioro acelerado detectado: el riesgo empeora más rápido que la tendencia histórica',
          daysToEvent: 15,
          probability: 70,
        });
      }
    }

    // Volatility warning
    if (volatility > this.VOLATILITY_THRESHOLD) {
      warnings.push({
        type: 'volatility',
        severity: volatility > 0.3 ? 'HIGH' : 'MEDIUM',
        message: `Alta volatilidad en scores de riesgo (${Math.round(volatility * 100)}%). Posible inestabilidad organizacional`,
        daysToEvent: 45,
        probability: Math.round(volatility * 100 + 30),
      });
    }

    // Pattern match - low coverage
    const profile = input.orgProfile;
    if (profile && profile.protocolCoverage && profile.protocolCoverage < 50) {
      warnings.push({
        type: 'pattern_match',
        severity: 'MEDIUM',
        message: `Baja cobertura de protocolos (${profile.protocolCoverage}%). Correlación con aumento de riesgo`,
        daysToEvent: 60,
        probability: 65,
      });
    }

    return warnings;
  }

  private generateInsights(
    scores: HistoricalScore[],
    trend: string,
    forecasts: { days_30: number; days_60: number; days_90: number },
    warnings: EarlyWarning[],
  ): string[] {
    const insights: string[] = [];

    if (scores.length === 0) {
      insights.push('No hay datos históricos suficientes para generar predicciones');
      return insights;
    }

    if (trend === 'deteriorating') {
      insights.push(`Tendencia de riesgo empeorando. Proyección a 90 días: ${forecasts.days_90}/100`);
      if (forecasts.days_90 >= 70) {
        insights.push('ALERTA: Se proyecta nivel de riesgo crítico en 90 días si no se implementan medidas correctivas');
      }
    } else if (trend === 'improving') {
      insights.push(`Tendencia de riesgo mejorando. Proyección a 90 días: ${forecasts.days_90}/100`);
    } else {
      insights.push(`Riesgo estable. Proyección a 30 días: ${forecasts.days_30}/100`);
    }

    // Warning-based insights
    const highWarnings = warnings.filter((w) => w.severity === 'HIGH' || w.severity === 'CRITICAL');
    if (highWarnings.length > 0) {
      insights.push(`${highWarnings.length} alerta(s) temprana(s) activa(s) requieren atención inmediata`);
    }

    // Trend comparison
    if (scores.length >= 3) {
      const last3 = scores.slice(-3);
      const avg3 = last3.reduce((a, b) => a + b.score, 0) / 3;
      insights.push(`Score promedio últimos 3 períodos: ${Math.round(avg3)}/100`);
    }

    insights.push(`Confiabilidad de la predicción: ${this.computeConfidence(scores)}%`);

    return insights;
  }
}
