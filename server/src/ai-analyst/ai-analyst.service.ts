import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AnalystQuery {
  assessmentId?: string;
  organizationId: string;
  question: string;
  contextType: 'general' | 'assessment' | 'compliance' | 'threat' | 'planning';
}

@Injectable()
export class AiAnalystService {
  private readonly logger = new Logger(AiAnalystService.name);

  constructor(private prisma: PrismaService) {}

  async analyze(query: AnalystQuery) {
    const groqKey = process.env.GROQ_KEY;
    if (!groqKey) return { error: 'GROQ_KEY not configured', response: null };

    let contextData: any = {};
    if (query.assessmentId) {
      contextData.assessment = await this.prisma.assessment.findUnique({
        where: { id: query.assessmentId },
        include: { vulnerabilities: true, responses: true },
      });
    }
    if (query.contextType === 'compliance') {
      contextData.regulations = this.getComplianceFramework(query.organizationId);
    }

    const systemPrompt = this.buildSystemPrompt(query.contextType, contextData);
    const userPrompt = this.buildUserPrompt(query, contextData);

    try {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.3,
        }),
      });

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '';

      return {
        response: text,
        model: 'llama-3.3-70b-versatile',
        usage: data.usage,
      };
    } catch (e) {
      this.logger.error('AI Analyst error', e);
      return { error: e.message, response: null };
    }
  }

  async generateReport(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { organization: true, responses: true, vulnerabilities: true },
    });
    if (!assessment) return { error: 'Assessment not found' };

    const scores = assessment.scores as any;
    const prompt = `Genera un informe ejecutivo de seguridad basado en estos datos:
- Organización: ${assessment.organization.name}
- Metodología: ${assessment.methodology}
- Score general: ${scores?.overall?.avg || 'N/A'}/5 (${scores?.overall?.severity || 'N/A'})
- Vulnerabilidades: ${assessment.vulnerabilities.length}
- Respuestas: ${assessment.responses.length}

Formato JSON con:
1. Resumen ejecutivo
2. Principales hallazgos
3. Recomendaciones priorizadas
4. Próximos pasos`;

    return this.analyze({
      organizationId: assessment.organizationId,
      question: prompt,
      contextType: 'general',
    });
  }

  private getComplianceFramework(orgId: string) {
    return {
      standards: ['ISO 27001', 'ISO 31000', 'NIST SP 800-53', 'GDPR', 'LOPDGDD'],
      applicable: ['ISO 31000', 'NIST SP 800-53'],
    };
  }

  private buildSystemPrompt(type: string, context: any): string {
    const base = 'Eres IRIS AI Strategic Analyst, un experto en seguridad integral y análisis de riesgos empresariales. ' +
      'Debes proporcionar análisis profundos, accionables y basados en datos. Responde en español.';

    const prompts: Record<string, string> = {
      general: base,
      assessment: base + ' Analiza los resultados de evaluación y proporciona insights estratégicos basados en los scores y vulnerabilidades identificadas.',
      compliance: base + ' Evalúa el cumplimiento normativo y regulatorio basado en los estándares internacionales. Identifica brechas y recomienda acciones correctivas.',
      threat: base + ' Eres un experto en simulación de amenazas. Analiza escenarios de ataque, evalúa probabilidad e impacto, y recomienda mitigaciones.',
      planning: base + ' Ayuda a crear planes de seguridad estratégicos con hitos, métricas de éxito y asignación de recursos.',
    };

    return prompts[type] || base;
  }

  private buildUserPrompt(query: AnalystQuery, context: any): string {
    let ctx = '';
    if (context.assessment?.scores) {
      const s = context.assessment.scores as any;
      ctx += `\nScore general: ${s.overall?.avg}/5 (${s.overall?.severity})`;
    }
    if (context.assessment?.vulnerabilities?.length) {
      ctx += `\nVulnerabilidades: ${context.assessment.vulnerabilities.map(v => `- ${v.name} (${v.severity})`).join('\n')}`;
    }
    return `${query.question}\n\nContexto:${ctx}`;
  }
}
