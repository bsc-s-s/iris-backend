"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, Shield, Download, BarChart3, CheckCircle } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const RISK_LABELS: Record<string, string> = {
  fisica: "Física", corporativa: "Corporativa", ejecutiva: "Ejecutiva",
  operacional: "Operacional", financiero: "Financiero", geopolitico: "Geopolítico",
  reputacional: "Reputacional", digital_ciber: "Digital/Ciber", insider: "Insider",
  continuidad: "Continuidad", inteligencia: "Inteligencia", compliance: "Compliance",
};

const QUESTIONS: Array<{ id: string; key: string; category: string; text: string }> = [
  { id: "q_fis_01", key: "fisica_control_acceso", category: "fisica", text: "¿Los accesos físicos están controlados con credenciales o biometría?" },
  { id: "q_fis_02", key: "fisica_vigilancia", category: "fisica", text: "¿Existe vigilancia perimetral y cámaras de seguridad?" },
  { id: "q_fis_03", key: "fisica_visitas", category: "fisica", text: "¿Hay registro y supervisión de visitantes?" },
  { id: "q_corp_01", key: "corporativa_estructura", category: "corporativa", text: "¿La estructura organizacional está claramente definida?" },
  { id: "q_corp_02", key: "corporativa_rotacion", category: "corporativa", text: "¿La rotación de personal es baja y controlada?" },
  { id: "q_corp_03", key: "corporativa_comunicacion", category: "corporativa", text: "¿Existen canales de comunicación interna eficaces?" },
  { id: "q_ejec_01", key: "ejecutiva_liderazgo", category: "ejecutiva", text: "¿El liderazgo ejecutivo está estable y visible?" },
  { id: "q_ejec_02", key: "ejecutiva_sucesion", category: "ejecutiva", text: "¿Hay un plan de sucesión para roles críticos?" },
  { id: "q_oper_01", key: "operacional_procesos", category: "operacional", text: "¿Los procesos operativos están documentados y actualizados?" },
  { id: "q_oper_02", key: "operacional_controles", category: "operacional", text: "¿Existen controles operativos para prevenir fallos?" },
  { id: "q_fin_01", key: "financiero_presupuesto", category: "financiero", text: "¿Hay presupuesto asignado para seguridad y riesgo?" },
  { id: "q_fin_02", key: "financiero_auditoria", category: "financiero", text: "¿Se realizan auditorías financieras periódicas?" },
  { id: "q_geo_01", key: "geopolitico_ubicacion", category: "geopolitico", text: "¿Las operaciones están expuestas a riesgos geopolíticos?" },
  { id: "q_geo_02", key: "geopolitico_regulacion", category: "geopolitico", text: "¿Se monitorean cambios regulatorios en países de operación?" },
  { id: "q_rep_01", key: "reputacional_imagen", category: "reputacional", text: "¿Existe un plan de gestión de crisis reputacional?" },
  { id: "q_rep_02", key: "reputacional_redes", category: "reputacional", text: "¿Se monitorea la percepción pública y redes sociales?" },
  { id: "q_dig_01", key: "digital_ciber_seguridad", category: "digital_ciber", text: "¿Los sistemas críticos están protegidos contra ciberataques?" },
  { id: "q_dig_02", key: "digital_ciber_respaldo", category: "digital_ciber", text: "¿Se realizan backups cifrados y pruebas de restauración?" },
  { id: "q_ins_01", key: "insider_monitoreo", category: "insider", text: "¿Se monitorean accesos internos a información sensible?" },
  { id: "q_ins_02", key: "insider_confidencialidad", category: "insider", text: "¿Los empleados firman acuerdos de confidencialidad?" },
  { id: "q_con_01", key: "continuidad_bcp", category: "continuidad", text: "¿Existe un plan de continuidad de negocio (BCP)?" },
  { id: "q_con_02", key: "continuidad_drp", category: "continuidad", text: "¿El plan de recuperación ante desastres (DRP) se prueba periódicamente?" },
  { id: "q_int_01", key: "inteligencia_amenazas", category: "inteligencia", text: "¿Se recopila inteligencia de amenazas activamente?" },
  { id: "q_int_02", key: "inteligencia_analisis", category: "inteligencia", text: "¿El análisis de inteligencia se integra en la toma de decisiones?" },
  { id: "q_com_01", key: "compliance_cumplimiento", category: "compliance", text: "¿Se cumple con todas las regulaciones aplicables?" },
  { id: "q_com_02", key: "compliance_auditoria", category: "compliance", text: "¿Las auditorías de cumplimiento se realizan al menos anualmente?" },
];

