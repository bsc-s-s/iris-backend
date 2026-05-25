import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityPlanningService } from './security-planning.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('security-planning')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SecurityPlanningController {
  constructor(private planning: SecurityPlanningService) {}

  @Post('generate')
  @Roles('admin', 'architect')
  async generatePlan(
    @Body() body: { assessmentId?: string; scope?: string; timeframeMonths?: number },
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.planning.generatePlan({
      organizationId: orgId,
      assessmentId: body.assessmentId,
      scope: (body.scope as any) || 'full',
      timeframeMonths: body.timeframeMonths || 12,
    });
  }

  @Get('protocols')
  async getProtocols(@CurrentUser('organizationId') orgId: string) {
    return this.planning.getProtocols(orgId);
  }

  @Put('protocols/:id')
  @Roles('admin', 'architect')
  async updateProtocol(@Param('id') id: string, @Body() body: any) {
    return this.planning.updateProtocol(id, body);
  }
}
