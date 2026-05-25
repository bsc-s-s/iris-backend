export interface AnomalyResult {
  anomaliesDetected: boolean;
  anomalies: Anomaly[];
  patterns: string[];
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

export type AnomalyType =
  | 'unusual_login_time'
  | 'spike_error_rate'
  | 'unusual_access_pattern'
  | 'data_volume_anomaly'
  | 'frequency_anomaly';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DetectionInput {
  userId?: string;
  events: SecurityEvent[];
  metrics: MetricPoint[];
  timeRange: { start: string; end: string };
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

    return {
      anomaliesDetected: anomalies.length > 0,
      anomalies,
      patterns: [...new Set(patterns)],
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
          severity: hour >= 0 && hour < 5 ? 'HIGH' : 'MEDIUM',
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
          severity: count > threshold * 2 ? 'CRITICAL' : 'HIGH',
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
}
