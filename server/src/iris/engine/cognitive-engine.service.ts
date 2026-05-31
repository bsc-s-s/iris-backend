import { Injectable, Logger } from '@nestjs/common';
import { PatternDetector } from './pattern-detector.service';
import { BehavioralAnalyzer } from './behavioral-analyzer.service';
import { OrganizationalAnalyzer } from './organizational-analyzer.service';

@Injectable()
export class CognitiveEngine {
  private readonly logger = new Logger(CognitiveEngine.name);

  constructor(
    private patternDetector: PatternDetector,
    private behavioralAnalyzer: BehavioralAnalyzer,
    private organizationalAnalyzer: OrganizationalAnalyzer,
  ) {}

  async analyzeScanResponses(responses: any[]) {
    const [patternSignals, behavioralSignals, orgSignals] = await Promise.all([
      this.patternDetector.detectPatterns(responses),
      this.behavioralAnalyzer.analyze(responses),
      this.organizationalAnalyzer.analyze(responses),
    ]);

    const allSignals = [...patternSignals, ...behavioralSignals, ...orgSignals];
    const merged = this.mergeDuplicateSignals(allSignals);

    return {
      signals: merged,
      patterns: { contradictions: merged.filter(s => s.category === 'contradiction'), inconsistencies: merged.filter(s => s.category === 'inconsistency'), anomalies: merged.filter(s => s.category === 'anomaly') },
    };
  }

  async analyzeText(text: string) {
    return this.patternDetector.analyzeTextContent(text);
  }

  private mergeDuplicateSignals(signals: any[]) {
    const map = new Map<string, any>();
    for (const s of signals) {
      const key = `${s.category}:${s.title}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.confidence = Math.max(existing.confidence, s.confidence);
        existing.severity = this.maxSeverity(existing.severity, s.severity);
        existing.description += ` ${s.description}`;
      } else {
        map.set(key, { ...s });
      }
    }
    return Array.from(map.values());
  }

  private maxSeverity(a: string, b: string) {
    const order: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
    return (order[b] || 0) > (order[a] || 0) ? b : a;
  }
}
