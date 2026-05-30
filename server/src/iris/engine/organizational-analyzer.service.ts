import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrganizationalAnalyzer {
  private readonly logger = new Logger(OrganizationalAnalyzer.name);

  async analyze(responses: any[]) {
    const signals: any[] = [];
    const groups = this.groupByCategory(responses);

    // Blind spot detection
    if (groups.has('blind_spot')) {
      const items = groups.get('blind_spot')!;
      const lowAwareness = items.filter(r => typeof r.response?.value === 'number' && r.response.value <= 2);
      if (lowAwareness.length > items.length * 0.3) {
        signals.push({
          type: 'organizational', category: 'weak_signal',
          title: 'Organizational blind spots detected',
          description: `${lowAwareness.length}/${items.length} responses indicate low awareness of critical risks. The organization may have significant blind spots.`,
          severity: lowAwareness.length > items.length * 0.5 ? 'high' : 'medium',
          confidence: 0.6 + (lowAwareness.length / items.length) * 0.3,
          metadata: { lowAwarenessRatio: lowAwareness.length / items.length },
        });
      }
    }

    // Protocol erosion
    if (groups.has('protocol_erosion')) {
      const items = groups.get('protocol_erosion')!;
      const protocolWeak = items.filter(r => typeof r.response?.value === 'number' && r.response.value <= 2);
      if (protocolWeak.length > items.length * 0.4) {
        signals.push({
          type: 'organizational', category: 'deterioration',
          title: 'Protocol erosion pattern',
          description: `${protocolWeak.length}/${items.length} responses indicate weak protocol adherence. Process discipline may be eroding.`,
          severity: protocolWeak.length > items.length * 0.6 ? 'high' : 'medium',
          confidence: 0.6,
          metadata: { weakProtocolRatio: protocolWeak.length / items.length },
        });
      }
    }

    // Key person dependency
    if (groups.has('key_person')) {
      const items = groups.get('key_person')!;
      const highDependency = items.filter(r => typeof r.response?.value === 'number' && r.response.value >= 4);
      if (highDependency.length > items.length * 0.3) {
        signals.push({
          type: 'organizational', category: 'dependency',
          title: 'Critical key person dependencies',
          description: `${highDependency.length}/${items.length} indicators show heavy reliance on specific individuals. Single-person dependencies represent significant operational risk.`,
          severity: highDependency.length > items.length * 0.5 ? 'critical' : 'high',
          confidence: 0.7,
          metadata: { dependencyRatio: highDependency.length / items.length },
        });
      }
    }

    // Cultural degradation
    if (groups.has('cultural_degradation')) {
      const items = groups.get('cultural_degradation')!;
      const cultureWeak = items.filter(r => typeof r.response?.value === 'number' && r.response.value <= 2);
      if (cultureWeak.length > items.length * 0.3) {
        signals.push({
          type: 'organizational', category: 'deterioration',
          title: 'Cultural degradation signals',
          description: `${cultureWeak.length}/${items.length} indicators suggest organizational culture deterioration. Potential impact on retention and collaboration.`,
          severity: cultureWeak.length > items.length * 0.5 ? 'high' : 'medium',
          confidence: 0.6,
          metadata: { weakCultureRatio: cultureWeak.length / items.length },
        });
      }
    }

    // Knowledge concentration
    if (groups.has('knowledge_concentration')) {
      const items = groups.get('knowledge_concentration')!;
      const concentrated = items.filter(r => typeof r.response?.value === 'number' && r.response.value >= 4);
      if (concentrated.length > items.length * 0.3) {
        signals.push({
          type: 'organizational', category: 'dependency',
          title: 'Knowledge concentration risk',
          description: `${concentrated.length}/${items.length} indicators suggest knowledge is concentrated in few individuals. This creates bus-factor risk.`,
          severity: concentrated.length > items.length * 0.5 ? 'critical' : 'high',
          confidence: 0.65,
          metadata: { concentrationRatio: concentrated.length / items.length },
        });
      }
    }

    return signals;
  }

  private groupByCategory(responses: any[]) {
    const map = new Map<string, typeof responses>();
    for (const r of responses) {
      if (!map.has(r.question.category)) {
        map.set(r.question.category, []);
      }
      map.get(r.question.category)!.push(r as any);
    }
    return map;
  }
}