const SCORE_LABELS = ["", "Muy bajo", "Bajo", "Medio", "Alto", "Crítico"];

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    setLoadError("");
    api.assessments.get(id).then((a) => {
      setAssessment(a);
      const existing: Record<string, number> = {};
      for (const r of (a.responses || []) as any[]) {
        existing[r.questionId] = (r.response as any)?.value ?? 0;
      }
      setResponses(existing);
    }).catch((e) => setLoadError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const submitAll = async () => {
    setSending(true);
    setMsg("");
    try {
      for (const q of QUESTIONS) {
        const value = responses[q.id];
        if (value && value > 0) {
          await api.assessments.submitResponse(id, {
            questionId: q.id,
            questionKey: q.key,
            response: { value },
          });
        }
      }
      setMsg("Respuestas guardadas correctamente");
      load();
    } catch (e: any) {
      setMsg("Error: " + (e.message || "desconocido"));
    }
    setSending(false);
  };

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
  const isDraft = assessment.status === "draft" || !scores?.overall;

  const severityColor = (sev: string) =>
    sev === "critical" ? "badge-critical" : sev === "high" ? "badge-high" : sev === "medium" ? "badge-medium" : "badge-low";

  const categories = Array.from(new Set(QUESTIONS.map((q) => q.category)));

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
        <span className={`badge ml-auto ${assessment.status === "completed" ? "badge-low" : assessment.status === "in_progress" ? "badge-medium" : "badge-high"}`}>
          {assessment.status === "completed" ? "Completado" : assessment.status === "in_progress" ? "En curso" : "Borrador"}
        </span>
      </div>

      {isDraft ? (
        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-white">Responder preguntas</h3>
            <p className="mb-4 text-xs text-iris-400">Evalúa cada área del 1 (muy bajo riesgo) al 5 (riesgo crítico).</p>
            {msg && (
              <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
                {msg}
              </div>
            )}
            {categories.map((cat) => (
              <div key={cat} className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-iris-accent">{RISK_LABELS[cat] || cat}</h4>
                <div className="space-y-3">
                  {QUESTIONS.filter((q) => q.category === cat).map((q) => (
                    <div key={q.id} className="rounded-lg bg-iris-600/30 p-3">
                      <p className="mb-2 text-sm text-white">{q.text}</p>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <button
                            key={v}
                            onClick={() => setResponses((prev) => ({ ...prev, [q.id]: responses[q.id] === v ? 0 : v }))}
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium transition-all ${
                              responses[q.id] === v
                                ? "bg-iris-accent text-white shadow-lg shadow-iris-accent/30 scale-110"
                                : "bg-iris-700/50 text-iris-300 hover:bg-iris-600"
                            }`}
                            title={SCORE_LABELS[v]}
                          >
                            {v}
                          </button>
                        ))}
                        <span className="ml-2 text-xs text-iris-400">{responses[q.id] ? SCORE_LABELS[responses[q.id]] : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={submitAll} disabled={sending} className="btn btn-primary">
                {sending ? "Guardando..." : <><CheckCircle className="h-4 w-4" /> Guardar respuestas</>}
              </button>
              <button onClick={() => api.assessments.calculate(id).then(load)} className="btn btn-ghost">
                <BarChart3 className="h-4 w-4" /> Calcular scores
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
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
                      <div className="h-2 rounded-full transition-all" style={{
                        width: `${(data.avg / 5) * 100}%`,
                        backgroundColor: data.severity === "critical" ? "#ef4444" : data.severity === "high" ? "#f59e0b" : data.severity === "medium" ? "#3b82f6" : "#10b981",
                      }} />
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
              <span className="text-sm font-medium text-white">Recalcular scores</span>
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
        </>
      )}
    </div>
  );
}
