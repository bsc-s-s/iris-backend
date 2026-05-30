import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface BenchmarkFilter {
  industry?: string;
  size?: string;
  region?: string;
}

@Injectable()
export class BenchmarkService {
  private readonly logger = new Logger(BenchmarkService.name);

  constructor(private prisma: PrismaService) {}

  async compare(orgId: string, filters: BenchmarkFilter) {
    const orgScore = await this.prisma.irisOrgScore.findFirst({
      where: { organizationId: orgId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!orgScore) {
      return { organization: null, peers: [], industryAverage: null, percentile: null };
    }

    const where: any = { organizationId: { not: orgId } };
    if (filters.industry) where.industry = filters.industry;
    if (filters.size) where.companySize = filters.size;
    if (filters.region) where.region = filters.region;

    const peers = await this.prisma.benchmarkData.findMany({
      where: filters.industry || filters.size || filters.region ? where : {},
      orderBy: { overallScore: 'desc' },
      take: 100,
    });

    const industryScores = filters.industry
      ? await this.prisma.benchmarkData.findMany({ where: { industry: filters.industry } })
      : peers;

    const industryAverage = industryScores.length > 0
      ? industryScores.reduce((s, b) => s + b.overallScore, 0) / industryScores.length
      : null;

    const belowCount = peers.filter(p => p.overallScore < orgScore.overallScore).length;
    const percentile = peers.length > 0 ? Math.round((belowCount / peers.length) * 100) : null;

    const dimensionAverages = this.calculateDimensionAverages(peers);

    return {
      organization: {
        overallScore: orgScore.overallScore,
        classification: orgScore.classification,
        anticipation: orgScore.anticipation,
        resilience: orgScore.resilience,
        exposure: orgScore.exposure,
        invisibility: orgScore.invisibility,
        dependency: orgScore.dependency,
        culture: orgScore.culture,
        governance: orgScore.governance,
        fragility: orgScore.fragility,
        operationalHealth: orgScore.operationalHealth,
        strategicAlignment: orgScore.strategicAlignment,
      },
      peerCount: peers.length,
      industryAverage,
      percentile,
      dimensionAverages,
    };
  }

  async getPosition(orgId: string) {
    const [orgScore, allScores] = await Promise.all([
      this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
      this.prisma.benchmarkData.findMany({ orderBy: { overallScore: 'desc' } }),
    ]);

    if (!orgScore) return { position: null, total: allScores.length };

    const rank = allScores.findIndex(s => s.overallScore >= orgScore.overallScore) + 1;
    return {
      rank: rank || allScores.length,
      total: allScores.length,
      percentile: allScores.length > 0 ? Math.round(((allScores.length - (rank || allScores.length)) / allScores.length) * 100) : null,
      score: orgScore.overallScore,
    };
  }

  async recordBenchmark(orgId: string) {
    const score = await this.prisma.irisOrgScore.findFirst({
      where: { organizationId: orgId },
      orderBy: { calculatedAt: 'desc' },
    });
    if (!score) return null;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });

    return this.prisma.benchmarkData.create({
      data: {
        overallScore: score.overallScore,
        industry: (org as any)?.industry || null,
        companySize: (org as any)?.companySize || null,
        scores: {
          anticipation: score.anticipation,
          resilience: score.resilience,
          exposure: score.exposure,
          invisibility: score.invisibility,
          dependency: score.dependency,
          culture: score.culture,
          governance: score.governance,
          fragility: score.fragility,
          operationalHealth: score.operationalHealth,
          strategicAlignment: score.strategicAlignment,
        },
        organizationId: orgId,
      },
    });
  }

  private calculateDimensionAverages(peers: any[]) {
    if (peers.length === 0) return null;
    const dims = ['anticipation', 'resilience', 'exposure', 'invisibility', 'dependency', 'culture', 'governance', 'fragility', 'operationalHealth', 'strategicAlignment'];
    const result: Record<string, number> = {};
    for (const dim of dims) {
      const values = peers.map((p: any) => p.scores?.[dim]).filter(Boolean);
      result[dim] = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    }
    return result;
  }
}
