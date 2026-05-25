export interface AnomalyInput {
  scores: { date: string; value: number }[];
  events: { type: string; timestamp: string; userId?: string; metadata?: Record<string, any> }[];
  metrics: { name: string; value: number; timestamp: string }[];
  userBehavior: { userId: string; action: string; timestamp: string; resource?: string }[];
  config?: {
    sensitivity?: number;
    windowSize?: number;
    baselinePeriod?: number;
  };
}

export interface AnomalyResult {
  scoreAnomalies: ScoreAnomaly[];
  eventAnomalies: EventAnomaly[];
  behavioralAnomalies: BehavioralAnomaly[];
  organizationalAnomalies: OrganizationalAnomaly[];
  anomalyScore: number;
  anomalyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

export interface ScoreAnomaly {
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

export interface EventAnomaly {
  type: string;
  description: string;
  frequency: number;
  expectedFrequency: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeframe: string;
}

export interface BehavioralAnomaly {
  userId: string;
  pattern: string;
  description: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
}

export interface OrganizationalAnomaly {
  pattern: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  indicators: string[];
  description: string;
}

export class AnomalyDetectionEngine {
  private readonly DEFAULT_SENSITIVITY = 2.0;
  private readonly DEFAULT_WINDOW = 7;

  detect(input: AnomalyInput): AnomalyResult {
    const sensitivity = input.config?.sensitivity ?? this.DEFAULT_SENSITIVITY;

    const scoreAnomalies = this.detectScoreAnomalies(input.scores, sensitivity);
    const eventAnomalies = this.detectEventAnomalies(input.events);
    const behavioralAnomalies = this.detectBehavioralAnomalies(input.userBehavior);
    const organizationalAnomalies = this.detectOrganizationalAnomalies(input);

    const allAnomalies = scoreAnomalies.length + eventAnomalies.length + behavioralAnomalies.length + organizationalAnomalies.length;
    const anomalyScore = Math.min(100, allAnomalies * 12 + scoreAnomalies.reduce((s, a) => s + this.severityWeight(a.severity), 0));
    const anomalyLevel = anomalyScore >= 70 ? 'CRITICAL' : anomalyScore >= 50 ? 'HIGH' : anomalyScore >= 25 ? 'MEDIUM' : 'LOW';

    return {
      scoreAnomalies,
      eventAnomalies,
      behavioralAnomalies,
      organizationalAnomalies,
      anomalyScore,
      anomalyLevel,
      timestamp: new Date().toISOString(),
    };
  }

