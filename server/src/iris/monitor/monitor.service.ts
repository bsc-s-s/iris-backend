import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScoringEngine } from '../scoring/scoring.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    private prisma: PrismaService,
    private scoring: ScoringEngine,
  ) {}

  async runCycle(orgId: string, frequency: string = 'monthly') {
    const cycle = await this.prisma.monitorCycle.create({
      data: { frequency, status: 'running', organizationId: orgId, startedAt: new Date() },
    });

    try {
      const scores = await this.scoring.calculateAllScores(orgId);

      const signals = await this.prisma.riskSignal.findMany({
        where: { organizationId: orgId, acknowledgedAt: null },
        orderBy: { detectedAt: 'desc' },
        take: 50,
      });

      const activeAlerts: any[] = [];
      const thresholdAlerts = this.generateThresholdAlerts(scores);

      if (thresholdAlerts.length > 0) {
        const created = await this.prisma.alert.createMany({
          data: thresholdAlerts.map(a => ({ ...a, organizationId: orgId })),
        });
        activeAlerts.push(...Array.from({ length: created.count }, (_, i) => ({ ...thresholdAlerts[i], organizationId: orgId })));
      }

      const criticalSignals = signals.filter(s => s.severity === 'critical' || s.severity === 'high').slice(0, 5);
      if (criticalSignals.length > 0) {
        const existingAlertIds = new Set(
          (await this.prisma.alert.findMany({
            where: { signalId: { in: criticalSignals.map(s => s.id) }, organizationId: orgId },
            select: { signalId: true },
          })).map(a => a.signalId),
        );
        const newSignalAlerts = criticalSignals
          .filter(s => !existingAlertIds.has(s.id))
          .map(signal => ({
            title: `Risk signal: ${signal.title}`,
            message: signal.description,
            severity: signal.severity as any,
            category: signal.category,
            source: 'monitor',
            signalId: signal.id,
            organizationId: orgId,
          }));
        if (newSignalAlerts.length > 0) {
          await this.prisma.alert.createMany({ data: newSignalAlerts });
          activeAlerts.push(...newSignalAlerts);
        }
      }

      await this.prisma.monitorCycle.update({
        where: { id: cycle.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          scores: scores as any,
          signalsCount: signals.length,
          alertsGenerated: activeAlerts.length,
        },
      });

      await this.prisma.activity.create({
        data: {
          type: 'alert_triggered',
          title: `Monitor cycle completed: ${activeAlerts.length} alerts`,
          description: `${frequency} monitoring cycle completed with ${activeAlerts.length} alerts and ${signals.length} active signals.`,
          severity: activeAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 ? 'high' : 'info',
          organizationId: orgId,
          metadata: { cycleId: cycle.id, frequency, alertsCount: activeAlerts.length, signalsCount: signals.length },
        },
      });

      return { cycle, scores, alerts: activeAlerts, signalsCount: signals.length };
    } catch (e: any) {
      await this.prisma.monitorCycle.update({
        where: { id: cycle.id },
        data: { status: 'failed', metadata: { error: e.message?.slice(0, 500) } },
      });
      throw e;
    }
  }

  async getCycleHistory(orgId: string) {
    return this.prisma.monitorCycle.findMany({
      where: { organizationId: orgId },
      orderBy: { startedAt: 'desc' },
      take: 24,
    });
  }

  async getMonitorStatus(orgId: string) {
    const [lastCycle, lastScore] = await Promise.all([
      this.prisma.monitorCycle.findFirst({ where: { organizationId: orgId }, orderBy: { startedAt: 'desc' } }),
      this.prisma.irisOrgScore.findFirst({ where: { organizationId: orgId }, orderBy: { calculatedAt: 'desc' } }),
    ]);

    const daysSinceLastCycle = lastCycle?.completedAt
      ? Math.floor((Date.now() - lastCycle.completedAt.getTime()) / 86400000)
      : null;

    return {
      lastCycle,
      lastScore,
      daysSinceLastCycle,
      status: !lastCycle ? 'never_run' : daysSinceLastCycle && daysSinceLastCycle > 35 ? 'overdue' : 'active',
    };
  }

  private generateThresholdAlerts(scores: any) {
    const alerts: any[] = [];
    const thresholds: Record<string, { low: number; label: string; message: string }> = {
      anticipation: { low: 30, label: 'Anticipation Capacity Critical', message: 'Your organization\'s ability to anticipate risks has fallen below critical threshold.' },
      resilience: { low: 30, label: 'Resilience Below Threshold', message: 'Organizational resilience score indicates vulnerability to disruption.' },
      dependency: { low: 40, label: 'Dependency Risk Escalated', message: 'Dependency scores suggest excessive reliance on key individuals or systems.' },
      culture: { low: 35, label: 'Culture Degradation Warning', message: 'Organizational culture indicators are at concerning levels.' },
      fragility: { low: 30, label: 'Operational Fragility Alert', message: 'Operational fragility has reached critical levels requiring attention.' },
    };

    for (const [dim, config] of Object.entries(thresholds)) {
      const value = (scores as any)[dim];
      if (typeof value === 'number' && value < config.low) {
        alerts.push({
          title: config.label,
          message: `${config.message} Current score: ${value.toFixed(0)}/100`,
          severity: value < config.low - 10 ? 'critical' : 'high',
          category: dim === 'dependency' || dim === 'fragility' ? 'resilience' : dim,
          source: 'monitor',
          metric: dim,
          currentValue: value,
          threshold: config.low,
        });
      }
    }

    return alerts;
  }
}
