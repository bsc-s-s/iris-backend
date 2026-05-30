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
    try {
      const where: any = { organizationId };
      if (status) where.status = status;
      return await this.prisma.assessment.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, title: true, status: true, methodology: true, scores: true,
          createdAt: true, updatedAt: true, completedAt: true, facilityId: true, createdById: true,
          facility: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });
    } catch (e: any) {
      this.logger.error(`findAll error: ${e?.message || e}`);
      throw e;
    }
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
        protocols: true,
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
    try {
      const existing = await this.prisma.area.findFirst();
      if (!existing) {
        await this.seedAreas();
      }
      return await this.prisma.area.findMany({
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
    } catch (e: any) {
      this.logger.error(`getAreas error: ${e?.message || e}`);
      return [];
    }
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
        data: { ...p, type: 'plan_seguridad', organizationId: assessment.organizationId },
      });
    }

    return plan;
  }

  async generateProtocol(assessmentId: string, protocolType: string, organizationId: string) {
    const assessment = await this.findOne(assessmentId);
    const scores = assessment.scores as any;

    const templates: Record<string, { name: string; description: string; category: string; steps: string[] }> = {
      plan_autoproteccion: {
        name: 'Plan de Autoprotección',
        description: 'Plan integral de autoprotección para la organización, estableciendo medidas de seguridad pasiva y activa.',
        category: 'Plan de Seguridad',
        steps: [
          'Identificar y evaluar riesgos internos y externos de la organización.',
          'Establecer medidas de seguridad física: control de accesos, vigilancia perimetral, sistemas de alarma.',
          'Definir procedimientos de actuación ante emergencias y amenazas.',
          'Designar responsables y equipos de autoprotección por áreas o turnos.',
          'Implementar sistemas de comunicación interna para alertas y notificaciones.',
          'Realizar simulacros periódicos de autoprotección con todo el personal.',
          'Establecer protocolos de coordinación con servicios de emergencia externos.',
          'Revisar y actualizar el plan semestralmente o tras cada incidente significativo.',
        ],
      },
      plan_emergencia: {
        name: 'Plan de Emergencia',
        description: 'Plan de respuesta ante emergencias, definiendo roles, rutas de evacuación y procedimientos de actuación.',
        category: 'Plan de Emergencia',
        steps: [
          'Identificar tipos de emergencia potenciales según la actividad y ubicación de la organización.',
          'Definir organigrama de emergencia: director, jefes de sector, equipos de primera intervención.',
          'Establecer rutas de evacuación primarias y alternativas, señalizadas y despejadas.',
          'Designar puntos de reunión seguros externos e internos.',
          'Implementar sistemas de alerta y megafonía para comunicación en emergencias.',
          'Definir procedimientos para cada tipo de emergencia: incendio, inundación, sismo, amenaza.',
          'Establecer protocolo de comunicación con familiares y medios de comunicación.',
          'Programar simulacros trimestrales y ejercicios de mesa semestrales.',
        ],
      },
      plan_seguridad: {
        name: 'Plan de Seguridad',
        description: 'Plan director de seguridad de la organización, integrando todas las medidas y protocolos existentes.',
        category: 'Plan de Seguridad',
        steps: [
          'Realizar análisis de riesgos y vulnerabilidades de la organización.',
          'Definir política de seguridad corporativa aprobada por la dirección.',
          'Establecer organigrama de seguridad con responsabilidades claras.',
          'Implementar controles de acceso físico y lógico basados en el principio de mínimo privilegio.',
          'Desplegar sistemas de videovigilancia y detección perimetral.',
          'Establecer procedimientos de gestión de incidentes de seguridad.',
          'Implementar programa de concienciación y formación en seguridad para todo el personal.',
          'Realizar auditorías de seguridad internas y externas periódicamente.',
          'Establecer métricas e indicadores para medir la efectividad del plan.',
        ],
      },
      hipotesis_desastre_natural: {
        name: 'Protocolo ante Desastre Natural',
        description: 'Procedimiento de actuación ante desastres naturales como terremotos, inundaciones, huracanes o incendios forestales.',
        category: 'Protocolo de Emergencia',
        steps: [
          'Activar sistema de alerta temprana y comunicación masiva al personal.',
          'Ejecutar procedimientos de evacuación según el tipo de desastre (vertical para inundaciones, horizontal para terremotos).',
          'Verificar integridad estructural de las instalaciones antes de permitir el reingreso.',
          'Activar equipos de primera respuesta y brigadas de emergencia internas.',
          'Establecer centro de coordinación de emergencias con comunicaciones redundantes.',
          'Contactar con servicios de emergencia externos: bomberos, protección civil, ambulancias.',
          'Evaluar daños y activar plan de continuidad de negocio si es necesario.',
          'Realizar censo de personal y visitantes para verificar que todos están a salvo.',
        ],
      },
      hipotesis_atentado: {
        name: 'Protocolo ante Atentado',
        description: 'Procedimiento de actuación ante un atentado con explosivos o artefactos sospechosos.',
        category: 'Protocolo de Seguridad',
        steps: [
          'Activar protocolo de emergencia máximo y notificar a las autoridades competentes.',
          'Evacuar la zona de impacto y establecer perímetro de seguridad de 300 metros.',
          'NO manipular objetos sospechosos. No usar radios ni teléfonos cerca del artefacto.',
          'Activar equipos de búsqueda de artefactos secundarios en instalaciones.',
          'Establecer puesto de mando avanzado y punto de reunión alternativo.',
          'Coordinar con fuerzas y cuerpos de seguridad: Policía Nacional, Guardia Civil, TEDAX.',
          'Gestionar la comunicación con medios de forma centralizada y controlada.',
          'Preservar pruebas y facilitar la investigación policial posterior.',
        ],
      },
      hipotesis_tirador_activo: {
        name: 'Protocolo ante Tirador Activo',
        description: 'Procedimiento de actuación ante un incidente con tirador activo en las instalaciones.',
        category: 'Protocolo de Seguridad',
        steps: [
          'Activar alerta inmediata: "Código Rojo - Tirador Activo" por megafonía o sistema de alerta.',
          'Ejecutar procedimiento "Correr, Esconderse, Luchar": evacuar si es seguro, atrincherarse si no, forcejear como último recurso.',
          'Bloquear y barricar puertas con muebles, apagar luces, silenciar dispositivos móviles.',
          'NO abrir la puerta hasta recibir confirmación de las autoridades.',
          'Atención a heridos solo si es seguro, aplicar torniquetes y primeros auxilios básicos.',
          'Proporcionar a la policía información: ubicación, descripción del atacante, tipo de arma.',
          'Establecer punto de reunión secundario para supervivientes.',
          'Activar apoyo psicológico para afectados y testigos tras el incidente.',
        ],
      },
      hipotesis_toma_rehenes: {
        name: 'Protocolo ante Toma de Rehenes',
        description: 'Procedimiento de actuación durante una situación de toma de rehenes en las instalaciones.',
        category: 'Protocolo de Seguridad',
        steps: [
          'NO confrontar a los agresores. Mantener la calma y seguir sus instrucciones.',
          'Activar alerta silenciosa si es posible sin ser detectado.',
          'Aislar la zona y evacuar áreas no comprometidas.',
          'Establecer comunicación con los agresores solo si se está entrenado para ello.',
          'Proporcionar a las autoridades: número de agresores, descripción, armas, ubicación exacta.',
          'NO permitir el intercambio de rehenes por personal no entrenado.',
          'Preparar planos de la zona e información de utilidad para las fuerzas especiales.',
          'Tras la resolución, activar apoyo psicológico y atención médica inmediata.',
        ],
      },
      hipotesis_robos_hurtos: {
        name: 'Protocolo ante Robos y Hurtos',
        description: 'Procedimiento de prevención y actuación ante robos, hurtos y otros delitos contra la propiedad.',
        category: 'Protocolo de Seguridad',
        steps: [
          'Reforzar medidas de seguridad pasiva: alarmas, cámaras, cerraduras de seguridad, iluminación.',
          'Establecer procedimiento de denuncia obligatorio ante cualquier sustracción.',
          'Implementar control de inventarios y activos con responsabilidad asignada.',
          'Formar al personal en prevención de robos y hurtos: no dejar objetos de valor a la vista.',
          'Activar protocolo de bloqueo de accesos y alerta al personal de seguridad ante un robo en curso.',
          'NO intervenir físicamente si el agresor porta armas. Priorizar la seguridad de las personas.',
          'Preservar la escena para la investigación policial: no tocar, no limpiar.',
          'Revisar grabaciones de videovigilancia y proporcionarlas a las autoridades.',
          'Realizar análisis post-incidente para identificar vulnerabilidades y mejorar medidas.',
        ],
      },
      hipotesis_violencia_genero: {
        name: 'Protocolo ante Violencia de Género',
        description: 'Procedimiento de actuación y apoyo ante casos de violencia de género en el ámbito laboral.',
        category: 'Protocolo Social',
        steps: [
          'Garantizar un entorno seguro y de confidencialidad para la víctima.',
          'Activar el protocolo interno de acoso y violencia de género de la organización.',
          'Designar un interlocutor/a formado en violencia de género para acompañar a la víctima.',
          'Facilitar los recursos de asistencia: teléfono 016, casas de acogida, asesoramiento legal.',
          'Aplicar medidas de protección laboral: cambio de puesto, horario flexible, teletrabajo.',
          'Informar a la autoridad laboral y activar los protocolos de riesgo laboral por VDG.',
          'Solicitar orden de protección si existe riesgo para la víctima en el entorno laboral.',
          'Formar a toda la plantilla en identificación y prevención de la violencia de género.',
          'Realizar seguimiento periódico del caso y mantener la confidencialidad.',
        ],
      },
      hipotesis_violacion: {
        name: 'Protocolo ante Violación o Agresión Sexual',
        description: 'Procedimiento de actuación inmediata ante una agresión sexual en el ámbito laboral.',
        category: 'Protocolo Social',
        steps: [
          'Garantizar la seguridad inmediata de la víctima y trasladarla a un entorno seguro.',
          'Activar los servicios de emergencia: 112, urgencias hospitalarias, atención psicológica.',
          'NO lavar, cambiar ropa, ni alterar ninguna posible prueba. Preservar todas las evidencias.',
          'Acompañar a la víctima al hospital para reconocimiento forense y profilaxis de emergencia.',
          'Activar el protocolo de acoso sexual de la organización de forma inmediata.',
          'Designar una persona de apoyo formada para acompañar a la víctima durante todo el proceso.',
          'Informar a la víctima de sus derechos y recursos disponibles: asistencia jurídica gratuita.',
          'Suspender cautelarmente al agresor si es personal de la organización, sin prejuzgar.',
          'Activar apoyo psicológico especializado para la víctima a corto y largo plazo.',
          'Instruir diligencias y poner el caso en conocimiento de la autoridad judicial.',
        ],
      },
      hipotesis_homicidio: {
        name: 'Protocolo ante Homicidio o Muerte Violenta',
        description: 'Procedimiento de actuación ante un homicidio o muerte violenta en las instalaciones de la organización.',
        category: 'Protocolo de Crisis',
        steps: [
          'Aislar inmediatamente la escena y evitar el acceso de personal no autorizado.',
          'Activar servicios de emergencia: 112, policía, servicios funerarios.',
          'NO mover el cuerpo ni alterar la escena bajo ninguna circunstancia.',
          'Identificar y retener a posibles testigos para declaración a la policía.',
          'Activar el comité de crisis de la organización y designar portavoz único.',
          'Comunicar internamente con respeto y sensibilidad, evitando rumores.',
          'Gestionar la comunicación externa con medios de forma controlada y respetuosa.',
          'Activar apoyo psicológico para empleados, especialmente para testigos directos.',
          'Coordinar con la policía científica y facilitar el acceso a la escena.',
          'Evaluar impacto en las operaciones y activar plan de continuidad si es necesario.',
        ],
      },
    };

    const template = templates[protocolType];
    if (!template) throw new NotFoundException(`Tipo de protocolo no válido: ${protocolType}`);

    const priority = scores?.overall?.severity === 'critical' ? 'critical'
      : scores?.overall?.severity === 'high' ? 'high'
      : scores?.overall?.severity === 'medium' ? 'medium' : 'low';

    const implementation = {
      steps: template.steps.map((step, i) => ({
        order: i + 1,
        action: step,
        status: 'pending',
        assignedTo: '',
        deadline: '',
      })),
      assessmentScore: scores?.overall?.avg || 0,
      generatedAt: new Date().toISOString(),
    };

    return this.prisma.securityProtocol.create({
      data: {
        name: template.name,
        description: template.description,
        type: protocolType,
        category: template.category,
        priority,
        status: 'active',
        implementation,
        template: protocolType,
        organizationId,
        assessmentId,
      },
    });
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
