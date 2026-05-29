"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, Shield, Swords, Download, BarChart3 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const RISK_LABELS: Record<string, string> = {
  fisica: "Física", corporativa: "Corporativa", ejecutiva: "Ejecutiva",
  operacional: "Operacional", financiero: "Financiero", geopolitico: "Geopolítico",
  reputacional: "Reputacional", digital_ciber: "Digital/Ciber", insider: "Insider",
  continuidad: "Continuidad", inteligencia: "Inteligencia", compliance: "Compliance",
};

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [loadError, setLoadError] = useState("");

  const load = () => {
    setLoading(true);
    setLoadError("");
    api.assessments.get(id).then(setAssessment).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
      </div>
    );
  }

  if (loadError) {
    return <div className="text-center py-20 text-red-400">Error: {loadError}</div>;
  }

  if (!assessment) {
    return <div className="text-center py-20 text-iris-400">Evaluación no encontrada</div>;
  }

  const scores = assessment.scores as any;
  const severityColor = (sev: string) =>
    sev === "critical" ? "badge-critical" : sev === "high" ? "badge-high" : sev === "medium" ? "badge-medium" : "badge-low";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assessments" className="btn btn-ghost p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{assessment.title}</h1>
          <p className="text-sm text-iris-400">
            {assessment.methodology} · {new Date(assessment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ml-auto ${severityColor(scores?.overall?.severity)}`}>
          {scores?.overall?.severity || "pendiente"}
        </span>
      </div>

      {scores?.categories && (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-white">Resultados por categoría</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(scores.categories).map(([cat, data]: [string, any]) => (
              <div key={cat} className="rounded-lg bg-iris-600/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-iris-300">{RISK_LABELS[cat] || cat}</span>
                  <span className={`badge ${severityColor(data.severity)}`}>{data.severity}</span>
                </div>
                <div className="h-2 rounded-full bg-iris-600">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${(data.avg / 5) * 100}%`,
                      backgroundColor: data.severity === "critical" ? "#ef4444" : data.severity === "high" ? "#f59e0b" : data.severity === "medium" ? "#3b82f6" : "#10b981",
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-iris-400">{data.avg.toFixed(1)}/5</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-iris-accent/5 p-4">
            <span className="text-sm font-medium text-white">Score global</span>
            <span className="text-2xl font-bold text-white">{scores.overall?.avg?.toFixed(1) || "N/A"}<span className="text-sm text-iris-400">/5</span></span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <button onClick={() => api.assessments.calculate(id).then(load)} className="card card-hover flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-iris-accent" />
          <span className="text-sm font-medium text-white">Calcular scores</span>
        </button>
        <button onClick={() => api.assessments.generatePlan(id).then(load)} className="card card-hover flex items-center gap-3">
          <Shield className="h-5 w-5 text-iris-success" />
          <span className="text-sm font-medium text-white">Generar plan</span>
        </button>
        <button className="card card-hover flex items-center gap-3">
          <Download className="h-5 w-5 text-iris-warning" />
          <span className="text-sm font-medium text-white">Exportar reporte</span>
        </button>
      </div>

      {assessment.vulnerabilities?.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-white">Vulnerabilidades detectadas</h3>
          <div className="space-y-2">
            {assessment.vulnerabilities.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg bg-iris-600/50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{v.name}</p>
                  <p className="text-xs text-iris-400">{v.description}</p>
                </div>
                <span className={`badge ${severityColor(v.severity)}`}>{v.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assessment.securityPlan && (
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-white">Plan de seguridad generado</h3>
          <p className="mb-4 text-sm text-iris-300">{assessment.securityPlan.executiveSummary}</p>
          {assessment.securityPlan.recommendations?.map((r: string, i: number) => (
            <div key={i} className="mb-2 flex items-start gap-2 text-sm text-iris-300">
              <span className="mt-0.5 text-iris-accent">•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
