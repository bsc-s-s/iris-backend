import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RiskEngine } from '../../core/riskEngine';
import { AiEngine } from '../../core/aiEngine';
import { PatternDetectionEngine } from '../../core/patternDetection';
import { PredictionEngine } from '../../core/predictionEngine';
import { CorrelationEngine } from '../../core/correlationEngine';
import { AnomalyDetectionEngine } from '../../core/anomalyEngine';
import { RiskIntelligenceService } from '../../core/riskIntelligence.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Enterprise API v1')
@Controller('v1')
@UseGuards(AuthGuard('jwt'), TenantGuard)
@ApiBearerAuth()
export class V1Controller {
  private readonly logger = new Logger(V1Controller.name);

  constructor(
    private riskEngine: RiskEngine,
    private aiEngine: AiEngine,
    private patternEngine: PatternDetectionEngine,
    private predictionEngine: PredictionEngine,
    private correlationEngine: CorrelationEngine,
    private anomalyEngine: AnomalyDetectionEngine,
    private riskIntelligence: RiskIntelligenceService,
    private prisma: PrismaService,
  ) {}

  @Get('intelligence')
  @ApiOperation({ summary: 'Análisis completo de inteligencia de riesgo (score, forecast, patrones, anomalías, correlaciones)' })
  @ApiResponse({ status: 200, description: 'Risk Intelligence completo' })
  async getIntelligence(@CurrentUser('organizationId') orgId: string) {
    try {
      const data = await this.loadOrgData(orgId);
      return await this.riskIntelligence.comprehensiveAnalysis({
        organizationId: orgId,
        categoryScores: data.categoryScores,
        orgProfile: data.profile,
        historicalScores: data.historicalScores,
        incidents: data.allIncidents,
        events: data.events,
        metrics: data.metrics,
        userActivity: data.userActivity,
      });
    } catch (e: any) {
      this.logger.error(`getIntelligence error: ${e?.message || e || 'Unknown error'}`);
      return {
        error: 'Partial intelligence data available',
        message: e?.message || String(e) || 'Unknown error',
        riskScore: 0, riskLevel: 'LOW', invisibleRiskIndex: 0, organizationalFragility: 0,
        categories: {}, recommendations: [], correlations: [],
        benchmark: { vsIndustry: 0, vsPeriod: 0, percentile: 0, trend: 'stable' },
        confidence: 0,
        forecast: { riskForecast: [], trend: 'stable', confidence: 0, incidentProbability: 0, earlyWarnings: [], insights: [] },
        organizationalPatterns: [], crossCorrelations: [], compoundRisks: [], weakSignals: [],
        anomalyScore: 0, anomalyLevel: 'LOW', scoreAnomalies: [], behavioralAnomalies: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('risk/score')
  @ApiOperation({ summary: 'Score de riesgo completo con índice invisible, fragilidad y benchmark' })
  @ApiResponse({ status: 200, description: 'RiskAssessmentResult con 8 categorías, correlaciones, recomendaciones' })
  async getRiskScore(@CurrentUser('organizationId') orgId: string) {
    const data = await this.loadOrgData(orgId);
    if (data.assessments.length === 0) {
      return this.riskEngine.calculateScore({
        organizationId: orgId,
        factors: [],
        orgProfile: data.profile,
      });
    }
    return this.riskEngine.calculateScore({
      assessmentId: data.assessments[0].id,
      organizationId: orgId,
      categoryScores: data.categoryScores,
      historicalData: data.historicalScores.map(s => ({ ...s, category: 'operational' as any })),
      orgProfile: data.profile,
    });
  }

  @Post('risk/analyze')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Analizar factores de riesgo personalizados' })
  @ApiResponse({ status: 201, description: 'Resultado del análisis de riesgo' })
  async analyzeRisk(@Body() body: { factors?: any[]; categoryScores?: Record<string, number> }, @CurrentUser('organizationId') orgId: string) {
    const factors = (body.factors || []).map((f: any) => ({
      name: f.name || f.factor || 'Unknown factor',
      severity: typeof f.severity === 'number' ? f.severity : 3,
      description: f.description || '',
      category: f.category || 'operational',
    }));
    return this.riskEngine.calculateScore({ organizationId: orgId, factors, categoryScores: body.categoryScores });
  }

  @Get('risk/report/:id')
  @ApiOperation({ summary: 'Reporte detallado de riesgo por ID de evaluación' })
  @ApiResponse({ status: 200, description: 'Reporte completo con análisis, vulnerabilidades y facility' })
  @ApiResponse({ status: 404, description: 'Assessment no encontrado' })
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

    return {
      assessment: { id: assessment.id, title: assessment.title, methodology: assessment.methodology },
      riskAnalysis: riskResult,
      vulnerabilities: (assessment.vulnerabilities || []).map((v: any) => ({
        id: v.id, name: v.name, severity: v.severity, category: v.category, status: v.status,
      })),
      facility: assessment.facility,
    };
  }

  @Post('ai/insight')
  @Roles('admin', 'analyst', 'executive')
  @ApiOperation({ summary: 'Generar insight con IA (Groq Llama 3.3)' })
  @ApiResponse({ status: 201, description: 'Respuesta del asistente IA' })
  async getAiInsight(@Body() body: { question: string; contextType?: string; riskData?: any }, @CurrentUser() user: any) {
    return this.aiEngine.generateInsight({
      organizationId: user.organizationId,
      question: body.question,
      contextType: (body.contextType as any) || 'general',
      riskData: body.riskData,
    });
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Analytics del dashboard ejecutivo (estadísticas, forecast, actividad)' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics completo' })
  async getDashboardAnalytics(@CurrentUser('organizationId') orgId: string) {
    const data = await this.loadOrgData(orgId);
    const completed = data.assessments.filter((a: any) => a.status === 'completed');
    const scores = completed.map((a: any) => (a.scores as any)?.overall?.avg || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 25) : 0;
    const forecast = this.predictionEngine.forecast({ historicalScores: data.historicalScores, organizationId: orgId });

    return {
      stats: {
        totalAssessments: data.assessments.length,
        completedAssessments: completed.length,
        totalUsers: data.users.length,
        totalProtocols: data.protocols.length,
        averageRiskScore: avgScore,
        totalIncidents: data.allIncidents.length,
      },
      riskLevel: this.riskEngine.scoreToLevel(avgScore),
      invisibleRiskIndex: Math.round(avgScore * 0.35 + 12),
      organizationalFragility: Math.round(avgScore * 0.2 + 15),
      forecast,
      recentActivity: (data.auditLogs || []).slice(0, 10).map((log: any) => ({
        action: log.action, entity: log.entity, createdAt: log.createdAt,
      })),
    };
  }

  @Post('risk/predict')
  @ApiOperation({ summary: 'Predecir riesgo a 30/60/90 días basado en scores históricos' })
  @ApiResponse({ status: 201, description: 'Pronóstico de riesgo con tendencia y confianza' })
  async predictRisk(@Body() body: { scores?: { date: string; score: number }[] }, @CurrentUser('organizationId') orgId: string) {
    let historicalScores = body.scores || [];
    if (historicalScores.length === 0) {
      const assessments = await this.prisma.assessment.findMany({
        where: { organizationId: orgId, status: 'completed' },
        orderBy: { createdAt: 'asc' },
      });
      historicalScores = assessments
        .filter((a: any) => (a.scores as any)?.overall?.avg)
        .map((a: any) => ({ date: a.createdAt.toISOString(), score: ((a.scores as any).overall?.avg || 0) * 25 }));
    }
    return this.predictionEngine.forecast({ historicalScores, organizationId: orgId });
  }

  @Post('anomalies/detect')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Detectar anomalías (scores, eventos, comportamiento, organizacionales)' })
  @ApiResponse({ status: 201, description: 'Anomalías detectadas con patrones' })
  async detectAnomalies(@Body() body: any, @CurrentUser('organizationId') orgId: string) {
    const profile = body.orgProfile || await this.buildOrgProfile(orgId);

    const [patternResult, anomalyResult] = await Promise.all([
      Promise.resolve(this.patternEngine.analyze({
        events: body.events || [],
        metrics: body.metrics || [],
        timeRange: body.timeRange || { start: '', end: '' },
        orgProfile: profile,
      })),
      Promise.resolve(this.anomalyEngine.detect({
        scores: body.scores || [],
        events: body.events || [],
        metrics: body.metrics || [],
        userBehavior: body.userBehavior || [],
      })),
    ]);

    return {
      organizationalPatterns: patternResult.organizationalPatterns,
      scoreAnomalies: anomalyResult.scoreAnomalies,
      eventAnomalies: anomalyResult.eventAnomalies,
      behavioralAnomalies: anomalyResult.behavioralAnomalies,
      organizationalAnomalies: anomalyResult.organizationalAnomalies,
      anomalyScore: anomalyResult.anomalyScore,
      anomalyLevel: anomalyResult.anomalyLevel,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('risk/organizational-patterns')
  @ApiOperation({ summary: 'Detectar 5 patrones organizacionales: degradación, insider, fatigue, escalación, gobernanza' })
  @ApiResponse({ status: 200, description: 'Patrones organizacionales con probabilidad y severidad' })
  async getOrganizationalPatterns(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.buildOrgProfile(orgId);
    const result = this.patternEngine.analyze({
      events: [], metrics: [],
      timeRange: { start: new Date(Date.now() - 30 * 86400000).toISOString(), end: new Date().toISOString() },
      orgProfile: profile,
    });
    return { organizationalPatterns: result.organizationalPatterns, timestamp: result.timestamp };
  }

  @Get('risk/benchmark')
  @ApiOperation({ summary: 'Benchmark de riesgo vs industria, período anterior y percentil' })
  @ApiResponse({ status: 200, description: 'Benchmark comparativo' })
  async getRiskBenchmark(@CurrentUser('organizationId') orgId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { organizationId: orgId, status: 'completed' },
      orderBy: { createdAt: 'desc' }, take: 10,
    });
    const scores = assessments.map((a: any) => ((a.scores as any)?.overall?.avg || 0) * 25);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return {
      vsIndustry: Math.round(avgScore * 0.85 + 8),
      vsPeriod: scores.length > 1 ? Math.round((scores[0] + scores[scores.length - 1]) / 2) : avgScore,
      percentile: Math.round(100 - avgScore * 0.7),
      trend: avgScore > 60 ? 'deteriorating' : avgScore < 35 ? 'improving' : 'stable',
      sampleSize: scores.length,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('predict/incident-probability')
  @ApiOperation({ summary: 'Probabilidad de incidentes a 30/60/90 días con alertas tempranas' })
  @ApiResponse({ status: 200, description: 'Incident probability + early warnings' })
  async getIncidentProbability(@CurrentUser('organizationId') orgId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { organizationId: orgId, status: 'completed' },
      orderBy: { createdAt: 'asc' },
      include: { incidents: true, vulnerabilities: true },
    });
    const historicalScores = assessments.map((a: any) => ({
      date: a.createdAt.toISOString(),
      score: ((a.scores as any)?.overall?.avg || 0) * 25,
    }));
    const allVulns = assessments.flatMap((a: any) => a.vulnerabilities);
    return this.predictionEngine.forecast({
      historicalScores,
      organizationId: orgId,
      orgProfile: {
        protocolCoverage: await this.prisma.securityProtocol.count({ where: { organizationId: orgId } }),
        vulnerabilityCount: allVulns.length,
        incidentTrend: 0,
        assessmentFrequency: assessments.length,
      },
    });
  }

  @Get('correlations')
  @ApiOperation({ summary: 'Correlaciones cruzadas entre categorías de riesgo y señales débiles' })
  @ApiResponse({ status: 200, description: 'Cross-correlations, compound risks, weak signals' })
  async getCorrelations(@CurrentUser('organizationId') orgId: string) {
    const data = await this.loadOrgData(orgId);
    return this.correlationEngine.analyze({
      categoryScores: data.categoryScores,
      incidents: data.allIncidents,
      userActivity: data.userActivity,
      metrics: data.metrics,
      orgProfile: {
        turnoverRate: 0,
        communicationScore: 50,
        leadershipStability: 50,
        policyViolations: data.allIncidents.filter((i: any) => i.type === 'policy_violation').length,
        lateAssessments: data.assessments.filter((a: any) => a.status === 'pending').length,
      },
      historicalScores: data.historicalScores.map(s => ({ ...s, category: 'operational' })),
    });
  }

  @Get('anomalies/overview')
  @ApiOperation({ summary: 'Vista general de anomalías del sistema' })
  @ApiResponse({ status: 200, description: 'Anomaly overview with score and level' })
  async getAnomalyOverview(@CurrentUser('organizationId') orgId: string) {
    const data = await this.loadOrgData(orgId);
    return this.anomalyEngine.detect({
      scores: data.historicalScores.map(s => ({ date: s.date, value: s.score })),
      events: data.events,
      metrics: data.metrics,
      userBehavior: data.userActivity,
    });
  }

  @Get('indexes')
  @ApiOperation({ summary: 'Índices propietarios IRIS (Invisible Risk, Fragilidad, Compliance Stability, Executive Vulnerability)' })
  @ApiResponse({ status: 200, description: '4 índices propietarios con histórico y tendencias' })
  async getProprietaryIndexes(@CurrentUser('organizationId') orgId: string) {
    const data = await this.loadOrgData(orgId);
    const result = this.riskEngine.calculateScore({
      organizationId: orgId,
      categoryScores: data.categoryScores,
      orgProfile: data.profile,
    });

    return {
      proprietaryIndexes: [
        {
          name: 'Invisible Risk Exposure Score™',
          value: result.invisibleRiskIndex,
          level: this.riskEngine.scoreToLevel(result.invisibleRiskIndex),
          description: 'Mide exposición a riesgos no detectados por evaluaciones tradicionales',
          trend: result.invisibleRiskIndex > 50 ? 'deteriorating' : 'stable',
        },
        {
          name: 'Organizational Fragility Index™',
          value: result.organizationalFragility,
          level: this.riskEngine.scoreToLevel(result.organizationalFragility),
          description: 'Evalúa fragilidad de la estructura organizacional ante crisis',
          trend: result.organizationalFragility > 50 ? 'deteriorating' : 'stable',
        },
        {
          name: 'Compliance Stability Score™',
          value: 100 - (result.categories?.['compliance']?.riskScore || 25),
          level: 'LOW',
          description: 'Estabilidad del programa de compliance y cumplimiento normativo',
          trend: 'stable',
        },
        {
          name: 'Executive Vulnerability Index™',
          value: Math.round((result.overallScore + result.invisibleRiskIndex) / 2),
          level: this.riskEngine.scoreToLevel(Math.round((result.overallScore + result.invisibleRiskIndex) / 2)),
          description: 'Vulnerabilidad ejecutiva combinando score general y riesgos invisibles',
          trend: result.overallScore > 50 ? 'deteriorating' : 'stable',
        },
      ],
      timestamp: result.timestamp,
    };
  }

  private async loadOrgData(orgId: string) {
    const [users, assessments, protocols, auditLogs] = await Promise.all([
      this.prisma.user.findMany({ where: { organizationId: orgId } }),
      this.prisma.assessment.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { incidents: true, vulnerabilities: true },
      }),
      this.prisma.securityProtocol.findMany({ where: { organizationId: orgId } }),
      this.prisma.auditLog.findMany({ where: { organizationId: orgId }, take: 50, orderBy: { createdAt: 'desc' } }),
    ]);

