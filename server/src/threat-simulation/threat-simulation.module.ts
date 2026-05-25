import { Module } from '@nestjs/common';
import { ThreatSimulationController } from './threat-simulation.controller';
import { ThreatSimulationService } from './threat-simulation.service';

@Module({
  controllers: [ThreatSimulationController],
  providers: [ThreatSimulationService],
  exports: [ThreatSimulationService],
})
export class ThreatSimulationModule {}
