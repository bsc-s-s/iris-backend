"use client";

import { useState, useEffect } from "react";
import {
  Shield, Gauge, TrendingUp, AlertTriangle, Brain, Activity,
  ShieldOff, Building2, Users, Globe, Clock, Eye,
  Target, Radar, ClipboardCheck, Siren, ScanEye,
  Fingerprint, Sigma, BarChart3, Zap, Radio,
} from "lucide-react";
import { v1, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";
import { ChartWidget } from "@/components/ui/chart-widget";
import { ActivityLog } from "@/components/ui/activity-log";
import { HeatmapGrid } from "@/components/ui/heatmap-grid";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { GlassCard } from "@/components/ui/glass-card";
import { Timeline } from "@/components/ui/timeline";

export default function ExecutiveDashboard() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [indexes, setIndexes] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      v1.intelligence.overview().catch(() => null),
      v1.analytics.dashboard().catch(() => null),
      v1.indexes.proprietary().catch(() => null),
      api.audit.list({ limit: "20" }).catch(() => null),
      api.assessments.list().catch(() => []),
    ]).then(([i, a, idx, audit, assessments]) => {
      setIntel(i);
      setAnalytics(a);
      setIndexes(idx);
      setAuditLogs(audit?.logs || []);
      setRecentAssessments(assessments || []);
      setLoading(false);
    });
  }, []);

  const riskScore = intel?.riskScore ?? analytics?.riskLevel?.score ?? 0;
  const riskLevel = intel?.riskLevel ?? analytics?.riskLevel?.level ?? "unknown";
  const invisibleRisk = intel?.invisibleRiskIndex ?? analytics?.invisibleRiskIndex ?? 0;
  const fragility = intel?.organizationalFragility ?? analytics?.organizationalFragility ?? 0;
  const forecast = intel?.forecast?.riskForecast ?? analytics?.forecast?.riskForecast ?? {};
  const trend = intel?.forecast?.trend ?? analytics?.forecast?.trend ?? "stable";
  const earlyWarnings = intel?.forecast?.earlyWarnings ?? [];
  const incidentProb = intel?.forecast?.incidentProbability ?? {};
  const patterns = intel?.organizationalPatterns ?? [];
  const compoundRisks = intel?.compoundRisks ?? [];
  const weakSignals = intel?.weakSignals ?? [];
  const crossCorrelations = intel?.crossCorrelations ?? [];
  const recommendations = intel?.recommendations ?? [];
  const anomalyScore = intel?.anomalyScore ?? 0;
  const behavioralAnomalies = intel?.behavioralAnomalies ?? [];
  const proprietaryIndexes = indexes?.proprietaryIndexes ?? [];
  const stats = analytics?.stats ?? {};

  const execKpis = [
    {
      title: "Índice de Riesgo",
      value: riskScore,
      subtitle: `Nivel ${riskLevel}`,
      icon: <Gauge className="h-5 w-5" />,
      color: riskScore >= 70 ? "danger" : riskScore >= 40 ? "warning" : "success" as any,
    },
    {
      title: "Riesgo Invisible™",
      value: invisibleRisk,
      subtitle: "Exposición no detectada",
      icon: <Eye className="h-5 w-5" />,
      color: invisibleRisk >= 60 ? "danger" : invisibleRisk >= 35 ? "warning" : "success" as any,
      trend: { value: Math.round(invisibleRisk * 0.1), positive: invisibleRisk < 50 },
    },
    {
      title: "Fragilidad Org.",
      value: fragility,
      subtitle: "Resistencia organizacional",
      icon: <Sigma className="h-5 w-5" />,
      color: fragility >= 60 ? "danger" : fragility >= 35 ? "warning" : "success" as any,
    },
    {
      title: "Anomalías",
      value: anomalyScore,
      subtitle: `${behavioralAnomalies.length} comportamientos`,
      icon: <ScanEye className="h-5 w-5" />,
      color: anomalyScore >= 70 ? "danger" : anomalyScore >= 40 ? "warning" : "success" as any,
    },
    {
      title: "Evaluaciones",
      value: stats.totalAssessments ?? 0,
      subtitle: `${stats.completedAssessments ?? 0} completadas`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: "accent" as any,
      trend: { value: stats.totalAssessments > 0 ? 12 : 0, positive: true },
    },
    {
      title: "Incidentes",
      value: stats.totalIncidents ?? 0,
      subtitle: "Registrados",
      icon: <Siren className="h-5 w-5" />,
      color: (stats.totalIncidents ?? 0) > 0 ? "warning" : "success" as any,
    },
  ];

  const heatmapData = intel?.categories
    ? Object.entries(intel.categories).map(([key, val]: any) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: val.riskScore,
        category: "risk",
      }))
    : [];

  const timelineEvents = (auditLogs || []).slice(0, 8).map((log: any) => ({
    id: log.id,
    title: log.action,
    description: `${log.entity}${log.description ? ` — ${log.description}` : ""}`,
    timestamp: log.createdAt,
    type: (log.action?.includes("delete") || log.action?.includes("critical"))
      ? "critical" as const
      : log.action?.includes("update") || log.action?.includes("warning")
        ? "warning" as const
        : log.action?.includes("create")
          ? "success" as const
          : "info" as const,
  }));

  const signalColors = [
    { label: "Críticas", value: heatmapData.filter((d: any) => d.value >= 70).length, color: "bg-iris-danger" },
    { label: "Altas", value: heatmapData.filter((d: any) => d.value >= 40 && d.value < 70).length, color: "bg-iris-warning" },
    { label: "Medias", value: heatmapData.filter((d: any) => d.value >= 20 && d.value < 40).length, color: "bg-iris-accent" },
    { label: "Bajas", value: heatmapData.filter((d: any) => d.value < 20).length, color: "bg-iris-success" },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Risk Intelligence Command Center"
        subtitle={organization?.name || "IRIS Enterprise"}
        badge={{
          text: trend === "improving" ? "Mejorando" : trend === "deteriorating" ? "Deteriorándose" : "Estable",
          color: trend === "improving" ? "badge-low" : trend === "deteriorating" ? "badge-critical" : "badge-medium",
        }}
        action={
          <button
            className="btn btn-primary btn-sm"
            disabled={reportLoading}
            onClick={async () => {
              setReportLoading(true);
              try {
                const data = await v1.reports.executive();
                setReportData(data);
              } catch (e) { alert("Error al generar reporte"); }
              finally { setReportLoading(false); }
            }}
          >
            <Zap className="h-4 w-4" />
            {reportLoading ? "Generando..." : "Generar Reporte Ejecutivo"}
          </button>
        }
      />

      {/* Executive KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {execKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Early Warnings Bar */}
      {earlyWarnings.length > 0 && (
        <GlassCard>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-iris-warning" />
            <h3 className="text-sm font-semibold text-white">Alertas Tempranas</h3>
            <span className="badge badge-critical text-[10px]">{earlyWarnings.length} activas</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {earlyWarnings.map((w: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${
                w.severity === "CRITICAL" ? "border-iris-danger/30 bg-iris-danger/10"
                : w.severity === "HIGH" ? "border-iris-warning/30 bg-iris-warning/10"
                : "border-iris-accent/30 bg-iris-accent-dim"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`badge text-[10px] ${
                    w.severity === "CRITICAL" ? "badge-critical"
                    : w.severity === "HIGH" ? "badge-high"
                    : "badge-medium"
                  }`}>{w.severity}</span>
                  <span className="text-[10px] text-iris-400">{w.daysToEvent}d</span>
                </div>
                <p className="mt-2 text-xs text-iris-200">{w.message}</p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] text-iris-400">Probabilidad:</span>
                  <span className="text-[10px] font-semibold text-white">{w.probability}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Risk Signals + Heatmap Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Mapa de Riesgo por Categoría</h3>
              <p className="mt-0.5 text-xs text-iris-400">Heatmap de exposición por tipo de riesgo</p>
            </div>
            <div className="flex gap-3">
              {signalColors.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <span className="text-[10px] text-iris-400">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
          <HeatmapGrid data={heatmapData} loading={loading} />
        </GlassCard>

        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Pronóstico de Riesgo</h3>
            <p className="mt-0.5 text-xs text-iris-400">Proyección a 90 días</p>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                {[
                  { label: "30d", value: forecast.days_30 ?? 45, color: "bg-iris-accent" },
                  { label: "60d", value: forecast.days_60 ?? 50, color: "bg-iris-warning" },
                  { label: "90d", value: forecast.days_90 ?? 48, color: "bg-iris-danger" },
                ].map((f) => (
                  <div key={f.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{f.value}</span>
                    <div className="flex h-32 w-full items-end rounded-lg bg-iris-600/30 p-1">
                      <div
                        className={`w-full rounded-md transition-all duration-1000 ${f.color}`}
                        style={{ height: `${f.value}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-iris-400">{f.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-iris-600/30 px-3 py-2">
                <span className="text-xs text-iris-400">Confiabilidad</span>
                <span className={`text-xs font-semibold ${(intel?.forecast?.confidence ?? 65) >= 70 ? "text-iris-success" : "text-iris-warning"}`}>
                  {intel?.forecast?.confidence ?? 65}%
                </span>
              </div>

              {/* Incident Probability */}
              {incidentProb.days_30 !== undefined && (
                <div className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-3">
                  <p className="text-[10px] text-iris-400">Probabilidad de Incidentes</p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-iris-300">30d</span>
                        <span className="font-semibold text-white">{incidentProb.days_30}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-iris-600">
                        <div className="h-full rounded-full bg-iris-accent transition-all" style={{ width: `${incidentProb.days_30}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-iris-300">60d</span>
                        <span className="font-semibold text-white">{incidentProb.days_60}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-iris-600">
                        <div className="h-full rounded-full bg-iris-warning transition-all" style={{ width: `${incidentProb.days_60}%` }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-iris-300">90d</span>
                        <span className="font-semibold text-white">{incidentProb.days_90}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-iris-600">
                        <div className="h-full rounded-full bg-iris-danger transition-all" style={{ width: `${incidentProb.days_90}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <RiskGauge value={riskScore} label="Score actual" />
            </div>
          )}
        </GlassCard>
      </div>

      {/* Proprietary Indexes */}
      {proprietaryIndexes.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Radar className="h-4 w-4 text-iris-purple" />
            <h3 className="text-sm font-semibold text-white">Índices Propietarios IRIS™</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {proprietaryIndexes.map((idx: any, i: number) => (
              <div key={i} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-white">{idx.name}</p>
                  <span className={`status-dot ${idx.value >= 60 ? "critical" : idx.value >= 35 ? "warning" : "active"}`} />
                </div>
                <p className="mt-2 text-2xl font-bold text-white">{idx.value}<span className="text-sm text-iris-400">/100</span></p>
                <p className="mt-1 text-[10px] text-iris-400">{idx.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`badge text-[10px] ${
                    idx.level === "CRITICAL" ? "badge-critical"
                    : idx.level === "HIGH" ? "badge-high"
                    : idx.level === "MEDIUM" ? "badge-medium"
                    : "badge-low"
                  }`}>{idx.level}</span>
                  <span className="text-[10px] text-iris-400">Tendencia: {idx.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Compound Risks + Weak Signals + Patterns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compound Risks */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Riesgos Compuestos</h3>
              <p className="mt-0.5 text-xs text-iris-400">Correlaciones de múltiples factores</p>
            </div>
            <Sigma className="h-4 w-4 text-iris-rose" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : compoundRisks.length === 0 ? (
            <p className="text-xs text-iris-400">Sin riesgos compuestos detectados</p>
          ) : (
            <div className="space-y-2">
              {compoundRisks.map((r: any, i: number) => (
                <div key={i} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{r.name}</span>
                    <span className={`badge text-[10px] ${
                      r.severity === "CRITICAL" ? "badge-critical"
                      : r.severity === "HIGH" ? "badge-high"
                      : "badge-medium"
                    }`}>{r.severity}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-iris-400">{r.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.contributingFactors?.map((f: string, j: number) => (
                      <span key={j} className="badge badge-info text-[10px]">{f}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Weak Signals */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Señales Débiles</h3>
              <p className="mt-0.5 text-xs text-iris-400">Indicadores tempranos de riesgo</p>
            </div>
            <Radio className="h-4 w-4 text-iris-teal" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : weakSignals.length === 0 ? (
            <p className="text-xs text-iris-400">Sin señales débiles detectadas</p>
          ) : (
            <div className="space-y-2">
              {weakSignals.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{s.signal}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-iris-400">{s.intensity}%</span>
                      <span className={`status-dot ${s.intensity >= 60 ? "critical" : s.intensity >= 35 ? "warning" : "active"}`} />
                    </div>
                  </div>
                  <p className="mt-1 text-[10px] text-iris-400">{s.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-iris-400">Frecuencia: {s.frequency}</span>
                    <span className="text-[10px] text-iris-400">|</span>
                    <span className="text-[10px] text-iris-400">Tendencia: {s.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Organizational Patterns */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Patrones Organizacionales</h3>
              <p className="mt-0.5 text-xs text-iris-400">Comportamiento organizacional</p>
            </div>
            <Fingerprint className="h-4 w-4 text-iris-orange" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : patterns.length === 0 ? (
            <p className="text-xs text-iris-400">Sin patrones organizacionales detectados</p>
          ) : (
            <div className="space-y-2">
              {patterns.map((p: any, i: number) => (
                <div key={i} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{p.name}</span>
                    <span className={`badge text-[10px] ${
                      p.severity === "CRITICAL" ? "badge-critical"
                      : p.severity === "HIGH" ? "badge-high"
                      : "badge-medium"
                    }`}>{p.probability}%</span>
                  </div>
                  <p className="mt-1 text-[10px] text-iris-400">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.indicators?.map((ind: string, j: number) => (
                      <span key={j} className="badge badge-info text-[10px]">{ind}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Middle Row: Timeline + Behavioral Anomalies */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Línea de Tiempo de Eventos</h3>
              <p className="mt-0.5 text-xs text-iris-400">Actividad reciente del sistema</p>
            </div>
            <Clock className="h-4 w-4 text-iris-400" />
          </div>
          <Timeline events={timelineEvents} loading={loading} />
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Anomalías de Comportamiento</h3>
              <p className="mt-0.5 text-xs text-iris-400">Actividad inusual de usuarios</p>
            </div>
            <ScanEye className="h-4 w-4 text-iris-warning" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : behavioralAnomalies.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Shield className="mb-2 h-8 w-8 text-iris-success" />
              <p className="text-sm text-iris-400">Sin anomalías de comportamiento detectadas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {behavioralAnomalies.map((a: any, i: number) => (
                <div key={i} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{a.pattern}</span>
                      <span className={`badge text-[10px] ${
                        a.severity === "CRITICAL" ? "badge-critical"
                        : a.severity === "HIGH" ? "badge-high"
                        : "badge-medium"
                      }`}>{a.severity}</span>
                    </div>
                    <span className="text-[10px] text-iris-400">{a.confidence}% confianza</span>
                  </div>
                  <p className="mt-1 text-[10px] text-iris-400">{a.description}</p>
                  <p className="mt-1 text-[10px] text-iris-400">Usuario: {a.userId}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Bottom Row: Recommendations + Cross Correlations + Recent Assessments */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recomendaciones IA</h3>
              <p className="mt-0.5 text-xs text-iris-400">Basadas en análisis de riesgo</p>
            </div>
            <Brain className="h-4 w-4 text-iris-purple" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : (
            <div className="space-y-2">
              {(recommendations.length > 0 ? recommendations : [
                { priority: "HIGH", message: riskScore >= 40 ? "Revisar políticas de seguridad — el score supera el umbral" : "Mantener políticas actuales de seguridad" },
                { priority: "MEDIUM", message: "Monitorear patrones de acceso fuera de horario laboral" },
                { priority: "MEDIUM", message: "Actualizar protocolos de respuesta a incidentes" },
              ]).map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    r.priority === "CRITICAL" ? "bg-iris-danger/20 text-iris-danger"
                    : r.priority === "HIGH" ? "bg-iris-warning/20 text-iris-warning"
                    : "bg-iris-accent-dim text-iris-accent"
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                  <div>
                    <span className={`badge text-[10px] ${
                      r.priority === "CRITICAL" ? "badge-critical"
                      : r.priority === "HIGH" ? "badge-high"
                      : "badge-medium"
                    }`}>{r.priority}</span>
                    <p className="mt-1 text-xs text-iris-300">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Cross Correlations */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Correlaciones Cruzadas</h3>
              <p className="mt-0.5 text-xs text-iris-400">Relaciones entre categorías</p>
            </div>
            <BarChart3 className="h-4 w-4 text-iris-accent" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : (
            <div className="space-y-2">
              {(crossCorrelations.length > 0 ? crossCorrelations : intel?.correlations ?? []).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white">{c.source} → {c.target}</p>
                    <p className="text-[10px] text-iris-400">{c.description || c.d}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] ${
                      (c.coefficient || c.correlation) >= 70 ? "badge-critical"
                      : (c.coefficient || c.correlation) >= 40 ? "badge-high"
                      : "badge-medium"
                    }`}>{c.coefficient || c.correlation}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Recent Assessments */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Evaluaciones Recientes</h3>
              <p className="mt-0.5 text-xs text-iris-400">Últimas {recentAssessments.length}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-iris-accent" />
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : recentAssessments.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Target className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin evaluaciones aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAssessments.slice(0, 6).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-3 py-2.5 transition-colors hover:bg-iris-600/40">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{a.title}</p>
                    <p className="text-[10px] text-iris-400">{new Date(a.createdAt).toLocaleDateString("es")}</p>
                  </div>
                  <span className={`badge shrink-0 text-[10px] ${
                    a.status === "completed" ? "badge-low"
                    : a.status === "in_progress" ? "badge-medium"
                    : "badge-high"
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Reporte Modal */}
      {reportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportData(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-iris-600/30 bg-iris-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{reportData.title}</h2>
              <button className="btn btn-ghost text-xs" onClick={() => setReportData(null)}>Cerrar</button>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg bg-iris-700/50 p-4">
                <p className="text-xs text-iris-400">Generado: {new Date(reportData.generatedAt).toLocaleString("es")}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded bg-iris-600/20 p-2 text-center">
                    <p className="text-xs text-iris-400">Score</p>
                    <p className="text-lg font-bold text-white">{reportData.overallScore}</p>
                  </div>
                  <div className="rounded bg-iris-600/20 p-2 text-center">
                    <p className="text-xs text-iris-400">Audit Readiness</p>
                    <p className="text-lg font-bold text-white">{reportData.auditReadiness}%</p>
                  </div>
                  <div className="rounded bg-iris-600/20 p-2 text-center">
                    <p className="text-xs text-iris-400">Madurez</p>
                    <p className="text-lg font-bold text-white">{reportData.maturityLevel}</p>
                  </div>
                  <div className="rounded bg-iris-600/20 p-2 text-center">
                    <p className="text-xs text-iris-400">Hallazgos</p>
                    <p className="text-lg font-bold text-white">{reportData.criticalFindings}</p>
                  </div>
                </div>
              </div>

              {reportData.organizationProfile && (
                <div className="rounded-lg bg-iris-700/50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Perfil Organizacional</h3>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div><p className="text-iris-400">Usuarios</p><p className="font-bold text-white">{reportData.organizationProfile.users}</p></div>
                    <div><p className="text-iris-400">Evaluaciones</p><p className="font-bold text-white">{reportData.organizationProfile.assessments}</p></div>
                    <div><p className="text-iris-400">Protocolos</p><p className="font-bold text-white">{reportData.organizationProfile.protocols}</p></div>
                    <div><p className="text-iris-400">Incidentes</p><p className="font-bold text-white">{reportData.organizationProfile.incidents}</p></div>
                    <div><p className="text-iris-400">Riesgo</p><p className="font-bold text-white">{reportData.organizationProfile.riskScore}</p></div>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-iris-700/50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Frameworks de Cumplimiento</h3>
                <div className="space-y-2">
                  {reportData.frameworks?.map((fw: any) => (
                    <div key={fw.name} className="flex items-center justify-between rounded bg-iris-600/20 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">{fw.name}</p>
                        <p className="text-[10px] text-iris-400">{fw.implemented}/{fw.total} controles implementados</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{fw.score}%</p>
                        <p className="text-[10px] text-iris-400">{fw.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {reportData.gapAnalysis && reportData.gapAnalysis.length > 0 && (
                <div className="rounded-lg bg-iris-700/50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Gap Analysis</h3>
                  <div className="space-y-2">
                    {reportData.gapAnalysis.map((g: any) => (
                      <div key={g.framework} className="rounded bg-iris-600/20 px-3 py-2 text-xs">
                        <p className="font-medium text-white">{g.framework}: {g.score}% - {g.remediationEffort} esfuerzo ({g.estimatedTimeline})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reportData.recommendations && reportData.recommendations.length > 0 && (
                <div className="rounded-lg bg-iris-700/50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-white">Recomendaciones</h3>
                  <ul className="space-y-1">
                    {reportData.recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2 text-xs text-iris-200">
                        <span className="mt-0.5 shrink-0 text-iris-accent">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className={`status-dot ${intel?.anomalyLevel === "CRITICAL" ? "critical" : "active"}`} />
            {intel?.anomalyLevel ? `Nivel anomalía: ${intel.anomalyLevel}` : "Sistema operativo"}
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            Riesgo: {riskScore}/100 · Invisible: {invisibleRisk}/100 · Fragilidad: {fragility}/100
          </span>
        </div>
        <span className="text-[10px] text-iris-500">IRIS Enterprise v5 — Risk Intelligence Command Center</span>
      </div>
    </div>
  );
}
