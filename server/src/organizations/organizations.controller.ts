import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Organizaciones')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrganizationsController {
  constructor(private orgs: OrganizationsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener datos de la organización actual' })
  @ApiResponse({ status: 200, description: 'Datos de la organización' })
  async getCurrent(@CurrentUser('organizationId') orgId: string) {
    return this.orgs.findOne(orgId);
  }

  @Put('current')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar datos de la organización' })
  @ApiResponse({ status: 200, description: 'Organización actualizada' })
  async updateCurrent(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
    return this.orgs.update(orgId, body);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de la organización' })
  @ApiResponse({ status: 200, description: 'Estadísticas (evaluaciones, usuarios, protocolos)' })
  async getStats(@CurrentUser('organizationId') orgId: string) {
    return this.orgs.getStats(orgId);
  }
}
