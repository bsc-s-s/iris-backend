"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, Shield, Download, BarChart3, CheckCircle, ChevronRight, ChevronLeft, Layers, Trash2, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const SCORE_LABELS = ["", "Muy bajo", "Bajo", "Medio", "Alto", "Crítico"];
const SCORE_COLORS = ["", "bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-orange-500", "bg-red-500"];

type Area = { id: string; name: string; subAreas: SubArea[] };
type SubArea = { id: string; name: string; questions: Question[] };
type Question = { id: string; text: string; order: number };

export default function AssessmentChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [assessment, setAssessment] = useState<any>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<"loading" | "intro" | "select" | "answer" | "complete" | "results">("loading");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [selectedSubAreaIds, setSelectedSubAreaIds] = useState<Set<string>>(new Set());
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  // Flatten selected questions
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questionSubAreas, setQuestionSubAreas] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [a, areasData] = await Promise.all([
        api.assessments.get(id),
        api.assessments.areas(),
      ]);
      setAssessment(a);
      setAreas(areasData);

      const existing: Record<string, number> = {};
      for (const r of (a.responses || []) as any[]) {
        existing[r.questionId] = (r.response as any)?.value ?? 0;
      }
      setResponses(existing);

      if (a.status === "completed" && a.scores?.overall) {
        setPhase("results");
      } else if (a.selectedSubAreaIds?.length > 0) {
        setSelectedSubAreaIds(new Set(a.selectedSubAreaIds));
        buildQuestionList(areasData, a.selectedSubAreaIds, existing);
        setPhase("answer");
      } else if (Object.keys(existing).length > 0) {
        setPhase("answer");
      } else {
        setPhase("intro");
      }
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const buildQuestionList = (areasData: Area[], subAreaIds: string[], existingResponses: Record<string, number>) => {
    const questions: Question[] = [];
    const qSubAreas: Record<string, string> = {};
    let foundExisting = false;
    let startIndex = 0;

    for (const area of areasData) {
      for (const sa of area.subAreas) {
        if (!subAreaIds.includes(sa.id)) continue;
        for (const q of sa.questions) {
          questions.push(q);
          qSubAreas[q.id] = sa.name;
          if (existingResponses[q.id] !== undefined && existingResponses[q.id] > 0) {
            foundExisting = true;
          }
          if (!foundExisting && existingResponses[q.id] === undefined) {
            startIndex = questions.length - 1;
          }
        }
      }
    }

    setAllQuestions(questions);
    setQuestionSubAreas(qSubAreas);
    if (foundExisting) {
      const lastAnswered = questions.findLastIndex(q => existingResponses[q.id] !== undefined && existingResponses[q.id] > 0);
      setCurrentQIndex(Math.min(lastAnswered + 1, questions.length - 1));
    } else {
      setCurrentQIndex(startIndex);
    }
  };

  const totalQuestions = allQuestions.length;
  const currentQuestion = allQuestions[currentQIndex];
  const currentSubArea = currentQuestion ? questionSubAreas[currentQuestion.id] : "";
  const answeredCount = allQuestions.filter(q => (responses[q.id] || 0) > 0).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const handleSelectArea = (area: Area) => {
    const subIds = area.subAreas.map(sa => sa.id);
    const next = new Set(selectedSubAreaIds);
    // Check if any sub-areas from this area are already selected
    const someSelected = subIds.some(id => next.has(id));
    if (someSelected) {
      subIds.forEach(id => next.delete(id));
    } else {
      subIds.forEach(id => next.add(id));
    }
    setSelectedSubAreaIds(next);
  };

  const isAreaFullySelected = (area: Area) => area.subAreas.every(sa => selectedSubAreaIds.has(sa.id));
  const isAreaPartiallySelected = (area: Area) => area.subAreas.some(sa => selectedSubAreaIds.has(sa.id)) && !isAreaFullySelected(area);

  const handleSelectSubArea = (subAreaId: string) => {
    const next = new Set(selectedSubAreaIds);
    if (next.has(subAreaId)) next.delete(subAreaId); else next.add(subAreaId);
    setSelectedSubAreaIds(next);
  };

  const startAssessment = async () => {
    const subAreaIds = Array.from(selectedSubAreaIds);
    if (subAreaIds.length === 0) return;

    try {
      await api.assessments.selectAreas(id, subAreaIds);
    } catch {}
    buildQuestionList(areas, subAreaIds, responses);
    setPhase("answer");
  };

  const submitCurrentAnswer = async () => {
    if (!currentQuestion) return;
    const value = responses[currentQuestion.id];
    if (!value || value <= 0) return;

    try {
      await api.assessments.submitResponse(id, {
        questionId: currentQuestion.id,
        response: { value },
      });
    } catch {}
  };

  const goNext = async () => {
    await submitCurrentAnswer();
    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const finishAndCalculate = async () => {
    setSending(true);
    setMsg("");
    try {
      // Save any remaining responses
      for (const q of allQuestions) {
        const value = responses[q.id];
        if (value && value > 0) {
          await api.assessments.submitResponse(id, {
            questionId: q.id,
            response: { value },
          });
        }
      }
      await api.assessments.calculate(id);
      const updated = await api.assessments.get(id);
      setAssessment(updated);
      setPhase("results");
    } catch (e: any) {
      setMsg("Error: " + (e.message || "desconocido"));
    }
    setSending(false);
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta evaluación? Esta acción no se puede deshacer.")) return;
    try {
      await api.assessments.delete(id);
      router.push("/assessments");
    } catch (e: any) {
      setMsg("Error al eliminar: " + (e.message || "desconocido"));
    }
  };

  if (loading || phase === "loading") {
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

  // === RENDER PHASES ===

  const renderIntro = () => (
    <div className="flex flex-col items-center py-8">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-iris-accent to-purple-600 shadow-lg shadow-iris-accent/20">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <div className="card max-w-2xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-iris-accent/20">
            <Brain className="h-5 w-5 text-iris-accent" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">¡Hola! Soy IRIS</p>
            <p className="mt-2 text-sm text-iris-300 leading-relaxed">
              Voy a ayudarte a evaluar los riesgos de tu organización. 
              Te guiaré a través de preguntas organizadas en <span className="text-white font-medium">4 áreas principales</span> de análisis.
            </p>
            <p className="mt-3 text-sm text-iris-300 leading-relaxed">
              Primero, seleccionemos las áreas que quieres evaluar. Puedes elegir una o varias.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={() => setPhase("select")} className="btn btn-primary">
            Seleccionar áreas <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAreaSelect = () => (
    <div className="py-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-iris-accent/20">
          <Layers className="h-5 w-5 text-iris-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Selecciona las áreas a evaluar</p>
          <p className="text-xs text-iris-400">Haz clic en cada área para expandir y elegir sub-áreas específicas</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map((area) => {
          const fullySelected = isAreaFullySelected(area);
          const partiallySelected = isAreaPartiallySelected(area);
          const totalQ = area.subAreas.reduce((s, sa) => s + sa.questions.length, 0);
          return (
            <div
              key={area.id}
              className={`card cursor-pointer transition-all ${
                fullySelected ? "border-iris-accent/50" : partiallySelected ? "border-amber-500/30" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2" onClick={() => handleSelectArea(area)}>
                <h3 className={`text-sm font-semibold ${fullySelected ? "text-iris-accent" : "text-white"}`}>
                  {area.name}
                </h3>
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                  fullySelected ? "border-iris-accent bg-iris-accent text-white" : partiallySelected ? "border-amber-500 bg-amber-500/20 text-amber-400" : "border-iris-500 text-iris-400"
                }`}>
                  {totalQ}
                </div>
              </div>
              <div className="space-y-1.5">
                {area.subAreas.map((sa) => {
                  const saSelected = selectedSubAreaIds.has(sa.id);
                  return (
                    <label
                      key={sa.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs cursor-pointer transition-all ${
                        saSelected ? "bg-iris-accent/10 text-iris-accent" : "text-iris-400 hover:bg-iris-600/30"
                      }`}
                      onClick={(e) => { e.stopPropagation(); handleSelectSubArea(sa.id); }}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${
                        saSelected ? "border-iris-accent bg-iris-accent" : "border-iris-500"
                      }`}>
                        {saSelected && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <span>{sa.name}</span>
                      <span className="ml-auto text-iris-500">{sa.questions.length}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-iris-400">
          {selectedSubAreaIds.size} sub-áreas seleccionadas · {allQuestions.length || "—"} preguntas
        </p>
        <div className="flex gap-2">
          <button onClick={() => setPhase("intro")} className="btn btn-ghost text-xs">Volver</button>
          <button
            onClick={startAssessment}
            disabled={selectedSubAreaIds.size === 0}
            className="btn btn-primary"
          >
            Comenzar evaluación <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnswer = () => {
    if (!currentQuestion) return null;

    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
    const currentValue = responses[currentQuestion.id] || 0;

    return (
      <div className="mx-auto max-w-2xl py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-iris-400">Progreso</span>
            <span className="text-xs text-iris-400">{answeredCount} de {totalQuestions}</span>
          </div>
          <div className="h-1.5 rounded-full bg-iris-700/50">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-iris-accent to-iris-accent/60 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Sub-area indicator */}
        <div className="mb-3 flex items-center gap-2 text-xs text-iris-400">
          <Layers className="h-3 w-3" />
          <span>{currentSubArea}</span>
          <span className="text-iris-600">·</span>
          <span>Pregunta {currentQIndex + 1}</span>
        </div>

        {/* Chat bubble */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris-accent to-purple-600 shadow-lg shadow-iris-accent/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="rounded-2xl rounded-tl-sm bg-iris-700/60 px-5 py-4 text-sm text-white leading-relaxed shadow-sm">
                {currentQuestion.text}
              </div>
            </div>
          </div>
        </div>

        {/* Rating buttons */}
        <div className="mb-8">
          <p className="mb-3 text-center text-xs text-iris-400">¿Cuál es tu evaluación?</p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => {
              const selected = currentValue === v;
              return (
                <button
                  key={v}
                  onClick={() => setResponses(prev => ({ ...prev, [currentQuestion.id]: prev[currentQuestion.id] === v ? 0 : v }))}
                  className={`group relative flex flex-col items-center transition-all ${
                    selected ? "scale-110" : "hover:scale-105"
                  }`}
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold transition-all duration-200 ${
                    selected
                      ? `${SCORE_COLORS[v]} text-white shadow-lg`
                      : "bg-iris-700/50 text-iris-300 hover:bg-iris-600/60 hover:text-white"
                  }`}>
                    {v}
                  </div>
                  <span className={`mt-1.5 text-[10px] font-medium transition-all ${
                    selected ? "text-white" : "text-iris-500"
                  }`}>
                    {SCORE_LABELS[v]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentQIndex === 0}
            className="btn btn-ghost text-xs disabled:opacity-30"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </button>

          {currentQIndex < totalQuestions - 1 ? (
            <button
              onClick={goNext}
              disabled={!currentValue || currentValue <= 0}
              className="btn btn-primary text-xs disabled:opacity-50"
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={async () => { await submitCurrentAnswer(); setPhase("complete"); }}
              disabled={!currentValue || currentValue <= 0}
              className="btn btn-primary text-xs disabled:opacity-50"
            >
              Finalizar <CheckCircle className="ml-1 h-4 w-4" />
            </button>
          )}
        </div>

        {/* Save status */}
        <div className="mt-4 text-center">
          {currentValue > 0 && (
            <span className="text-[10px] text-iris-500">
              <CheckCircle className="mr-1 inline h-3 w-3" />
              Respondido: {SCORE_LABELS[currentValue]}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderComplete = () => (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">¡Evaluación completada!</h2>
      <p className="mb-6 text-sm text-iris-300 leading-relaxed">
        Has respondido todas las preguntas seleccionadas. 
        Ahora presiona "Calcular scores" para procesar tus respuestas y obtener los resultados.
      </p>
      {msg && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${msg.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
          {msg}
        </div>
      )}
      <button onClick={finishAndCalculate} disabled={sending} className="btn btn-primary text-base px-8 py-3">
        {sending ? "Calculando..." : <><BarChart3 className="mr-2 h-5 w-5" /> Calcular scores</>}
      </button>
    </div>
  );

  const renderResults = () => (
    <>
      {scores?.areas && (
        <div className="card">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Resultados por área</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(scores.areas).map(([area, data]: [string, any]) => (
              <div key={area} className="rounded-lg bg-iris-600/50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-iris-300">{area}</span>
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
          {scores?.subAreas && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-iris-400 hover:text-iris-300">Ver desglose por sub-área</summary>
              <div className="mt-3 space-y-2">
                {Object.entries(scores.subAreas).map(([sa, data]: [string, any]) => (
                  <div key={sa} className="flex items-center gap-3 rounded-lg bg-iris-600/30 px-3 py-2">
                    <span className="flex-1 text-xs text-iris-300">{sa}</span>
                    <div className="h-1.5 w-24 rounded-full bg-iris-600">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${(data.avg / 5) * 100}%`,
                        backgroundColor: data.severity === "critical" ? "#ef4444" : data.severity === "high" ? "#f59e0b" : data.severity === "medium" ? "#3b82f6" : "#10b981",
                      }} />
                    </div>
                    <span className="text-xs text-iris-400 w-12 text-right">{data.avg.toFixed(1)}</span>
                    <span className={`badge ${severityColor(data.severity)}`}>{data.severity}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/assessments" className="btn btn-ghost p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{assessment.title}</h1>
          <p className="text-xs text-iris-400">
            {assessment.methodology} · {new Date(assessment.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`badge ${assessment.status === "completed" ? "badge-low" : assessment.status === "in_progress" ? "badge-medium" : "badge-high"}`}>
          {assessment.status === "completed" ? "Completado" : assessment.status === "in_progress" ? "En curso" : "Borrador"}
        </span>
        <button onClick={handleDelete} className="btn btn-ghost p-1.5 text-iris-400 hover:text-red-400" title="Eliminar evaluación">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {phase === "intro" && renderIntro()}
      {phase === "select" && renderAreaSelect()}
      {phase === "answer" && renderAnswer()}
      {phase === "complete" && renderComplete()}
      {phase === "results" && renderResults()}
    </div>
  );
}
