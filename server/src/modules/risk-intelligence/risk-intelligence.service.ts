import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ThinkingEngineService, ThinkingInput, ThinkingOutput } from '../thinking-engine/thinking-engine.service';
import { DocumentAnalysisService, AnalyzedDocument } from '../document-analysis/document-analysis.service';
import { ScoringService, ScoreOutput, ScoreInput } from '../scoring/scoring.service';

export interface IntelligenceReport {
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  thinking: ThinkingOutput;
  documents: AnalyzedDocument[];
  scores: ScoreOutput;
  executiveSummary: string;
  criticalFindings: any[];
  recommendations: string[];
  riskLevel: string;
}

@Injectable()
export class RiskIntelligenceService {
  private readonly logger = new Logger(RiskIntelligenceService.name);

  constructor(
    private prisma: PrismaService,
    private thinkingEngine: ThinkingEngineService,
    private documentAnalysis: DocumentAnalysisService,
    private scoring: ScoringService,
  ) {}

  async generateFullReport(orgId: string, options?: {
    assessmentId?: string;
    documents?: { name: string; content: string; type?: string }[];
    userId?: string;
  }): Promise<IntelligenceReport> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });

    const thinkingInput: ThinkingInput = {
      organizationId: orgId,
      assessmentId: options?.assessmentId,
      contextType: 'full_audit',
      userId: options?.userId,
    };

    const [thinkingResult, docResults, scoresResult] = await Promise.all([
      this.thinkingEngine.analyze(thinkingInput),
      Promise.all(
        (options?.documents || []).map(d =>
          this.documentAnalysis.analyze({
            organizationId: orgId,
            userId: options?.userId,
            name: d.name,
            type: d.type || 'txt',
            content: d.content,
          })
        )
      ),
      this.loadScoringFromData(orgId, options?.assessmentId),
    ]);

    const criticalFindings = [
      ...thinkingResult.findings.filter(f => f.severity === 'critical'),
      ...thinkingResult.contradictions.filter(c => c.severity === 'critical').map(c => ({
        type: 'contradiction',
        description: c.description,
        severity: c.severity,
        confidence: c.confidence,
      })),
      ...thinkingResult.invisibleRisks.filter(r => r.estimatedExposure > 70).map(r => ({
        type: 'invisible_risk',
        description: r.title,
        severity: 'critical' as const,
        confidence: r.confidence,
      })),
    ];

    const executiveSummary = this.buildExecutiveSummary(
      thinkingResult,
      scoresResult,
      docResults,
    );

    return {
      organizationId: orgId,
      organizationName: org?.name || 'Unknown',
      generatedAt: new Date().toISOString(),
      thinking: thinkingResult,
      documents: docResults,
      scores: scoresResult,
      executiveSummary,
      criticalFindings,
      recommendations: thinkingResult.recommendations,
      riskLevel: scoresResult.riskLevel,
    };
  }

  private async loadScoringFromData(orgId: string, assessmentId?: string): Promise<ScoreOutput> {
    let assessmentFactors: any = {};

    if (assessmentId) {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: { vulnerabilities: true },
      });
      if (assessment) {
        const scores = assessment.scores as any;
        assessmentFactors = {
          vulnerabilityCount: assessment.vulnerabilities.length,
          avgScore: scores?.overall?.avg ? Math.round(scores.overall.avg * 25) : 50,
        };
      }
    }

    const scoreInput: ScoreInput = {
      organizationId: orgId,
      assessmentId,
      organizationalFactors: {
        lateAssessments: assessmentFactors.vulnerabilityCount || 0,
        ignoredRecommendations: Math.floor((assessmentFactors.vulnerabilityCount || 0) / 3),
      },
    };

    return this.scoring.calculate(scoreInput, true);
  }

  private buildExecutiveSummary(thinking: ThinkingOutput, scores: ScoreOutput, docs: AnalyzedDocument[]): string {
    const parts: string[] = [];
    parts.push(`## Resumen Ejecutivo de Riesgo`);
    parts.push(`Score General: ${scores.overallRiskScore}/100 (${scores.riskLevel.toUpperCase()})`);
    parts.push(``);
    parts.push(`### Scores Clave`);
    parts.push(`- Riesgo Humano: ${scores.humanRiskScore}/100`);
    parts.push(`- Exposición Organizacional: ${scores.organizationalExposureScore}/100`);
    parts.push(`- Índice de Riesgo Conductual: ${scores.behavioralRiskIndex}/100`);
    parts.push(`- Madurez de Cumplimiento: ${scores.complianceMaturityScore}/100`);
    parts.push(`- Riesgo Invisible: ${scores.invisibleRiskIndex}/100`);
    parts.push(``);
    parts.push(`### Hallazgos Críticos: ${thinking.findings.filter(f => f.severity === 'critical').length}`);
    parts.push(`### Contradicciones: ${thinking.contradictions.length}`);
    parts.push(`### Riesgos Invisibles: ${thinking.invisibleRisks.length}`);
    parts.push(`### Documentos Analizados: ${docs.length}`);
    return parts.join('\n');
  }
}
