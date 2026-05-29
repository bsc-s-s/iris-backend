import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ThinkingInput {
  organizationId: string;
  assessmentId?: string;
  responses?: any[];
  documents?: any[];
  contextType: 'assessment' | 'document_review' | 'behavioral' | 'compliance' | 'full_audit';
  userId?: string;
}

export interface ThinkingOutput {
  reasoning: string;
  findings: Finding[];
  contradictions: Contradiction[];
  invisibleRisks: InvisibleRisk[];
  signals: WeakSignal[];
  confidenceScore: number;
  riskScore: number;
  recommendations: string[];
  maturityLevel: string;
}

export interface Finding {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
}

export interface Contradiction {
  id: string;
  type: 'statement_vs_document' | 'statement_vs_statement' | 'behavior_vs_policy' | 'temporal';
  description: string;
  sourceA: string;
  sourceB: string;
  severity: 'critical' | 'high' | 'medium';
  confidence: number;
}

export interface InvisibleRisk {
  id: string;
  category: string;
  title: string;
  description: string;
  indicators: string[];
  estimatedExposure: number;
  confidence: number;
}

export interface WeakSignal {
  id: string;
  type: string;
  signal: string;
  evidence: string;
  potentialImpact: string;
  confidence: number;
}

@Injectable()
export class ThinkingEngineService {
  private readonly logger = new Logger(ThinkingEngineService.name);

  private readonly GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly MODEL = 'llama-3.3-70b-versatile';

  constructor(
    private prisma: PrismaService,
  ) {}

  async analyze(input: ThinkingInput): Promise<ThinkingOutput> {
    const context = await this.buildContext(input);

    const prompt = this.buildThinkingPrompt(input, context);

    try {
      const raw = await this.callGroq([
        { role: 'system', content: this.systemPrompt() },
        { role: 'user', content: prompt },
      ]);

      const parsed = this.parseResponse(raw);
      await this.storeResults(input, parsed);
      return parsed;
    } catch (e) {
      this.logger.error(`Thinking Engine error: ${e.message}`);
      return this.fallbackAnalysis(input, context);
    }
  }

  private systemPrompt(): string {
    return `Eres IRIS Thinking Engine, un analista senior de riesgo organizacional, investigador y auditor.

Debes analizar la información disponible y producir un análisis estructurado en JSON.

TU TRABAJO:
1. INGESTA - Procesa respuestas, documentos, metadata organizacional
2. ANÁLISIS - Encuentra correlaciones, contradicciones, patrones de exposición
3. INFERENCIA - Detecta riesgos invisibles y señales débiles
4. SCORING - Calcula scores de riesgo organizacional
5. CONCLUSIÓN - Genera hallazgos y recomendaciones ejecutivas

NO actúes como chatbot. Actúa como analista investigador.

Devuelve exclusivamente JSON con esta estructura:
{
  "reasoning": "string - análisis paso a paso interno",
  "findings": [{ "id": "string", "type": "string", "severity": "critical|high|medium|low", "title": "string", "description": "string", "evidence": ["string"], "confidence": 0-100 }],
  "contradictions": [{ "id": "string", "type": "statement_vs_document|statement_vs_statement|behavior_vs_policy|temporal", "description": "string", "sourceA": "string", "sourceB": "string", "severity": "critical|high|medium", "confidence": 0-100 }],
  "invisibleRisks": [{ "id": "string", "category": "string", "title": "string", "description": "string", "indicators": ["string"], "estimatedExposure": 0-100, "confidence": 0-100 }],
  "signals": [{ "id": "string", "type": "string", "signal": "string", "evidence": "string", "potentialImpact": "string", "confidence": 0-100 }],
  "confidenceScore": 0-100,
  "riskScore": 0-100,
  "recommendations": ["string"],
  "maturityLevel": "critical|high|medium|low|strategic"
}`;
  }

  private buildThinkingPrompt(input: ThinkingInput, context: any): string {
    let sections = `## ANÁLISIS DE RIESGO ORGANIZACIONAL\n\n`;
    sections += `Contexto: ${input.contextType}\n`;
    sections += `Organización: ${context.organization?.name || 'N/A'}\n`;

    if (context.assessment) {
      sections += `\n## EVALUACIÓN\n`;
      sections += JSON.stringify(context.assessment.scores || {}, null, 2);
      sections += `\nRespuestas: ${JSON.stringify(context.assessment.responses?.slice(0, 20) || [])}\n`;
      sections += `Vulnerabilidades: ${JSON.stringify(context.assessment.vulnerabilities || [])}\n`;
    }

    if (context.documents && context.documents.length > 0) {
      sections += `\n## DOCUMENTOS ANALIZADOS\n`;
      for (const doc of context.documents) {
        sections += `\n--- ${doc.name} ---\n`;
        sections += `${doc.content?.substring(0, 3000)}\n`;
        sections += `Entidades extraídas: ${JSON.stringify(doc.entities || [])}\n`;
      }
    }

    if (context.historical) {
      sections += `\n## PATRONES HISTÓRICOS\n`;
      sections += JSON.stringify(context.historical, null, 2);
    }

    sections += `\n\n## INSTRUCCIÓN\nAnaliza profundamente esta información. Identifica contradicciones entre respuestas y documentos, detecta señales de riesgo invisible, evalúa la madurez organizacional. Genera hallazgos con evidencia específica.`;

    return sections;
  }

