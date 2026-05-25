import { Module } from '@nestjs/common';
import { SecurityPlanningController } from './security-planning.controller';
import { SecurityPlanningService } from './security-planning.service';

@Module({
  controllers: [SecurityPlanningController],
  providers: [SecurityPlanningService],
  exports: [SecurityPlanningService],
})
export class SecurityPlanningModule {}
