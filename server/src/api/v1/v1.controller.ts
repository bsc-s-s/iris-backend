import { Controller, Get, Post, Body, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RiskEngine } from '../../core/riskEngine';
import { AiEngine } from '../../core/aiEngine';
import { PatternDetectionEngine } from '../../core/patternDetection';
import { PredictionEngine } from '../../core/predictionEngine';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('v1')
export class V1Controller {
  constructor(
    private riskEngine: RiskEngine,
    private aiEngine: AiEngine,
    private patternEngine: PatternDetectionEngine,
    private predictionEngine: PredictionEngine,
    private prisma: PrismaService,
  ) {}

  @Get('risk/score')
  @UseGuards(AuthGuard('jwt'))
  async getRiskScore(@CurrentUser('organizationId') orgId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { organizationId: orgId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (assessments.length === 0) {
      return this.riskEngine.calculateScore({
        organizationId: orgId,
        factors: [],
      });
    }

    const assessment = assessments[0];
    const scores = assessment.scores as Record<string, any> || {};
    const categoryScores: Record<string, number> = {};

    for (const cat of ['operational', 'financial', 'security', 'human', 'geopolitical']) {
      if (scores[cat]?.avg) categoryScores[cat] = scores[cat].avg * 25;
    }

    return this.riskEngine.calculateScore({
      assessmentId: assessment.id,
      organizationId: orgId,
      categoryScores,
    });
  }

  @Post('risk/analyze')
  @UseGuards(AuthGuard('jwt'))
  async analyzeRisk(@Body() body: { factors?: any[]; categoryScores?: Record<string, number> }, @CurrentUser('organizationId') orgId: string) {
    const factors = (body.factors || []).map((f: any) => ({
      name: f.name || f.factor || 'Unknown factor',
      severity: typeof f.severity === 'number' ? f.severity : 3,
      description: f.description || '',
      category: f.category || 'operational',
    }));

    return this.riskEngine.calculateScore({
      organizationId: orgId,
      factors,
      categoryScores: body.categoryScores,
    });
  }

  @Get('risk/report/:id')
  @UseGuards(AuthGuard('jwt'))
  async getRiskReport(@Param('id') id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { responses: true, vulnerabilities: true, facility: true },
    });

    if (!assessment) throw new HttpException('Assessment not found', HttpStatus.NOT_FOUND);

    const scores = assessment.scores as Record<string, any> || {};
    const categoryScores: Record<string, number> = {};
    for (const cat of ['operational', 'financial', 'security', 'human', 'geopolitical']) {
      if (scores[cat]?.avg) categoryScores[cat] = scores[cat].avg * 25;
    }

    const riskResult = this.riskEngine.calculateScore({
      assessmentId: assessment.id,
      organizationId: assessment.organizationId,
      categoryScores,
    });

    const vulnerabilities = assessment.vulnerabilities?.map((v: any) => ({
      id: v.id,
      name: v.name,
      severity: v.severity,
      category: v.category,
      status: v.status,
    })) || [];

    return {
      assessment: { id: assessment.id, title: assessment.title, methodology: assessment.methodology },
      riskAnalysis: riskResult,
      vulnerabilities,
      facility: assessment.facility,
    };
  }

  @Post('ai/insight')
  @UseGuards(AuthGuard('jwt'))
  async getAiInsight(@Body() body: { question: string; contextType?: string; riskData?: any }, @CurrentUser() user: any) {
    const result = await this.aiEngine.generateInsight({
      organizationId: user.organizationId,
      question: body.question,
      contextType: (body.contextType as any) || 'general',
      riskData: body.riskData,
    });
    return result;
  }

  @Get('analytics/dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboardAnalytics(@CurrentUser('organizationId') orgId: string) {
    const [assessments, users, protocols, auditLogs] = await Promise.all([
      this.prisma.assessment.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.findMany({ where: { organizationId: orgId } }),
      this.prisma.securityProtocol.findMany({ where: { organizationId: orgId } }),
      this.prisma.auditLog.findMany({ where: { organizationId: orgId }, take: 50, orderBy: { createdAt: 'desc' } }),
    ]);

    const completed = assessments.filter((a) => a.status === 'completed');
    const scores = completed.map((a) => (a.scores as any)?.overall?.avg || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 25) : 0;

    const historicalScores = completed.map((a) => ({
      date: a.updatedAt?.toISOString() || a.createdAt.toISOString(),
      score: ((a.scores as any)?.overall?.avg || 0) * 25,
    }));

    const forecast = this.predictionEngine.forecast({ historicalScores, organizationId: orgId });

    return {
      stats: {
        totalAssessments: assessments.length,
        completedAssessments: completed.length,
        totalUsers: users.length,
        totalProtocols: protocols.length,
        averageRiskScore: avgScore,
      },
      riskLevel: this.riskEngine.scoreToLevel(avgScore),
      forecast,
      recentActivity: auditLogs.slice(0, 10).map((log: any) => ({
        action: log.action,
        entity: log.entity,
        createdAt: log.createdAt,
      })),
    };
  }

  @Post('risk/predict')
  @UseGuards(AuthGuard('jwt'))
  async predictRisk(@Body() body: { scores?: { date: string; score: number }[] }, @CurrentUser('organizationId') orgId: string) {
    const historicalScores = body.scores?.map((s) => ({
      date: s.date,
      score: s.score,
    })) || [];

    if (historicalScores.length === 0) {
      const assessments = await this.prisma.assessment.findMany({
        where: { organizationId: orgId, status: 'completed' },
        orderBy: { createdAt: 'asc' },
      });
      for (const a of assessments) {
        const score = (a.scores as any)?.overall?.avg;
        if (score) {
          historicalScores.push({
            date: a.createdAt.toISOString(),
            score: score * 25,
          });
        }
      }
    }

    return this.predictionEngine.forecast({ historicalScores, organizationId: orgId });
  }

  @Post('anomalies/detect')
  @UseGuards(AuthGuard('jwt'))
  async detectAnomalies(@Body() body: any) {
    return this.patternEngine.analyze({
      events: body.events || [],
      metrics: body.metrics || [],
      timeRange: body.timeRange || { start: '', end: '' },
    });
  }
}
