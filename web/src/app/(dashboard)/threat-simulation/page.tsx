"use client";

import { useState, useEffect } from "react";
import { Swords, Play, History, AlertTriangle, Shield, Target } from "lucide-react";
import { api } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  insider: "Ataque Interno",
  ransomware: "Ransomware",
  reputational: "Crisis Reputacional",
  protest: "Protesta Social",
  sabotage: "Sabotaje",
  natural_disaster: "Desastre Natural",
};

export default function ThreatSimulationPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    api.threatSimulation.types().then(setTypes).catch(() => {});
    api.assessments.list("completed").then(setAssessments).catch(() => {});
  }, []);

  const run = async () => {
    if (!selectedType || !selectedAssessment) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await api.threatSimulation.run(selectedAssessment, selectedType);
      setResult(res);
      setSimulations((prev) => [res, ...prev]);
    } catch {}
    setRunning(false);
  };

  const loadHistory = async () => {
    if (!selectedAssessment) return;
    try {
      const h = await api.threatSimulation.history(selectedAssessment);
      setSimulations(h);
    } catch {}
  };

  useEffect(() => { if (selectedAssessment) loadHistory(); }, [selectedAssessment]);

  const severityColor = (sev: string) =>
    sev === "critical" ? "badge-critical" : sev === "high" ? "badge-high" : sev === "medium" ? "badge-medium" : "badge-low";

  const riskColor = (score: number) =>
    score >= 4 ? "#ef4444" : score >= 3 ? "#f59e0b" : score >= 2 ? "#3b82f6" : "#10b981";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulación de Amenazas</h1>
          <p className="mt-1 text-sm text-iris-400">Threat Simulation Engine — modela escenarios de ataque y evalúa tu postura</p>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-white">Nueva simulación</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Evaluación base</label>
            <select value={selectedAssessment} onChange={(e) => setSelectedAssessment(e.target.value)} className="input">
              <option value="">Seleccionar evaluación</option>
              {assessments.map((a: any) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Tipo de amenaza</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="input">
              <option value="">Seleccionar tipo</option>
              {types.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={run} disabled={!selectedType || !selectedAssessment || running} className="btn btn-primary w-full">
              {running ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Play className="h-4 w-4" />}
              {running ? "Simulando..." : "Ejecutar simulación"}
            </button>
          </div>
        </div>
      </div>

      {result?.results && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Resultados: {TYPE_LABELS[result.type] || result.type}</h3>
            <span className={`badge ${severityColor(result.results.overallSeverity)}`}>
              Riesgo: {result.results.overallSeverity}
            </span>
          </div>
          <div className="text-center">
            <span className="text-3xl font-bold" style={{ color: riskColor(result.results.overallRisk) }}>
              {result.results.overallRisk?.toFixed(1)}
            </span>
            <span className="text-sm text-iris-400">/5</span>
          </div>
          <div className="space-y-3">
            {result.results.scenarios?.map((s: any, i: number) => (
              <div key={i} className="rounded-lg bg-iris-600/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{s.scenario}</p>
                  <span className={`badge ${severityColor(s.severity)}`}>{s.severity}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-iris-400">
                  <span>Probabilidad: {s.probability}%</span>
                  <span>Impacto: {s.impact}%</span>
                  <span>Risk Score: {s.riskScore}/5</span>
                </div>
                {s.mitigations?.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-iris-accent">Mitigaciones:</p>
                    {s.mitigations.map((m: string, j: number) => (
                      <p key={j} className="flex items-start gap-1 text-xs text-iris-300">
                        <Shield className="mt-0.5 h-3 w-3 shrink-0 text-iris-success" /> {m}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Historial de simulaciones</h3>
        {simulations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <History className="mb-3 h-10 w-10 text-iris-500" />
            <p className="text-sm text-iris-400">Selecciona una evaluación y ejecuta una simulación</p>
          </div>
        ) : (
          <div className="space-y-2">
            {simulations.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-iris-600/50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{s.name}</p>
                  <p className="text-xs text-iris-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${s.status === "completed" ? "badge-low" : s.status === "running" ? "badge-medium" : "badge-high"}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
