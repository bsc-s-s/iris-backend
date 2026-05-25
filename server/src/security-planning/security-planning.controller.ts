import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SecurityPlanningService } from './security-planning.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Planificación de Seguridad')
@ApiBearerAuth()
@Controller('security-planning')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SecurityPlanningController {
  constructor(private planning: SecurityPlanningService) {}

  @Post('generate')
  @Roles('admin', 'architect')
  @ApiOperation({ summary: 'Generar plan de seguridad' })
  @ApiResponse({ status: 201, description: 'Plan generado exitosamente' })
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
  @ApiOperation({ summary: 'Listar protocolos de seguridad' })
  @ApiResponse({ status: 200, description: 'Lista de protocolos' })
  async getProtocols(@CurrentUser('organizationId') orgId: string) {
    return this.planning.getProtocols(orgId);
  }

  @Put('protocols/:id')
  @Roles('admin', 'architect')
  @ApiOperation({ summary: 'Actualizar un protocolo de seguridad' })
  @ApiResponse({ status: 200, description: 'Protocolo actualizado' })
  async updateProtocol(@Param('id') id: string, @Body() body: any) {
    return this.planning.updateProtocol(id, body);
  }
}
