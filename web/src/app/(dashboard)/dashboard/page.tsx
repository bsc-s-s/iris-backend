"use client";

import { useState, useEffect } from "react";
import { Shield, ClipboardCheck, AlertTriangle, TrendingUp, Plus, ArrowRight, Building2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-iris-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { organization } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [trends, setTrends] = useState<any>(null);

  useEffect(() => {
    api.organizations.stats().then(setStats).catch(() => {});
    api.assessments.list().then(setRecent).catch(() => {});
    api.assessments.trends().then(setTrends).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-iris-400">
            {organization?.name} — Visión general de seguridad integral
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="h-4 w-4" />
          Nueva evaluación
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardCheck} label="Evaluaciones" value={stats?.stats?.assessments || 0} color="bg-iris-accent" />
        <StatCard icon={AlertTriangle} label="Vulnerabilidades" value={trends?.count || 0} color="bg-iris-danger" />
        <StatCard icon={Shield} label="Protocolos" value={stats?.stats?.protocols || 0} color="bg-iris-success" />
        <StatCard icon={Building2} label="Instalaciones" value={stats?.stats?.facilities || 0} color="bg-iris-purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-white">Evaluaciones recientes</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-iris-400">No hay evaluaciones aún. Crea tu primera evaluación.</p>
          ) : (
            <div className="space-y-3">
              {recent.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-iris-600/50 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{a.title}</p>
                    <p className="text-xs text-iris-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${a.status === "completed" ? "badge-low" : a.status === "in_progress" ? "badge-medium" : "badge-high"}`}>
                      {a.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-iris-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-white">Tendencias de riesgo</h3>
          {trends?.assessments?.length > 0 ? (
            <div className="space-y-2">
              {trends.assessments.slice(-6).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs text-iris-400">{new Date(t.date).toLocaleDateString()}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-iris-600">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(t.overallScore / 5) * 100}%`,
                          backgroundColor: t.overallScore >= 4 ? "#ef4444" : t.overallScore >= 3 ? "#f59e0b" : "#10b981",
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-right text-xs font-medium text-white">{t.overallScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center">
              <TrendingUp className="h-8 w-8 text-iris-500" />
              <p className="ml-2 text-sm text-iris-400">Completa evaluaciones para ver tendencias</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
