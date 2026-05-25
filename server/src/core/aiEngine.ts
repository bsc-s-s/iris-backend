export interface InsightRequest {
  assessmentId?: string;
  organizationId: string;
  question: string;
  contextType: 'general' | 'assessment' | 'compliance' | 'threat' | 'planning';
  riskData?: {
    overallScore?: number;
    categories?: Record<string, number>;
    factors?: string[];
  };
}

export interface InsightResult {
  response: string;
  model: string;
  tokensUsed: number;
  timestamp: string;
}

export class AiEngine {
  private readonly GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
  private readonly MODEL = 'llama-3.3-70b-versatile';

  private readonly SYSTEM_PROMPTS: Record<string, string> = {
    general: `Eres un analista de riesgo corporativo experto. Proporciona análisis claros y procesables sobre temas de seguridad empresarial, riesgo organizacional y estrategias de mitigación.`,
    assessment: `Eres un evaluador de riesgos senior. Analiza evaluaciones de seguridad y genera reportes profesionales con hallazgos, scoring y recomendaciones accionables.`,
    compliance: `Eres un auditor de cumplimiento normativo experto en GDPR, ISO 27001, ISO 31000 y regulaciones latinoamericanas. Evalúa el nivel de cumplimiento y sugiere mejoras concretas.`,
    threat: `Eres un analista de inteligencia de amenazas. Evalúa vectores de ataque, probabilidades de incidentes y recomienda controles de seguridad específicos.`,
    planning: `Eres un consultor de planificación estratégica en seguridad. Genera roadmaps, presupuestos y KPIs alineados con mejores prácticas internacionales.`,
  };

  async generateInsight(request: InsightRequest): Promise<InsightResult> {
    const systemPrompt = this.SYSTEM_PROMPTS[request.contextType] || this.SYSTEM_PROMPTS.general;
    const userPrompt = this.buildUserPrompt(request);
    const groqKey = process.env.GROQ_KEY;

    if (!groqKey) {
      return {
        response: `[AI Engine] GROQ_KEY no configurada. Para habilitar análisis IA, configura la variable de entorno GROQ_KEY.\n\nAnálisis fuera de línea:\n${this.generateOfflineResponse(request)}`,
        model: this.MODEL,
        tokensUsed: 0,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const resp = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || 'Groq API error');

      return {
        response: data.choices?.[0]?.message?.content || 'No response generated',
        model: this.MODEL,
        tokensUsed: data.usage?.total_tokens || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        response: `Error al conectar con IA: ${error.message}. Usando análisis fuera de línea:\n${this.generateOfflineResponse(request)}`,
        model: this.MODEL,
        tokensUsed: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private buildUserPrompt(request: InsightRequest): string {
    const parts: string[] = [request.question];

    if (request.riskData) {
      parts.push('\n\nContexto de riesgo actual:');
      if (request.riskData.overallScore !== undefined) {
        parts.push(`- Score general: ${request.riskData.overallScore}/100`);
      }
      if (request.riskData.categories) {
        parts.push('- Categorías:');
        for (const [cat, score] of Object.entries(request.riskData.categories)) {
          parts.push(`  * ${cat}: ${score}/100`);
        }
      }
      if (request.riskData.factors?.length) {
        parts.push(`- Factores identificados: ${request.riskData.factors.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  private generateOfflineResponse(request: InsightRequest): string {
    const score = request.riskData?.overallScore ?? 50;
    const level = score >= 80 ? 'CRÍTICO' : score >= 60 ? 'ALTO' : score >= 35 ? 'MEDIO' : 'BAJO';
    return [
      `Análisis de Riesgo - Nivel ${level} (Score: ${score}/100)`,
      '',
      'Recomendaciones generales:',
      score >= 60 ? '- Se requiere intervención inmediata en las áreas críticas detectadas' : '- Monitoreo continuo de los indicadores de riesgo',
      '- Revisar controles de seguridad existentes',
      '- Actualizar plan de tratamiento de riesgos',
      score >= 35 ? '- Programar revisión ejecutiva del perfil de riesgo' : '- Mantener las prácticas actuales de gestión de riesgo',
    ].join('\n');
  }
}
