export interface AnomalyResult {
  anomaliesDetected: boolean;
  anomalies: Anomaly[];
  patterns: string[];
  organizationalPatterns: OrganizationalPattern[];
  timestamp: string;
}

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  value: any;
  expected: any;
  timestamp: string;
}

export interface OrganizationalPattern {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  description: string;
  indicators: string[];
  recommendation: string;
}

export type AnomalyType =
  | 'unusual_login_time'
  | 'spike_error_rate'
  | 'unusual_access_pattern'
  | 'data_volume_anomaly'
  | 'frequency_anomaly'
  | 'insider_threat_indicator'
  | 'compliance_fatigue'
  | 'silent_escalation';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DetectionInput {
  userId?: string;
  events: SecurityEvent[];
  metrics: MetricPoint[];
  timeRange: { start: string; end: string };
  orgProfile?: {
    userCount: number;
    activeUsers: number;
    weakLeadership?: boolean;
    highTurnover?: boolean;
    smallIncidents?: number;
    fragmentedCommunication?: boolean;
    policyViolations?: number;
    lateAssessments?: number;
    ignoredRecommendations?: number;
  };
}

export interface SecurityEvent {
  type: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MetricPoint {
  metric: string;
  value: number;
  timestamp: string;
}

export class PatternDetectionEngine {
  private readonly WORK_HOURS = { start: 7, end: 19 };
  private readonly ANOMALY_THRESHOLD = 2.5;

  analyze(input: DetectionInput): AnomalyResult {
    const anomalies: Anomaly[] = [];
    const patterns: string[] = [];
    const organizationalPatterns: OrganizationalPattern[] = [];

    // Basic anomaly detection
    const loginAnomalies = this.detectUnusualLoginTimes(input.events);
    anomalies.push(...loginAnomalies);
    if (loginAnomalies.length > 0) patterns.push('unusual_login_time');

    const errorAnomalies = this.detectErrorSpikes(input.metrics);
    anomalies.push(...errorAnomalies);
    if (errorAnomalies.length > 0) patterns.push('spike_error_rate');

    const accessAnomalies = this.detectUnusualAccessPatterns(input.events);
    anomalies.push(...accessAnomalies);
    if (accessAnomalies.length > 0) patterns.push('unusual_access_pattern');

    const volumeAnomalies = this.detectDataVolumeAnomalies(input.metrics);
    anomalies.push(...volumeAnomalies);
    if (volumeAnomalies.length > 0) patterns.push('data_volume_anomaly');

    // Advanced organizational pattern detection
    const degradationPattern = this.detectOrganizationalDegradation(input);
    if (degradationPattern) organizationalPatterns.push(degradationPattern);

    const insiderThreat = this.detectInsiderThreat(input);
    if (insiderThreat) organizationalPatterns.push(insiderThreat);

    const complianceFatigue = this.detectComplianceFatigue(input);
    if (complianceFatigue) organizationalPatterns.push(complianceFatigue);

    const silentEscalation = this.detectSilentEscalation(input);
    if (silentEscalation) organizationalPatterns.push(silentEscalation);

    const governanceDecay = this.detectGovernanceDecay(input);
    if (governanceDecay) organizationalPatterns.push(governanceDecay);

    return {
      anomaliesDetected: anomalies.length > 0 || organizationalPatterns.length > 0,
      anomalies,
      patterns: [...new Set(patterns)],
      organizationalPatterns,
      timestamp: new Date().toISOString(),
    };
  }

  private detectUnusualLoginTimes(events: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const loginEvents = events.filter((e) => e.type === 'login' || e.type === 'auth');

    for (const event of loginEvents) {
      const hour = new Date(event.timestamp).getHours();
      if (hour < this.WORK_HOURS.start || hour >= this.WORK_HOURS.end) {
        anomalies.push({
          type: 'unusual_login_time',
          severity: hour >= 0 && hour < 5 ? 'HIGH' as AnomalySeverity : 'MEDIUM' as AnomalySeverity,
          description: `Login fuera de horario laboral a las ${hour}:00`,
          value: hour,
          expected: `${this.WORK_HOURS.start}-${this.WORK_HOURS.end}`,
          timestamp: event.timestamp,
        });
      }
    }

    return anomalies;
  }

