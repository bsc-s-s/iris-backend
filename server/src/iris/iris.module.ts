import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { IrisController } from './iris.controller';
import { IrisService } from './iris.service';
import { CognitiveEngine } from './engine/cognitive-engine.service';
import { PatternDetector } from './engine/pattern-detector.service';
import { BehavioralAnalyzer } from './engine/behavioral-analyzer.service';
import { OrganizationalAnalyzer } from './engine/organizational-analyzer.service';
import { ScoringEngine } from './scoring/scoring.service';
import { ScanEngine } from './scan/scan.service';
import { MonitorService } from './monitor/monitor.service';
import { PredictService } from './predict/predict.service';
import { BenchmarkService } from './benchmark/benchmark.service';
import { ReportEngine } from './reports/report-engine.service';
import { SuperAdminController } from './admin/super-admin.controller';
import { SuperAdminService } from './admin/super-admin.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [IrisController, SuperAdminController],
  providers: [
    IrisService,
    CognitiveEngine,
    PatternDetector,
    BehavioralAnalyzer,
    OrganizationalAnalyzer,
    ScoringEngine,
    ScanEngine,
    MonitorService,
    PredictService,
    BenchmarkService,
    ReportEngine,
    SuperAdminService,
  ],
  exports: [
    CognitiveEngine, ScoringEngine, ScanEngine,
    MonitorService, PredictService, BenchmarkService, ReportEngine,
  ],
})
export class IrisModule {}
