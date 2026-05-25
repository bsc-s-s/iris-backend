import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoría' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrar por usuario' })
  @ApiQuery({ name: 'entity', required: false, description: 'Filtrar por entidad' })
  @ApiQuery({ name: 'action', required: false, description: 'Filtrar por acción' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados' })
  @ApiQuery({ name: 'offset', required: false, description: 'Desplazamiento' })
  @ApiResponse({ status: 200, description: 'Lista de logs de auditoría' })
  async findAll(
    @CurrentUser('organizationId') orgId: string,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.audit.findAll(orgId, {
      userId,
      entity,
      action,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de auditoría' })
  @ApiResponse({ status: 200, description: 'Estadísticas agregadas' })
  async getStats(@CurrentUser('organizationId') orgId: string) {
    return this.audit.getStats(orgId);
  }
}
