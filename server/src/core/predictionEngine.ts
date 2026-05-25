export interface ForecastInput {
  historicalScores: HistoricalScore[];
  organizationId: string;
  category?: string;
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
  insights: string[];
  timestamp: string;
}

export class PredictionEngine {
  private readonly TREND_WINDOW = 7;

  forecast(input: ForecastInput): ForecastResult {
    const scores = input.historicalScores;
    const trend = this.analyzeTrend(scores);
    const { alpha, beta } = this.computeTrendLine(scores);
    const confidence = this.computeConfidence(scores);

    const forecasts = {
      days_30: this.predict(scores, alpha, beta, 30),
      days_60: this.predict(scores, alpha, beta, 60),
      days_90: this.predict(scores, alpha, beta, 90),
    };

    const insights = this.generateInsights(scores, trend, forecasts);

    return {
      riskForecast: forecasts,
      trend,
      confidence,
      insights,
      timestamp: new Date().toISOString(),
    };
  }

  private predict(scores: HistoricalScore[], alpha: number, beta: number, daysAhead: number): number {
    if (scores.length === 0) return 50;
    const lastScore = scores[scores.length - 1].score;
    const predicted = Math.round(lastScore + beta * daysAhead + alpha * 0.1);
    return Math.min(100, Math.max(0, predicted));
  }

  private analyzeTrend(scores: HistoricalScore[]): 'improving' | 'stable' | 'deteriorating' {
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-this.TREND_WINDOW);
    const first = recent[0].score;
    const last = recent[recent.length - 1].score;
    const diff = last - first;

    if (diff >= 5) return 'deteriorating';
    if (diff <= -5) return 'improving';
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
    return 85;
  }

  private generateInsights(
    scores: HistoricalScore[],
    trend: string,
    forecasts: { days_30: number; days_60: number; days_90: number },
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

    insights.push(`Confianza en la predicción: ${this.computeConfidence(scores)}%`);

    return insights;
  }
}
