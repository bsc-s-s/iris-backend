"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, RefreshCw, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function SecurityPlanningPage() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const loadProtocols = () => {
    api.securityPlanning.protocols().then(setProtocols).catch(() => {});
  };

  useEffect(() => { loadProtocols(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await api.securityPlanning.generate({ scope: "full", timeframeMonths: 12 });
      setPlan(result);
      loadProtocols();
    } catch {}
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planificación de Seguridad</h1>
          <p className="mt-1 text-sm text-iris-400">Security Planning Engine — genera planes estratégicos y protocolos</p>
        </div>
        <button onClick={generate} disabled={generating} className="btn btn-primary">
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {generating ? "Generando..." : "Generar plan estratégico"}
        </button>
      </div>

      {plan && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-white">Plan Estratégico</h3>
          <p className="text-sm text-iris-300">{plan.executiveSummary}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {plan.strategicObjectives?.map((obj: any) => (
              <div key={obj.id} className="rounded-lg bg-iris-600/50 p-3">
                <div className="flex items-center gap-2">
                  <span className={`badge ${obj.priority === "critical" ? "badge-critical" : obj.priority === "high" ? "badge-high" : "badge-medium"}`}>
                    {obj.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm text-iris-200">{obj.objective}</p>
              </div>
            ))}
          </div>

          {plan.actionPlan?.map((phase: any, i: number) => (
            <div key={i} className="rounded-lg bg-iris-600/30 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-iris-accent" />
                <span className="text-sm font-medium text-white">{phase.phase}</span>
                <span className="text-xs text-iris-400">({phase.timeframe})</span>
              </div>
              <ul className="mt-2 space-y-1">
                {phase.actions?.map((a: string, j: number) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-iris-300">
                    <CheckCircle className="h-3 w-3 text-iris-success" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {plan.budget && (
            <div className="rounded-lg bg-iris-accent/5 p-4">
              <p className="text-sm font-medium text-white">Presupuesto estimado: {plan.budget.estimated}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {plan.budget.breakdown?.map((b: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-iris-300">
                    <span>{b.item}</span>
                    <span className="font-medium">{b.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Protocolos de seguridad ({protocols.length})</h3>
        {protocols.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Shield className="mb-3 h-10 w-10 text-iris-500" />
            <p className="text-sm text-iris-400">Genera un plan estratégico para crear protocolos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {protocols.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-iris-600/50 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-iris-400">{p.category} · {p.priority}</p>
                </div>
                <span className={`badge ${p.status === "active" ? "badge-low" : "badge-medium"}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
