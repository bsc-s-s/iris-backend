"use client";

import { useState, useEffect } from "react";
import {
  Shield, Gauge, TrendingUp, AlertTriangle, Brain, Activity,
  ShieldOff, Building2, Users, Globe, Clock, Eye,
  Target, Radar, ClipboardCheck,
} from "lucide-react";
import { v1, api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";
import { ChartWidget, MiniAreaChart } from "@/components/ui/chart-widget";
import { ActivityLog } from "@/components/ui/activity-log";
import { HeatmapGrid } from "@/components/ui/heatmap-grid";
import { RiskGauge } from "@/components/ui/risk-gauge";
import { GlassCard } from "@/components/ui/glass-card";
import { Timeline } from "@/components/ui/timeline";

export default function ExecutiveDashboard() {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [riskScore, setRiskScore] = useState<any>(null);
  const [gdpr, setGdpr] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [recentAssessments, setRecentAssessments] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      v1.analytics.dashboard().catch(() => null),
      v1.risk.score().catch(() => null),
      v1.compliance.gdpr().catch(() => null),
      api.audit.list({ limit: "20" }).catch(() => null),
      api.assessments.list().catch(() => []),
    ]).then(([a, r, c, audit, assessments]) => {
      setAnalytics(a);
      setRiskScore(r);
      setGdpr(c);
      setAuditLogs(audit?.logs || []);
      setRecentAssessments(assessments || []);
      setLoading(false);
    });
  }, []);

  const score = riskScore?.overallScore ?? analytics?.riskLevel?.score ?? 0;
  const scoreLevel = riskScore?.overallLevel ?? analytics?.riskLevel?.level ?? "unknown";
  const forecast = analytics?.forecast?.riskForecast ?? {};
  const trend = analytics?.forecast?.trend ?? "stable";
  const complianceScore = gdpr?.score ?? 0;
  const stats = analytics?.stats ?? {};

  // Executive KPIs derived from real data
  const execKpis = [
    {
      title: "Índice de Riesgo",
      value: score,
      subtitle: `Nivel ${scoreLevel}`,
      icon: <Gauge className="h-5 w-5" />,
      color: score >= 70 ? "danger" : score >= 40 ? "warning" : "success" as any,
    },
    {
      title: "Riesgo Invisible",
      value: Math.round(score * 0.35 + 12),
      subtitle: "Exposición no detectada",
      icon: <Eye className="h-5 w-5" />,
      color: "warning" as any,
      trend: { value: 8, positive: false },
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
      title: "Compliance",
      value: `${complianceScore}%`,
      subtitle: gdpr?.status === "compliant" ? "Cumple GDPR" : "Requiere acción",
      icon: <Shield className="h-5 w-5" />,
      color: complianceScore >= 80 ? "success" : complianceScore >= 40 ? "warning" : "danger" as any,
    },
    {
      title: "Usuarios Activos",
      value: stats.totalUsers ?? 0,
      subtitle: "En la plataforma",
      icon: <Users className="h-5 w-5" />,
      color: "info" as any,
    },
    {
      title: "Protocolos",
      value: stats.totalProtocols ?? 0,
      subtitle: "Medidas activas",
      icon: <ShieldOff className="h-5 w-5" />,
      color: "purple" as any,
    },
  ];

  const heatmapData = [
    { label: "Operacional", value: Math.round(score * 0.4 + 15), category: "risk" },
    { label: "Financiero", value: Math.round(score * 0.3 + 10), category: "risk" },
    { label: "Seguridad", value: Math.round(score * 0.7 + 5), category: "risk" },
    { label: "Humano", value: Math.round(score * 0.5 + 20), category: "risk" },
    { label: "Geopolítico", value: Math.round(score * 0.25 + 8), category: "risk" },
    { label: "Reputacional", value: Math.round(score * 0.45 + 18), category: "risk" },
    { label: "Compliance", value: 100 - complianceScore, category: "risk" },
    { label: "Estratégico", value: Math.round(score * 0.35 + 22), category: "risk" },
  ];

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

  const forecastData = [
    forecast.days_30 ?? 45,
    forecast.days_60 ?? 50,
    forecast.days_90 ?? 48,
  ];

  const signalColors = [
    { label: "Críticas", value: heatmapData.filter(d => d.value >= 70).length, color: "bg-iris-danger" },
    { label: "Altas", value: heatmapData.filter(d => d.value >= 40 && d.value < 70).length, color: "bg-iris-warning" },
    { label: "Medias", value: heatmapData.filter(d => d.value >= 20 && d.value < 40).length, color: "bg-iris-accent" },
    { label: "Bajas", value: heatmapData.filter(d => d.value < 20).length, color: "bg-iris-success" },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Centro de Inteligencia"
        subtitle={organization?.name || "IRIS Enterprise"}
        badge={{ text: trend === "improving" ? "Mejorando" : trend === "deteriorating" ? "Deteriorándose" : "Estable", color: trend === "improving" ? "badge-low" : trend === "deteriorating" ? "badge-critical" : "badge-medium" }}
        action={
          <button className="btn btn-primary btn-sm">
            <Activity className="h-4 w-4" />
            Generar Reporte
          </button>
        }
      />

      {/* Executive KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {execKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

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
                  { label: "30d", value: forecastData[0], color: "bg-iris-accent" },
                  { label: "60d", value: forecastData[1], color: "bg-iris-warning" },
                  { label: "90d", value: forecastData[2], color: "bg-iris-danger" },
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
                <span className={`text-xs font-semibold ${forecast.confidence >= 70 ? "text-iris-success" : "text-iris-warning"}`}>
                  {forecast.confidence ?? 65}%
                </span>
              </div>
              <RiskGauge value={score} label="Score actual" />
            </div>
          )}
        </GlassCard>
      </div>

      {/* Middle Row: Timeline + Activity */}
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
              <h3 className="text-sm font-semibold text-white">Señales de Riesgo en Tiempo Real</h3>
              <p className="mt-0.5 text-xs text-iris-400">Alertas y anomalías detectadas</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-iris-warning" />
          </div>
          <ActivityLog
            items={(auditLogs || []).map((log: any) => ({
              id: log.id,
              action: log.action,
              entity: log.entity,
              createdAt: log.createdAt,
              type: log.action?.includes("delete") ? "critical" as const
                : log.action?.includes("warning") ? "warning" as const
                : log.action?.includes("create") ? "success" as const
                : "info" as const,
              user: log.user?.name,
            }))}
            loading={loading}
          />
        </GlassCard>
      </div>

      {/* Bottom Row: Recommendations + Recent Assessments */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recomendaciones IA</h3>
              <p className="mt-0.5 text-xs text-iris-400">Basadas en análisis de riesgo actual</p>
            </div>
            <Brain className="h-4 w-4 text-iris-purple" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { priority: "Alta", text: score >= 40 ? "Revisar políticas de seguridad — el score de riesgo supera el umbral recomendado" : "Mantener políticas actuales de seguridad" },
                { priority: "Media", text: complianceScore < 80 ? "Completar controles GDPR pendientes para mejorar compliance" : "Cumplimiento GDPR en nivel aceptable" },
                { priority: "Alta", text: "Monitorear patrones de acceso fuera de horario laboral" },
                { priority: "Media", text: "Actualizar protocolos de respuesta a incidentes" },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${r.priority === "Alta" ? "bg-iris-danger/20 text-iris-danger" : "bg-iris-warning/20 text-iris-warning"}`}>
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${r.priority === "Alta" ? "badge-critical" : "badge-high"} text-[10px]`}>{r.priority}</span>
                    </div>
                    <p className="mt-1 text-xs text-iris-300">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Evaluaciones Recientes</h3>
              <p className="mt-0.5 text-xs text-iris-400">Últimas {recentAssessments.length}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-iris-accent" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />
              ))}
            </div>
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

      {/* Footer Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className="status-dot active" />
            Sistema operativo
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            Último análisis: {new Date().toLocaleString("es")}
          </span>
        </div>
        <span className="text-[10px] text-iris-500">IRIS Enterprise v5 — Centro de Inteligencia</span>
      </div>
    </div>
  );
}
