"use client";

import { useState } from "react";
import { AlertTriangle, Shield, Clock, User, Activity } from "lucide-react";
import { v1 } from "@/lib/api";

export default function AnomaliesPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDetection = async () => {
    setLoading(true);
    try {
      const data = await v1.anomalies.detect({
        events: [
          { type: "login", userId: "user-1", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
          { type: "login", userId: "user-2", timestamp: new Date(Date.now() - 3600000 * 22).toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
          { type: "access", userId: "user-1", timestamp: new Date().toISOString() },
        ],
        metrics: [
          { metric: "error_rate", value: 2, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
          { metric: "error_rate", value: 3, timestamp: new Date(Date.now() - 3600000 * 12).toISOString() },
          { metric: "error_rate", value: 45, timestamp: new Date().toISOString() },
          { metric: "data_volume", value: 100, timestamp: new Date(Date.now() - 3600000 * 48).toISOString() },
          { metric: "data_volume", value: 110, timestamp: new Date(Date.now() - 3600000 * 24).toISOString() },
          { metric: "data_volume", value: 350, timestamp: new Date().toISOString() },
        ],
        timeRange: {
          start: new Date(Date.now() - 86400000 * 7).toISOString(),
          end: new Date().toISOString(),
        },
      });
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "text-iris-danger border-iris-danger/30 bg-iris-danger/10";
      case "HIGH": return "text-iris-warning border-iris-warning/30 bg-iris-warning/10";
      case "MEDIUM": return "text-iris-accent border-iris-accent/30 bg-iris-accent/10";
      default: return "text-iris-400 border-iris-600 bg-iris-600/30";
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case "unusual_login_time": return <Clock className="h-4 w-4" />;
      case "spike_error_rate": return <Activity className="h-4 w-4" />;
      case "unusual_access_pattern": return <User className="h-4 w-4" />;
      case "data_volume_anomaly": return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const typeLabel = (t: string) => {
    const labels: Record<string, string> = {
      unusual_login_time: "Login fuera de horario",
      spike_error_rate: "Pico de errores",
      unusual_access_pattern: "Patrón de acceso inusual",
      data_volume_anomaly: "Volumen de datos anómalo",
      frequency_anomaly: "Frecuencia anómala",
    };
    return labels[t] || t;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas y Anomalías</h1>
          <p className="mt-1 text-sm text-iris-400">Detección de patrones anómalos y comportamientos sospechosos</p>
        </div>
        <button onClick={runDetection} disabled={loading} className="btn btn-primary">
          {loading ? "Analizando..." : "Ejecutar detección"}
        </button>
      </div>

      {result?.anomaliesDetected && (
        <div className="card border border-iris-warning/30 bg-iris-warning/5">
          <div className="flex items-center gap-2 text-iris-warning">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">Se detectaron {result.anomalies.length} anomalías</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.patterns?.map((p: string) => (
              <span key={p} className="badge badge-warning">{typeLabel(p)}</span>
            ))}
          </div>
        </div>
      )}

      {result?.anomalies?.length > 0 && (
        <div className="space-y-3">
          {result.anomalies.map((a: any, i: number) => (
            <div key={i} className={`card border ${severityColor(a.severity)}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcon(a.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{typeLabel(a.type)}</p>
                    <span className={`badge ${a.severity === "CRITICAL" ? "badge-critical" : a.severity === "HIGH" ? "badge-warning" : "badge-medium"}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-iris-400">{a.description}</p>
                  {a.value !== undefined && (
                    <p className="mt-1 text-xs text-iris-400">
                      Valor: {a.value} | Esperado: ~{a.expected}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result && !result.anomaliesDetected && !result.error && (
        <div className="card border border-iris-success/30 bg-iris-success/5">
          <p className="text-sm font-medium text-iris-success">No se detectaron anomalías en los datos analizados</p>
        </div>
      )}

      {!result && (
        <div className="card">
          <div className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="mb-3 h-10 w-10 text-iris-500" />
            <p className="text-sm text-iris-400">Presiona "Ejecutar detección" para analizar eventos y métricas en busca de anomalías</p>
          </div>
        </div>
      )}
    </div>
  );
}
