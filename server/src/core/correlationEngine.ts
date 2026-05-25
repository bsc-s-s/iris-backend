export interface CorrelationInput {
  categoryScores: Record<string, number>;
  incidents: { type: string; severity: string; timestamp: string }[];
  userActivity: { action: string; timestamp: string; userId?: string }[];
  metrics: { metric: string; value: number; timestamp: string }[];
  orgProfile?: {
    turnoverRate?: number;
    communicationScore?: number;
    leadershipStability?: number;
    policyViolations?: number;
    lateAssessments?: number;
  };
  historicalScores?: { date: string; score: number; category: string }[];
}

export interface CorrelationResult {
  correlations: CrossCorrelation[];
  compoundRisks: CompoundRisk[];
  weakSignals: WeakSignal[];
  timestamp: string;
}

export interface CrossCorrelation {
  source: string;
  target: string;
  coefficient: number;
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  lagDays?: number;
}

export interface CompoundRisk {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: number;
  contributingFactors: string[];
  description: string;
  recommendation: string;
}

export interface WeakSignal {
  signal: string;
  intensity: number;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  description: string;
}

export class CorrelationEngine {
  analyze(input: CorrelationInput): CorrelationResult {
    const correlations = this.computeCrossCorrelations(input);
    const compoundRisks = this.detectCompoundRisks(input);
    const weakSignals = this.detectWeakSignals(input);

    return {
      correlations,
      compoundRisks,
      weakSignals,
      timestamp: new Date().toISOString(),
    };
  }

  private computeCrossCorrelations(input: CorrelationInput): CrossCorrelation[] {
    const results: CrossCorrelation[] = [];
    const cats = input.categoryScores;

    const pairs = [
      { s: 'security', t: 'operational', desc: 'Brechas de seguridad interrumpen operaciones críticas' },
      { s: 'human', t: 'operational', desc: 'Rotación de personal erosiona capacidad operativa' },
      { s: 'financial', t: 'strategic', desc: 'Restricciones financieras limitan ejecución estratégica' },
      { s: 'compliance', t: 'reputational', desc: 'Fallos de compliance dañan reputación corporativa' },
      { s: 'human', t: 'security', desc: 'Cultura organizacional débil aumenta riesgo de seguridad' },
      { s: 'operational', t: 'financial', desc: 'Ineficiencias operativas generan pérdidas financieras' },
      { s: 'geopolitical', t: 'strategic', desc: 'Inestabilidad geopolítica afecta planes estratégicos' },
      { s: 'reputational', t: 'financial', desc: 'Daño reputacional impacta resultados financieros' },
    ];

    for (const { s, t, desc } of pairs) {
      const src = cats[s] ?? 25;
      const trg = cats[t] ?? 25;
      const base = src > 0 && trg > 0 ? Math.round((src + trg) / 20) : 0;
      const coefficient = Math.min(95, base);

      results.push({
        source: s,
        target: t,
        coefficient,
        strength: coefficient >= 70 ? 'strong' : coefficient >= 40 ? 'moderate' : 'weak',
        description: desc,
        lagDays: coefficient > 60 ? 7 : 14,
      });
    }

    return results;
  }

