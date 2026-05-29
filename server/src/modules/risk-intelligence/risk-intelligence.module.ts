import { Module } from '@nestjs/common';
import { RiskIntelligenceService } from './risk-intelligence.service';
import { RiskIntelligenceController } from './risk-intelligence.controller';
import { ThinkingEngineModule } from '../thinking-engine/thinking-engine.module';
import { DocumentAnalysisModule } from '../document-analysis/document-analysis.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [ThinkingEngineModule, DocumentAnalysisModule, ScoringModule],
  controllers: [RiskIntelligenceController],
  providers: [RiskIntelligenceService],
  exports: [RiskIntelligenceService],
})
export class RiskIntelligenceModule {}
