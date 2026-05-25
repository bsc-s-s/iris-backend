export interface ComplianceResult {
  framework: string;
  score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  controls: ControlStatus[];
  missingControls: string[];
  recommendations: string[];
  timestamp: string;
}

export interface ControlStatus {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  score: number;
  evidence?: string;
}

export class ComplianceEvaluator {
  private readonly GDPR_CONTROLS: ControlStatus[] = [
    { id: 'gdpr-01', name: 'Consentimiento explícito', description: 'Obtención y registro de consentimiento para procesamiento de datos', implemented: false, score: 0 },
    { id: 'gdpr-02', name: 'Derecho al olvido', description: 'Mecanismo para eliminación de datos personales a solicitud', implemented: false, score: 0 },
    { id: 'gdpr-03', name: 'Portabilidad de datos', description: 'Exportación de datos personales en formato estructurado', implemented: false, score: 0 },
    { id: 'gdpr-04', name: 'Notificación de brechas', description: 'Procedimiento para notificar brechas de seguridad en 72h', implemented: false, score: 0 },
    { id: 'gdpr-05', name: 'DPO designado', description: 'Delegado de Protección de Datos designado oficialmente', implemented: false, score: 0 },
    { id: 'gdpr-06', name: 'Registro de actividades', description: 'Registro actualizado de actividades de procesamiento', implemented: false, score: 0 },
    { id: 'gdpr-07', name: 'Evaluación de impacto', description: 'DPIA realizada para procesamientos de alto riesgo', implemented: false, score: 0 },
    { id: 'gdpr-08', name: 'Cifrado de datos', description: 'Datos personales cifrados en reposo y en tránsito', implemented: false, score: 0 },
    { id: 'gdpr-09', name: 'Minimización de datos', description: 'Principio de minimización aplicado a recolección de datos', implemented: false, score: 0 },
    { id: 'gdpr-10', name: 'Transferencias internacionales', description: 'Garantías adecuadas para transferencias a terceros países', implemented: false, score: 0 },
  ];

  private readonly ISO27001_CONTROLS: ControlStatus[] = [
    { id: 'iso-01', name: 'Política de seguridad', description: 'Política de seguridad de la información documentada y aprobada', implemented: false, score: 0 },
    { id: 'iso-02', name: 'Organización interna', description: 'Estructura organizacional para gestión de seguridad', implemented: false, score: 0 },
    { id: 'iso-03', name: 'Activos de información', description: 'Inventario y clasificación de activos de información', implemented: false, score: 0 },
    { id: 'iso-04', name: 'Control de acceso', description: 'Política de control de acceso basada en roles', implemented: false, score: 0 },
    { id: 'iso-05', name: 'Cifrado', description: 'Política de cifrado para protección de información sensible', implemented: false, score: 0 },
    { id: 'iso-06', name: 'Seguridad física', description: 'Controles de seguridad física y perimetral', implemented: false, score: 0 },
    { id: 'iso-07', name: 'Seguridad de RRHH', description: 'Controles de seguridad antes, durante y después del empleo', implemented: false, score: 0 },
    { id: 'iso-08', name: 'Gestión de incidentes', description: 'Proceso documentado para gestión de incidentes de seguridad', implemented: false, score: 0 },
    { id: 'iso-09', name: 'Continuidad de negocio', description: 'Plan de continuidad del negocio y recuperación ante desastres', implemented: false, score: 0 },
    { id: 'iso-10', name: 'Cumplimiento legal', description: 'Identificación y cumplimiento de requisitos legales aplicables', implemented: false, score: 0 },
  ];

  evaluateGDPR(existingControls?: string[]): ComplianceResult {
    return this.evaluate('GDPR', this.GDPR_CONTROLS, existingControls);
  }

  evaluateISO27001(existingControls?: string[]): ComplianceResult {
    return this.evaluate('ISO 27001', this.ISO27001_CONTROLS, existingControls);
  }

  private evaluate(framework: string, controls: ControlStatus[], existingControls?: string[]): ComplianceResult {
    const evaluated = controls.map((c) => ({
      ...c,
      implemented: existingControls?.includes(c.id) || false,
      score: existingControls?.includes(c.id) ? 100 : 0,
    }));

    const implementedCount = evaluated.filter((c) => c.implemented).length;
    const score = Math.round((implementedCount / evaluated.length) * 100);
    const missingControls = evaluated.filter((c) => !c.implemented).map((c) => c.name);

    const status = score >= 80 ? 'compliant' as const : score >= 40 ? 'partial' as const : 'non_compliant' as const;

    return {
      framework,
      score,
      status,
      controls: evaluated,
      missingControls,
      recommendations: this.generateRecs(framework, missingControls),
      timestamp: new Date().toISOString(),
    };
  }

  private generateRecs(framework: string, missing: string[]): string[] {
    if (missing.length === 0) return [`${framework}: Todos los controles implementados`];
    return missing.map((ctrl) => `Implementar control: ${ctrl}`);
  }
}
