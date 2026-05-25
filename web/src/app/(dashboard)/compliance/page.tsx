"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { v1 } from "@/lib/api";

export default function CompliancePage() {
  const [gdpr, setGdpr] = useState<any>(null);
  const [iso, setIso] = useState<any>(null);

  useEffect(() => {
    v1.compliance.gdpr().then(setGdpr).catch(() => {});
    v1.compliance.iso27001().then(setIso).catch(() => {});
  }, []);

  const ScoreCard = ({ data }: { data: any }) => {
    if (!data) return null;
    const color = data.score >= 80 ? "text-iris-success" : data.score >= 40 ? "text-iris-warning" : "text-iris-danger";
    const Icon = data.status === "compliant" ? CheckCircle : data.status === "partial" ? AlertTriangle : XCircle;
    return (
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{data.framework}</h3>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${color}`}>{data.score}</span>
          <span className="text-sm text-iris-400">/ 100</span>
        </div>
        <div className="flex gap-2">
          <span className={`badge ${data.status === "compliant" ? "badge-success" : data.status === "partial" ? "badge-warning" : "badge-critical"}`}>
            {data.status === "compliant" ? "Cumple" : data.status === "partial" ? "Parcial" : "No cumple"}
          </span>
        </div>
        {data.missingControls?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-iris-danger">Controles pendientes ({data.missingControls.length})</p>
            <div className="space-y-1">
              {data.missingControls.slice(0, 8).map((c: string) => (
                <div key={c} className="flex items-start gap-2 text-xs text-iris-400">
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-iris-danger" />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.controls?.filter((c: any) => c.implemented).length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-iris-success">Controles implementados</p>
            <div className="space-y-1">
              {data.controls.filter((c: any) => c.implemented).slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-start gap-2 text-xs text-iris-400">
                  <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-iris-success" />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance</h1>
        <p className="mt-1 text-sm text-iris-400">Evaluación de cumplimiento normativo y readiness</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ScoreCard data={gdpr} />
        <ScoreCard data={iso} />
      </div>
      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Acerca de esta evaluación</h3>
        <p className="text-sm text-iris-400">
          Los scores de compliance se calculan en base a controles predefinidos para cada framework.
          Para actualizar el estado de implementación, utiliza el endpoint POST /api/v1/compliance/evaluate
          con los IDs de controles implementados.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {gdpr?.controls?.map((c: any) => (
            <div key={c.id} className="flex items-start gap-2 rounded-lg bg-iris-600/30 px-3 py-2">
              {c.implemented
                ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-iris-success" />
                : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-iris-danger" />}
              <div>
                <p className="text-xs font-medium text-white">{c.name}</p>
                <p className="text-[10px] text-iris-400">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
