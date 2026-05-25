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

  @Get('gdpr')
  @ApiOperation({ summary: 'Evaluar cumplimiento GDPR (10 controles)' })
  @ApiResponse({ status: 200, description: 'Score GDPR con controles y recomendaciones' })
  getGDPR() {
    return this.evaluator.evaluateGDPR();
  }

  @Get('iso27001')
  @ApiOperation({ summary: 'Evaluar cumplimiento ISO 27001 (10 controles)' })
  @ApiResponse({ status: 200, description: 'Score ISO 27001 con controles y recomendaciones' })
  getISO27001() {
    return this.evaluator.evaluateISO27001();
  }

  @Post('evaluate')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Evaluar cumplimiento contra un framework específico' })
  @ApiResponse({ status: 201, description: 'Resultado de la evaluación' })
  evaluate(@Body() body: { framework: string; controls?: string[] }) {
    if (body.framework === 'gdpr') return this.evaluator.evaluateGDPR(body.controls);
    if (body.framework === 'iso27001') return this.evaluator.evaluateISO27001(body.controls);
    return { error: 'Framework not supported. Use: gdpr, iso27001' };
  }
}
