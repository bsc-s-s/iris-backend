import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiAnalystService } from './ai-analyst.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ai-analyst')
@UseGuards(AuthGuard('jwt'))
export class AiAnalystController {
  constructor(private analyst: AiAnalystService) {}

  @Post('analyze')
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
  async generateReport(@Body() body: { assessmentId: string }) {
    return this.analyst.generateReport(body.assessmentId);
  }
}
