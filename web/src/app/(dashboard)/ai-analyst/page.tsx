"use client";

import { useState, useEffect } from "react";
import { Brain, Send, FileText, Sparkles, BarChart3, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

const CONTEXT_TYPES = [
  { id: "general", label: "Consulta general" },
  { id: "assessment", label: "Análisis de evaluación" },
  { id: "compliance", label: "Cumplimiento normativo" },
  { id: "threat", label: "Análisis de amenazas" },
  { id: "planning", label: "Planificación estratégica" },
];

const SUGGESTIONS = [
  "Analiza los resultados de mi última evaluación y dame recomendaciones",
  "¿Qué brechas de cumplimiento normativo tengo según ISO 31000?",
  "¿Cómo puedo mejorar mi postura de seguridad general?",
  "Genera un análisis de tendencias basado en mis evaluaciones",
  "Recomienda medidas de seguridad para una empresa de tecnología",
];

export default function AiAnalystPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [contextType, setContextType] = useState("general");
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.assessments.list("completed").then(setAssessments).catch(() => {});
  }, []);

  const ask = async (q?: string) => {
    const query = q || question;
    if (!query) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const res = await api.aiAnalyst.analyze({
        assessmentId: selectedAssessment || undefined,
        question: query,
        contextType,
      });
      setResponse(res.response);
    } catch (err: any) {
      setError(err.message || "Error al consultar AI Analyst");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">IRIS AI Strategic Analyst</h1>
          <p className="mt-1 text-sm text-iris-400">Asistente inteligente potenciado por Groq Llama 3.3 70B</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-iris-purple/20">
              <Sparkles className="h-4 w-4 text-iris-purple" />
            </div>
            <span className="text-sm font-medium text-white">Consulta al analista</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Contexto</label>
              <select value={contextType} onChange={(e) => setContextType(e.target.value)} className="input">
                {CONTEXT_TYPES.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Evaluación de referencia</label>
              <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} className="input">
                <option value="">Sin referencia</option>
                {assessments.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Escribe tu pregunta para el analista estratégico..."
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => ask()} disabled={loading || !question} className="btn btn-primary">
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
              {loading ? "Analizando..." : "Consultar"}
            </button>
            <button onClick={() => { setResponse(null); setError(""); }} className="btn btn-ghost">
              Limpiar
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-iris-danger/30 bg-iris-danger/10 px-4 py-3 text-sm text-iris-danger">
              {error}
            </div>
          )}

          {response && (
            <div className="rounded-lg border border-iris-500 bg-iris-800 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-iris-purple" />
                <span className="text-xs font-medium text-iris-purple">AI Strategic Analyst</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-iris-200 whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-white">Consultas sugeridas</h3>
          <div className="space-y-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuestion(s); ask(s); }}
                className="w-full rounded-lg bg-iris-600/30 px-3 py-2.5 text-left text-xs text-iris-300 hover:bg-iris-600/50 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="border-t border-iris-600 pt-4">
            <h4 className="mb-2 text-xs font-medium text-iris-400">Capacidades</h4>
            <div className="space-y-2">
              {[
                { icon: BarChart3, label: "Análisis de evaluaciones" },
                { icon: AlertTriangle, label: "Detección de patrones" },
                { icon: FileText, label: "Generación de informes" },
                { icon: Brain, label: "Recomendaciones IA" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-iris-400">
                  <item.icon className="h-3 w-3 text-iris-accent" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
