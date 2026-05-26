"use client";

import { useState, useEffect } from "react";
import {
  Shield, ShieldCheck, Lock, Globe, BarChart3, FileText,
  AlertTriangle, CheckCircle, XCircle, TrendingUp,
  Target, Siren, Gauge, Building2, Users, Sigma,
  Eye, Activity, RefreshCw, Clock,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";
import { RiskGauge } from "@/components/ui/risk-gauge";

const FRAMEWORKS = [
  { id: "gdpr", label: "GDPR", icon: Lock, color: "text-iris-accent" },
  { id: "iso27001", label: "ISO 27001", icon: ShieldCheck, color: "text-iris-success" },
  { id: "nist", label: "NIST CSF", icon: Shield, color: "text-iris-purple" },
  { id: "soc2", label: "SOC 2", icon: Building2, color: "text-iris-teal" },
  { id: "esg", label: "ESG", icon: Globe, color: "text-iris-rose" },
];

export default function EnterpriseComplianceCenter() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      v1.enterpriseCompliance.dashboard().catch(() => null),
      v1.enterpriseCompliance.summary().catch(() => null),
    ]).then(([d, s]) => {
      setDashboard(d);
      setSummary(s);
      setLoading(false);
    });
  }, []);

  const ds = dashboard || {};
  const sm = summary || {};

  const overallScore = ds.overallScore ?? sm.overallScore ?? 0;
  const auditReadiness = ds.auditReadiness ?? sm.auditReadiness ?? 0;
  const criticalFindings = ds.criticalFindings ?? sm.criticalFindings ?? 0;
  const maturityLevel = ds.maturityLevel ?? sm.maturityLevel ?? "initial";
  const frameworkCount = ds.frameworkCount ?? sm.frameworkCount ?? 0;
  const frameworkScores = ds.frameworkScores ?? sm.frameworkScores ?? [];
  const gapAnalysis = ds.gapAnalysis ?? sm.gapAnalysis ?? [];
  const recommendations = ds.recommendations ?? sm.recommendations ?? [];

  const kpis = [
    {
      title: "Cumplimiento Global",
      value: overallScore,
      subtitle: ds.overallStatus || sm.overallStatus || "Evaluado",
      icon: <ShieldCheck className="h-5 w-5" />,
      color: overallScore >= 80 ? "success" : overallScore >= 40 ? "warning" : "danger" as any,
    },
    {
      title: "Audit Readiness",
      value: auditReadiness,
      subtitle: "Preparación para auditoría",
      icon: <FileText className="h-5 w-5" />,
      color: auditReadiness >= 70 ? "success" : auditReadiness >= 40 ? "warning" : "danger" as any,
    },
    {
      title: "Hallazgos Críticos",
      value: criticalFindings,
      subtitle: "Requieren acción inmediata",
      icon: <Siren className="h-5 w-5" />,
      color: criticalFindings > 0 ? "danger" : "success" as any,
    },
    {
      title: "Madurez",
      value: typeof maturityLevel === "string" ? maturityLevel.charAt(0).toUpperCase() + maturityLevel.slice(1) : maturityLevel,
      subtitle: "Nivel organizacional",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "accent" as any,
    },
    {
      title: "Frameworks",
      value: frameworkCount,
      subtitle: "Evaluaciones activas",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "info" as any,
    },
    {
      title: "Recomendaciones",
      value: recommendations.length,
      subtitle: "Acciones pendientes",
      icon: <Target className="h-5 w-5" />,
      color: recommendations.length > 0 ? "warning" : "success" as any,
    },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Enterprise Compliance Center"
        subtitle="Cumplimiento unificado multi-framework"
        badge={{
          text: overallScore >= 80 ? "Cumple" : overallScore >= 40 ? "Parcial" : "No cumple",
          color: overallScore >= 80 ? "badge-low" : overallScore >= 40 ? "badge-high" : "badge-critical",
        }}
      />

      {/* Enterprise Compliance Banner */}
      <div className="rounded-lg border border-iris-purple/30 bg-iris-purple/10 p-4">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-iris-purple" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Cumplimiento Empresarial Unificado</p>
            <p className="mt-1 text-xs text-iris-300">
              IRIS Enterprise Compliance Center unifica GDPR, ISO 27001, NIST CSF, SOC 2 y ESG en un solo panel.
              {frameworkCount > 0
                ? ` ${frameworkCount} frameworks evaluados · ${gapAnalysis.length} brechas identificadas`
                : " Conecta tus frameworks de cumplimiento para obtener una visión unificada."}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Framework Scores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(FRAMEWORKS.map(fw => {
          const score = frameworkScores?.find((s: any) => s.framework?.toLowerCase() === fw.id || s.name?.toLowerCase() === fw.id);
          const Icon = fw.icon;
          return (
            <div key={fw.id} className="card">
              <div className="flex items-center justify-between">
                <Icon className={`h-5 w-5 ${fw.color}`} />
                <span className={`badge text-[10px] ${
                  (score?.score ?? 0) >= 80 ? "badge-low"
                  : (score?.score ?? 0) >= 40 ? "badge-high"
                  : "badge-critical"
                }`}>{score?.score ?? 0}%</span>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{fw.label}</p>
              <div className="mt-2">
                <div className="flex h-1.5 w-full rounded-full bg-iris-600">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (score?.score ?? 0) >= 80 ? "bg-iris-success"
                      : (score?.score ?? 0) >= 40 ? "bg-iris-warning"
                      : "bg-iris-danger"
                    }`}
                    style={{ width: `${score?.score ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-iris-400">
                <span>Audit: {score?.auditReadiness ?? 0}%</span>
                <span>{score?.maturity ?? score?.status ?? "—"}</span>
              </div>
            </div>
          );
        }))}
      </div>

      {/* Risk Gauge + Maturity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <RiskGauge value={overallScore} label="Score de Cumplimiento Global" />
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Maturity & Readiness</h3>
            <p className="mt-0.5 text-xs text-iris-400">Nivel de madurez y preparación para auditoría</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
              <p className="text-[10px] text-iris-400">Nivel de Madurez</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{typeof maturityLevel === "string" ? maturityLevel.charAt(0).toUpperCase() + maturityLevel.slice(1) : maturityLevel}</span>
                <Gauge className="h-5 w-5 text-iris-accent" />
              </div>
            </div>
            <div className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
              <p className="text-[10px] text-iris-400">Audit Readiness</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{auditReadiness}%</span>
                <FileText className="h-5 w-5 text-iris-accent" />
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-iris-600">
                <div
                  className={`h-full rounded-full transition-all ${
                    auditReadiness >= 70 ? "bg-iris-success"
                    : auditReadiness >= 40 ? "bg-iris-warning"
                    : "bg-iris-danger"
                  }`}
                  style={{ width: `${auditReadiness}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Gap Analysis Table */}
      {gapAnalysis.length > 0 && (
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
                {gapAnalysis.map((g: any) => (
                  <tr key={g.framework} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                    <td className="px-3 py-2.5 font-medium text-white">{g.framework}</td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${
                        g.score >= 80 ? "text-iris-success"
                        : g.score >= 40 ? "text-iris-warning"
                        : "text-iris-danger"
                      }`}>{g.score}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-iris-success">{g.implementedCount ?? g.implemented ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-iris-warning">{g.partialCount ?? g.partial ?? 0}</td>
                    <td className="px-3 py-2.5 text-center text-iris-danger">{g.missingCount ?? g.missing ?? 0}</td>
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
      {recommendations.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Recomendaciones Transversales</h3>
          </div>
          <div className="space-y-2">
            {recommendations.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-iris-warning" />
                <p className="text-xs text-iris-300">{r}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Cross-Framework Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Estado por Framework</h3>
          </div>
          <div className="space-y-3">
            {(frameworkScores.length > 0 ? frameworkScores : FRAMEWORKS.map(fw => ({
              framework: fw.label,
              score: 0,
              status: "not_evaluated",
            }))).map((fw: any) => (
              <div key={fw.framework} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  {fw.score >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-iris-success" />
                  ) : fw.score >= 40 ? (
                    <AlertTriangle className="h-4 w-4 text-iris-warning" />
                  ) : (
                    <XCircle className="h-4 w-4 text-iris-danger" />
                  )}
                  <span className="text-xs font-medium text-white">{fw.framework}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-1.5 w-20 rounded-full bg-iris-600">
                    <div
                      className={`h-full rounded-full transition-all ${
                        fw.score >= 80 ? "bg-iris-success"
                        : fw.score >= 40 ? "bg-iris-warning"
                        : "bg-iris-danger"
                      }`}
                      style={{ width: `${fw.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${
                    fw.score >= 80 ? "text-iris-success"
                    : fw.score >= 40 ? "text-iris-warning"
                    : "text-iris-400"
                  }`}>{fw.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Próximos Hitos</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : (
            <div className="space-y-2">
              {[
                { label: "ISO 27001 Surveillance Audit", days: 90, type: "audit" },
                { label: "GDPR Annual Review", days: 120, type: "review" },
                { label: "SOC 2 Type II Report Due", days: 180, type: "report" },
                { label: "NIST CSF Maturity Assessment", days: 45, type: "assessment" },
              ].filter(() => true).map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <div>
                    <span className="text-xs font-medium text-white">{h.label}</span>
                    <span className="ml-2 badge badge-info text-[10px]">{h.type}</span>
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    h.days <= 30 ? "text-iris-danger"
                    : h.days <= 90 ? "text-iris-warning"
                    : "text-iris-400"
                  }`}>{h.days}d</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className="status-dot active" />
            Enterprise Compliance Active
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            {frameworkCount} frameworks · {gapAnalysis.length} brechas · {recommendations.length} recomendaciones
          </span>
        </div>
        <span className="text-[10px] text-iris-500">Enterprise Compliance Center v1 — Unified Multi-Framework</span>
      </div>
    </div>
  );
}
