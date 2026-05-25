import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThreatSimulationService } from './threat-simulation.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Simulación de Amenazas')
@ApiBearerAuth()
@Controller('threat-simulation')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ThreatSimulationController {
  constructor(private simulation: ThreatSimulationService) {}

  @Get('types')
  @ApiOperation({ summary: 'Listar tipos de simulación disponibles' })
  @ApiResponse({ status: 200, description: 'Tipos de simulación' })
  async getTypes() {
    return this.simulation.getTypes();
  }

  @Post('run/:assessmentId/:type')
  @Roles('admin', 'architect', 'analyst')
  @ApiOperation({ summary: 'Ejecutar simulación de amenaza' })
  @ApiResponse({ status: 201, description: 'Simulación ejecutada' })
  async run(@Param('assessmentId') assessmentId: string, @Param('type') type: string) {
    return this.simulation.run(assessmentId, type);
  }

  @Get('history/:assessmentId')
  @ApiOperation({ summary: 'Obtener historial de simulaciones' })
  @ApiResponse({ status: 200, description: 'Historial de simulaciones' })
  async getHistory(@Param('assessmentId') assessmentId: string) {
    return this.simulation.getHistory(assessmentId);
  }
}
