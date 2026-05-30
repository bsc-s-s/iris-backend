import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PatternDetector {
  private readonly logger = new Logger(PatternDetector.name);

  async detectPatterns(responses: { question: { category: string; subCategory?: string; weight: number; depth: number }; response: any }[]) {
    const signals: any[] = [];

    // Contradictions across related categories
    const categoryResponses = this.groupByCategory(responses);
    for (const [cat, items] of categoryResponses) {
      if (items.length < 2) continue;
      const values = items.map(i => typeof i.response?.value === 'number' ? i.response.value : 3);
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const variance = values.reduce((a: number, v: number) => a + Math.pow(v - avg, 2), 0) / values.length;
      if (variance > 2.0) {
        signals.push({
          type: 'pattern', category: 'contradiction',
          title: 'Contradictory responses in ' + cat.replace('_', ' '),
          description: `Variance of ${variance.toFixed(2)} detected across ${items.length} responses in the ${cat.replace('_', ' ')} dimension. This may indicate underlying tension or misalignment.`,
          severity: variance > 3.5 ? 'high' : 'medium',
          confidence: Math.min(0.5 + variance * 0.1, 0.95),
          metadata: { category: cat, variance, responseCount: items.length },
        });
      }
    }

    // Extremes analysis
    const numericResponses = responses.filter(r => typeof r.response?.value === 'number' && r.question.depth >= 2);
    const allValues = numericResponses.map(r => r.response.value);
    if (allValues.length > 5) {
      const extremes = allValues.filter(v => v === 1 || v === 5);
      const extremeRatio = extremes.length / allValues.length;
      if (extremeRatio > 0.4) {
        signals.push({
          type: 'pattern', category: 'anomaly',
          title: 'Extreme response pattern detected',
          description: `${(extremeRatio * 100).toFixed(0)}% of responses are extreme values (1 or 5), suggesting polarization or potential bias in responses.`,
          severity: extremeRatio > 0.6 ? 'high' : 'medium',
          confidence: Math.min(0.5 + extremeRatio * 0.4, 0.9),
          metadata: { extremeRatio, extremeCount: extremes.length, totalCount: allValues.length },
        });
      }
    }

    // Consistency pattern
    const bySubCategory = new Map<string, number[]>();
    for (const r of responses) {
      const sub = r.question.subCategory || r.question.category;
      if (typeof r.response?.value === 'number') {
        if (!bySubCategory.has(sub)) bySubCategory.set(sub, []);
        bySubCategory.get(sub)!.push(r.response.value);
      }
    }
    for (const [sub, vals] of bySubCategory) {
      if (vals.length >= 3) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const stdDev = Math.sqrt(vals.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / vals.length);
        if (stdDev < 0.5 && avg > 4) {
          signals.push({
            type: 'pattern', category: 'weak_signal',
            title: 'Consistently high scores may indicate overconfidence',
            description: `Responses in '${sub}' are consistently rated high (avg: ${avg.toFixed(1)}) with low variance. This may indicate overconfidence or social desirability bias.`,
            severity: 'low',
            confidence: 0.4 + (1 - stdDev) * 0.3,
            metadata: { subCategory: sub, average: avg, stdDev, count: vals.length },
          });
        }
      }
    }

    return signals;
  }

  async analyzeTextContent(text: string) {
    const signals: any[] = [];
    const lower = text.toLowerCase();

    const riskPatterns = [
      { keyword: 'single point of failure', severity: 'high', category: 'dependency', label: 'Single point of failure identified' },
      { keyword: 'no backup', severity: 'high', category: 'fragility', label: 'No backup process in place' },
      { keyword: 'only one person', severity: 'high', category: 'key_person', label: 'Key person dependency' },
      { keyword: 'burnout', severity: 'high', category: 'cultural', label: 'Burnout signals detected' },
      { keyword: 'manual process', severity: 'medium', category: 'operational', label: 'Manual process risk' },
      { keyword: 'no documentation', severity: 'medium', category: 'governance', label: 'Documentation gap' },
      { keyword: 'outdated', severity: 'medium', category: 'fragility', label: 'Outdated systems or processes' },
      { keyword: 'no one knows', severity: 'critical', category: 'knowledge', label: 'Knowledge concentration risk' },
      { keyword: 'shadow it', severity: 'high', category: 'governance', label: 'Shadow IT detected' },
      { keyword: 'not compliant', severity: 'high', category: 'governance', label: 'Compliance gap detected' },
      { keyword: 'we always', severity: 'low', category: 'overconfidence', label: 'Potential overconfidence pattern' },
      { keyword: 'never happened', severity: 'low', category: 'overconfidence', label: 'Historical fallacy signal' },
      { keyword: 'too busy', severity: 'medium', category: 'cultural', label: 'Capacity strain indicator' },
    ];

    for (const pattern of riskPatterns) {
      if (lower.includes(pattern.keyword)) {
        signals.push({
          type: 'pattern', category: pattern.category,
          title: pattern.label,
          description: `Document contains language suggesting ${pattern.category} risk: "${pattern.keyword}"`,
          severity: pattern.severity,
          confidence: 0.7,
        });
      }
    }

    // Overconfidence detection
    const overconfidentPhrases = ['certainly', 'absolutely', 'never', 'always', 'impossible', 'guaranteed'];
    const overconfCount = overconfidentPhrases.filter(p => text.toLowerCase().includes(p)).length;
    if (overconfCount >= 2) {
      signals.push({
        type: 'pattern', category: 'overconfidence',
        title: 'Overconfidence language detected',
        description: `Document uses ${overconfCount} absolute terms, which may indicate organizational overconfidence.`,
        severity: overconfCount >= 4 ? 'medium' : 'low',
        confidence: 0.5 + overconfCount * 0.1,
      });
    }

    return signals;
  }

  private groupByCategory(responses: any[]) {
    const map = new Map<string, typeof responses>();
    for (const r of responses) {
      const cat = r.question.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r as any);
    }
    return map;
  }
}
