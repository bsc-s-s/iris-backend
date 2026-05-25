import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ComplianceEvaluator } from './compliance.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('v1/compliance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplianceController {
  constructor(
    private evaluator: ComplianceEvaluator,
    private prisma: PrismaService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Dashboard completo de salud compliance con datos reales de la org' })
  @ApiResponse({ status: 200, description: 'ComplianceHealth con scores, gap analysis, audit readiness, maturity' })
  async getHealth(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimatedControls = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateAll(estimatedControls);
  }

  @Get('gdpr')
  @ApiOperation({ summary: 'Evaluar cumplimiento GDPR (10 controles ponderados)' })
  @ApiResponse({ status: 200, description: 'Score GDPR con controles, gaps críticos y audit readiness' })
  async getGDPR(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateGDPR(estimated?.gdpr);
  }

  @Get('iso27001')
  @ApiOperation({ summary: 'Evaluar cumplimiento ISO 27001 (10 controles ponderados)' })
  @ApiResponse({ status: 200, description: 'Score ISO 27001 con controles, gaps críticos y audit readiness' })
  async getISO27001(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateISO27001(estimated?.iso27001);
  }

  @Get('nist')
  @ApiOperation({ summary: 'Evaluar cumplimiento NIST CSF' })
  @ApiResponse({ status: 200, description: 'Score NIST CSF' })
  async getNIST(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateNIST(estimated?.nist);
  }

  @Get('soc2')
  @ApiOperation({ summary: 'Evaluar cumplimiento SOC 2' })
  @ApiResponse({ status: 200, description: 'Score SOC 2' })
  async getSOC2(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateSOC2(estimated?.soc2);
  }

  @Get('esg')
  @ApiOperation({ summary: 'Evaluar cumplimiento ESG' })
  @ApiResponse({ status: 200, description: 'Score ESG' })
  async getESG(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    return this.evaluator.evaluateESG(estimated?.esg);
  }

  @Post('evaluate')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Evaluar cumplimiento contra framework específico con controles implementados' })
  @ApiResponse({ status: 201, description: 'Resultado de la evaluación con gap analysis' })
  evaluate(@Body() body: { framework: string; controls?: string[] }) {
    const fw = body.framework.toLowerCase();
    if (fw === 'gdpr') return this.evaluator.evaluateGDPR(body.controls);
    if (fw === 'iso27001' || fw === 'iso') return this.evaluator.evaluateISO27001(body.controls);
    if (fw === 'nist') return this.evaluator.evaluateNIST(body.controls);
    if (fw === 'soc2' || fw === 'soc') return this.evaluator.evaluateSOC2(body.controls);
    if (fw === 'esg') return this.evaluator.evaluateESG(body.controls);
    return { error: 'Framework not supported. Use: gdpr, iso27001, nist, soc2, esg' };
  }

  @Post('evaluate-all')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Evaluar todos los frameworks simultáneamente con controles implementados' })
  @ApiResponse({ status: 201, description: 'ComplianceHealth completo' })
  evaluateAll(@Body() body: { controls?: Record<string, string[]> }) {
    return this.evaluator.evaluateAll(body.controls);
  }

  @Post('generate-report')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Generar reporte de compliance ejecutivo' })
  @ApiResponse({ status: 201, description: 'Reporte estructurado con análisis y recomendaciones' })
  async generateReport(@CurrentUser('organizationId') orgId: string) {
    const profile = await this.loadComplianceProfile(orgId);
    const estimated = this.evaluator.estimateControls(profile);
    const health = this.evaluator.evaluateAll(estimated);
    return this.evaluator.buildExecutiveReport(health, profile);
  }

  private async loadComplianceProfile(orgId: string) {
    const [assessments, protocols, incidents, users] = await Promise.all([
      this.prisma.assessment.findMany({ where: { organizationId: orgId }, take: 10, orderBy: { createdAt: 'desc' } }),
      this.prisma.securityProtocol.findMany({ where: { organizationId: orgId } }),
      this.prisma.incident.findMany({ where: { assessment: { organizationId: orgId } }, take: 50 }),
      this.prisma.user.count({ where: { organizationId: orgId } }),
    ]);
    const completedAssessments = assessments.filter(a => a.status === 'completed');
    const latestScore = completedAssessments[0]?.scores as Record<string, any> || {};
    const overallAvg = latestScore?.overall?.avg ? Math.round(latestScore.overall.avg * 25) : 50;
    return {
      userCount: users,
      assessmentCount: assessments.length,
      protocolCount: protocols.length,
      incidentCount: incidents.length,
      completedAssessments: completedAssessments.length,
      overallScore: overallAvg,
    };
  }
}
