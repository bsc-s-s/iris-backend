"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, TrendingUp,
  BarChart3, FileText, Clock, Target, Siren, Gauge,
  Globe, Lock, Building2, Users, Sigma,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";
import { RiskGauge } from "@/components/ui/risk-gauge";

const FRAMEWORK_META: Record<string, { icon: any; color: string }> = {
  GDPR: { icon: Lock, color: "text-iris-accent" },
  "ISO 27001": { icon: ShieldCheck, color: "text-iris-success" },
  "NIST CSF": { icon: Globe, color: "text-iris-purple" },
  "SOC 2": { icon: Building2, color: "text-iris-teal" },
  ESG: { icon: Users, color: "text-iris-rose" },
};

export default function CompliancePage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  useEffect(() => {
    v1.compliance.health().then(setHealth).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const frameworks = health?.frameworks ?? [];
  const selected = frameworks.find((f: any) => f.framework === selectedFramework);

  const kpis = [
    {
      title: "Cumplimiento Global",
      value: health?.overallScore ?? 0,
      subtitle: health?.overallStatus === "compliant" ? "Cumple" : health?.overallStatus === "partial" ? "Parcial" : "No cumple",
      icon: <ShieldCheck className="h-5 w-5" />,
      color: (health?.overallScore ?? 0) >= 80 ? "success" : (health?.overallScore ?? 0) >= 40 ? "warning" : "danger" as any,
    },
    {
      title: "Audit Readiness",
      value: health?.auditReadiness ?? 0,
      subtitle: "Preparado para auditoría",
      icon: <FileText className="h-5 w-5" />,
      color: (health?.auditReadiness ?? 0) >= 70 ? "success" : (health?.auditReadiness ?? 0) >= 40 ? "warning" : "danger" as any,
    },
    {
      title: "Hallazgos Críticos",
      value: health?.criticalFindings ?? 0,
      subtitle: "Requieren acción",
      icon: <Siren className="h-5 w-5" />,
      color: (health?.criticalFindings ?? 0) > 0 ? "danger" : "success" as any,
    },
    {
      title: "Madurez",
      value: health?.maturityLevel ?? "initial",
      subtitle: "Nivel de madurez",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "accent" as any,
    },
    {
      title: "Frameworks",
      value: health?.frameworkCount ?? 0,
      subtitle: "Evaluados",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "info" as any,
    },
    {
      title: "Recomendaciones",
      value: health?.recommendations?.length ?? 0,
      subtitle: "Acciones pendientes",
      icon: <Target className="h-5 w-5" />,
      color: "warning" as any,
    },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Compliance & Governance Center"
        subtitle="Evaluación multi-framework con gap analysis y audit readiness"
        badge={{
          text: health?.overallStatus === "compliant" ? "Cumple" : health?.overallStatus === "partial" ? "Parcial" : "No cumple",
          color: health?.overallScore >= 80 ? "badge-low" : health?.overallScore >= 40 ? "badge-high" : "badge-critical",
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
            <FileText className="h-4 w-4" />
            {reportLoading ? "Generando..." : "Generar Reporte de Compliance"}
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Framework Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {frameworks.map((fw: any) => {
          const meta = FRAMEWORK_META[fw.framework] || { icon: ShieldCheck, color: "text-iris-accent" };
          const Icon = meta.icon;
          return (
            <button
              key={fw.framework}
              onClick={() => setSelectedFramework(selectedFramework === fw.framework ? null : fw.framework)}
              className={`card text-left transition-all ${
                selectedFramework === fw.framework ? "ring-2 ring-iris-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${meta.color}`} />
                <span className={`badge text-[10px] ${
                  fw.status === "compliant" ? "badge-low"
                  : fw.status === "partial" ? "badge-high"
                  : "badge-critical"
                }`}>{fw.score}%</span>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{fw.framework}</p>
              <div className="mt-2">
                <div className="flex h-1.5 w-full rounded-full bg-iris-600">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fw.score >= 80 ? "bg-iris-success"
                      : fw.score >= 40 ? "bg-iris-warning"
                      : "bg-iris-danger"
                    }`}
                    style={{ width: `${fw.score}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-iris-400">
                <span>Audit: {fw.auditReadiness}%</span>
                <span>{fw.maturity}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected framework detail */}
      {selected && (
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = FRAMEWORK_META[selected.framework]?.icon || ShieldCheck;
                return <Icon className={`h-5 w-5 ${FRAMEWORK_META[selected.framework]?.color || "text-iris-accent"}`} />;
              })()}
              <div>
                <h3 className="text-sm font-semibold text-white">{selected.framework} — Detalle de Controles</h3>
                <p className="mt-0.5 text-xs text-iris-400">Audit readiness: {selected.auditReadiness}% | Madurez: {selected.maturity}</p>
              </div>
            </div>
            <span className={`badge text-[10px] ${
              selected.status === "compliant" ? "badge-low"
              : selected.status === "partial" ? "badge-high"
              : "badge-critical"
            }`}>{selected.score}%</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selected.controls.map((c: any) => (
              <div
                key={c.id}
                className={`rounded-lg border p-3 transition-all ${
                  c.implemented
                    ? "border-iris-success/20 bg-iris-success/5"
                    : c.weight >= 10
                      ? "border-iris-danger/20 bg-iris-danger/5"
                      : "border-iris-600/30 bg-iris-600/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {c.implemented
                        ? <CheckCircle className="h-3.5 w-3.5 text-iris-success" />
                        : <XCircle className={`h-3.5 w-3.5 ${c.weight >= 10 ? "text-iris-danger" : "text-iris-400"}`} />
                      }
                      <span className="text-xs font-medium text-white">{c.name}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-iris-400">{c.description}</p>
                  </div>
                  <span className={`badge text-[10px] shrink-0 ml-2 ${
                    c.weight >= 12 ? "badge-critical"
                    : c.weight >= 10 ? "badge-high"
                    : "badge-medium"
                  }`}>P{c.weight}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-iris-400">
                  <span>Categoría: {c.category}</span>
                  {c.implemented && <span className="text-iris-success">✓ Implementado</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Critical Gaps */}
          {selected.criticalGaps?.length > 0 && (
            <div className="mt-4 rounded-lg border border-iris-danger/30 bg-iris-danger/10 p-4">
              <div className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-iris-danger" />
                <p className="text-xs font-semibold text-iris-danger">Brechas Críticas ({selected.criticalGaps.length})</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.criticalGaps.map((g: string) => (
                  <span key={g} className="badge badge-critical text-[10px]">{g}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {selected.recommendations?.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium text-iris-accent">Recomendaciones</p>
              {selected.recommendations.map((r: string, i: number) => (
                <p key={i} className="text-[10px] text-iris-400">• {r}</p>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Gap Analysis Table */}
      {health?.gapAnalysis?.length > 0 && !selectedFramework && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Gap Analysis Comparativo</h3>
            <p className="mt-0.5 text-xs text-iris-400">Brechas por framework con esfuerzo de remediación</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-iris-600/30">
                  <th className="px-3 py-2 text-left text-iris-400">Framework</th>
                  <th className="px-3 py-2 text-left text-iris-400">Score</th>
                  <th className="px-3 py-2 text-center text-iris-400">Implementados</th>
                  <th className="px-3 py-2 text-center text-iris-400">Parciales</th>
                  <th className="px-3 py-2 text-center text-iris-400">Faltantes</th>
                  <th className="px-3 py-2 text-left text-iris-400">Esfuerzo</th>
                  <th className="px-3 py-2 text-left text-iris-400">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {health.gapAnalysis.map((g: any) => (
                  <tr key={g.framework} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                    <td className="px-3 py-2.5 font-medium text-white">{g.framework}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${
                        g.score >= 80 ? "text-iris-success"
                        : g.score >= 40 ? "text-iris-warning"
                        : "text-iris-danger"
                      }`}>{g.score}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-iris-success">{g.implementedCount}</td>
                    <td className="px-3 py-2.5 text-center text-iris-warning">{g.partialCount}</td>
                    <td className="px-3 py-2.5 text-center text-iris-danger">{g.missingCount}</td>
                    <td className="px-3 py-2.5">
                      <span className={`badge text-[10px] ${
                        g.remediationEffort === "high" ? "badge-critical"
                        : g.remediationEffort === "medium" ? "badge-high"
                        : "badge-low"
                      }`}>{g.remediationEffort}</span>
                    </td>
                    <td className="px-3 py-2.5 text-iris-400">{g.estimatedTimeline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Recommendations */}
      {health?.recommendations?.length > 0 && !selectedFramework && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Recomendaciones Transversales</h3>
          </div>
          <div className="space-y-2">
            {health.recommendations.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-iris-warning" />
                <p className="text-xs text-iris-300">{r}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

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
    </div>
  );
}
