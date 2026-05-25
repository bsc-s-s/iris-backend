import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SIMULATION_TYPES = {
  insider: {
    name: 'Ataque Interno (Insider Threat)',
    scenarios: [
      { name: 'Fuga de información por empleado descontento', probability: 0.7, impact: 0.8 },
      { name: 'Sabotaje de sistemas por personal con acceso', probability: 0.4, impact: 0.9 },
      { name: 'Robo de propiedad intelectual por ejecutivo', probability: 0.3, impact: 0.95 },
    ],
  },
  ransomware: {
    name: 'Ataque de Ransomware',
    scenarios: [
      { name: 'Cifrado masivo de datos críticos', probability: 0.6, impact: 0.9 },
      { name: 'Exfiltración de datos con amenaza de publicación', probability: 0.5, impact: 0.85 },
      { name: 'Ataque a infraestructura cloud híbrida', probability: 0.4, impact: 0.8 },
    ],
  },
  reputational: {
    name: 'Crisis Reputacional',
    scenarios: [
      { name: 'Filtración de datos personales de clientes', probability: 0.5, impact: 0.9 },
      { name: 'Denuncia pública de malas prácticas', probability: 0.4, impact: 0.7 },
      { name: 'Crisis en redes sociales viral', probability: 0.6, impact: 0.6 },
    ],
  },
  protest: {
    name: 'Protesta Social / Bloqueo',
    scenarios: [
      { name: 'Manifestación en instalaciones principales', probability: 0.3, impact: 0.6 },
      { name: 'Bloqueo de operaciones por comunidad local', probability: 0.2, impact: 0.7 },
      { name: 'Campaña de desprestigio coordinada', probability: 0.3, impact: 0.5 },
    ],
  },
  sabotage: {
    name: 'Sabotaje / Terrorismo',
    scenarios: [
      { name: 'Daño físico a infraestructura crítica', probability: 0.1, impact: 0.95 },
      { name: 'Intrusión en perímetro de seguridad', probability: 0.2, impact: 0.8 },
      { name: 'Ataque coordinado a múltiples instalaciones', probability: 0.05, impact: 0.99 },
    ],
  },
  natural_disaster: {
    name: 'Desastre Natural',
    scenarios: [
      { name: 'Terremoto en zona de operaciones', probability: 0.1, impact: 0.95 },
      { name: 'Inundación de instalaciones críticas', probability: 0.15, impact: 0.8 },
      { name: 'Incendio forestal afectando infraestructura', probability: 0.1, impact: 0.7 },
    ],
  },
};

@Injectable()
export class ThreatSimulationService {
  private readonly logger = new Logger(ThreatSimulationService.name);

  constructor(private prisma: PrismaService) {}

  async getTypes() {
    return Object.entries(SIMULATION_TYPES).map(([key, val]) => ({
      id: key,
      name: val.name,
      scenarios: val.scenarios.map(s => s.name),
    }));
  }

  async run(assessmentId: string, type: string) {
    const config = SIMULATION_TYPES[type];
    if (!config) return { error: `Unknown simulation type: ${type}` };

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { responses: true },
    });
    if (!assessment) return { error: 'Assessment not found' };

    const scores = assessment.scores as any;

    const simulation = await this.prisma.simulation.create({
      data: {
        type,
        name: config.name,
        assessmentId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    const results = config.scenarios.map(scenario => {
      const riskFactor = scores?.overall?.avg ? scores.overall.avg / 5 : 0.5;
      const adjustedProbability = Math.min(1, scenario.probability * (1 + riskFactor * 0.5));
      const riskScore = adjustedProbability * scenario.impact * 5;
      const severity = riskScore >= 4 ? 'critical' : riskScore >= 3 ? 'high' : riskScore >= 2 ? 'medium' : 'low';

      return {
        scenario: scenario.name,
        probability: Math.round(adjustedProbability * 100),
        impact: Math.round(scenario.impact * 100),
        riskScore: Math.round(riskScore * 10) / 10,
        severity,
        mitigations: this.getMitigations(type, scenario.name),
      };
    });

    const overallRisk = results.reduce((sum, r) => sum + r.riskScore, 0) / results.length;

    await this.prisma.simulation.update({
      where: { id: simulation.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        results: {
          scenarios: results,
          overallRisk: Math.round(overallRisk * 10) / 10,
          overallSeverity: overallRisk >= 4 ? 'critical' : overallRisk >= 3 ? 'high' : overallRisk >= 2 ? 'medium' : 'low',
          simulatedAt: new Date().toISOString(),
          type: config.name,
        },
      },
    });

    return this.prisma.simulation.findUnique({ where: { id: simulation.id } });
  }

  async getHistory(assessmentId: string) {
    return this.prisma.simulation.findMany({
      where: { assessmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getMitigations(type: string, scenario: string): string[] {
    const mitigations: Record<string, string[]> = {
      insider: [
        'Implementar monitoreo de comportamiento de usuarios (UEBA)',
        'Establecer políticas de privilegio mínimo y acceso just-in-time',
        'Realizar auditorías periódicas de acceso a datos sensibles',
        'Implementar DLP (Data Loss Prevention)',
        'Programa de concientización y detección temprana',
      ],
      ransomware: [
        'Backups offline inmutables con recuperación probada',
        'Segmentación de red y microsegmentación',
        'Soluciones EDR/XDR con detección de ransomware',
        'Plan de respuesta a incidentes con playbooks',
        'Autenticación multifactor en todos los accesos críticos',
      ],
      reputational: [
        'Plan de comunicación de crisis',
        'Monitoreo de medios y redes sociales 24/7',
        'Portavoces entrenados para crisis',
        'Seguro de responsabilidad reputacional',
        'Protocolo de transparencia y divulgación',
      ],
      protest: [
        'Diálogo comunitario y relaciones públicas proactivas',
        'Plan de continuidad operativa con rutas alternas',
        'Coordinación con autoridades locales',
        'Evaluación de impacto social antes de proyectos',
        'Protocolo de desescalada y gestión de conflictos',
      ],
      sabotage: [
        'Control de acceso físico con múltiples factores',
        'Vigilancia perimetral con análisis de video IA',
        'Pruebas de penetración física regulares',
        'Procedimientos de verificación de personal y contratistas',
        'Sistemas de detección de intrusión perimetral',
      ],
      natural_disaster: [
        'Plan de continuidad de negocio con sede alterna',
        'Evaluación estructural de instalaciones',
        'Seguros con cobertura de desastres naturales',
        'Stock de suministros de emergencia',
        'Simulacros de evacuación y respuesta a desastres',
      ],
    };

    return mitigations[type] || ['Evaluación de riesgos específica requerida'];
  }
}
