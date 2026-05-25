import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

interface PlanRequest {
  organizationId: string;
  assessmentId?: string;
  scope: 'full' | 'quick' | 'compliance';
  timeframeMonths: number;
}

@Injectable()
export class SecurityPlanningService {
  private readonly logger = new Logger(SecurityPlanningService.name);

  constructor(private prisma: PrismaService) {}

  async generatePlan(request: PlanRequest) {
    const org = await this.prisma.organization.findUnique({
      where: { id: request.organizationId },
      include: { protocols: true, assessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const latestAssessment = request.assessmentId
      ? await this.prisma.assessment.findUnique({ where: { id: request.assessmentId }, include: { vulnerabilities: true } })
      : org?.assessments[0];

    const scores = latestAssessment?.scores as any;
    const plan = {
      id: uuid(),
      organization: org?.name,
      generatedAt: new Date().toISOString(),
      scope: request.scope,
      timeframeMonths: request.timeframeMonths,
      executiveSummary: this.generateSummary(scores, request),
      strategicObjectives: this.generateObjectives(scores, request),
      actionPlan: this.generateActionPlan(scores, request),
      milestones: this.generateMilestones(request.timeframeMonths),
      budget: this.estimateBudget(scores, request),
      metrics: {
        kpis: [
          { name: 'Índice de Madurez de Seguridad', target: '> 4.0/5', current: scores?.overall?.avg || 0 },
          { name: 'Vulnerabilidades Críticas', target: '0', current: (latestAssessment as any)?.vulnerabilities?.length || 0 },
          { name: 'Protocolos Implementados', target: '100%', current: `${org?.protocols?.length || 0} activos` },
        ],
      },
    };

    return plan;
  }

  async getProtocols(organizationId: string) {
    return this.prisma.securityProtocol.findMany({
      where: { organizationId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateProtocol(id: string, data: { status?: string; effectiveness?: string; implementation?: any }) {
    return this.prisma.securityProtocol.update({ where: { id }, data });
  }

  private generateSummary(scores: any, request: PlanRequest): string {
    if (!scores) return 'Plan de seguridad basado en evaluación inicial. Complete una evaluación para obtener recomendaciones personalizadas.';
    const overall = scores.overall;
    return `Plan estratégico de seguridad con alcance ${request.scope} para ${request.timeframeMonths} meses. ` +
      `Basado en evaluación IRIS con score general de ${overall?.avg?.toFixed(1) || 'N/A'}/5 (severidad: ${overall?.severity || 'N/A'}). ` +
      `Se requiere atención prioritaria en las categorías con mayor nivel de riesgo.`;
  }

  private generateObjectives(scores: any, request: PlanRequest): Array<{ id: number; objective: string; priority: string }> {
    const objectives = [
      { id: 1, objective: 'Establecer gobierno de seguridad integral con políticas y procedimientos formalizados', priority: 'critical' },
      { id: 2, objective: 'Reducir el perfil de riesgo general a niveles aceptables (< 3.0/5)', priority: 'high' },
      { id: 3, objective: 'Implementar controles de seguridad física, lógica y operativa priorizados por riesgo', priority: 'high' },
      { id: 4, objective: 'Desarrollar capacidades de detección y respuesta a incidentes', priority: 'medium' },
      { id: 5, objective: 'Establecer programa de cumplimiento normativo y auditoría continua', priority: 'medium' },
    ];

    if (scores?.categories) {
      const highRiskCats = Object.entries(scores.categories)
        .filter(([_, d]: [string, any]) => d.severity === 'critical' || d.severity === 'high')
        .map(([cat]) => cat);

      if (highRiskCats.length > 0) {
        objectives.unshift({
          id: 0,
          objective: `Abordar riesgos críticos inmediatos en: ${highRiskCats.join(', ')}`,
          priority: 'critical',
        });
      }
    }

    return objectives;
  }

  private generateActionPlan(scores: any, request: PlanRequest): Array<{ phase: string; actions: string[]; timeframe: string }> {
    const phases = [
      {
        phase: 'Respuesta Inmediata',
        actions: ['Evaluación de riesgos crítica', 'Contención de vulnerabilidades críticas', 'Activación de protocolos de emergencia'],
        timeframe: 'Días 1-30',
      },
      {
        phase: 'Corto Plazo',
        actions: ['Implementación de controles prioritarios', 'Capacitación del personal clave', 'Establecimiento de gobierno de seguridad'],
        timeframe: 'Días 31-90',
      },
      {
        phase: 'Mediano Plazo',
        actions: ['Automatización de controles', 'Integración de sistemas de monitoreo', 'Simulacros y pruebas de respuesta'],
        timeframe: 'Meses 4-6',
      },
    ];

    if (request.timeframeMonths > 6) {
      phases.push({
        phase: 'Largo Plazo',
        actions: ['Maduración del programa de seguridad', 'Certificaciones (ISO 27001, etc.)', 'Mejora continua basada en métricas'],
        timeframe: `Meses 7-${request.timeframeMonths}`,
      });
    }

    return phases;
  }

  private generateMilestones(months: number): Array<{ month: number; milestone: string }> {
    const milestones: Array<{ month: number; milestone: string }> = [];
    for (let i = 1; i <= months; i += Math.max(1, Math.floor(months / 6))) {
      milestones.push({
        month: i,
        milestone: i <= 3 ? `Revisión de avances del plan - Mes ${i}` : `Evaluación de madurez - Mes ${i}`,
      });
    }
    return milestones;
  }

  private estimateBudget(scores: any, request: PlanRequest): { estimated: string; currency: string; breakdown: Array<{ item: string; amount: string }> } {
    const baseAmount = request.scope === 'full' ? 50000 : request.scope === 'compliance' ? 30000 : 10000;
    const multiplier = Math.max(1, request.timeframeMonths / 3);
    const total = Math.round(baseAmount * multiplier);

    return {
      estimated: `$${total.toLocaleString()} USD`,
      currency: 'USD',
      breakdown: [
        { item: 'Consultoría y evaluación', amount: `$${Math.round(total * 0.3).toLocaleString()}` },
        { item: 'Implementación de controles', amount: `$${Math.round(total * 0.4).toLocaleString()}` },
        { item: 'Tecnología y herramientas', amount: `$${Math.round(total * 0.2).toLocaleString()}` },
        { item: 'Capacitación y cambio cultural', amount: `$${Math.round(total * 0.1).toLocaleString()}` },
      ],
    };
  }
}
