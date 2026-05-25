import { RiskEngine } from './riskEngine';
import { AiEngine } from './aiEngine';
import { PatternDetectionEngine } from './patternDetection';
import { PredictionEngine } from './predictionEngine';
import { CorrelationEngine } from './correlationEngine';
import { AnomalyDetectionEngine } from './anomalyEngine';

export class RiskIntelligenceService {
  constructor(
    private riskEngine: RiskEngine,
    private aiEngine: AiEngine,
    private patternEngine: PatternDetectionEngine,
    private predictionEngine: PredictionEngine,
    private correlationEngine: CorrelationEngine,
    private anomalyEngine: AnomalyDetectionEngine,
  ) {}

  async comprehensiveAnalysis(input: {
    organizationId: string;
    categoryScores?: Record<string, number>;
    factors?: any[];
    orgProfile?: any;
    historicalScores?: { date: string; score: number }[];
    incidents?: any[];
    userActivity?: any[];
    metrics?: any[];
    events?: any[];
  }) {
    const [riskResult, forecastResult, patternResult, correlationResult, anomalyResult] = await Promise.all([
      Promise.resolve(this.riskEngine.calculateScore({
        organizationId: input.organizationId,
        categoryScores: input.categoryScores,
        factors: input.factors,
        orgProfile: input.orgProfile,
        historicalData: input.historicalScores?.map(s => ({ ...s, category: 'operational' as any })),
      })),
      Promise.resolve(this.predictionEngine.forecast({
        historicalScores: input.historicalScores || [],
        organizationId: input.organizationId,
        orgProfile: {
          protocolCoverage: input.orgProfile?.protocolCount || 0,
          vulnerabilityCount: input.orgProfile?.incidentCount || 0,
          incidentTrend: 0,
          assessmentFrequency: input.orgProfile?.assessmentCount || 0,
        },
      })),
      Promise.resolve(this.patternEngine.analyze({
        events: input.events || [],
        metrics: input.metrics || [],
        timeRange: {
          start: new Date(Date.now() - 90 * 86400000).toISOString(),
          end: new Date().toISOString(),
        },
        orgProfile: {
          userCount: input.orgProfile?.userCount || 0,
          activeUsers: input.orgProfile?.userCount || 0,
          weakLeadership: input.orgProfile?.leadershipStability !== undefined && input.orgProfile.leadershipStability < 50,
          highTurnover: input.orgProfile?.turnoverRate !== undefined && input.orgProfile.turnoverRate > 20,
          smallIncidents: input.incidents?.filter((i: any) => i.severity === 'LOW' || i.severity === 'MEDIUM').length || 0,
          fragmentedCommunication: input.orgProfile?.communicationScore !== undefined && input.orgProfile.communicationScore < 40,
          policyViolations: input.incidents?.filter((i: any) => i.type === 'policy_violation').length || 0,
          lateAssessments: input.orgProfile?.lateAssessments || 0,
          ignoredRecommendations: input.orgProfile?.ignoredRecommendations || 0,
        },
      })),
      Promise.resolve(this.correlationEngine.analyze({
        categoryScores: input.categoryScores || {},
        incidents: input.incidents || [],
        userActivity: input.userActivity || [],
        metrics: input.metrics || [],
        orgProfile: {
          turnoverRate: input.orgProfile?.turnoverRate,
          communicationScore: input.orgProfile?.communicationScore,
          leadershipStability: input.orgProfile?.leadershipStability,
          policyViolations: input.incidents?.filter((i: any) => i.type === 'policy_violation').length,
          lateAssessments: input.orgProfile?.lateAssessments,
        },
        historicalScores: input.historicalScores?.map(s => ({ ...s, category: 'operational' })),
      })),
      Promise.resolve(this.anomalyEngine.detect({
        scores: input.historicalScores?.map(s => ({ date: s.date, value: s.score })) || [],
        events: input.events || [],
        metrics: input.metrics || [],
        userBehavior: input.userActivity || [],
      })),
    ]);

    return {
      riskScore: riskResult.overallScore,
      riskLevel: riskResult.overallLevel,
      invisibleRiskIndex: riskResult.invisibleRiskIndex,
      organizationalFragility: riskResult.organizationalFragility,
      categories: riskResult.categories,
      recommendations: riskResult.recommendations,
      correlations: riskResult.correlations,
      benchmark: riskResult.benchmark,
      confidence: riskResult.confidence,
      forecast: {
        riskForecast: forecastResult.riskForecast,
        trend: forecastResult.trend,
        confidence: forecastResult.confidence,
        incidentProbability: forecastResult.incidentProbability,
        earlyWarnings: forecastResult.earlyWarnings,
        insights: forecastResult.insights,
      },
      organizationalPatterns: patternResult.organizationalPatterns,
      crossCorrelations: correlationResult.correlations,
      compoundRisks: correlationResult.compoundRisks,
      weakSignals: correlationResult.weakSignals,
      anomalyScore: anomalyResult.anomalyScore,
      anomalyLevel: anomalyResult.anomalyLevel,
      scoreAnomalies: anomalyResult.scoreAnomalies,
      behavioralAnomalies: anomalyResult.behavioralAnomalies,
      timestamp: new Date().toISOString(),
    };
  }
}
