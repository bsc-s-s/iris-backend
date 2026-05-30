import { Controller, Get, Post, Body, Param, UseGuards, Req, Query, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IrisService } from './iris.service';
import { CognitiveEngine } from './engine/cognitive-engine.service';
import { ScoringEngine } from './scoring/scoring.service';
import { ScanEngine } from './scan/scan.service';
import { MonitorService } from './monitor/monitor.service';
import { PredictService } from './predict/predict.service';
import { BenchmarkService } from './benchmark/benchmark.service';
import { ReportEngine } from './reports/report-engine.service';

@Controller('iris')
@UseGuards(AuthGuard('jwt'))
export class IrisController {
  private readonly logger = new Logger(IrisController.name);
  constructor(
    private iris: IrisService,
    private cognitive: CognitiveEngine,
    private scoring: ScoringEngine,
    private scan: ScanEngine,
    private monitor: MonitorService,
    private predict: PredictService,
    private benchmark: BenchmarkService,
    private reports: ReportEngine,
  ) {}

  // ─── INTELLIGENCE OVERVIEW ───
  @Get('intelligence')
  async getIntelligence(@Req() req: any) {
    return this.iris.getOrganizationalIntelligence(req.user.organizationId);
  }

  // ─── IRIS SCAN ───
  @Post('scan/start')
  async startScan(@Req() req: any, @Body() body: { title?: string; categories?: string[] }) {
    try {
      return await this.scan.startScan(req.user.organizationId, req.user.id, body);
    } catch (e: any) {
      this.logger.error(`startScan error: ${e.message}`);
      throw e;
    }
  }

  @Get('scan/:id')
  async getScan(@Param('id') id: string, @Req() req: any) {
    return this.scan.getScan(id, req.user.organizationId);
  }

  @Post('scan/:id/respond')
  async submitResponse(@Param('id') id: string, @Body() body: { questionId: string; response: any }, @Req() req: any) {
    return this.scan.submitResponse(id, body.questionId, body.response, req.user.organizationId);
  }

  @Post('scan/:id/complete')
  async completeScan(@Param('id') id: string, @Req() req: any) {
    return this.scan.completeScan(id, req.user.organizationId);
  }

  @Get('scan/:id/signals')
  async getScanSignals(@Param('id') id: string, @Req() req: any) {
    return this.scan.getDetectedSignals(id, req.user.organizationId);
  }

  // ─── QUESTIONS ───
  @Get('questions')
  async getQuestions(@Query('category') category?: string, @Query('depth') depth?: string) {
    return this.scan.getQuestions(category, depth ? parseInt(depth) : undefined);
  }

  @Get('questions/next/:scanId')
  async getNextQuestion(@Param('scanId') scanId: string, @Req() req: any) {
    return this.scan.getNextQuestion(scanId, req.user.organizationId);
  }

  // ─── SCORING ───
  @Post('scoring/calculate')
  async calculateScores(@Req() req: any, @Body() body: { scanId?: string }) {
    return this.scoring.calculateAllScores(req.user.organizationId, body.scanId);
  }

  @Get('scoring/history')
  async getScoreHistory(@Req() req: any, @Query('days') days?: string) {
    return this.scoring.getScoreHistory(req.user.organizationId, days ? parseInt(days) : 90);
  }

  @Get('scoring/latest')
  async getLatestScores(@Req() req: any) {
    return this.scoring.getLatestScores(req.user.organizationId);
  }

  @Get('scoring/dimensions')
  async getDimensionScores(@Req() req: any) {
    return this.scoring.getAllDimensionScores(req.user.organizationId);
  }

  // ─── SIGNALS ───
  @Get('signals')
  async getSignals(@Req() req: any, @Query('severity') severity?: string, @Query('type') type?: string) {
    return this.iris.getRiskSignals(req.user.organizationId, { severity, type });
  }

  @Post('signals/:id/acknowledge')
  async acknowledgeSignal(@Param('id') id: string, @Req() req: any) {
    return this.iris.acknowledgeSignal(id, req.user.id, req.user.organizationId);
  }

  // ─── ALERTS ───
  @Get('alerts')
  async getAlerts(@Req() req: any) {
    return this.iris.getActiveAlerts(req.user.organizationId);
  }

  @Post('alerts/:id/dismiss')
  async dismissAlert(@Param('id') id: string, @Req() req: any) {
    return this.iris.dismissAlert(id, req.user.organizationId);
  }

  // ─── MONITOR ───
  @Post('monitor/run')
  async runMonitorCycle(@Req() req: any, @Body() body: { frequency?: string }) {
    return this.monitor.runCycle(req.user.organizationId, body.frequency || 'monthly');
  }

  @Get('monitor/cycles')
  async getMonitorCycles(@Req() req: any) {
    return this.monitor.getCycleHistory(req.user.organizationId);
  }

  @Get('monitor/status')
  async getMonitorStatus(@Req() req: any) {
    return this.monitor.getMonitorStatus(req.user.organizationId);
  }

  // ─── PREDICT ───
  @Post('predict/run')
  async runPredictions(@Req() req: any) {
    return this.predict.runAllPredictions(req.user.organizationId);
  }

  @Get('predict/results')
  async getPredictions(@Req() req: any, @Query('model') model?: string) {
    return this.predict.getPredictions(req.user.organizationId, model);
  }

  // ─── BENCHMARK ───
  @Post('benchmark/compare')
  async compareBenchmark(@Req() req: any, @Body() body: { industry?: string; size?: string; region?: string }) {
    return this.benchmark.compare(req.user.organizationId, body);
  }

  @Get('benchmark/position')
  async getBenchmarkPosition(@Req() req: any) {
    return this.benchmark.getPosition(req.user.organizationId);
  }

  // ─── REPORTS ───
  @Post('reports/generate')
  async generateReport(@Req() req: any, @Body() body: { type: string; title?: string }) {
    return this.reports.generate(req.user.organizationId, req.user.id, body.type, body.title);
  }

  @Get('reports')
  async listReports(@Req() req: any) {
    return this.reports.list(req.user.organizationId);
  }

  @Get('reports/:id')
  async getReport(@Param('id') id: string, @Req() req: any) {
    return this.reports.get(id, req.user.organizationId);
  }

  // ─── TIMELINE ───
  @Get('timeline')
  async getTimeline(@Req() req: any, @Query('days') days?: string) {
    return this.iris.getTimeline(req.user.organizationId, days ? parseInt(days) : 90);
  }

  // ─── DASHBOARD ───
  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.iris.getExecutiveDashboard(req.user.organizationId);
  }

  // ─── DOCUMENT INTELLIGENCE ───
  @Post('documents/analyze')
  async analyzeDocument(@Req() req: any, @Body() body: { fileName: string; content: string; fileType: string }) {
    return this.iris.analyzeDocument(req.user.organizationId, req.user.id, body);
  }
}
