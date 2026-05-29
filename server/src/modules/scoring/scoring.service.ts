import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ScoreInput {
  organizationId: string;
  assessmentId?: string;
  humanFactors?: {
    trainingCompletionRate?: number;
    policyAwarenessScore?: number;
    incidentReportRate?: number;
    phishingSusceptibility?: number;
    passwordHygiene?: number;
    mfaAdoption?: number;
  };
  organizationalFactors?: {
    turnoverRate?: number;
    communicationScore?: number;
    leadershipStability?: number;
    policyViolations?: number;
    lateAssessments?: number;
    ignoredRecommendations?: number;
  };
  technicalFactors?: {
    vulnerabilityPatchRate?: number;
    encryptionCoverage?: number;
    accessControlScore?: number;
    monitoringCoverage?: number;
    backupCompliance?: number;
  };
}

export interface ScoreOutput {
  humanRiskScore: number;
  organizationalExposureScore: number;
  behavioralRiskIndex: number;
  complianceMaturityScore: number;
  invisibleRiskIndex: number;
  overallRiskScore: number;
  riskLevel: string;
  categories: Record<string, number>;
  weights: Record<string, number>;
  timestamp: string;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private prisma: PrismaService) {}

  async calculate(input: ScoreInput, useAI = true): Promise<ScoreOutput> {
    const weights = this.getDefaultWeights();

    const humanRisk = this.calculateHumanRisk(input.humanFactors, weights);
    const orgExposure = this.calculateOrgExposure(input.organizationalFactors, weights);
    const behavioralRisk = this.calculateBehavioralRisk(input, weights);
    const complianceMaturity = this.calculateComplianceMaturity(input, weights);
    const invisibleRisk = this.calculateInvisibleRisk(input, weights);

    let aiEnhancement = { invisibleRiskBoost: 0, confidenceAdjustment: 0 };
    if (useAI && process.env.GROQ_KEY) {
      aiEnhancement = await this.aiScoreEnhancement(input, {
        humanRisk, orgExposure, behavioralRisk, complianceMaturity, invisibleRisk,
      });
    }

    const adjustedInvisible = Math.min(100, invisibleRisk + aiEnhancement.invisibleRiskBoost);

    const overall = Math.round(
      humanRisk * weights.humanRisk +
      orgExposure * weights.orgExposure +
      behavioralRisk * weights.behavioralRisk +
      complianceMaturity * weights.complianceMaturity +
      adjustedInvisible * weights.invisibleRisk
    );

    return {
      humanRiskScore: Math.round(humanRisk),
      organizationalExposureScore: Math.round(orgExposure),
      behavioralRiskIndex: Math.round(behavioralRisk),
      complianceMaturityScore: Math.round(complianceMaturity),
      invisibleRiskIndex: Math.round(adjustedInvisible),
      overallRiskScore: overall,
      riskLevel: this.scoreToLevel(overall),
      categories: {
        humanRisk: Math.round(humanRisk),
        organizationalExposure: Math.round(orgExposure),
        behavioralRisk: Math.round(behavioralRisk),
        complianceMaturity: Math.round(complianceMaturity),
        invisibleRisk: Math.round(adjustedInvisible),
      },
      weights,
      timestamp: new Date().toISOString(),
    };
  }

  private getDefaultWeights() {
    return {
      humanRisk: 0.25,
      orgExposure: 0.20,
      behavioralRisk: 0.20,
      complianceMaturity: 0.20,
      invisibleRisk: 0.15,
    };
  }

  private calculateHumanRisk(factors?: ScoreInput['humanFactors'], weights?: any): number {
    if (!factors) return 50;
    const scores: number[] = [];
    if (factors.trainingCompletionRate !== undefined) scores.push(100 - factors.trainingCompletionRate);
    if (factors.policyAwarenessScore !== undefined) scores.push(100 - factors.policyAwarenessScore);
    if (factors.incidentReportRate !== undefined) scores.push(factors.incidentReportRate);
    if (factors.phishingSusceptibility !== undefined) scores.push(factors.phishingSusceptibility);
    if (factors.passwordHygiene !== undefined) scores.push(100 - factors.passwordHygiene);
    if (factors.mfaAdoption !== undefined) scores.push(100 - factors.mfaAdoption);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private calculateOrgExposure(factors?: ScoreInput['organizationalFactors'], weights?: any): number {
    if (!factors) return 50;
    const scores: number[] = [];
    if (factors.turnoverRate !== undefined) scores.push(factors.turnoverRate);
    if (factors.communicationScore !== undefined) scores.push(100 - factors.communicationScore);
    if (factors.leadershipStability !== undefined) scores.push(100 - factors.leadershipStability);
    if (factors.policyViolations !== undefined) scores.push(Math.min(100, factors.policyViolations * 10));
    if (factors.lateAssessments !== undefined) scores.push(Math.min(100, factors.lateAssessments * 15));
    if (factors.ignoredRecommendations !== undefined) scores.push(Math.min(100, factors.ignoredRecommendations * 20));
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private calculateBehavioralRisk(input: ScoreInput, weights?: any): number {
    const human = this.calculateHumanRisk(input.humanFactors, weights);
    const org = this.calculateOrgExposure(input.organizationalFactors, weights);
    return (human * 0.6 + org * 0.4);
  }

  private calculateComplianceMaturity(input: ScoreInput, weights?: any): number {
    const tech = input.technicalFactors;
    if (!tech) return 50;
    const scores: number[] = [];
    if (tech.vulnerabilityPatchRate !== undefined) scores.push(100 - tech.vulnerabilityPatchRate);
    if (tech.encryptionCoverage !== undefined) scores.push(100 - tech.encryptionCoverage);
    if (tech.accessControlScore !== undefined) scores.push(100 - tech.accessControlScore);
    if (tech.monitoringCoverage !== undefined) scores.push(100 - tech.monitoringCoverage);
    if (tech.backupCompliance !== undefined) scores.push(100 - tech.backupCompliance);
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private calculateInvisibleRisk(input: ScoreInput, weights?: any): number {
    const behavioral = this.calculateBehavioralRisk(input, weights);
    const org = this.calculateOrgExposure(input.organizationalFactors, weights);
    const combined = (behavioral * 0.5 + org * 0.3);

    const orgFactors = input.organizationalFactors;
    let hiddenBoost = 0;
    if (orgFactors) {
      if ((orgFactors.turnoverRate ?? 0) > 25) hiddenBoost += 10;
      if ((orgFactors.communicationScore ?? 100) < 40) hiddenBoost += 10;
      if ((orgFactors.leadershipStability ?? 100) < 30) hiddenBoost += 15;
      if ((orgFactors.ignoredRecommendations ?? 0) > 3) hiddenBoost += 10;
    }
    return Math.min(100, combined + hiddenBoost);
  }

  private async aiScoreEnhancement(input: ScoreInput, scores: any): Promise<{ invisibleRiskBoost: number; confidenceAdjustment: number }> {
    try {
      const key = process.env.GROQ_KEY;
      if (!key) return { invisibleRiskBoost: 0, confidenceAdjustment: 0 };

      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Eres un evaluador de riesgos. Analiza scores y factores organizacionales para ajustar el riesgo invisible. Responde JSON con invisibleRiskBoost (0-30) y confidenceAdjustment (-10 a 10).' },
            { role: 'user', content: JSON.stringify({ scores, factors: input }) },
          ],
          max_tokens: 500,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '{}';
      const result = JSON.parse(text);
      return {
        invisibleRiskBoost: Math.min(30, Math.max(0, result.invisibleRiskBoost || 0)),
        confidenceAdjustment: Math.min(10, Math.max(-10, result.confidenceAdjustment || 0)),
      };
    } catch {
      return { invisibleRiskBoost: 0, confidenceAdjustment: 0 };
    }
  }

  private scoreToLevel(score: number): string {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 35) return 'medium';
    if (score >= 15) return 'low';
    return 'strategic';
  }
}