  private detectErrorSpikes(metrics: MetricPoint[]): Anomaly[] {
    const errorMetrics = metrics.filter((m) => m.metric === 'error_rate' || m.metric === 'errors');
    if (errorMetrics.length < 2) return [];

    const values = errorMetrics.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
    const threshold = mean + this.ANOMALY_THRESHOLD * stdDev;

    return errorMetrics
      .filter((m) => m.value > threshold && m.value > mean * 2)
      .map((m) => ({
        type: 'spike_error_rate' as AnomalyType,
        severity: (m.value > threshold * 2 ? 'CRITICAL' : 'HIGH') as AnomalySeverity,
        description: `Incremento anómalo en tasa de error: ${m.value} (esperado: ~${Math.round(mean)})`,
        value: m.value,
        expected: Math.round(mean),
        timestamp: m.timestamp,
      }));
  }

  private detectUnusualAccessPatterns(events: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const accessEvents = events.filter((e) => e.type === 'access' || e.type === 'resource_access');

    const userAccessCounts = new Map<string, number>();
    for (const event of accessEvents) {
      const uid = event.userId || 'anonymous';
      userAccessCounts.set(uid, (userAccessCounts.get(uid) || 0) + 1);
    }

    const counts = Array.from(userAccessCounts.values());
    if (counts.length < 2) return anomalies;

    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(counts.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / counts.length);
    const threshold = mean + this.ANOMALY_THRESHOLD * stdDev;

    for (const [userId, count] of userAccessCounts) {
      if (count > threshold) {
        anomalies.push({
          type: 'unusual_access_pattern',
          severity: count > threshold * 2 ? 'CRITICAL' as AnomalySeverity : 'HIGH' as AnomalySeverity,
          description: `Usuario ${userId} tuvo ${count} accesos vs promedio de ${Math.round(mean)}`,
          value: count,
          expected: Math.round(mean),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return anomalies;
  }

  private detectDataVolumeAnomalies(metrics: MetricPoint[]): Anomaly[] {
    const volumeMetrics = metrics.filter((m) => m.metric === 'data_volume' || m.metric === 'throughput');
    if (volumeMetrics.length < 3) return [];

    const values = volumeMetrics.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const deviation = Math.abs(values[values.length - 1] - median);

    if (deviation > median * 0.5) {
      return [{
        type: 'data_volume_anomaly' as AnomalyType,
        severity: (deviation > median * 1.5 ? 'HIGH' : 'MEDIUM') as AnomalySeverity,
        description: `Volumen de datos anómalo: ${values[values.length - 1]} (mediana: ${Math.round(median)})`,
        value: values[values.length - 1],
        expected: Math.round(median),
        timestamp: volumeMetrics[volumeMetrics.length - 1].timestamp,
      }];
    }

    return [];
  }

  private detectOrganizationalDegradation(input: DetectionInput): OrganizationalPattern | null {
    const p = input.orgProfile;
    if (!p) return null;

    let score = 0;
    const indicators: string[] = [];

    if (p.weakLeadership) { score += 25; indicators.push('Liderazgo débil detectado'); }
    if (p.highTurnover) { score += 20; indicators.push('Alta rotación de personal'); }
    if (p.smallIncidents && p.smallIncidents > 5) { score += 20; indicators.push(`${p.smallIncidents} incidentes pequeños repetitivos`); }
    if (p.fragmentedCommunication) { score += 15; indicators.push('Comunicación fragmentada entre equipos'); }
    if (p.ignoredRecommendations && p.ignoredRecommendations > 3) { score += 15; indicators.push(`${p.ignoredRecommendations} recomendaciones ignoradas`); }

    if (score >= 40) {
      return {
        name: 'Organizational Degradation Pattern',
        severity: score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(95, score + 10),
        description: 'Degradación organizacional progresiva detectada. Múltiples indicadores de deterioro silencioso.',
        indicators,
        recommendation: 'Realizar revisión estructural de la organización. Evaluar clima laboral y canales de comunicación.',
      };
    }

    return null;
  }

  private detectInsiderThreat(input: DetectionInput): OrganizationalPattern | null {
    const p = input.orgProfile;
    if (!p) return null;

    const unusualLogins = input.events.filter((e) => {
      const h = new Date(e.timestamp).getHours();
      return (e.type === 'login' || e.type === 'auth') && (h < 6 || h >= 22);
    });

    let score = 0;
    const indicators: string[] = [];

    if (unusualLogins.length > 3) { score += 25; indicators.push(`${unusualLogins.length} accesos fuera de horario`); }
    if (p.policyViolations && p.policyViolations > 3) { score += 25; indicators.push(`${p.policyViolations} violaciones de política`); }
    if (p.highTurnover) { score += 15; indicators.push('Alta rotación — posible insatisfacción'); }
    if (p.ignoredRecommendations && p.ignoredRecommendations > 5) { score += 15; indicators.push('Patrón de ignorar directivas de seguridad'); }

    if (score >= 35) {
      return {
        name: 'Insider Threat Probability',
        severity: score >= 65 ? 'CRITICAL' : score >= 45 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(90, score + 5),
        description: 'Patrón de comportamiento que sugiere posible riesgo interno.',
        indicators,
        recommendation: 'Revisar accesos y comportamiento de usuarios identificados. Implementar monitoreo adicional.',
      };
    }

    return null;
  }

  private detectComplianceFatigue(input: DetectionInput): OrganizationalPattern | null {
    const p = input.orgProfile;
    if (!p) return null;

    let score = 0;
    const indicators: string[] = [];

    if (p.lateAssessments && p.lateAssessments > 2) { score += 25; indicators.push(`${p.lateAssessments} evaluaciones vencidas`); }
    if (p.ignoredRecommendations && p.ignoredRecommendations > 3) { score += 20; indicators.push('Recomendaciones de compliance ignoradas'); }
    if (p.policyViolations && p.policyViolations > 5) { score += 20; indicators.push('Múltiples violaciones de política recurrente'); }
    if (p.smallIncidents && p.smallIncidents > 8) { score += 15; indicators.push('Incidentes menores no resueltos acumulados'); }

    if (score >= 35) {
      return {
        name: 'Compliance Fatigue',
        severity: score >= 60 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(85, score + 10),
        description: 'Fatiga de compliance: la organización muestra desgaste en el mantenimiento de controles normativos.',
        indicators,
        recommendation: 'Automatizar controles de compliance. Reducir carga administrativa. Asignar responsables de seguimiento.',
      };
    }

    return null;
  }

  private detectSilentEscalation(input: DetectionInput): OrganizationalPattern | null {
    const p = input.orgProfile;
    if (!p) return null;

    let score = 0;
    const indicators: string[] = [];

    if (p.smallIncidents && p.smallIncidents > 3 && p.smallIncidents < 10) { score += 20; indicators.push('Incidentes pequeños no escalados'); }
    if (p.ignoredRecommendations && p.ignoredRecommendations > 2) { score += 20; indicators.push('Recomendaciones sin acción'); }
    if (p.lateAssessments && p.lateAssessments > 1) { score += 15; indicators.push('Evaluaciones retrasadas sin escalación'); }
    if (p.fragmentedCommunication) { score += 20; indicators.push('Comunicación fragmentada — riesgos no reportados'); }

    if (score >= 35) {
      return {
        name: 'Silent Escalation Risk',
        severity: score >= 55 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(85, score + 5),
        description: 'Riesgos están escalando silenciosamente sin ser detectados por los canales formales.',
        indicators,
        recommendation: 'Implementar canales de escalación automáticos. Revisar umbrales de alerta temprana.',
      };
    }

    return null;
  }

  private detectGovernanceDecay(input: DetectionInput): OrganizationalPattern | null {
    const p = input.orgProfile;
    if (!p) return null;

    let score = 0;
    const indicators: string[] = [];

    if (p.lateAssessments && p.lateAssessments > 3) { score += 20; indicators.push('Múltiples evaluaciones vencidas'); }
    if (p.ignoredRecommendations && p.ignoredRecommendations > 4) { score += 20; indicators.push('Recomendaciones acumuladas sin revisión'); }
    if (p.weakLeadership) { score += 20; indicators.push('Debilidad en liderazgo de gobernanza'); }
    if (p.policyViolations && p.policyViolations > 5) { score += 15; indicators.push('Violaciones de política recurrentes'); }

    if (score >= 35) {
      return {
        name: 'Governance Decay',
        severity: score >= 60 ? 'CRITICAL' : score >= 40 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(90, score),
        description: 'Deterioro del marco de gobernanza. La estructura de control está perdiendo efectividad.',
        indicators,
        recommendation: 'Revisar y actualizar marco de gobernanza. Implementar controles automatizados de cumplimiento.',
      };
    }

    return null;
  }
}