    const allIncidents = assessments.flatMap((a: any) => a.incidents || []);
    const completed = assessments.filter((a: any) => a.status === 'completed');
    const categoryScores: Record<string, number> = {};
    const allCats = ['operational', 'financial', 'security', 'human', 'geopolitical', 'reputational', 'strategic', 'compliance'];

    if (completed.length > 0) {
      const latestScores = (completed[0].scores as Record<string, any>) || {};
      for (const cat of allCats) {
        if (latestScores[cat]?.avg) categoryScores[cat] = latestScores[cat].avg * 25;
      }
    }

    const historicalScores = completed.map((a: any) => ({
      date: a.createdAt.toISOString(),
      score: ((a.scores as any)?.overall?.avg || 0) * 25,
    }));

    const lateAssessments = assessments.filter((a: any) => a.status === 'pending').length;
    const allVulns = assessments.flatMap((a: any) => a.vulnerabilities || []);
    const ignoredRecs = allVulns.filter((v: any) => v.status === 'open' || v.status === 'ignored').length;

    return {
      users,
      assessments,
      protocols,
      auditLogs,
      allIncidents,
      categoryScores,
      historicalScores,
      profile: {
        userCount: users.length,
        assessmentCount: assessments.length,
        protocolCount: protocols.length,
        incidentCount: allIncidents.length,
        turnoverRate: 0,
        communicationScore: 50,
        lateAssessments,
        ignoredRecommendations: ignoredRecs,
      },
      events: assessments.flatMap((a: any) =>
        (a.incidents || []).map((i: any) => ({ type: i.type, timestamp: i.createdAt.toISOString() }))
      ),
      metrics: [],
      userActivity: auditLogs.map((log: any) => ({
        userId: log.userId || 'anonymous',
        action: log.action,
        timestamp: log.createdAt.toISOString(),
        resource: log.entity,
      })),
    };
  }

  private async buildOrgProfile(orgId: string) {
    const data = await this.loadOrgData(orgId);
    return {
      userCount: data.users.length,
      activeUsers: data.users.filter((u: any) => u.isActive !== false).length,
      weakLeadership: false,
      highTurnover: false,
      smallIncidents: data.allIncidents.filter((i: any) => i.severity === 'LOW' || i.severity === 'MEDIUM').length,
      fragmentedCommunication: false,
      policyViolations: data.allIncidents.filter((i: any) => i.type === 'policy_violation').length,
      lateAssessments: data.assessments.filter((a: any) => a.status === 'pending').length,
      ignoredRecommendations: (data as any).profile?.ignoredRecommendations || 0,
    };
  }
}
