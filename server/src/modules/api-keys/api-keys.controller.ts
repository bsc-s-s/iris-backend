import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nueva API key para la organización' })
  @ApiResponse({ status: 201, description: 'API Key creada (devuelve key solo aquí)' })
  async create(@Body() body: { name: string; scopes?: string; rateLimit?: number }, @CurrentUser('organizationId') orgId: string) {
    return this.service.create(orgId, body);
  }

  @Get()
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Listar todas las API keys de la organización' })
  @ApiResponse({ status: 200, description: 'Lista de API keys (sin secretos)' })
  async list(@CurrentUser('organizationId') orgId: string) {
    return this.service.list(orgId);
  }

  @Post(':id/revoke')
  @Roles('admin')
  @ApiOperation({ summary: 'Revocar una API key' })
  @ApiResponse({ status: 200, description: 'API Key revocada' })
  async revoke(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.revoke(orgId, id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar una API key permanentemente' })
  @ApiResponse({ status: 200, description: 'API Key eliminada' })
  async delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(orgId, id);
  }
}
