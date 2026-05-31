import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CognitiveEngine } from '../engine/cognitive-engine.service';

const SEED_QUESTIONS = [
  { text: 'Do you have a complete inventory of all critical business processes?', category: 'blind_spot', subCategory: 'process_awareness', weight: 1.0, depth: 1, adaptive: true },
  { text: 'Are there processes that only one person knows how to execute?', category: 'key_person', subCategory: 'single_point_failure', weight: 1.2, depth: 1, adaptive: true },
  { text: 'When was the last time you tested your incident response plan?', category: 'protocol_erosion', subCategory: 'incident_response', weight: 1.1, depth: 1, adaptive: true },
  { text: 'Do teams consistently follow documented procedures?', category: 'protocol_erosion', subCategory: 'adherence', weight: 1.0, depth: 1, adaptive: true },
  { text: 'How confident are you that critical operations would survive the loss of a key employee?', category: 'key_person', subCategory: 'succession', weight: 1.3, depth: 2, adaptive: true },
  { text: 'Do you have a culture of psychological safety where problems are reported early?', category: 'cultural_degradation', subCategory: 'psychological_safety', weight: 1.1, depth: 1, adaptive: true },
  { text: 'Are there warning signs being ignored because "it has always worked"?', category: 'overconfidence', subCategory: 'complacency', weight: 1.2, depth: 2, adaptive: true },
  { text: 'How would you rate your governance and compliance framework effectiveness?', category: 'governance_weakness', subCategory: 'framework', weight: 1.0, depth: 1, adaptive: true },
  { text: 'What percentage of institutional knowledge is documented vs. held by individuals?', category: 'knowledge_concentration', subCategory: 'documentation', weight: 1.2, depth: 2, adaptive: true },
  { text: 'How resilient is your supply chain to disruption?', category: 'operational_fragility', subCategory: 'supply_chain', weight: 1.1, depth: 1, adaptive: true },
  { text: 'Are strategic decisions data-driven or intuition-based?', category: 'strategic_misalignment', subCategory: 'decision_making', weight: 1.0, depth: 1, adaptive: true },
  { text: 'How quickly can you detect abnormal operations?', category: 'resilience_capacity', subCategory: 'detection', weight: 1.1, depth: 2, adaptive: true },
  { text: 'Do you have a succession plan for every critical role?', category: 'key_person', subCategory: 'succession_planning', weight: 1.3, depth: 2, adaptive: true },
  { text: 'How often do teams bypass established protocols to "get things done"?', category: 'protocol_erosion', subCategory: 'bypass', weight: 1.2, depth: 2, adaptive: true },
  { text: 'Is there a healthy tension between innovation and risk management?', category: 'cultural_degradation', subCategory: 'innovation_risk', weight: 1.0, depth: 2, adaptive: true },
  { text: 'What metrics do you use to measure organizational health?', category: 'blind_spot', subCategory: 'metrics', weight: 0.9, depth: 2, adaptive: true },
  { text: 'How many single points of failure exist in your critical infrastructure?', category: 'operational_fragility', subCategory: 'spof', weight: 1.3, depth: 2, adaptive: true },
  { text: 'Do you have visibility into shadow IT across the organization?', category: 'governance_weakness', subCategory: 'shadow_it', weight: 1.1, depth: 2, adaptive: true },
  { text: 'How would you rate cross-departmental collaboration?', category: 'cultural_degradation', subCategory: 'collaboration', weight: 0.9, depth: 1, adaptive: true },
  { text: 'What early warning systems do you have for emerging risks?', category: 'resilience_capacity', subCategory: 'early_warning', weight: 1.1, depth: 2, adaptive: true },
  { text: 'How much would it cost to replace your top 3 knowledge holders?', category: 'knowledge_concentration', subCategory: 'replacement_cost', weight: 1.2, depth: 3, adaptive: false },
  { text: 'Is there a systematic process for learning from failures?', category: 'cultural_degradation', subCategory: 'learning', weight: 1.0, depth: 2, adaptive: true },
  { text: 'Are you aware of regulatory changes that could impact your business?', category: 'governance_weakness', subCategory: 'regulatory', weight: 1.0, depth: 1, adaptive: true },
  { text: 'How aligned is your technology roadmap with business strategy?', category: 'strategic_misalignment', subCategory: 'technology_alignment', weight: 1.0, depth: 2, adaptive: true },
  { text: 'What would you identify as your organization\'s biggest blind spot?', category: 'blind_spot', subCategory: 'self_assessment', weight: 1.0, depth: 3, adaptive: false },
  { text: 'How long could your organization operate without its CEO?', category: 'key_person', subCategory: 'ceo_dependency', weight: 1.3, depth: 3, adaptive: false },
  { text: 'Are there known risks that leadership chooses not to address?', category: 'overconfidence', subCategory: 'risk_denial', weight: 1.2, depth: 3, adaptive: false },
  { text: 'Do you have a culture of reporting near-misses?', category: 'cultural_degradation', subCategory: 'near_miss', weight: 1.0, depth: 2, adaptive: true },
  { text: 'How quickly can you redeploy resources in response to crisis?', category: 'resilience_capacity', subCategory: 'resource_agility', weight: 1.1, depth: 2, adaptive: true },
  { text: 'Is compliance seen as a checkbox or a strategic advantage?', category: 'governance_weakness', subCategory: 'compliance', weight: 0.9, depth: 2, adaptive: true },
  { text: 'What is your bus-factor for critical project delivery?', category: 'knowledge_concentration', subCategory: 'bus_factor', weight: 1.3, depth: 3, adaptive: false },
  { text: 'How would your organization withstand a 30-day leadership vacuum?', category: 'key_person', subCategory: 'leadership_continuity', weight: 1.3, depth: 3, adaptive: false },
];

