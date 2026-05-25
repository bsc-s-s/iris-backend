import { Global, Module } from '@nestjs/common';
import { RiskEngine } from './riskEngine';
import { AiEngine } from './aiEngine';
import { PatternDetectionEngine } from './patternDetection';
import { PredictionEngine } from './predictionEngine';

@Global()
@Module({
  providers: [RiskEngine, AiEngine, PatternDetectionEngine, PredictionEngine],
  exports: [RiskEngine, AiEngine, PatternDetectionEngine, PredictionEngine],
})
export class CoreModule {}
