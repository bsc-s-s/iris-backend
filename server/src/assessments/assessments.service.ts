import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

const RISK_CATEGORIES = ['fisica', 'corporativa', 'ejecutiva', 'operacional', 'financiero', 'geopolitico', 'reputacional', 'digital_ciber', 'insider', 'continuidad', 'inteligencia', 'compliance'];

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
        methodology: dto.methodology || 'iris-v4',
        createdById: userId,
        organizationId,
      },
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
        questionKey: dto.questionKey,
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
    const scores: Record<string, { total: number; count: number; avg: number; severity: string }> = {};
    const vulnerabilities: Array<{ category: string; name: string; description: string; severity: string }> = [];

    for (const resp of responses) {
      const response = resp.response as any;
      const value = response.value ?? 0;
      const keyParts = resp.questionKey.split('_');
      const category = keyParts.length > 1 ? keyParts.slice(0, -1).join('_') : 'general';

      if (!scores[category]) scores[category] = { total: 0, count: 0, avg: 0, severity: 'low' };
      scores[category].total += value;
      scores[category].count += 1;
      scores[category].avg = scores[category].total / scores[category].count;
      scores[category].severity = calculateSeverity(scores[category].avg);

      if (value >= 4) {
        vulnerabilities.push({
          category,
          name: `Alto riesgo en ${category}: ${resp.questionKey}`,
          description: `Se identificó un puntaje crítico (${value}/5) en ${resp.questionKey}`,
          severity: value >= 4.5 ? 'critical' : 'high',
        });
      }
    }

    const totalScore = Object.values(scores).reduce((sum, s) => sum + s.avg, 0) / (Object.keys(scores).length || 1);
    const overallSeverity = calculateSeverity(totalScore);

    const scoresJson = { categories: scores, overall: { avg: totalScore, severity: overallSeverity }, totalResponses: responses.length };

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

    for (const [cat, data] of Object.entries(scores.categories || {})) {
      const d = data as any;
      if (d.severity === 'critical' || d.severity === 'high') {
        recommendations.push(`Implementar medidas correctivas urgentes en ${cat} (severidad: ${d.severity})`);
        protocols.push({
          name: `Protocolo de mitigación - ${cat}`,
          description: `Plan de acción para reducir riesgo en categoría ${cat} de ${d.avg.toFixed(1)} a niveles aceptables`,
          category: cat,
          priority: d.severity === 'critical' ? 'critical' : 'high',
        });
      } else if (d.severity === 'medium') {
        recommendations.push(`Monitorear y mejorar controles en ${cat} (severidad: ${d.severity})`);
        protocols.push({
          name: `Protocolo de mejora - ${cat}`,
          description: `Plan de mejora continua para categoría ${cat}`,
          category: cat,
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
