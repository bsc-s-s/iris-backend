import { Global, Module } from '@nestjs/common';
import { RiskEngine } from './riskEngine';
import { AiEngine } from './aiEngine';
import { PatternDetectionEngine } from './patternDetection';
import { PredictionEngine } from './predictionEngine';
import { CorrelationEngine } from './correlationEngine';
import { AnomalyDetectionEngine } from './anomalyEngine';
import { RiskIntelligenceService } from './riskIntelligence.service';

@Global()
@Module({
  providers: [
    RiskEngine,
    AiEngine,
    PatternDetectionEngine,
    PredictionEngine,
    CorrelationEngine,
    AnomalyDetectionEngine,
    RiskIntelligenceService,
  ],
  exports: [
    RiskEngine,
    AiEngine,
    PatternDetectionEngine,
    PredictionEngine,
    CorrelationEngine,
    AnomalyDetectionEngine,
    RiskIntelligenceService,
  ],
})
export class CoreModule {}
