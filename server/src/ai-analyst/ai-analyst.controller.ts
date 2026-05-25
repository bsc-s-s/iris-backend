import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiAnalystService } from './ai-analyst.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('AI Analyst')
@ApiBearerAuth()
@Controller('ai-analyst')
@UseGuards(AuthGuard('jwt'))
export class AiAnalystController {
  constructor(private analyst: AiAnalystService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analizar riesgo usando IA (Groq Llama 3.3)' })
  @ApiResponse({ status: 201, description: 'Análisis generado' })
  async analyze(
    @Body() body: { assessmentId?: string; question: string; contextType?: string },
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.analyst.analyze({
      assessmentId: body.assessmentId,
      organizationId: orgId,
      question: body.question,
      contextType: (body.contextType as any) || 'general',
    });
  }

  @Post('report')
  @ApiOperation({ summary: 'Generar reporte completo de una evaluación' })
  @ApiResponse({ status: 201, description: 'Reporte generado' })
  async generateReport(@Body() body: { assessmentId: string }) {
    return this.analyst.generateReport(body.assessmentId);
  }
}
