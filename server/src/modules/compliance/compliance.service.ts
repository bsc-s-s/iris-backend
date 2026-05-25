export interface ComplianceResult {
  framework: string;
  score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  controls: ControlStatus[];
  missingControls: string[];
  criticalGaps: string[];
  recommendations: string[];
  maturity: 'initial' | 'repeatable' | 'defined' | 'managed' | 'optimizing';
  auditReadiness: number;
  timestamp: string;
}

export interface ControlStatus {
  id: string;
  name: string;
  description: string;
  category: string;
  weight: number;
  implemented: boolean;
  score: number;
  evidence?: string;
  targetDate?: string;
}

export interface GapAnalysis {
  framework: string;
  totalControls: number;
  implementedCount: number;
  partialCount: number;
  missingCount: number;
  score: number;
  criticalGaps: string[];
  remediationEffort: 'low' | 'medium' | 'high';
  estimatedTimeline: string;
}

export interface ComplianceHealth {
  overallScore: number;
  overallStatus: 'compliant' | 'partial' | 'non_compliant';
  frameworkCount: number;
  frameworks: ComplianceResult[];
  gapAnalysis: GapAnalysis[];
  criticalFindings: number;
  auditReadiness: number;
  maturityLevel: string;
  recommendations: string[];
  timestamp: string;
}

export class ComplianceEvaluator {
  private readonly GDPR_CONTROLS: ControlStatus[] = [
    { id: 'gdpr-01', name: 'Consentimiento explícito', description: 'Obtención y registro de consentimiento para procesamiento de datos', category: 'consent', weight: 12, implemented: false, score: 0 },
    { id: 'gdpr-02', name: 'Derecho al olvido', description: 'Mecanismo para eliminación de datos personales a solicitud', category: 'rights', weight: 10, implemented: false, score: 0 },
    { id: 'gdpr-03', name: 'Portabilidad de datos', description: 'Exportación de datos personales en formato estructurado', category: 'rights', weight: 8, implemented: false, score: 0 },
    { id: 'gdpr-04', name: 'Notificación de brechas', description: 'Procedimiento para notificar brechas de seguridad en 72h', category: 'breach', weight: 15, implemented: false, score: 0 },
    { id: 'gdpr-05', name: 'DPO designado', description: 'Delegado de Protección de Datos designado oficialmente', category: 'governance', weight: 10, implemented: false, score: 0 },
    { id: 'gdpr-06', name: 'Registro de actividades', description: 'Registro actualizado de actividades de procesamiento', category: 'records', weight: 10, implemented: false, score: 0 },
    { id: 'gdpr-07', name: 'Evaluación de impacto', description: 'DPIA realizada para procesamientos de alto riesgo', category: 'risk', weight: 12, implemented: false, score: 0 },
    { id: 'gdpr-08', name: 'Cifrado de datos', description: 'Datos personales cifrados en reposo y en tránsito', category: 'security', weight: 10, implemented: false, score: 0 },
    { id: 'gdpr-09', name: 'Minimización de datos', description: 'Principio de minimización aplicado a recolección de datos', category: 'privacy', weight: 8, implemented: false, score: 0 },
    { id: 'gdpr-10', name: 'Transferencias internacionales', description: 'Garantías adecuadas para transferencias a terceros países', category: 'transfers', weight: 5, implemented: false, score: 0 },
  ];