  private async buildContext(input: ThinkingInput): Promise<any> {
    const ctx: any = {};

    ctx.organization = await this.prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, name: true, slug: true, plan: true, gdprCompliant: true, iso27001Compliant: true },
    });

    if (input.assessmentId) {
      ctx.assessment = await this.prisma.assessment.findUnique({
        where: { id: input.assessmentId },
        include: {
          responses: true,
          vulnerabilities: true,
          organization: { select: { name: true } },
        },
      });
    }

    ctx.historical = await this.getHistoricalPatterns(input.organizationId);

    return ctx;
  }

  private async getHistoricalPatterns(orgId: string): Promise<any> {
    const recentAssessments = await this.prisma.assessment.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, scores: true, status: true, createdAt: true, methodology: true },
    });

    const recentAudits = await this.prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { action: true, createdAt: true, result: true },
    });

    return {
      assessments: recentAssessments,
      recentActivity: recentAudits,
      totalAssessments: recentAssessments.length,
    };
  }

  private parseResponse(raw: string): ThinkingOutput {
    try {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        reasoning: parsed.reasoning || '',
        findings: parsed.findings || [],
        contradictions: parsed.contradictions || [],
        invisibleRisks: parsed.invisibleRisks || [],
        signals: parsed.signals || [],
        confidenceScore: parsed.confidenceScore ?? 75,
        riskScore: parsed.riskScore ?? 50,
        recommendations: parsed.recommendations || [],
        maturityLevel: parsed.maturityLevel || 'medium',
      };
    } catch {
      return this.fallbackParse(raw);
    }
  }

  private fallbackParse(raw: string): ThinkingOutput {
    return {
      reasoning: raw.substring(0, 2000),
      findings: [{
        id: 'finding-1',
        type: 'analysis',
        severity: 'medium',
        title: 'Análisis completado (parseo manual)',
        description: 'La respuesta de IA se incluye como reasoning.',
        evidence: ['Respuesta cruda de IA'],
        confidence: 60,
      }],
      contradictions: [],
      invisibleRisks: [],
      signals: [],
      confidenceScore: 60,
      riskScore: 50,
      recommendations: ['Revisar el análisis completo en la sección de razonamiento'],
      maturityLevel: 'medium',
    };
  }

  private fallbackAnalysis(input: ThinkingInput, context: any): ThinkingOutput {
    const totalVulns = context.assessment?.vulnerabilities?.length || 0;
    const scores = context.assessment?.scores as any;
    const avgScore = scores?.overall?.avg ? Math.round(scores.overall.avg * 25) : 50;

    return {
      reasoning: 'IRIS Thinking Engine ejecutó análisis offline basado en datos estructurados.',
      findings: [{
        id: 'f-offline-1',
        type: 'risk_assessment',
        severity: avgScore >= 70 ? 'critical' : avgScore >= 50 ? 'high' : 'medium',
        title: `Score de riesgo: ${avgScore}/100`,
        description: `Basado en ${totalVulns} vulnerabilidades identificadas.`,
        evidence: [`Score: ${avgScore}`, `Vulnerabilidades: ${totalVulns}`],
        confidence: 70,
      }],
      contradictions: [],
      invisibleRisks: [],
      signals: [],
      confidenceScore: 70,
      riskScore: avgScore,
      recommendations: [
        totalVulns > 0 ? `Remediación de ${totalVulns} vulnerabilidades` : 'Continuar monitoreo',
        'Revisar controles de seguridad periódicamente',
        'Actualizar evaluación de riesgo',
      ],
      maturityLevel: avgScore >= 80 ? 'strategic' : avgScore >= 60 ? 'low' : avgScore >= 35 ? 'high' : 'critical',
    };
  }

  private async callGroq(messages: { role: string; content: string }[]): Promise<string> {
    const key = process.env.GROQ_KEY;
    if (!key) throw new Error('GROQ_KEY no configurada');

    const resp = await fetch(this.GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages,
        max_tokens: 8192,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Groq API error');
    return data.choices?.[0]?.message?.content || '{}';
  }

  private async storeResults(input: ThinkingInput, output: ThinkingOutput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'AI_THINKING_ANALYSIS',
          entity: 'Assessment',
          entityId: input.assessmentId || 'unknown',
          description: `IRIS Thinking Engine: ${output.findings.length} hallazgos, ${output.contradictions.length} contradicciones, ${output.invisibleRisks.length} riesgos invisibles`,
          userId: input.userId,
          organizationId: input.organizationId,
          metadata: {
            confidenceScore: output.confidenceScore,
            riskScore: output.riskScore,
            maturityLevel: output.maturityLevel,
            findingsCount: output.findings.length,
            contradictionsCount: output.contradictions.length,
            invisibleRisksCount: output.invisibleRisks.length,
            contextType: input.contextType,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Could not store analysis results: ${e.message}`);
    }
  }
}