@Injectable()
export class ScanEngine {
  private readonly logger = new Logger(ScanEngine.name);

  constructor(
    private prisma: PrismaService,
    private cognitive: CognitiveEngine,
  ) {}

  async startScan(orgId: string, userId: string, opts: { title?: string; categories?: string[] }) {
    let questions = SEED_QUESTIONS;
    if (opts.categories && opts.categories.length > 0) {
      questions = questions.filter(q => opts.categories!.includes(q.category));
    }

    await this.prisma.irisQuestion.createMany({ data: questions });
    const questionRecords = await this.prisma.irisQuestion.findMany({
      where: { category: { in: [...new Set(questions.map(q => q.category))] } },
    });

    const scan = await this.prisma.irisScan.create({
      data: {
        title: opts.title || 'Organizational Intelligence Scan',
        organizationId: orgId,
        createdById: userId,
        totalQuestions: questionRecords.length,
      },
    });

    await this.prisma.activity.create({
      data: {
        type: 'scan_completed',
        title: 'IRIS Scan initiated',
        description: `New organizational intelligence scan started with ${questionRecords.length} questions`,
        organizationId: orgId,
        userId,
        metadata: { scanId: scan.id, questionCount: questionRecords.length },
      },
    });

    return { ...scan, questions: questionRecords };
  }