  private readonly ISO27001_CONTROLS: ControlStatus[] = [
    { id: 'iso-01', name: 'Política de seguridad', description: 'Política de seguridad de la información documentada y aprobada', category: 'policy', weight: 12, implemented: false, score: 0 },
    { id: 'iso-02', name: 'Organización interna', description: 'Estructura organizacional para gestión de seguridad', category: 'governance', weight: 10, implemented: false, score: 0 },
    { id: 'iso-03', name: 'Activos de información', description: 'Inventario y clasificación de activos de información', category: 'assets', weight: 10, implemented: false, score: 0 },
    { id: 'iso-04', name: 'Control de acceso', description: 'Política de control de acceso basada en roles', category: 'access', weight: 12, implemented: false, score: 0 },
    { id: 'iso-05', name: 'Cifrado', description: 'Política de cifrado para protección de información sensible', category: 'crypto', weight: 8, implemented: false, score: 0 },
    { id: 'iso-06', name: 'Seguridad física', description: 'Controles de seguridad física y perimetral', category: 'physical', weight: 8, implemented: false, score: 0 },
    { id: 'iso-07', name: 'Seguridad de RRHH', description: 'Controles de seguridad antes, durante y después del empleo', category: 'hr', weight: 10, implemented: false, score: 0 },
    { id: 'iso-08', name: 'Gestión de incidentes', description: 'Proceso documentado para gestión de incidentes de seguridad', category: 'incident', weight: 12, implemented: false, score: 0 },
    { id: 'iso-09', name: 'Continuidad de negocio', description: 'Plan de continuidad del negocio y recuperación ante desastres', category: 'bcm', weight: 10, implemented: false, score: 0 },
    { id: 'iso-10', name: 'Cumplimiento legal', description: 'Identificación y cumplimiento de requisitos legales aplicables', category: 'legal', weight: 8, implemented: false, score: 0 },
  ];

  private readonly NIST_CONTROLS: ControlStatus[] = [
    { id: 'nist-01', name: 'Identificación de activos', description: 'Inventario y clasificación de activos críticos', category: 'identify', weight: 10, implemented: false, score: 0 },
    { id: 'nist-02', name: 'Evaluación de riesgos', description: 'Proceso continuo de identificación y evaluación de riesgos', category: 'identify', weight: 12, implemented: false, score: 0 },
    { id: 'nist-03', name: 'Protección de datos', description: 'Cifrado, segmentación y controles de integridad', category: 'protect', weight: 10, implemented: false, score: 0 },
    { id: 'nist-04', name: 'Control de acceso', description: 'Mecanismos de autenticación y autorización basados en riesgos', category: 'protect', weight: 12, implemented: false, score: 0 },
    { id: 'nist-05', name: 'Concienciación y entrenamiento', description: 'Programa de capacitación en seguridad para todo el personal', category: 'protect', weight: 8, implemented: false, score: 0 },
    { id: 'nist-06', name: 'Monitoreo continuo', description: 'Detección y monitoreo de amenazas en tiempo real', category: 'detect', weight: 12, implemented: false, score: 0 },
    { id: 'nist-07', name: 'Anomalías y eventos', description: 'Detección de eventos anómalos mediante análisis automatizado', category: 'detect', weight: 10, implemented: false, score: 0 },
    { id: 'nist-08', name: 'Respuesta a incidentes', description: 'Plan documentado de respuesta a incidentes con equipo designado', category: 'respond', weight: 12, implemented: false, score: 0 },
    { id: 'nist-09', name: 'Recuperación', description: 'Plan de recuperación y continuidad de operaciones críticas', category: 'recover', weight: 8, implemented: false, score: 0 },
    { id: 'nist-10', name: 'Mejora continua', description: 'Proceso de mejora basado en lecciones aprendidas y métricas', category: 'recover', weight: 6, implemented: false, score: 0 },
  ];

