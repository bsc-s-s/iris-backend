import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThreatSimulationService } from './threat-simulation.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('threat-simulation')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ThreatSimulationController {
  constructor(private simulation: ThreatSimulationService) {}

  @Get('types')
  async getTypes() {
    return this.simulation.getTypes();
  }

  @Post('run/:assessmentId/:type')
  @Roles('admin', 'architect', 'analyst')
  async run(@Param('assessmentId') assessmentId: string, @Param('type') type: string) {
    return this.simulation.run(assessmentId, type);
  }

  @Get('history/:assessmentId')
  async getHistory(@Param('assessmentId') assessmentId: string) {
    return this.simulation.getHistory(assessmentId);
  }
}
