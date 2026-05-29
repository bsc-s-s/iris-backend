import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface InvisibleRiskIndicator {
  id: string;
  category: 'behavioral' | 'cultural' | 'structural' | 'temporal' | 'relational';
  name: string;
  description: string;
  signalStrength: number;
  confidence: number;
  evidence: string[];
  recommendedAction: string;
}

export interface InvisibleRiskReport {
  organizationId: string;
  generatedAt: string;
  indicators: InvisibleRiskIndicator[];
  overallInvisibleRiskScore: number;
  riskLevel: string;
  hiddenPatterns: string[];
  earlyWarnings: string[];
}

@Injectable()
export class InvisibleRiskEngineService {
  private readonly logger = new Logger(InvisibleRiskEngineService.name);

  constructor(private prisma: PrismaService) {}

  async scan(orgId: string): Promise<InvisibleRiskReport> {
    const [users, assessments, auditLogs, incidents] = await Promise.all([
      this.prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true, role: true, isActive: true, lastLoginAt: true, failedLoginAttempts: true } }),
      this.prisma.assessment.findMany({ where: { organizationId: orgId }, include: { vulnerabilities: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.auditLog.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.incident.findMany({ where: { assessment: { organizationId: orgId } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);

    const indicators: InvisibleRiskIndicator[] = [];

    // 1. Behavioral: Silent users
    const silentUsers = users.filter(u => !u.lastLoginAt || (Date.now() - u.lastLoginAt.getTime()) > 30 * 86400000);
    if (silentUsers.length > users.length * 0.3) {
      indicators.push({
        id: 'ir-beh-001',
        category: 'behavioral',
        name: 'Alta tasa de usuarios inactivos',
        description: `${silentUsers.length} de ${users.length} usuarios no han accedido en 30+ días`,
        signalStrength: Math.min(100, Math.round((silentUsers.length / users.length) * 100)),
        confidence: 80,
        evidence: [`${silentUsers.length} usuarios sin login en 30 días`],
        recommendedAction: 'Revisar cuentas inactivas y rotación de personal',
      });
    }

    // 2. Structural: Unaddressed vulnerabilities
    const openVulns = assessments.flatMap(a => a.vulnerabilities).filter(v => v.status === 'open');
    if (openVulns.length > 5) {
      indicators.push({
        id: 'ir-struct-001',
        category: 'structural',
        name: 'Vulnerabilidades sin remediar acumuladas',
        description: `${openVulns.length} vulnerabilidades abiertas sin plan de remediación`,
        signalStrength: Math.min(100, openVulns.length * 5),
        confidence: 85,
        evidence: [`${openVulns.length} vulnerabilidades abiertas`],
        recommendedAction: 'Implementar plan de remediación con prioridades',
      });
    }

    // 3. Cultural: Policy violations
    const policyViolations = incidents.filter(i => i.type === 'policy_violation');
    if (policyViolations.length > 3) {
      indicators.push({
        id: 'ir-cult-001',
        category: 'cultural',
        name: 'Patrón de violaciones de política',
        description: `${policyViolations.length} incidentes por violación de política`,
        signalStrength: Math.min(100, policyViolations.length * 15),
        confidence: 75,
        evidence: policyViolations.slice(0, 5).map(v => v.title),
        recommendedAction: 'Reforzar cultura de seguridad y capacitación',
      });
    }

    // 4. Temporal: Assessment gaps
    const recentAssessments = assessments.filter(a => a.status === 'completed');
    if (recentAssessments.length === 0) {
      indicators.push({
        id: 'ir-temp-001',
        category: 'temporal',
        name: 'Sin evaluaciones completadas',
        description: 'No hay evaluaciones de riesgo completadas en esta organización',
        signalStrength: 90,
        confidence: 95,
        evidence: ['0 evaluaciones completadas'],
        recommendedAction: 'Realizar evaluación de riesgo inicial',
      });
    }

    // 5. Relational: Failed logins
    const totalFailedLogins = users.reduce((sum, u) => sum + u.failedLoginAttempts, 0);
    if (totalFailedLogins > 20) {
      indicators.push({
        id: 'ir-rel-001',
        category: 'relational',
        name: 'Múltiples intentos de acceso fallidos',
        description: `${totalFailedLogins} intentos de login fallidos en toda la organización`,
        signalStrength: Math.min(100, totalFailedLogins * 2),
        confidence: 70,
        evidence: [`${totalFailedLogins} failed login attempts`],
        recommendedAction: 'Investigar origen de intentos de acceso',
      });
    }

    const overallScore = indicators.length > 0
      ? Math.round(indicators.reduce((sum, i) => sum + i.signalStrength, 0) / indicators.length)
      : 10;

    return {
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
      indicators,
      overallInvisibleRiskScore: overallScore,
      riskLevel: overallScore >= 70 ? 'critical' : overallScore >= 50 ? 'high' : overallScore >= 30 ? 'medium' : 'low',
      hiddenPatterns: indicators.map(i => i.name),
      earlyWarnings: indicators.filter(i => i.signalStrength > 60).map(i => i.description),
    };
  }
}