  private readonly SOC2_CONTROLS: ControlStatus[] = [
    { id: 'soc2-01', name: 'Políticas de seguridad', description: 'Políticas documentadas de seguridad de la información', category: 'security', weight: 12, implemented: false, score: 0 },
    { id: 'soc2-02', name: 'Controles de acceso lógico', description: 'Autenticación multifactor y control de acceso basado en roles', category: 'access', weight: 12, implemented: false, score: 0 },
    { id: 'soc2-03', name: 'Disponibilidad del sistema', description: 'Monitoreo de disponibilidad y planes de continuidad', category: 'availability', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-04', name: 'Integridad del procesamiento', description: 'Validación de entradas/salidas y detección de errores', category: 'processing', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-05', name: 'Confidencialidad', description: 'Cifrado y controles de acceso para información confidencial', category: 'confidentiality', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-06', name: 'Privacidad', description: 'Recolección, uso y retención de datos personales conforme a políticas', category: 'privacy', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-07', name: 'Gestión de riesgos de vendors', description: 'Evaluación de riesgos de proveedores y terceros', category: 'vendor', weight: 8, implemented: false, score: 0 },
    { id: 'soc2-08', name: 'Monitoreo y detección', description: 'Sistemas de detección de intrusiones y monitoreo de logs', category: 'monitoring', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-09', name: 'Respuesta a incidentes', description: 'Proceso documentado de respuesta a incidentes de seguridad', category: 'incident', weight: 10, implemented: false, score: 0 },
    { id: 'soc2-10', name: 'Capacitación en seguridad', description: 'Programa anual de concienciación en seguridad', category: 'training', weight: 8, implemented: false, score: 0 },
  ];

  private readonly ESG_CONTROLS: ControlStatus[] = [
    { id: 'esg-01', name: 'Gobierno corporativo ESG', description: 'Estructura de gobierno para supervisión de riesgos ESG', category: 'governance', weight: 12, implemented: false, score: 0 },
    { id: 'esg-02', name: 'Gestión de riesgos climáticos', description: 'Identificación y mitigación de riesgos físicos y de transición climática', category: 'climate', weight: 10, implemented: false, score: 0 },
    { id: 'esg-03', name: 'Emisiones y huella de carbono', description: 'Medición, reporte y reducción de emisiones GHG', category: 'environmental', weight: 10, implemented: false, score: 0 },
    { id: 'esg-04', name: 'Derechos humanos', description: 'Políticas de derechos humanos y debida diligencia en cadena de suministro', category: 'social', weight: 10, implemented: false, score: 0 },
    { id: 'esg-05', name: 'Diversidad e inclusión', description: 'Políticas de diversidad, equidad e inclusión con métricas', category: 'social', weight: 8, implemented: false, score: 0 },
    { id: 'esg-06', name: 'Ciberseguridad ESG', description: 'Protección de datos ESG y resiliencia cibernética', category: 'security', weight: 12, implemented: false, score: 0 },
    { id: 'esg-07', name: 'Reportes de sostenibilidad', description: 'Reportes periódicos alineados con SASB/TCFD/GRI', category: 'reporting', weight: 10, implemented: false, score: 0 },
    { id: 'esg-08', name: 'Cadena de suministro responsable', description: 'Evaluación de riesgos ESG en proveedores críticos', category: 'supply_chain', weight: 10, implemented: false, score: 0 },
    { id: 'esg-09', name: 'Ética y compliance', description: 'Código de conducta, canal de denuncias y anticorrupción', category: 'ethics', weight: 10, implemented: false, score: 0 },
    { id: 'esg-10', name: 'Gestión de stakeholders', description: 'Compromiso con comunidades locales y grupos de interés', category: 'stakeholder', weight: 8, implemented: false, score: 0 },
  ];

  evaluateGDPR(existingControls?: string[]): ComplianceResult {
    return this.evaluate('GDPR', this.GDPR_CONTROLS, existingControls);
  }

  evaluateISO27001(existingControls?: string[]): ComplianceResult {
    return this.evaluate('ISO 27001', this.ISO27001_CONTROLS, existingControls);
  }

  evaluateNIST(existingControls?: string[]): ComplianceResult {
    return this.evaluate('NIST CSF', this.NIST_CONTROLS, existingControls);
  }

  evaluateSOC2(existingControls?: string[]): ComplianceResult {
    return this.evaluate('SOC 2', this.SOC2_CONTROLS, existingControls);
  }

  evaluateESG(existingControls?: string[]): ComplianceResult {
    return this.evaluate('ESG', this.ESG_CONTROLS, existingControls);
  }

  evaluateAll(existingControls?: Record<string, string[]>): ComplianceHealth {
    const frameworks = [
      this.evaluateGDPR(existingControls?.gdpr),
      this.evaluateISO27001(existingControls?.iso27001),
      this.evaluateNIST(existingControls?.nist),
      this.evaluateSOC2(existingControls?.soc2),
      this.evaluateESG(existingControls?.esg),
    ];

    const overallScore = Math.round(frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length);
    const totalCritical = frameworks.reduce((sum, f) => sum + f.criticalGaps.length, 0);
    const avgAuditReadiness = Math.round(frameworks.reduce((sum, f) => sum + f.auditReadiness, 0) / frameworks.length);
    const avgMaturity = this.computeOverallMaturity(frameworks.map(f => f.maturity));

    const gapAnalysis = frameworks.map(f => this.buildGapAnalysis(f));
    const allRecs = frameworks.flatMap(f => f.recommendations);

    const status = overallScore >= 80 ? 'compliant' as const : overallScore >= 40 ? 'partial' as const : 'non_compliant' as const;

    return {
      overallScore,
      overallStatus: status,
      frameworkCount: frameworks.length,
      frameworks,
      gapAnalysis,
      criticalFindings: totalCritical,
      auditReadiness: avgAuditReadiness,
      maturityLevel: avgMaturity,
      recommendations: allRecs.slice(0, 10),
      timestamp: new Date().toISOString(),
    };
  }

  private evaluate(framework: string, controls: ControlStatus[], existingControls?: string[]): ComplianceResult {
    const implementedSet = new Set(existingControls || []);
    const evaluated = controls.map((c) => ({
      ...c,
      implemented: implementedSet.has(c.id),
      score: implementedSet.has(c.id) ? 100 : 0,
    }));

    const totalWeight = evaluated.reduce((sum, c) => sum + c.weight, 0);
    const weightedScore = evaluated.reduce((sum, c) => sum + (c.implemented ? c.weight * 100 : 0), 0);
    const score = Math.round(weightedScore / (totalWeight || 1));

    const missingControls = evaluated.filter((c) => !c.implemented).map((c) => c.name);
    const criticalGaps = evaluated.filter((c) => !c.implemented && c.weight >= 10).map((c) => c.name);
    const implementedCount = evaluated.filter((c) => c.implemented).length;
    const pctImplemented = implementedCount / evaluated.length;

    const status = score >= 80 ? 'compliant' as const : score >= 40 ? 'partial' as const : 'non_compliant' as const;
    const maturity = this.computeMaturity(pctImplemented);
    const auditReadiness = Math.round(score * 0.7 + implementedCount * 3);

    return {
      framework,
      score,
      status,
      controls: evaluated,
      missingControls,
      criticalGaps,
      recommendations: this.generateRecs(framework, missingControls, criticalGaps),
      maturity,
      auditReadiness: Math.min(100, auditReadiness),
      timestamp: new Date().toISOString(),
    };
  }

  private buildGapAnalysis(result: ComplianceResult): GapAnalysis {
    const total = result.controls.length;
    const implemented = result.controls.filter(c => c.implemented).length;
    const partial = result.controls.filter(c => !c.implemented && c.weight >= 8).length;
    const missing = total - implemented - partial;

    const effort = result.score >= 80 ? 'low' as const : result.score >= 40 ? 'medium' as const : 'high' as const;
    const timeline = result.score >= 80 ? '3-6 meses' : result.score >= 40 ? '6-12 meses' : '12-24 meses';

    return {
      framework: result.framework,
      totalControls: total,
      implementedCount: implemented,
      partialCount: partial,
      missingCount: missing,
      score: result.score,
      criticalGaps: result.criticalGaps,
      remediationEffort: effort,
      estimatedTimeline: timeline,
    };
  }

  private computeMaturity(pctImplemented: number): 'initial' | 'repeatable' | 'defined' | 'managed' | 'optimizing' {
    if (pctImplemented >= 0.9) return 'optimizing';
    if (pctImplemented >= 0.7) return 'managed';
    if (pctImplemented >= 0.5) return 'defined';
    if (pctImplemented >= 0.3) return 'repeatable';
    return 'initial';
  }

  private computeOverallMaturity(maturities: string[]): string {
    const levels = ['initial', 'repeatable', 'defined', 'managed', 'optimizing'];
    const avgIdx = Math.round(maturities.reduce((sum, m) => sum + levels.indexOf(m), 0) / maturities.length);
    return levels[Math.min(avgIdx, 4)];
  }

  private generateRecs(framework: string, missing: string[], critical: string[]): string[] {
    const recs: string[] = [];
    if (missing.length === 0) {
      recs.push(`${framework}: Todos los controles implementados. Mantener mejora continua.`);
      return recs;
    }
    if (critical.length > 0) {
      recs.push(`[CRÍTICO] ${framework}: Implementar controles de alto peso: ${critical.slice(0, 3).join(', ')}`);
    }
    recs.push(`${framework}: ${missing.length} controles pendientes de ${missing.length + (missing.length > 0 ? 0 : 0)}`);
    recs.push(...missing.slice(0, 5).map(c => `Implementar: ${c}`));
    if (missing.length > 5) recs.push(`Y ${missing.length - 5} controles adicionales...`);
    return recs;
  }
}
