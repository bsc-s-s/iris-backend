"use client";

import { useState, useEffect } from "react";
import {
  Shield, Eye, UserCheck, FileText, Download, Bell,
  AlertTriangle, CheckCircle, XCircle, Settings,
  Globe, Lock, Users, Clock, Activity, Search,
  RefreshCw, ExternalLink, Key, Sliders,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

const CONSENT_CATEGORIES = [
  { id: "marketing", label: "Marketing", color: "text-iris-rose" },
  { id: "analytics", label: "Analítica", color: "text-iris-accent" },
  { id: "functional", label: "Funcional", color: "text-iris-success" },
  { id: "third_party", label: "Terceros", color: "text-iris-warning" },
];

export default function PrivacyPage() {
  const [loading, setLoading] = useState(true);
  const [gdprDashboard, setGdprDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    Promise.all([
      v1.gdpr.dashboard().catch(() => null),
    ]).then(([gdpr]) => {
      setGdprDashboard(gdpr);
      setLoading(false);
    });
  }, []);

  const d = gdprDashboard || {};
  const consents = d.consentList || [];
  const privacyPolicies = d.privacyPolicies || [];
  const dsrList = d.dsrList || [];
  const dpiaList = d.dpiaList || [];
  const exportRequests = d.exportRequests || [];
  const retentionPolicies = d.retentionPolicies || [];

  const activeConsents = consents.filter((c: any) => c.active);
  const pendingDsrs = dsrList.filter((r: any) => r.status === "pending");

  const overviewKpis = [
    { title: "Consentimientos Activos", value: activeConsents.length, subtitle: `${consents.length} totales`, icon: <UserCheck className="h-5 w-5" />, color: "success" as any },
    { title: "DSR Pendientes", value: pendingDsrs.length, subtitle: `${dsrList.length} solicitudes`, icon: <FileText className="h-5 w-5" />, color: pendingDsrs.length > 0 ? "warning" : "success" as any },
    { title: "DPIAs Activas", value: dpiaList.length, subtitle: "Evaluaciones de impacto", icon: <Shield className="h-5 w-5" />, color: "accent" as any },
    { title: "Políticas de Privacidad", value: privacyPolicies.length, subtitle: "Versiones publicadas", icon: <FileText className="h-5 w-5" />, color: "info" as any },
    { title: "Exportaciones", value: exportRequests.length, subtitle: "Solicitudes de datos", icon: <Download className="h-5 w-5" />, color: "accent" as any },
    { title: "Políticas Retención", value: retentionPolicies.length, subtitle: "Configuradas", icon: <Clock className="h-5 w-5" />, color: "success" as any },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "consents", label: "Consentimientos", icon: UserCheck },
    { id: "policies", label: "Políticas", icon: FileText },
    { id: "dsr", label: "DSR", icon: Bell },
    { id: "settings", label: "Configuración", icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Privacy Center"
        subtitle="Gestión centralizada de privacidad y consentimientos"
        badge={{
          text: activeConsents.length > 0 ? "Consentimientos Activos" : "Sin Consentimientos",
          color: activeConsents.length > 0 ? "badge-low" : "badge-medium",
        }}
      />

      {/* Privacy Status Banner */}
      <div className="rounded-lg border border-iris-accent/30 bg-iris-accent-dim p-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-iris-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Privacidad desde el Diseño</p>
            <p className="mt-1 text-xs text-iris-300">
              IRIS Privacy Center implementa controles de privacidad por defecto.
              {activeConsents.length > 0
                ? ` ${activeConsents.length} consentimientos activos · ${dpiaList.length} DPIAs documentadas`
                : " Configura tus consentimientos y políticas de privacidad para comenzar."}
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
        {overviewKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Consent Categories */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Categorías de Consentimiento</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-iris-600" />)}</div>
            ) : (
              <div className="space-y-3">
                {CONSENT_CATEGORIES.map((cat) => {
                  const catConsents = consents.filter((c: any) => c.type === cat.id);
                  const activeCount = catConsents.filter((c: any) => c.active).length;
                  return (
                    <div key={cat.id} className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${cat.color.replace("text-", "bg-")}`} />
                          <span className="text-xs font-medium text-white">{cat.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-iris-300">{activeCount}/{catConsents.length}</span>
                          <span className={`badge text-[10px] ${activeCount > 0 ? "badge-low" : "badge-medium"}`}>
                            {activeCount > 0 ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Actividad Reciente</h3>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
            ) : dsrList.length === 0 && exportRequests.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <Activity className="mb-2 h-8 w-8 text-iris-500" />
                <p className="text-sm text-iris-400">Sin actividad reciente de privacidad</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...dsrList.slice(0, 3), ...exportRequests.slice(0, 2)].sort(
                  (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                ).slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {item.requestType ? (
                        <Bell className="h-3.5 w-3.5 text-iris-warning" />
                      ) : (
                        <Download className="h-3.5 w-3.5 text-iris-accent" />
                      )}
                      <span className="text-xs text-iris-300">
                        {item.requestType || "Exportación de datos"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${
                        item.status === "completed" ? "badge-low"
                        : item.status === "processing" || item.status === "in_progress" ? "badge-medium"
                        : "badge-high"
                      }`}>{item.status}</span>
                      <span className="text-[10px] text-iris-400">
                        {new Date(item.createdAt).toLocaleDateString("es")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Privacy Policies Summary */}
          {privacyPolicies.length > 0 && (
            <GlassCard className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-iris-accent" />
                  <h3 className="text-sm font-semibold text-white">Políticas de Privacidad</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-iris-600/30">
                      <th className="px-3 py-2 text-left text-iris-400">Versión</th>
                      <th className="px-3 py-2 text-left text-iris-400">Estado</th>
                      <th className="px-3 py-2 text-right text-iris-400">Publicada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {privacyPolicies.slice(0, 5).map((p: any) => (
                      <tr key={p.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                        <td className="px-3 py-2.5 font-medium text-white">{p.version}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge text-[10px] ${p.active ? "badge-low" : "badge-medium"}`}>
                            {p.active ? "Activa" : "Archivada"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-iris-400">
                          {new Date(p.createdAt).toLocaleDateString("es")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === "consents" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Gestión de Consentimientos</h3>
            <p className="mt-0.5 text-xs text-iris-400">Consentimientos de usuarios para tratamiento de datos personales</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : consents.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <UserCheck className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin consentimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Usuario</th>
                    <th className="px-3 py-2 text-left text-iris-400">Categoría</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Concedido</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c: any) => (
                    <tr key={c.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{c.userId || c.email}</td>
                      <td className="px-3 py-2.5 text-iris-400">{c.type || "general"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${c.active ? "badge-low" : "badge-critical"}`}>
                          {c.active ? "Activo" : "Retirado"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {new Date(c.createdAt).toLocaleDateString("es")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "policies" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Políticas de Privacidad</h3>
            <p className="mt-0.5 text-xs text-iris-400">Historial de versiones de la política de privacidad</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : privacyPolicies.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <FileText className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin políticas de privacidad publicadas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Versión</th>
                    <th className="px-3 py-2 text-left text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Publicada</th>
                  </tr>
                </thead>
                <tbody>
                  {privacyPolicies.map((p: any) => (
                    <tr key={p.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{p.version}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-[10px] ${p.active ? "badge-low" : "badge-medium"}`}>
                          {p.active ? "Activa" : "Archivada"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {new Date(p.createdAt).toLocaleDateString("es")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "dsr" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Data Subject Requests</h3>
            <p className="mt-0.5 text-xs text-iris-400">Solicitudes de derechos ARCO + portabilidad (RGPD Arts. 15-22)</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : dsrList.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Bell className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin solicitudes DSR</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Solicitante</th>
                    <th className="px-3 py-2 text-left text-iris-400">Tipo</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {dsrList.map((r: any) => (
                    <tr key={r.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{r.requesterName || r.requesterEmail}</td>
                      <td className="px-3 py-2.5 text-iris-400">{r.requestType}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          r.status === "completed" ? "badge-low"
                          : r.status === "in_progress" ? "badge-medium"
                          : "badge-critical"
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {r.deadline ? new Date(r.deadline).toLocaleDateString("es") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Configuración de Privacidad</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white">Consentimiento por Defecto</p>
                  <p className="text-[10px] text-iris-400">Requerir consentimiento explícito para todo tratamiento</p>
                </div>
                <span className="badge badge-low text-[10px]">Habilitado</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white">Retención de Logs</p>
                  <p className="text-[10px] text-iris-400">Período de retención de registros de consentimiento</p>
                </div>
                <span className="badge badge-info text-[10px]">5 años</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white">Notificaciones DSR</p>
                  <p className="text-[10px] text-iris-400">Alertas para nuevas solicitudes de titulares</p>
                </div>
                <span className="badge badge-low text-[10px]">Activas</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white">Portal de Privacidad</p>
                  <p className="text-[10px] text-iris-400">URL del portal de privacidad para usuarios</p>
                </div>
                <span className="text-[10px] text-iris-400">/privacy-portal</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Privacidad por Defecto</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-iris-success/20 bg-iris-success/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-iris-success" />
                  <span className="text-xs font-medium text-white">Minimización de Datos</span>
                </div>
                <p className="mt-1 text-[10px] text-iris-400">Solo se recolectan datos estrictamente necesarios</p>
              </div>
              <div className="rounded-lg border border-iris-success/20 bg-iris-success/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-iris-success" />
                  <span className="text-xs font-medium text-white">Cifrado en Reposo</span>
                </div>
                <p className="mt-1 text-[10px] text-iris-400">Todos los datos personales cifrados con AES-256</p>
              </div>
              <div className="rounded-lg border border-iris-success/20 bg-iris-success/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-iris-success" />
                  <span className="text-xs font-medium text-white">Control de Acceso</span>
                </div>
                <p className="mt-1 text-[10px] text-iris-400">Acceso a datos personales basado en roles</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className="status-dot active" />
            Privacy Center Active
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            {activeConsents.length} consentimientos · {privacyPolicies.length} políticas · {dsrList.length} DSRs
          </span>
        </div>
        <span className="text-[10px] text-iris-500">Privacy Center v1 — Data Protection by Design</span>
      </div>
    </div>
  );
}
