import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Post, Body, UseGuards, Param, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permission } from '../rbac/rbac.enum';

@ApiTags('IRIS Risk Intelligence')
@ApiBearerAuth()
@Controller('ai/intelligence')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class RiskIntelligenceController {
  constructor(private service: RiskIntelligenceService) {}

  @Post('full-report')
  @RequirePermissions(Permission.AI_ADVANCED)
  @ApiOperation({ summary: 'Generar reporte completo de inteligencia de riesgo' })
  async fullReport(
    @Body() body: { assessmentId?: string; documents?: { name: string; content: string; type?: string }[] },
    @CurrentUser('organizationId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.generateFullReport(orgId, {
      assessmentId: body.assessmentId,
      documents: body.documents,
      userId,
    });
  }
}
