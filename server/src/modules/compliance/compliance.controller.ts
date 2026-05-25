import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplianceEvaluator } from './compliance.service';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller('v1/compliance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplianceController {
  constructor(private evaluator: ComplianceEvaluator) {}

  @Get('health')
  @ApiOperation({ summary: 'Dashboard completo de salud compliance (5 frameworks: GDPR, ISO27001, NIST, SOC2, ESG)' })
  @ApiResponse({ status: 200, description: 'ComplianceHealth con scores, gap analysis, audit readiness, maturity' })
  getHealth() {
    return this.evaluator.evaluateAll();
  }

  @Get('gdpr')
  @ApiOperation({ summary: 'Evaluar cumplimiento GDPR (10 controles ponderados)' })
  @ApiResponse({ status: 200, description: 'Score GDPR con controles, gaps críticos y audit readiness' })
  getGDPR() {
    return this.evaluator.evaluateGDPR();
  }

  @Get('iso27001')
  @ApiOperation({ summary: 'Evaluar cumplimiento ISO 27001 (10 controles ponderados)' })
  @ApiResponse({ status: 200, description: 'Score ISO 27001 con controles, gaps críticos y audit readiness' })
  getISO27001() {
    return this.evaluator.evaluateISO27001();
  }

  @Get('nist')
  @ApiOperation({ summary: 'Evaluar cumplimiento NIST CSF (10 controles, 5 funciones: Identify, Protect, Detect, Respond, Recover)' })
  @ApiResponse({ status: 200, description: 'Score NIST CSF con controles y gap analysis' })
  getNIST() {
    return this.evaluator.evaluateNIST();
  }

  @Get('soc2')
  @ApiOperation({ summary: 'Evaluar cumplimiento SOC 2 (10 controles, 5 trust criteria)' })
  @ApiResponse({ status: 200, description: 'Score SOC 2 con controles y audit readiness' })
  getSOC2() {
    return this.evaluator.evaluateSOC2();
  }

  @Get('esg')
  @ApiOperation({ summary: 'Evaluar cumplimiento ESG (10 controles: governance, climate, social, reporting)' })
  @ApiResponse({ status: 200, description: 'Score ESG con controles y recomendaciones' })
  getESG() {
    return this.evaluator.evaluateESG();
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
}
