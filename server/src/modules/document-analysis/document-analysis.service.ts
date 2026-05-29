import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface AnalyzedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  entities: ExtractedEntity[];
  risks: DetectedRisk[];
  inconsistencies: string[];
  summary: string;
  confidence: number;
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'policy' | 'date' | 'control' | 'compliance' | 'risk';
  value: string;
  context: string;
}

export interface DetectedRisk {
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
}

interface DocumentInput {
  organizationId: string;
  name: string;
  type: string;
  content: string;
  userId?: string;
}

@Injectable()
export class DocumentAnalysisService {
  private readonly logger = new Logger(DocumentAnalysisService.name);
  private readonly GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private prisma: PrismaService) {}

  async analyze(input: DocumentInput): Promise<AnalyzedDocument> {
    const key = process.env.GROQ_KEY;
    const analysis = key ? await this.aiAnalysis(input) : this.ruleBasedAnalysis(input);

    const doc: AnalyzedDocument = {
      id: crypto.randomUUID(),
      name: input.name,
      type: input.type,
      size: input.content.length,
      content: input.content.substring(0, 500),
      entities: analysis.entities || [],
      risks: analysis.risks || [],
      inconsistencies: analysis.inconsistencies || [],
      summary: analysis.summary || 'Análisis completado',
      confidence: analysis.confidence || 70,
    };

    await this.storeAnalysis(input, doc);

    return doc;
  }

  private async aiAnalysis(input: DocumentInput): Promise<Partial<AnalyzedDocument>> {
    const truncated = input.content.substring(0, 8000);
    const prompt = `Analiza este documento de seguridad organizacional y extrae:

1. ENTIDADES: personas, organizaciones, políticas, controles, fechas, riesgos mencionados
2. RIESGOS DETECTADOS: categoría, descripción, severidad, evidencia textual
3. INCONSISTENCIAS: contradicciones internas, información faltante, datos incompletos
4. RESUMEN: síntesis ejecutiva del documento

DOCUMENTO (${input.name}):
${truncated}

Responde en JSON con:
{
  "entities": [{ "type": "person|organization|policy|date|control|compliance|risk", "value": "string", "context": "string" }],
  "risks": [{ "category": "string", "description": "string", "severity": "critical|high|medium|low", "evidence": "string" }],
  "inconsistencies": ["string"],
  "summary": "string",
  "confidence": number
}`;

    try {
      const resp = await fetch(this.GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Eres un analista documental experto en seguridad. Extrae entidades, detecta riesgos, encuentra inconsistencias. Responde SOLO con JSON válido.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 4096,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      return JSON.parse(text.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim());
    } catch (e: any) {
      this.logger.error(`AI Document Analysis error: ${e.message}`);
      return this.ruleBasedAnalysis(input);
    }
  }

  private ruleBasedAnalysis(input: DocumentInput): Partial<AnalyzedDocument> {
    const content = input.content.toLowerCase();
    const entities: ExtractedEntity[] = [];
    const risks: DetectedRisk[] = [];
    const inconsistencies: string[] = [];

    const riskKeywords = [
      { word: 'mfa', risk: 'Autenticación multifactor', severity: 'high' as const },
      { word: 'backup', risk: 'Respaldo de información', severity: 'medium' as const },
      { word: 'encrypt', risk: 'Cifrado de datos', severity: 'high' as const },
      { word: 'password', risk: 'Gestión de contraseñas', severity: 'medium' as const },
      { word: 'vulnerability', risk: 'Gestión de vulnerabilidades', severity: 'critical' as const },
      { word: 'incident', risk: 'Respuesta a incidentes', severity: 'high' as const },
      { word: 'compliance', risk: 'Cumplimiento normativo', severity: 'medium' as const },
      { word: 'audit', risk: 'Auditoría de seguridad', severity: 'low' as const },
      { word: 'training', risk: 'Capacitación en seguridad', severity: 'low' as const },
      { word: 'access control', risk: 'Control de acceso', severity: 'high' as const },
    ];

    for (const { word, risk, severity } of riskKeywords) {
      if (content.includes(word)) {
        risks.push({
          category: 'policy',
          description: `Mención de ${risk}`,
          severity,
          evidence: `Documento contiene referencia a "${word}"`,
        });
      }
    }

    // Detectar entidades básicas
    const orgPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:SAS?|SA|SRL|Ltda|Corp|Inc|LLC)/g;
    let match;
    while ((match = orgPattern.exec(input.content)) !== null) {
      entities.push({ type: 'organization', value: match[1].trim(), context: match[0] });
    }

    return {
      entities,
      risks: risks.slice(0, 10),
      inconsistencies,
      summary: `Análisis offline: ${risks.length} riesgos potenciales identificados, ${entities.length} entidades encontradas.`,
      confidence: 65,
    };
  }

  private async storeAnalysis(input: DocumentInput, doc: AnalyzedDocument): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'DOCUMENT_ANALYZED',
          entity: 'Document',
          entityId: doc.id,
          description: `Documento analizado: ${input.name} (${doc.risks.length} riesgos, ${doc.entities.length} entidades)`,
          userId: input.userId,
          organizationId: input.organizationId,
          metadata: {
            fileName: input.name,
            fileType: input.type,
            risksFound: doc.risks.length,
            entitiesFound: doc.entities.length,
            inconsistencies: doc.inconsistencies.length,
            confidence: doc.confidence,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Could not store document analysis: ${e.message}`);
    }
  }
}
