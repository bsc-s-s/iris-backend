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

    if (!groqKey) {
      const offlineResponse = this.generateOfflineResponse(query, contextData);
      return { response: offlineResponse, model: 'offline', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
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
      const offlineResponse = this.generateOfflineResponse(query, contextData);
      return { response: `[IA no disponible: ${e.message}]\n\n${offlineResponse}`, model: 'offline', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
    }
  }

  async generateReport(assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { organization: true, responses: true, vulnerabilities: true },
    });
    if (!assessment) return { error: 'Assessment not found' };

    const scores = assessment.scores as any;
    const overall = scores?.overall?.avg ? Math.round(scores.overall.avg * 25) : 50;
    const vulns = assessment.vulnerabilities || [];
    const criticalVulns = vulns.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH');

    const report = {
      title: 'Reporte de Evaluación de Riesgo',
      organization: assessment.organization.name,
      methodology: assessment.methodology,
      generatedAt: new Date().toISOString(),
      overallScore: overall,
      vulnerabilities: {
        total: vulns.length,
        critical: criticalVulns.length,
        items: vulns.slice(0, 10).map(v => ({ name: v.name, severity: v.severity, status: v.status })),
      },
      summary: this.generateExecutiveSummary(overall, vulns.length, criticalVulns.length),
      recommendations: this.generateRecommendations(overall, criticalVulns),
    };

    const groqKey = process.env.GROQ_KEY;
    if (!groqKey) return { report, offline: true, message: 'GROQ_KEY no configurada. Reporte generado en modo offline.' };

    const prompt = `Genera un informe ejecutivo de seguridad en español basado en estos datos:
- Organización: ${assessment.organization.name}
- Metodología: ${assessment.methodology}
- Score general: ${overall}/100
- Vulnerabilidades totales: ${vulns.length} (${criticalVulns.length} críticas/altas)

Formato JSON con:
1. Resumen ejecutivo
2. Principales hallazgos
3. Recomendaciones priorizadas
4. Próximos pasos`;

    try {
      const aiResult = await this.analyze({
        organizationId: assessment.organizationId,
        question: prompt,
        contextType: 'assessment',
      });
      return { report, aiAnalysis: aiResult.response };
    } catch {
      return { report, offline: true };
    }
  }

  private generateExecutiveSummary(score: number, totalVulns: number, criticalVulns: number): string {
    if (score >= 80) return `Riesgo controlado. Score ${score}/100. ${totalVulns} vulnerabilidades encontradas (${criticalVulns} críticas).`;
    if (score >= 60) return `Atención requerida. Score ${score}/100. ${totalVulns} vulnerabilidades (${criticalVulns} críticas). Se recomienda revisar controles.`;
    if (score >= 35) return `Riesgo elevado. Score ${score}/100. ${totalVulns} vulnerabilidades (${criticalVulns} críticas). Acción correctiva necesaria.`;
    return `Riesgo crítico. Score ${score}/100. ${totalVulns} vulnerabilidades (${criticalVulns} críticas). Intervención inmediata requerida.`;
  }

  private generateRecommendations(score: number, criticalVulns: any[]): string[] {
    const recs: string[] = [];
    if (criticalVulns.length > 0) {
      recs.push(`[CRÍTICO] Remediación inmediata de ${criticalVulns.length} vulnerabilidades críticas: ${criticalVulns.map(v => v.name).join(', ')}`);
    }
    if (score < 60) recs.push('Revisar y fortalecer controles de seguridad existentes');
    if (score < 40) recs.push('Realizar evaluación de riesgo completa con metodología actualizada');
    recs.push('Establecer plan de mejora continua con KPIs trimestrales');
    recs.push('Programar revisión ejecutiva del perfil de riesgo');
    return recs;
  }

  private generateOfflineResponse(query: AnalystQuery, context: any): string {
    const score = context.assessment?.scores?.overall?.avg ? Math.round(context.assessment.scores.overall.avg * 25) : 50;
    const vulnCount = context.assessment?.vulnerabilities?.length || 0;
    const level = score >= 80 ? 'CRÍTICO' : score >= 60 ? 'ALTO' : score >= 35 ? 'MEDIO' : 'BAJO';

    const responses: Record<string, string> = {
      general: `## Análisis de Riesgo - Nivel ${level}\n\nBasado en los datos disponibles, el nivel de riesgo general es ${level} (Score: ${score}/100).\n\n### Recomendaciones:\n- Monitoreo continuo de indicadores\n- Revisión periódica de controles\n- Actualización del plan de tratamiento de riesgos`,
      assessment: `## Análisis de Evaluación\n\nScore general: ${score}/100 (${level})\nVulnerabilidades identificadas: ${vulnCount}\n\n### Hallazgos Principales:\n- Se requiere revisión de controles críticos\n- Actualizar plan de remediación\n- Programar seguimiento en 30 días`,
      compliance: `## Análisis de Cumplimiento\n\nNivel de cumplimiento estimado: ${level}\n\n### Brechas Identificadas:\n- Revisar controles GDPR aplicables\n- Evaluar conformidad con ISO 27001\n- Documentar políticas de seguridad`,
      threat: `## Simulación de Amenazas\n\nPerfil de amenaza: ${level}\n\n### Vectores Principales:\n- Acceso no autorizado\n- Fuga de datos\n- Incumplimiento normativo`,
      planning: `## Planificación Estratégica\n\nEstado actual: ${level}\n\n### Próximos Pasos:\n1. Evaluación completa de riesgos\n2. Definición de controles prioritarios\n3. Establecimiento de KPIs\n4. Revisión trimestral`,
    };

    return responses[query.contextType] || responses.general;
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
