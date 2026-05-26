import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EnterpriseComplianceService } from './enterprise-compliance.service';

@Controller('enterprise-compliance')
export class EnterpriseComplianceController {
  constructor(private svc: EnterpriseComplianceService) {}

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  async getDashboard(@Req() req: any) { return this.svc.getUnifiedDashboard(req.user.organizationId); }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  async getSummary(@Req() req: any) { return this.svc.getComplianceSummary(req.user.organizationId); }

  @Get('audit-trail')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'superadmin', 'auditor')
  async getAuditTrail(@Req() req: any, @Query('userId') userId?: string, @Query('entity') entity?: string, @Query('action') action?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.svc.getAuditTrail(req.user.organizationId, { userId, entity, action, limit: limit ? parseInt(limit) : undefined, offset: offset ? parseInt(offset) : undefined });
  }
}
