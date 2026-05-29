import { Module } from '@nestjs/common';
import { InvisibleRiskEngineService } from './invisible-risk-engine.service';
import { InvisibleRiskEngineController } from './invisible-risk-engine.controller';

@Module({
  controllers: [InvisibleRiskEngineController],
  providers: [InvisibleRiskEngineService],
  exports: [InvisibleRiskEngineService],
})
export class InvisibleRiskEngineModule {}
