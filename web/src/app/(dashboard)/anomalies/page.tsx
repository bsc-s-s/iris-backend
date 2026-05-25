"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle, Shield, Clock, User, Activity, ScanEye,
  TrendingUp, BarChart3, Siren, Zap, Radio, Fingerprint,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";
import { Timeline } from "@/components/ui/timeline";

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "border-iris-danger/30 bg-iris-danger/10 text-iris-danger",
  HIGH: "border-iris-warning/30 bg-iris-warning/10 text-iris-warning",
  MEDIUM: "border-iris-accent/30 bg-iris-accent-dim text-iris-accent",
  LOW: "border-iris-600/30 bg-iris-600/20 text-iris-400",
};

export default function AnomaliesPage() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const data = await v1.anomalies.overview();
      setOverview(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchOverview(); }, []);

  const runFullDetection = async () => {
    setDetecting(true);
    try {
      const data = await v1.anomalies.detect({
        events: [
          { type: "login", userId: "user-1", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
          { type: "login", userId: "user-2", timestamp: new Date(Date.now() - 3600000 * 22).toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access_denied", userId: "user-3", timestamp: new Date(Date.now() - 600000 * 5).toISOString() },
          { type: "access_denied", userId: "user-3", timestamp: new Date(Date.now() - 600000 * 4).toISOString() },
          { type: "access_denied", userId: "user-3", timestamp: new Date(Date.now() - 600000 * 3).toISOString() },
          { type: "access_denied", userId: "user-3", timestamp: new Date(Date.now() - 600000 * 2).toISOString() },
          { type: "failed_login", userId: "user-3", timestamp: new Date(Date.now() - 60000).toISOString() },
        ],
        metrics: [
          { name: "error_rate", value: 2, timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
          { name: "error_rate", value: 3, timestamp: new Date(Date.now() - 86400000).toISOString() },
          { name: "error_rate", value: 45, timestamp: new Date().toISOString() },
        ],
        scores: [
          { date: new Date(Date.now() - 86400000 * 6).toISOString(), value: 35 },
          { date: new Date(Date.now() - 86400000 * 5).toISOString(), value: 38 },
          { date: new Date(Date.now() - 86400000 * 4).toISOString(), value: 42 },
          { date: new Date(Date.now() - 86400000 * 3).toISOString(), value: 40 },
          { date: new Date(Date.now() - 86400000 * 2).toISOString(), value: 65 },
          { date: new Date(Date.now() - 86400000).toISOString(), value: 72 },
        ],
        userBehavior: [
          { userId: "user-3", action: "access_denied", timestamp: new Date(Date.now() - 600000 * 5).toISOString() },
          { userId: "user-3", action: "access_denied", timestamp: new Date(Date.now() - 600000 * 4).toISOString() },
          { userId: "user-3", action: "access_denied", timestamp: new Date(Date.now() - 600000 * 3).toISOString() },
          { userId: "user-3", action: "failed_login", timestamp: new Date().toISOString() },
          { userId: "user-1", action: "login", timestamp: new Date(Date.now() - 3600000 * 23).toISOString() },
          { userId: "user-1", action: "login", timestamp: new Date(Date.now() - 3600000 * 22).toISOString() },
          { userId: "user-1", action: "login", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
        ],
        timeRange: {
          start: new Date(Date.now() - 86400000 * 7).toISOString(),
          end: new Date().toISOString(),
        },
      });
      setOverview(data);
    } catch { /* ignore */ }
    setDetecting(false);
  };

  const allAnomalies = [
    ...(overview?.scoreAnomalies?.map((a: any) => ({ ...a, _type: "score" })) || []),
    ...(overview?.behavioralAnomalies?.map((a: any) => ({ ...a, _type: "behavioral" })) || []),
    ...(overview?.eventAnomalies?.map((a: any) => ({ ...a, _type: "event" })) || []),
    ...(overview?.organizationalAnomalies?.map((a: any) => ({ ...a, _type: "organizational" })) || []),
  ];

  const kpis = [
    {
      title: "Score de Anomalía",
      value: overview?.anomalyScore ?? 0,
      subtitle: `Nivel ${overview?.anomalyLevel ?? "—"}`,
      icon: <ScanEye className="h-5 w-5" />,
      color: (overview?.anomalyScore ?? 0) >= 70 ? "danger" : (overview?.anomalyScore ?? 0) >= 40 ? "warning" : "success" as any,
    },
    {
      title: "Score Anomalías",
      value: overview?.scoreAnomalies?.length ?? 0,
      subtitle: "Desviaciones estadísticas",
      icon: <BarChart3 className="h-5 w-5" />,
      color: (overview?.scoreAnomalies?.length ?? 0) > 0 ? "warning" : "success" as any,
    },
    {
      title: "Comportamiento",
      value: overview?.behavioralAnomalies?.length ?? 0,
      subtitle: "Usuarios con actividad inusual",
      icon: <User className="h-5 w-5" />,
      color: (overview?.behavioralAnomalies?.length ?? 0) > 0 ? "danger" : "success" as any,
    },
    {
      title: "Eventos",
      value: overview?.eventAnomalies?.length ?? 0,
      subtitle: "Frecuencias anómalas",
      icon: <Activity className="h-5 w-5" />,
      color: (overview?.eventAnomalies?.length ?? 0) > 0 ? "warning" : "success" as any,
    },
    {
      title: "Organizacionales",
      value: overview?.organizationalAnomalies?.length ?? 0,
      subtitle: "Patrones de degradación",
      icon: <Radio className="h-5 w-5" />,
      color: (overview?.organizationalAnomalies?.length ?? 0) > 0 ? "danger" : "success" as any,
    },
    {
      title: "Total Detectadas",
      value: allAnomalies.length,
      subtitle: "Anomalías activas",
      icon: <Siren className="h-5 w-5" />,
      color: allAnomalies.length > 0 ? "danger" : "success" as any,
    },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Anomaly Detection Center"
        subtitle="Detección en tiempo real de anomalías de score, comportamiento, eventos y organizacionales"
        badge={{
          text: overview?.anomalyLevel ?? "Sin datos",
          color: overview?.anomalyLevel === "CRITICAL" ? "badge-critical"
            : overview?.anomalyLevel === "HIGH" ? "badge-high"
            : overview?.anomalyLevel === "MEDIUM" ? "badge-medium"
            : "badge-low",
        }}
        action={
          <button onClick={runFullDetection} disabled={detecting} className="btn btn-primary btn-sm">
            <Zap className={`h-4 w-4 ${detecting ? "animate-spin" : ""}`} />
            {detecting ? "Analizando..." : "Ejecutar detección completa"}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Score anomalies */}
      {overview?.scoreAnomalies?.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-iris-warning" />
            <h3 className="text-sm font-semibold text-white">Anomalías de Score</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.scoreAnomalies.map((a: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Desviación: {a.deviation}%</span>
                  <span className={`badge text-[10px] ${
                    a.severity === "HIGH" ? "badge-high" : "badge-medium"
                  }`}>{a.severity}</span>
                </div>
                <p className="mt-2 text-xs">Valor: {a.value} (esperado: ~{a.expected})</p>
                <p className="mt-1 text-[10px] opacity-70">{new Date(a.timestamp).toLocaleString("es")}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Behavioral anomalies */}
      {overview?.behavioralAnomalies?.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-iris-danger" />
            <h3 className="text-sm font-semibold text-white">Anomalías de Comportamiento</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.behavioralAnomalies.map((a: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLES[a.severity]}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{a.pattern}</span>
                  </div>
                  <span className={`badge text-[10px] ${
                    a.severity === "CRITICAL" ? "badge-critical"
                    : a.severity === "HIGH" ? "badge-high"
                    : "badge-medium"
                  }`}>{a.severity}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">{a.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[10px] opacity-60">
                  <span>Usuario: {a.userId}</span>
                  <span>Confianza: {a.confidence}%</span>
                </div>
                {a.recommendations?.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {a.recommendations.map((r: string, j: number) => (
                      <p key={j} className="text-[10px] opacity-70">→ {r}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Event anomalies */}
      {overview?.eventAnomalies?.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-iris-purple" />
            <h3 className="text-sm font-semibold text-white">Anomalías de Eventos</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.eventAnomalies.map((a: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLES[a.severity]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{a.type}</span>
                  <span className={`badge text-[10px] ${
                    a.severity === "CRITICAL" ? "badge-critical" : "badge-high"
                  }`}>{a.severity}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">{a.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[10px] opacity-60">
                  <span>Frecuencia: {a.frequency}</span>
                  <span>Esperado: ~{a.expectedFrequency}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Organizational anomalies */}
      {overview?.organizationalAnomalies?.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Radio className="h-4 w-4 text-iris-orange" />
            <h3 className="text-sm font-semibold text-white">Anomalías Organizacionales</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.organizationalAnomalies.map((a: any, i: number) => (
              <div key={i} className={`rounded-lg border p-3 ${SEVERITY_STYLES[a.severity]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{a.pattern}</span>
                  <span className={`badge text-[10px] ${
                    a.severity === "CRITICAL" ? "badge-critical"
                    : a.severity === "HIGH" ? "badge-high"
                    : "badge-medium"
                  }`}>{a.severity}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">{a.description}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] opacity-60">
                  <span>Probabilidad: {a.probability}%</span>
                </div>
                {a.indicators?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.indicators.map((ind: string, j: number) => (
                      <span key={j} className="badge badge-info text-[10px]">{ind}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* No anomalies */}
      {!loading && allAnomalies.length === 0 && (
        <GlassCard>
          <div className="flex flex-col items-center py-12 text-center">
            <Shield className="mb-3 h-10 w-10 text-iris-success" />
            <p className="text-sm font-medium text-iris-success">Sin anomalías detectadas</p>
            <p className="mt-1 text-xs text-iris-400">No se encontraron desviaciones, comportamientos inusuales ni patrones anómalos</p>
          </div>
        </GlassCard>
      )}

      {/* Loading */}
      {loading && (
        <GlassCard>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
          </div>
        </GlassCard>
      )}
    </div>
  );
}
