import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller('webhooks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WebhooksController {
  constructor(private service: WebhooksService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear un webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook creado con signing secret' })
  async create(@Body() body: { name: string; url: string; events: string[]; retryCount?: number; timeout?: number }, @CurrentUser('organizationId') orgId: string) {
    return this.service.create(orgId, body);
  }

  @Get()
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Listar webhooks de la organización' })
  @ApiResponse({ status: 200, description: 'Lista de webhooks' })
  async list(@CurrentUser('organizationId') orgId: string) {
    return this.service.list(orgId);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar un webhook' })
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser('organizationId') orgId: string) {
    return this.service.update(orgId, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar un webhook' })
  async delete(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.delete(orgId, id);
  }

  @Get('events')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Obtener log de eventos de webhooks' })
  async getEvents(@CurrentUser('organizationId') orgId: string) {
    return this.service.getEventLog(orgId);
  }

  @Get('events/:endpointId')
  @Roles('admin', 'analyst')
  @ApiOperation({ summary: 'Obtener eventos de un webhook específico' })
  async getEndpointEvents(@Param('endpointId') endpointId: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.getEventLog(orgId, endpointId);
  }

  @Post('test/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Enviar evento de prueba a un webhook' })
  async test(@Param('id') id: string, @CurrentUser('organizationId') orgId: string) {
    return this.service.dispatch('test.ping', { message: 'Webhook test from IRIS Enterprise', timestamp: new Date().toISOString() }, orgId);
  }
}
