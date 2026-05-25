import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComplianceEvaluator } from './compliance.service';

@Controller('api/v1/compliance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplianceController {
  constructor(private evaluator: ComplianceEvaluator) {}

  @Get('gdpr')
  getGDPR() {
    return this.evaluator.evaluateGDPR();
  }

  @Get('iso27001')
  getISO27001() {
    return this.evaluator.evaluateISO27001();
  }

  @Post('evaluate')
  @Roles('admin', 'analyst')
  evaluate(@Body() body: { framework: string; controls?: string[] }) {
    if (body.framework === 'gdpr') return this.evaluator.evaluateGDPR(body.controls);
    if (body.framework === 'iso27001') return this.evaluator.evaluateISO27001(body.controls);
    return { error: 'Framework not supported. Use: gdpr, iso27001' };
  }
}