  private detectCompoundRisks(input: CorrelationInput): CompoundRisk[] {
    const risks: CompoundRisk[] = [];
    const cats = input.categoryScores;
    const p = input.orgProfile;

    const securityScore = cats.security ?? 25;
    const humanScore = cats.human ?? 25;
    const operationalScore = cats.operational ?? 25;
    const complianceScore = cats.compliance ?? 25;

    // Insider Risk: security + human + policy violations
    if (securityScore > 40 || humanScore > 40) {
      let score = (securityScore + humanScore) / 2;
      if (p?.policyViolations && p.policyViolations > 2) score += 15;
      if (p?.leadershipStability && p.leadershipStability < 50) score += 10;
      if (score > 35) {
        risks.push({
          name: 'Insider Risk Compound',
          severity: score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : 'MEDIUM',
          probability: Math.min(90, Math.round(score + 10)),
          contributingFactors: [
            ...(securityScore > 40 ? ['Control de acceso insuficiente'] : []),
            ...(humanScore > 40 ? ['Personal insatisfecho o desmotivado'] : []),
            ...(p?.policyViolations && p.policyViolations > 2 ? [`${p.policyViolations} violaciones de política`] : []),
          ],
          description: 'Combinación de debilidades en seguridad técnica y factor humano aumenta riesgo de amenazas internas',
          recommendation: 'Implementar monitoreo de comportamiento de usuarios (UEBA). Reforzar políticas de acceso y realizar revisiones periódicas.',
        });
      }
    }

    // Operational Instability: operational + human + low communication
    if (operationalScore > 35) {
      let score = operationalScore + (humanScore * 0.5);
      if (p?.communicationScore && p.communicationScore < 50) score += 15;
      if (p?.turnoverRate && p.turnoverRate > 20) score += 10;
      if (score > 40) {
        risks.push({
          name: 'Operational Instability',
          severity: score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : 'MEDIUM',
          probability: Math.min(85, Math.round(score + 5)),
          contributingFactors: [
            ...(operationalScore > 50 ? ['Procesos operativos frágiles'] : []),
            ...(humanScore > 40 ? ['Alta rotación o ausentismo'] : []),
            ...(p?.communicationScore && p.communicationScore < 50 ? ['Comunicación organizacional deficiente'] : []),
          ],
          description: 'Debilidad operativa combinada con factores humanos crea inestabilidad organizacional progresiva',
          recommendation: 'Fortalecer procesos operativos. Mejorar canales de comunicación. Implementar programas de retención.',
        });
      }
    }

    // Compliance + Governance compound
    if (complianceScore > 35) {
      let score = complianceScore;
      if (p?.lateAssessments && p.lateAssessments > 2) score += 15;
      if (p?.policyViolations && p.policyViolations > 3) score += 10;
      if (score > 40) {
        risks.push({
          name: 'Governance & Compliance Gap',
          severity: score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : 'MEDIUM',
          probability: Math.min(80, Math.round(score + 10)),
          contributingFactors: [
            ...(complianceScore > 50 ? ['Controles de compliance débiles'] : []),
            ...(p?.lateAssessments && p.lateAssessments > 2 ? [`${p.lateAssessments} evaluaciones vencidas`] : []),
          ],
          description: 'Brecha de gobernanza y compliance que expone a la organización a riesgos regulatorios',
          recommendation: 'Automatizar controles de compliance. Establecer calendario de evaluaciones. Asignar responsables de gobierno.',
        });
      }
    }

    return risks;
  }

  private detectWeakSignals(input: CorrelationInput): WeakSignal[] {
    const signals: WeakSignal[] = [];
    const catScores = input.categoryScores;

    const allScores = Object.values(catScores);
    const avg = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 25;
    const variance = allScores.length > 0
      ? allScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / allScores.length
      : 0;

    // Cross-category variance as weak signal
    if (variance > 400) {
      signals.push({
        signal: 'Categorical Risk Imbalance',
        intensity: Math.min(90, Math.round(variance / 10)),
        frequency: allScores.filter(s => s > avg * 1.3).length,
        trend: 'increasing',
        description: 'Desequilibrio significativo entre categorías de riesgo sugiere focos ciegos',
      });
    }

    // Incident frequency
    if (input.incidents.length > 3) {
      const highSeverity = input.incidents.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length;
      signals.push({
        signal: 'Incident Accumulation',
        intensity: Math.min(85, Math.round((input.incidents.length * 10) + (highSeverity * 15))),
        frequency: input.incidents.length,
        trend: highSeverity > input.incidents.length * 0.3 ? 'increasing' : 'stable',
        description: `${input.incidents.length} incidentes registrados, ${highSeverity} de alta severidad`,
      });
    }

    // Silent escalation - small incidents without response
    const smallIncidents = input.incidents.filter(i => i.severity === 'LOW' || i.severity === 'MEDIUM').length;
    if (smallIncidents > 5) {
      signals.push({
        signal: 'Silent Escalation',
        intensity: Math.min(75, smallIncidents * 8),
        frequency: smallIncidents,
        trend: 'increasing',
        description: `${smallIncidents} incidentes menores sin escalación formal — posible riesgo silencioso`,
      });
    }

    // User activity anomaly
    const unusualActions = input.userActivity.filter(a =>
      a.action.includes('unusual') || a.action.includes('failed') || a.action.includes('denied')
    ).length;
    if (unusualActions > 3) {
      signals.push({
        signal: 'Unusual User Activity',
        intensity: Math.min(80, unusualActions * 12),
        frequency: unusualActions,
        trend: 'increasing',
        description: `${unusualActions} acciones inusuales de usuarios detectadas`,
      });
    }

    return signals;
  }
}
