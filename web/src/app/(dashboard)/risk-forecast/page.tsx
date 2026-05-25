"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { v1 } from "@/lib/api";

export default function RiskForecastPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([v1.analytics.dashboard(), v1.risk.predict()])
      .then(([analytics, forecast]) => setData({ analytics, forecast }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
      </div>
    );
  }

  const forecast = data?.forecast?.riskForecast;
  const trend = data?.forecast?.trend;
  const TrendIcon = trend === "improving" ? TrendingDown : trend === "deteriorating" ? TrendingUp : Minus;
  const trendColor = trend === "improving" ? "text-iris-success" : trend === "deteriorating" ? "text-iris-danger" : "text-iris-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pronóstico de Riesgo</h1>
        <p className="mt-1 text-sm text-iris-400">Predicción de evolución de riesgo a 30, 60 y 90 días</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {[30, 60, 90].map((days) => {
          const key = `days_${days}` as const;
          const score = forecast?.[key] ?? 50;
          const color = score >= 70 ? "text-iris-danger" : score >= 40 ? "text-iris-warning" : "text-iris-success";
          const bg = score >= 70 ? "bg-iris-danger/10 border-iris-danger/30" : score >= 40 ? "bg-iris-warning/10 border-iris-warning/30" : "bg-iris-success/10 border-iris-success/30";
          return (
            <div key={days} className={`card border ${bg}`}>
              <p className="text-xs font-medium text-iris-400">{days} días</p>
              <p className={`mt-2 text-4xl font-bold ${color}`}>{score}</p>
              <p className="mt-1 text-xs text-iris-400">/ 100</p>
              <div className="mt-3 h-2 rounded-full bg-iris-600">
                <div className={`h-full rounded-full ${score >= 70 ? "bg-iris-danger" : score >= 40 ? "bg-iris-warning" : "bg-iris-success"}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <TrendIcon className={`h-5 w-5 ${trendColor}`} />
          <div>
            <p className="text-sm font-medium text-white">
              Tendencia: {trend === "improving" ? "Mejorando" : trend === "deteriorating" ? "Empeorando" : "Estable"}
            </p>
            <p className="text-xs text-iris-400">Confianza: {data?.forecast?.confidence}%</p>
          </div>
        </div>
        {data?.forecast?.insights?.map((i: string, idx: number) => (
          <div key={idx} className="mt-3 flex items-start gap-2 text-xs text-iris-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-iris-warning" />
            <span>{i}</span>
          </div>
        ))}
      </div>

      {data?.analytics?.stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card">
            <p className="text-xs text-iris-400">Evaluaciones</p>
            <p className="mt-1 text-xl font-bold text-white">{data.analytics.stats.totalAssessments}</p>
          </div>
          <div className="card">
            <p className="text-xs text-iris-400">Score Promedio</p>
            <p className="mt-1 text-xl font-bold text-white">{data.analytics.stats.averageRiskScore}</p>
          </div>
          <div className="card">
            <p className="text-xs text-iris-400">Usuarios</p>
            <p className="mt-1 text-xl font-bold text-white">{data.analytics.stats.totalUsers}</p>
          </div>
          <div className="card">
            <p className="text-xs text-iris-400">Protocolos</p>
            <p className="mt-1 text-xl font-bold text-white">{data.analytics.stats.totalProtocols}</p>
          </div>
        </div>
      )}
    </div>
  );
}