  private detectScoreAnomalies(scores: { date: string; value: number }[], sensitivity: number): ScoreAnomaly[] {
    if (scores.length < 3) return [];

    const values = scores.map(s => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + sensitivity * stdDev;

    return scores
      .filter(s => s.value > threshold || s.value < mean - sensitivity * stdDev)
      .map(s => ({
        metric: 'risk_score',
        value: s.value,
        expected: Math.round(mean),
        deviation: Math.round(((s.value - mean) / (mean || 1)) * 100),
        severity: (Math.abs(s.value - mean) > 2 * stdDev ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
        timestamp: s.date,
      }));
  }

  private detectEventAnomalies(events: { type: string; timestamp: string }[]): EventAnomaly[] {
    if (events.length < 5) return [];

    const typeCounts = new Map<string, number>();
    for (const e of events) {
      typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
    }

    const avgCount = Array.from(typeCounts.values()).reduce((a, b) => a + b, 0) / typeCounts.size;
    const anomalies: EventAnomaly[] = [];

    for (const [type, count] of typeCounts) {
      if (count > avgCount * 3) {
        anomalies.push({
          type,
          description: `Frecuencia anómala de eventos tipo "${type}"`,
          frequency: count,
          expectedFrequency: Math.round(avgCount),
          severity: count > avgCount * 5 ? 'CRITICAL' : 'HIGH',
          timeframe: `${events.length} eventos analizados`,
        });
      }
    }

    return anomalies;
  }

  private detectBehavioralAnomalies(behavior: { userId: string; action: string; timestamp: string; resource?: string }[]): BehavioralAnomaly[] {
    const anomalies: BehavioralAnomaly[] = [];

    // Group by user
    const userActions = new Map<string, { action: string; timestamp: string; resource?: string }[]>();
    for (const b of behavior) {
      if (!userActions.has(b.userId)) userActions.set(b.userId, []);
      userActions.get(b.userId)!.push(b);
    }

    for (const [userId, actions] of userActions) {
      if (actions.length < 3) continue;

      // Check for unusual time patterns
      const hourCounts = new Array(24).fill(0);
      for (const a of actions) {
        const hour = new Date(a.timestamp).getHours();
        hourCounts[hour]++;
      }

      const offHours = hourCounts.slice(0, 6).concat(hourCounts.slice(22)).reduce((a, b) => a + b, 0);
      const totalActions = actions.length;
      const offHourRatio = offHours / totalActions;

      if (offHourRatio > 0.4 && totalActions > 5) {
        anomalies.push({
          userId,
          pattern: 'Off-Hours Activity',
          description: `${Math.round(offHourRatio * 100)}% de actividad fuera de horario laboral`,
          confidence: Math.round(offHourRatio * 100),
          severity: offHourRatio > 0.7 ? 'HIGH' : 'MEDIUM',
          recommendations: ['Revisar patrón de actividad del usuario', 'Verificar si hay autorización para acceso fuera de horario'],
        });
      }

      // Check for access denied patterns
      const deniedCount = actions.filter(a => a.action === 'access_denied' || a.action === 'failed_login').length;
      if (deniedCount > 3) {
        anomalies.push({
          userId,
          pattern: 'Failed Access Attempts',
          description: `${deniedCount} intentos de acceso fallidos`,
          confidence: Math.min(90, deniedCount * 15),
          severity: deniedCount > 8 ? 'CRITICAL' : 'HIGH',
          recommendations: ['Revisar credenciales del usuario', 'Verificar si hay actividad de fuerza bruta'],
        });
      }
    }

    return anomalies;
  }

  private detectOrganizationalAnomalies(input: AnomalyInput): OrganizationalAnomaly[] {
    const anomalies: OrganizationalAnomaly[] = [];

    // Sudden score changes
    if (input.scores.length >= 2) {
      const last = input.scores[input.scores.length - 1].value;
      const prev = input.scores[input.scores.length - 2].value;
      const jump = Math.abs(last - prev);

      if (jump > 20) {
        anomalies.push({
          pattern: 'Sudden Risk Score Change',
          severity: jump > 35 ? 'CRITICAL' : 'HIGH',
          probability: Math.min(90, jump * 2),
          indicators: [`Score cambió de ${prev} a ${last} en un período (+${jump} pts)`],
          description: `Cambio abrupto en score de riesgo (${jump > 0 ? 'incremento' : 'decremento'}) de ${Math.abs(jump)} puntos`,
        });
      }
    }

    // High error rate
    const errorMetrics = input.metrics.filter(m => m.name === 'error_rate' || m.name === 'errors');
    if (errorMetrics.length > 0) {
      const avgError = errorMetrics.reduce((a, b) => a + b.value, 0) / errorMetrics.length;
      if (avgError > 0.1) {
        anomalies.push({
          pattern: 'Elevated Error Rate',
          severity: avgError > 0.25 ? 'CRITICAL' : 'HIGH',
          probability: Math.min(85, Math.round(avgError * 100 + 20)),
          indicators: [`Tasa de error promedio: ${Math.round(avgError * 100)}%`],
          description: 'Tasa de error del sistema elevada — posible degradación del servicio',
        });
      }
    }

    return anomalies;
  }

  private severityWeight(severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): number {
    const weights = { LOW: 5, MEDIUM: 15, HIGH: 30, CRITICAL: 50 };
    return weights[severity];
  }
}