  async getScan(id: string, orgId: string) {
    const scan = await this.prisma.irisScan.findFirst({
      where: { id, organizationId: orgId },
      include: {
        responses: { include: { question: true }, orderBy: { createdAt: 'asc' } },
        scores: true,
        signals: true,
      },
    });
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  async submitResponse(scanId: string, questionId: string, response: any, orgId: string) {
    const scan = await this.prisma.irisScan.findFirst({ where: { id: scanId, organizationId: orgId } });
    if (!scan) throw new NotFoundException('Scan not found');
    if (scan.status !== 'in_progress') throw new BadRequestException('Scan is not active');

    const resp = await this.prisma.irisResponse.create({
      data: {
        questionId,
        response,
        latency: response.latency,
        hesitation: response.hesitation,
        corrections: response.corrections,
        scanId,
      },
    });

    await this.prisma.irisScan.update({
      where: { id: scanId },
      data: { currentQuestion: scan.currentQuestion + 1 },
    });

    return resp;
  }

  async completeScan(scanId: string, orgId: string) {
    const scan = await this.prisma.irisScan.findFirst({
      where: { id: scanId, organizationId: orgId },
      include: { responses: { include: { question: true } } },
    });
    if (!scan) throw new NotFoundException('Scan not found');

    const analysis = await this.cognitive.analyzeScanResponses(
      scan.responses.map(r => ({
        question: r.question,
        response: r.response as any,
        latency: r.latency || undefined,
        hesitation: r.hesitation || undefined,
        corrections: r.corrections || undefined,
      })),
    );

    if (analysis.signals.length > 0) {
      await this.prisma.riskSignal.createMany({
        data: analysis.signals.slice(0, 20).map(signal => ({
          type: signal.type || 'pattern',
          category: signal.category || 'anomaly',
          title: signal.title,
          description: signal.description,
          severity: signal.severity || 'medium',
          confidence: signal.confidence || 0.6,
          source: 'scan',
          metadata: signal.metadata || {},
          organizationId: orgId,
          scanId: scan.id,
        })),
      });
    }

    const updated = await this.prisma.irisScan.update({
      where: { id: scanId },
      data: { status: 'completed', completedAt: new Date() },
    });

    await this.prisma.activity.create({
      data: {
        type: 'scan_completed',
        title: 'IRIS Scan completed',
        description: `Scan completed with ${analysis.signals.length} risk signals detected`,
        severity: analysis.signals.filter(s => s.severity === 'critical' || s.severity === 'high').length > 0 ? 'high' : 'info',
        organizationId: orgId,
        metadata: { scanId: scan.id, signalsCount: analysis.signals.length, patterns: analysis.patterns },
      },
    });

    return { scan: updated, analysis };
  }

  async getDetectedSignals(scanId: string, orgId: string) {
    const scan = await this.prisma.irisScan.findFirst({ where: { id: scanId, organizationId: orgId } });
    if (!scan) throw new NotFoundException('Scan not found');
    return this.prisma.riskSignal.findMany({ where: { scanId }, orderBy: { detectedAt: 'desc' } });
  }

  async getQuestions(category?: string, depth?: number) {
    const where: any = {};
    if (category) where.category = category;
    if (depth) where.depth = depth;
    return this.prisma.irisQuestion.findMany({ where, orderBy: { depth: 'asc' } });
  }

  async getNextQuestion(scanId: string, orgId: string) {
    const scan = await this.prisma.irisScan.findFirst({
      where: { id: scanId, organizationId: orgId },
      include: { responses: { include: { question: true } } },
    });
    if (!scan) throw new NotFoundException('Scan not found');

    const answeredIds = new Set(scan.responses.map(r => r.questionId));
    const allDbQuestions = await this.prisma.irisQuestion.findMany({ orderBy: { depth: 'asc' } });
    const remaining = allDbQuestions.filter(q => !answeredIds.has(q.id));

    const answered = scan.responses.map(r => ({ ...r.question, responseValue: (r.response as any)?.value }));
    const lowScores = answered.filter(r => typeof r.responseValue === 'number' && r.responseValue <= 2);

    if (remaining.length === 0) return { question: null, progress: 1, total: allDbQuestions.length };

    const weakCategories = new Set(lowScores.map(r => r.category));
    const prioritized = remaining.sort((a, b) => {
      const aWeak = weakCategories.has(a.category) ? 1 : 0;
      const bWeak = weakCategories.has(b.category) ? 1 : 0;
      if (aWeak !== bWeak) return bWeak - aWeak;
      const aDepthScore = lowScores.filter(r => r.category === a.category).length * a.depth;
      const bDepthScore = lowScores.filter(r => r.category === b.category).length * b.depth;
      return bDepthScore - aDepthScore;
    });

    const next = prioritized[0];
    return {
      question: next,
      progress: answeredIds.size / allDbQuestions.length,
      answered: answeredIds.size,
      total: allDbQuestions.length,
      remaining: remaining.length,
    };
  }

  async seedQuestions() {
    const existing = await this.prisma.irisQuestion.count();
    if (existing > 0) return { count: existing, skipped: true };
    await this.prisma.irisQuestion.createMany({ data: SEED_QUESTIONS });
    return { count: SEED_QUESTIONS.length, skipped: false };
  }
}
