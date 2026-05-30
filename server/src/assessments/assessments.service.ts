import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

const SEVERITY_THRESHOLDS = { low: 2, medium: 3.5, high: 4.5 };

function calculateSeverity(score: number): string {
  if (score >= SEVERITY_THRESHOLDS.high) return 'critical';
  if (score >= SEVERITY_THRESHOLDS.medium) return 'high';
  if (score >= SEVERITY_THRESHOLDS.low) return 'medium';
  return 'low';
}

@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, status?: string) {
    const where: any = { organizationId };
    if (status) where.status = status;
    return this.prisma.assessment.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { facility: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        facility: true,
        createdBy: { select: { id: true, name: true, email: true } },
        responses: true,
        vulnerabilities: true,
        simulations: true,
      },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');
    return assessment;
  }

  async create(dto: CreateAssessmentDto, userId: string, organizationId: string) {
    return this.prisma.assessment.create({
      data: {
        title: dto.title,
        facilityId: dto.facilityId,
        methodology: dto.methodology || 'iris-v5',
        createdById: userId,
        organizationId,
      },
    });
  }

  async getAreas() {
    const existing = await this.prisma.area.findFirst();
    if (!existing) {
      await this.seedAreas();
    }
    return this.prisma.area.findMany({
      orderBy: { order: 'asc' },
      include: {
        subAreas: {
          orderBy: { order: 'asc' },
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true, subAreaId: true },
            },
          },
        },
      },
    });
  }

  private async seedAreas() {
    const areas = [
      {
        name: 'Seguridad Física',
        nameEn: 'Physical Security',
        order: 1,
        subAreas: [
          {
            name: 'Seguridad física',
            nameEn: 'Physical Security',
            order: 1,
            questions: [
              { text: '¿Los accesos físicos a las instalaciones están controlados con credenciales, biometría o sistemas de identificación?', order: 1 },
              { text: '¿Existe un sistema de vigilancia perimetral y cámaras de seguridad en puntos críticos?', order: 2 },
              { text: '¿Se lleva un registro actualizado de visitantes y proveedores externos?', order: 3 },
              { text: '¿Las áreas restringidas tienen control de acceso adicional?', order: 4 },
            ],
          },
          {
            name: 'Seguridad operativa',
            nameEn: 'Operational Security',
            order: 2,
            questions: [
              { text: '¿Los procesos operativos críticos están documentados y actualizados?', order: 1 },
              { text: '¿Existen controles operativos para prevenir fallos en la cadena de valor?', order: 2 },
              { text: '¿Se realizan pruebas periódicas de los controles operativos?', order: 3 },
              { text: '¿El personal está capacitado en procedimientos operativos de seguridad?', order: 4 },
            ],
          },
          {
            name: 'Seguridad ejecutiva',
            nameEn: 'Executive Security',
            order: 3,
            questions: [
              { text: '¿El liderazgo ejecutivo participa activamente en la gestión de riesgos?', order: 1 },
              { text: '¿Existe un plan de sucesión para roles ejecutivos críticos?', order: 2 },
              { text: '¿Se realizan reuniones periódicas del comité de riesgos?', order: 3 },
              { text: '¿Los ejecutivos tienen capacitación en gestión de crisis?', order: 4 },
            ],
          },
          {
            name: 'Gestión de crisis',
            nameEn: 'Crisis Management',
            order: 4,
            questions: [
              { text: '¿Existe un plan de continuidad de negocio (BCP) documentado y probado?', order: 1 },
              { text: '¿El plan de recuperación ante desastres (DRP) se prueba al menos anualmente?', order: 2 },
              { text: '¿Existe un equipo de gestión de crisis designado y capacitado?', order: 3 },
              { text: '¿Se realizan simulacros de crisis periódicamente?', order: 4 },
            ],
          },
        ],
      },
      {
        name: 'Riesgo Económico',
        nameEn: 'Economic Risk',
        order: 2,
        subAreas: [
          {
            name: 'Resiliencia financiera',
            nameEn: 'Financial Resilience',
            order: 1,
            questions: [
              { text: '¿La organización tiene reservas financieras para operar al menos 6 meses sin ingresos?', order: 1 },
              { text: '¿Existe un presupuesto específico asignado a seguridad y gestión de riesgos?', order: 2 },
              { text: '¿Se realizan auditorías financieras periódicas por terceros independientes?', order: 3 },
              { text: '¿La organización tiene acceso a líneas de crédito o financiamiento de emergencia?', order: 4 },
            ],
          },
          {
            name: 'Dependencia',
            nameEn: 'Dependency',
            order: 2,
            questions: [
              { text: '¿La organización depende de un número limitado de clientes para la mayoría de sus ingresos?', order: 1 },
              { text: '¿Existen proveedores críticos cuya falla paralizaría las operaciones?', order: 2 },
              { text: '¿Se han identificado alternativas para cada proveedor o socio crítico?', order: 3 },
              { text: '¿La cadena de suministro está diversificada geográficamente?', order: 4 },
            ],
          },
          {
            name: 'Vulnerabilidades económicas',
            nameEn: 'Economic Vulnerabilities',
            order: 3,
            questions: [
              { text: '¿La organización está expuesta a fluctuaciones cambiarias o de tasas de interés?', order: 1 },
              { text: '¿Se monitorean indicadores económicos que afectan al sector?', order: 2 },
              { text: '¿Existen seguros contratados para cubrir riesgos económicos clave?', order: 3 },
              { text: '¿Se realizan pruebas de estrés financiero periódicamente?', order: 4 },
            ],
          },
        ],
      },
      {
        name: 'Geopolítico / Regulatorio',
        nameEn: 'Geopolitical & Regulatory',
        order: 3,
        subAreas: [
          {
            name: 'Exposición regulatoria',
            nameEn: 'Regulatory Exposure',
            order: 1,
            questions: [
              { text: '¿Se cumple con todas las regulaciones aplicables al sector y jurisdicción?', order: 1 },
              { text: '¿Existe un sistema de monitoreo de cambios regulatorios?', order: 2 },
              { text: '¿Las auditorías de cumplimiento se realizan al menos anualmente?', order: 3 },
              { text: '¿Se han identificado riesgos de incumplimiento con sanciones significativas?', order: 4 },
            ],
          },
          {
            name: 'Política',
            nameEn: 'Political',
            order: 2,
            questions: [
              { text: '¿Las operaciones están expuestas a inestabilidad política en algún país de operación?', order: 1 },
              { text: '¿Existen relaciones con entidades gubernamentales que representen riesgo reputacional?', order: 2 },
              { text: '¿Se monitorean cambios en políticas comerciales o aranceles?', order: 3 },
              { text: '¿La organización tiene planes de contingencia para cambios de gobierno?', order: 4 },
            ],
          },
          {
            name: 'Geoestratégica',
            nameEn: 'Geostrategic',
            order: 3,
            questions: [
              { text: '¿Las operaciones internacionales están expuestas a conflictos geopolíticos?', order: 1 },
              { text: '¿Se monitorean sanciones económicas que afecten al negocio?', order: 2 },
              { text: '¿Existen activos en jurisdicciones de alto riesgo geopolítico?', order: 3 },
              { text: '¿La organización tiene capacidad para reubicar operaciones si es necesario?', order: 4 },
            ],
          },
        ],
      },
      {
        name: 'Organizacional y Humano',
        nameEn: 'Organizational & Human',
        order: 4,
        subAreas: [
          {
            name: 'Liderazgo',
            nameEn: 'Leadership',
            order: 1,
            questions: [
              { text: '¿La estructura organizacional está claramente definida y comunicada?', order: 1 },
              { text: '¿Existe una visión estratégica comunicada a todos los niveles?', order: 2 },
              { text: '¿Los líderes promueven una cultura de transparencia y rendición de cuentas?', order: 3 },
              { text: '¿Se realizan evaluaciones de desempeño del liderazgo periódicamente?', order: 4 },
            ],
          },
          {
            name: 'Cultura',
            nameEn: 'Culture',
            order: 2,
            questions: [
              { text: '¿Existe un código de conducta conocido y aplicado por todos?', order: 1 },
              { text: '¿Se fomenta activamente una cultura de reporte de incidentes sin represalias?', order: 2 },
              { text: '¿La organización mide el clima laboral y la satisfacción del personal?', order: 3 },
              { text: '¿Los valores organizacionales se reflejan en las decisiones diarias?', order: 4 },
            ],
          },
          {
            name: 'Resiliencia humana',
            nameEn: 'Human Resilience',
            order: 3,
            questions: [
              { text: '¿La rotación de personal es baja y controlada?', order: 1 },
              { text: '¿Existen programas de retención de talento clave?', order: 2 },
              { text: '¿El personal recibe capacitación continua en seguridad y riesgos?', order: 3 },
              { text: '¿Hay planes de contingencia para ausencia de personal crítico?', order: 4 },
            ],
          },
          {
            name: 'Puntos ciegos',
            nameEn: 'Blind Spots',
            order: 4,
            questions: [
              { text: '¿Existen mecanismos para desafiar el pensamiento grupal en la dirección?', order: 1 },
              { text: '¿Se realizan análisis de escenarios alternativos ("what if") regularmente?', order: 2 },
              { text: '¿La organización tiene canales anónimos para reportar riesgos no identificados?', order: 3 },
              { text: '¿Se revisan periódicamente los supuestos estratégicos del negocio?', order: 4 },
            ],
          },
        ],
      },
    ];

    for (const areaData of areas) {
      const { subAreas, ...areaFields } = areaData;
      const area = await this.prisma.area.create({ data: areaFields });
      for (const subData of subAreas) {
        const { questions, ...subFields } = subData;
        const subArea = await this.prisma.subArea.create({ data: { ...subFields, areaId: area.id } });
        for (const q of questions) {
          await this.prisma.question.create({ data: { ...q, subAreaId: subArea.id } });
        }
      }
    }

    this.logger.log('Areas, sub-areas and questions seeded successfully');
  }

  async selectAreas(assessmentId: string, subAreaIds: string[]) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    return this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { selectedSubAreaIds: subAreaIds, status: 'in_progress', startedAt: new Date() },
    });
  }

  async submitResponse(assessmentId: string, dto: SubmitResponseDto) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const existing = await this.prisma.assessmentResponse.findFirst({
      where: { assessmentId, questionId: dto.questionId },
    });

    if (existing) {
      return this.prisma.assessmentResponse.update({
        where: { id: existing.id },
        data: { response: dto.response },
      });
    }

    return this.prisma.assessmentResponse.create({
      data: {
        assessmentId,
        questionId: dto.questionId,
        response: dto.response,
      },
    });
  }

  async calculateScores(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { responses: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    const responses = assessment.responses;
    const questionIds = responses.map(r => r.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { subArea: { include: { area: true } } },
    });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    const areaScores: Record<string, { total: number; count: number; avg: number; severity: string }> = {};
    const subAreaScores: Record<string, { total: number; count: number; avg: number; severity: string }> = {};
    const vulnerabilities: Array<{ category: string; name: string; description: string; severity: string }> = [];

    for (const resp of responses) {
      const response = resp.response as any;
      const value = response.value ?? 0;
      const question = questionMap.get(resp.questionId);
      if (!question) continue;

      const subAreaName = question.subArea.name;
      const areaName = question.subArea.area.name;

      if (!subAreaScores[subAreaName]) subAreaScores[subAreaName] = { total: 0, count: 0, avg: 0, severity: 'low' };
      subAreaScores[subAreaName].total += value;
      subAreaScores[subAreaName].count += 1;
      subAreaScores[subAreaName].avg = subAreaScores[subAreaName].total / subAreaScores[subAreaName].count;
      subAreaScores[subAreaName].severity = calculateSeverity(subAreaScores[subAreaName].avg);

      if (!areaScores[areaName]) areaScores[areaName] = { total: 0, count: 0, avg: 0, severity: 'low' };
      areaScores[areaName].total += value;
      areaScores[areaName].count += 1;
      areaScores[areaName].avg = areaScores[areaName].total / areaScores[areaName].count;
      areaScores[areaName].severity = calculateSeverity(areaScores[areaName].avg);

      if (value >= 4) {
        vulnerabilities.push({
          category: areaName,
          name: `Alto riesgo en ${subAreaName}: ${question.text}`,
          description: `Se identificó un puntaje crítico (${value}/5) en ${subAreaName}`,
          severity: value >= 4.5 ? 'critical' : 'high',
        });
      }
    }

    const totalScore = Object.values(areaScores).reduce((sum, s) => sum + s.avg, 0) / (Object.keys(areaScores).length || 1);
    const overallSeverity = calculateSeverity(totalScore);

    const scoresJson = {
      areas: areaScores,
      subAreas: subAreaScores,
      overall: { avg: totalScore, severity: overallSeverity },
      totalResponses: responses.length,
    };

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        scores: scoresJson,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    for (const v of vulnerabilities) {
      await this.prisma.vulnerability.create({
        data: { ...v, assessmentId, status: 'open' },
      });
    }

    return scoresJson;
  }

  async generateSecurityPlan(assessmentId: string) {
    const assessment = await this.findOne(assessmentId);
    const scores = assessment.scores as any;
    if (!scores) throw new NotFoundException('Complete the assessment first');

    const recommendations: string[] = [];
    const protocols: Array<{ name: string; description: string; category: string; priority: string }> = [];

    for (const [area, data] of Object.entries(scores.areas || {})) {
      const d = data as any;
      if (d.severity === 'critical' || d.severity === 'high') {
        recommendations.push(`Implementar medidas correctivas urgentes en ${area} (severidad: ${d.severity})`);
        protocols.push({
          name: `Protocolo de mitigación - ${area}`,
          description: `Plan de acción para reducir riesgo en área ${area} de ${d.avg.toFixed(1)} a niveles aceptables`,
          category: area,
          priority: d.severity === 'critical' ? 'critical' : 'high',
        });
      } else if (d.severity === 'medium') {
        recommendations.push(`Monitorear y mejorar controles en ${area} (severidad: ${d.severity})`);
        protocols.push({
          name: `Protocolo de mejora - ${area}`,
          description: `Plan de mejora continua para área ${area}`,
          category: area,
          priority: 'medium',
        });
      }
    }

    const plan = {
      executiveSummary: `Evaluación IRIS completada. Score general: ${(scores.overall?.avg || 0).toFixed(1)}/5 (${scores.overall?.severity || 'unknown'}). Se identificaron ${protocols.length} áreas de mejora.`,
      recommendations,
      protocols,
      roadmap: protocols.map((p, i) => ({
        phase: i + 1,
        action: p.name,
        timeframe: p.priority === 'critical' ? '0-30 días' : p.priority === 'high' ? '30-60 días' : '60-90 días',
      })),
      generatedAt: new Date().toISOString(),
    };

    await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: { securityPlan: plan, recommendations },
    });

    for (const p of protocols) {
      await this.prisma.securityProtocol.create({
        data: { ...p, organizationId: assessment.organizationId },
      });
    }

    return plan;
  }

  async getTrends(organizationId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { organizationId, status: 'completed' },
      orderBy: { completedAt: 'asc' },
      select: { id: true, title: true, scores: true, completedAt: true },
    });

    const trends = assessments.map(a => {
      const s = a.scores as any;
      return {
        id: a.id,
        title: a.title,
        date: a.completedAt,
        overallScore: s?.overall?.avg || 0,
        severity: s?.overall?.severity || 'unknown',
      };
    });

    return { assessments: trends, count: trends.length };
  }

  async remove(id: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id } });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.prisma.assessmentResponse.deleteMany({ where: { assessmentId: id } });
    await this.prisma.vulnerability.deleteMany({ where: { assessmentId: id } });
    await this.prisma.simulation.deleteMany({ where: { assessmentId: id } });
    await this.prisma.assessment.delete({ where: { id } });

    return { ok: true, id };
  }

  async getFacilities(organizationId: string) {
    return this.prisma.facility.findMany({
      where: { organizationId },
      include: { _count: { select: { assessments: true } } },
    });
  }

  async createFacility(organizationId: string, data: { name: string; type: string; address?: string; country?: string; city?: string }) {
    return this.prisma.facility.create({ data: { ...data, organizationId } });
  }
}
