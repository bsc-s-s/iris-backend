"use client";

import { useState, useEffect } from "react";
import {
  Shield, ShieldCheck, ShieldOff, AlertTriangle, Activity,
  Fingerprint, Globe, Lock, Unlock, Users, Eye,
  Key, Server, Clock, LogIn, XCircle, CheckCircle,
  RefreshCw, Search, Siren, Gauge, MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user?.role !== "super_admin") return;
    api.security.dashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const isSuperAdmin = user?.role === "super_admin";
  const stats = dashboard?.stats || {};
  const recentEvents = dashboard?.recentEvents || [];
  const eventsByType = dashboard?.eventsByType || [];

  const kpis = [
    { title: "Usuarios", value: stats.totalUsers ?? 0, subtitle: "Registrados", icon: <Users className="h-5 w-5" />, color: "info" as any },
    { title: "Sesiones Activas", value: stats.activeSessions ?? 0, subtitle: "Tiempo real", icon: <Activity className="h-5 w-5" />, color: "success" as any },
    { title: "Cuentas Bloqueadas", value: stats.blockedAccounts ?? 0, subtitle: "Temporalmente", icon: <ShieldOff className="h-5 w-5" />, color: stats.blockedAccounts > 0 ? "danger" : "success" as any },
    { title: "Eventos 24h", value: stats.events24h ?? 0, subtitle: "Total eventos", icon: <Activity className="h-5 w-5" />, color: "accent" as any },
    { title: "Logins Fallidos", value: stats.failedLogins ?? 0, subtitle: "Últimas 24h", icon: <XCircle className="h-5 w-5" />, color: stats.failedLogins > 10 ? "danger" : stats.failedLogins > 0 ? "warning" : "success" as any },
    { title: "Bloqueos por Anomalía", value: stats.anomalyBlocks ?? 0, subtitle: "IA detuvo", icon: <Siren className="h-5 w-5" />, color: stats.anomalyBlocks > 0 ? "danger" : "success" as any },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "events", label: "Eventos", icon: Activity },
    { id: "sessions", label: "Sesiones", icon: Server },
    { id: "devices", label: "Dispositivos", icon: Fingerprint },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="mb-4 h-16 w-16 text-iris-500" />
        <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
        <p className="mt-2 text-sm text-iris-400">Solo el Super Admin puede acceder al Security Dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="🔐 Zero Trust Security Dashboard"
        subtitle="Super Admin · Monitoreo en tiempo real de seguridad Zero Trust"
        badge={{ text: "SUPER ADMIN", color: "badge-critical" }}
      />

      {/* Zero Trust Status Banner */}
      <div className="rounded-lg border border-iris-success/30 bg-iris-success/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-iris-success" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Zero Trust Architecture Activa</p>
            <p className="mt-1 text-xs text-iris-300">
              IRIS Zero Trust protege cada request con 5 capas: JWT → Sesión → Dispositivo → Geo → Anomalía.
              {stats.activeSessions > 0 ? ` ${stats.activeSessions} sesiones activas · ${stats.blockedAccounts} cuentas bloqueadas` : " Sistema operativo y monitoreando."}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-iris-600/30 bg-iris-700/50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-all ${
                activeTab === tab.id
                  ? "bg-iris-accent text-white shadow-lg"
                  : "text-iris-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Events by Type */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Eventos por Tipo (24h)</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-iris-600" />)}</div>
            ) : eventsByType.length === 0 ? (
              <p className="text-xs text-iris-400">Sin eventos en las últimas 24h</p>
            ) : (
              <div className="space-y-2">
                {eventsByType.map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        e.severity === "critical" || e.severity === "warning" ? "bg-iris-danger" : "bg-iris-accent"
                      }`} />
                      <span className="text-xs text-white">{e.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${
                        e.severity === "critical" ? "badge-critical"
                        : e.severity === "warning" ? "badge-high"
                        : "badge-low"
                      }`}>{e.severity}</span>
                      <span className="text-xs font-semibold text-white">{String(e.count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Recent Events */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Eventos Recientes</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
            ) : recentEvents.length === 0 ? (
              <p className="text-xs text-iris-400">Sin eventos recientes</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.slice(0, 8).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        e.severity === "critical" ? "bg-iris-danger"
                        : e.severity === "warning" ? "bg-iris-warning"
                        : "bg-iris-accent"
                      }`} />
                      <span className="text-[10px] text-iris-300 truncate">{e.type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-iris-400">{e.email || "—"}</span>
                      <span className="text-[10px] text-iris-500">
                        {e.timestamp ? new Date(e.timestamp).toLocaleTimeString("es") : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Protection Layers Status */}
          <GlassCard className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Zero Trust Protection Layers</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { layer: "JWT + Session", status: "Active", desc: "Token validation + server-side session", icon: Key, color: "text-iris-success" },
                { layer: "Device Fingerprint", status: "Active", desc: "x-device-id validation per request", icon: Fingerprint, color: "text-iris-success" },
                { layer: "Geo/IP Restriction", status: stats.geoBlocks > 0 ? "Active" : "Optional", desc: `${stats.geoBlocks || 0} geo blocks today`, icon: Globe, color: stats.geoBlocks > 0 ? "text-iris-warning" : "text-iris-success" },
                { layer: "Anomaly Detection", status: "Active", desc: `${stats.anomalyBlocks || 0} blocks by AI`, icon: Activity, color: stats.anomalyBlocks > 0 ? "text-iris-warning" : "text-iris-success" },
                { layer: "MFA Enforcement", status: "Active", desc: "Required for admin/super_admin", icon: Lock, color: "text-iris-success" },
                { layer: "Immutable Audit", status: "Active", desc: "Blockchain-style SHA-256 chain", icon: Shield, color: "text-iris-success" },
              ].map((layer) => {
                const Icon = layer.icon;
                return (
                  <div key={layer.layer} className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${layer.color}`} />
                        <span className="text-xs font-medium text-white">{layer.layer}</span>
                      </div>
                      <span className={`badge text-[10px] ${layer.status === "Active" ? "badge-low" : "badge-medium"}`}>{layer.status}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-iris-400">{layer.desc}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "events" && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Security Event Trail (Inmutable)</h3>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : recentEvents.length === 0 ? (
            <p className="text-xs text-iris-400">Sin eventos registrados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Tipo</th>
                    <th className="px-3 py-2 text-left text-iris-400">Severidad</th>
                    <th className="px-3 py-2 text-left text-iris-400">Usuario</th>
                    <th className="px-3 py-2 text-left text-iris-400">IP</th>
                    <th className="px-3 py-2 text-left text-iris-400">Dispositivo</th>
                    <th className="px-3 py-2 text-left text-iris-400">País</th>
                    <th className="px-3 py-2 text-right text-iris-400">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((e: any) => (
                    <tr key={e.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-white">{e.type}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-[10px] ${
                          e.severity === "critical" ? "badge-critical"
                          : e.severity === "warning" ? "badge-high"
                          : "badge-low"
                        }`}>{e.severity}</span>
                      </td>
                      <td className="px-3 py-2.5 text-iris-300">{e.email || e.name || "—"}</td>
                      <td className="px-3 py-2.5 text-iris-400 font-mono">{e.ipAddress || "—"}</td>
                      <td className="px-3 py-2.5 text-iris-400">
                        {e.deviceId ? `${e.deviceId.slice(0, 8)}...` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-iris-400">{e.country || "—"}</td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {e.timestamp ? new Date(e.timestamp).toLocaleString("es") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "sessions" && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Active Sessions</h3>
          </div>
          <div className="flex h-40 flex-col items-center justify-center text-center">
            <Activity className="mb-2 h-8 w-8 text-iris-500" />
            <p className="text-sm text-iris-400">
              {stats.activeSessions > 0
                ? `${stats.activeSessions} sesiones activas en el sistema`
                : "Sin sesiones activas"}
            </p>
            <p className="mt-1 text-[10px] text-iris-500">Usa la API /api/security/sessions para ver detalle</p>
          </div>
        </GlassCard>
      )}

      {activeTab === "devices" && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Device Fingerprinting</h3>
          </div>
          <div className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-4">
            <p className="text-xs text-iris-300">
              Cada dispositivo que accede a IRIS es identificado mediante un UUID único generado en el frontend
              y almacenado en localStorage. El backend valida el device ID en cada request.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded bg-iris-700/50 px-3 py-2">
                <p className="text-[10px] text-iris-400">Device ID (actual)</p>
                <p className="mt-0.5 text-xs font-mono text-white">
                  {typeof window !== "undefined" ? (localStorage.getItem("iris_device_id") || "No generado") : "—"}
                </p>
              </div>
              <div className="rounded bg-iris-700/50 px-3 py-2">
                <p className="text-[10px] text-iris-400">Zero Trust Header</p>
                <p className="mt-0.5 text-xs font-mono text-white">x-device-id</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className="status-dot active" />
            Zero Trust Active
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            {stats.activeSessions} sesiones · {stats.failedLogins} failed logins · {stats.anomalyBlocks} AI blocks
          </span>
        </div>
        <span className="text-[10px] text-iris-500">Zero Trust v1 — IRIS Enterprise Security</span>
      </div>
    </div>
  );
}
