import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BehavioralAnalyzer {
  private readonly logger = new Logger(BehavioralAnalyzer.name);

  async analyze(responses: { response: any; latency?: number; hesitation?: number; corrections?: number }[]) {
    const signals: any[] = [];

    const latencies = responses.filter(r => r.latency != null).map(r => r.latency!);
    if (latencies.length > 5) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const fastResponses = latencies.filter(l => l < avgLatency * 0.3);
      const fastRatio = fastResponses.length / latencies.length;

      if (fastRatio > 0.3) {
        signals.push({
          type: 'behavioral', category: 'anomaly',
          title: 'Abnormally fast response pattern',
          description: `${(fastRatio * 100).toFixed(0)}% of responses were answered in less than 30% of the average time. Fast responses may indicate lack of thoughtful consideration.`,
          severity: fastRatio > 0.5 ? 'medium' : 'low',
          confidence: 0.4 + fastRatio * 0.4,
          metadata: { fastResponseRatio: fastRatio, avgLatencyMs: avgLatency, fastCount: fastResponses.length },
        });
      }
    }

    const withHesitation = responses.filter(r => (r.hesitation || 0) > 2);
    if (withHesitation.length > 2) {
      const hesitationCategories = new Set(withHesitation.map(r => (r as any).question?.category).filter(Boolean));
      if (hesitationCategories.size > 0) {
        signals.push({
          type: 'behavioral', category: 'weak_signal',
          title: 'Hesitation cluster detected',
          description: `Significant hesitation detected in ${withHesitation.length} responses across categories: ${Array.from(hesitationCategories).join(', ')}. May indicate sensitive or difficult areas.`,
          severity: 'medium',
          confidence: 0.6,
          metadata: { hesitationCount: withHesitation.length, categories: Array.from(hesitationCategories) },
        });
      }
    }

    const withCorrections = responses.filter(r => (r.corrections || 0) > 1);
    if (withCorrections.length > 2) {
      signals.push({
        type: 'behavioral', category: 'inconsistency',
        title: 'Multiple answer corrections detected',
        description: `${withCorrections.length} responses had multiple corrections. Repeated answer changes may indicate uncertainty or lack of clear processes.`,
        severity: 'medium',
        confidence: 0.5,
        metadata: { correctionCount: withCorrections.length },
      });
    }

    return signals;
  }
}
