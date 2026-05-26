"use client";

import { useState, useEffect } from "react";
import {
  Shield, Lock, UserCheck, FileText, Globe, Download,
  AlertTriangle, CheckCircle, XCircle, Plus, Eye,
  ClipboardCheck, Users, Search, ArrowRight, Gauge,
  Fingerprint, Scale, ExternalLink, RefreshCw,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

export default function GDPRPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    v1.gdpr.dashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const d = dashboard || {};
  const dpo = d.dpo || {};
  const dpiaList = d.dpiaList || [];
  const consents = d.consentList || [];
  const transfers = d.transfers || [];
  const exportRequests = d.exportRequests || [];
  const dsrList = d.dsrList || [];
  const retentionPolicies = d.retentionPolicies || [];

  const overviewKpis = [
    { title: "DPIA Activas", value: dpiaList.filter((x: any) => x.status === "in_progress" || x.status === "pending").length, subtitle: `${dpiaList.length} totales`, icon: <ClipboardCheck className="h-5 w-5" />, color: "accent" as any },
    { title: "Consentimientos Activos", value: consents.filter((x: any) => x.active).length, subtitle: `${consents.length} registrados`, icon: <UserCheck className="h-5 w-5" />, color: "success" as any },
    { title: "Transferencias", value: transfers.length, subtitle: `${transfers.filter((x: any) => x.status === "active").length} activas`, icon: <Globe className="h-5 w-5" />, color: "accent" as any },
    { title: "Solicitudes DSR", value: dsrList.filter((x: any) => x.status === "pending").length, subtitle: `${dsrList.length} totales`, icon: <FileText className="h-5 w-5" />, color: "warning" as any },
    { title: "Exportaciones de Datos", value: exportRequests.length, subtitle: "Solicitudes", icon: <Download className="h-5 w-5" />, color: "info" as any },
    { title: "Políticas Retención", value: retentionPolicies.length, subtitle: "Activas", icon: <Shield className="h-5 w-5" />, color: "success" as any },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "dpia", label: "DPIAs", icon: ClipboardCheck },
    { id: "consents", label: "Consentimientos", icon: UserCheck },
    { id: "transfers", label: "Transferencias", icon: Globe },
    { id: "dsr", label: "DSR", icon: FileText },
    { id: "exports", label: "Exportación", icon: Download },
    { id: "retention", label: "Retención", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="GDPR Compliance Center"
        subtitle="Reglamento General de Protección de Datos"
        badge={{ text: dpo?.name ? "DPO Asignado" : "DPO Pendiente", color: dpo?.name ? "badge-low" : "badge-critical" }}
        action={
          <div className="flex items-center gap-2">
            {dpo?.name && (
              <div className="flex items-center gap-2 rounded-lg border border-iris-600/30 bg-iris-600/20 px-3 py-1.5">
                <Shield className="h-3.5 w-3.5 text-iris-accent" />
                <span className="text-[10px] text-iris-300">DPO: {dpo.name}</span>
              </div>
            )}
          </div>
        }
      />

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

      {/* KPIs - always visible */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overviewKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Estado DPO</h3>
            </div>
            {dpo?.name ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Nombre</span>
                  <span className="text-xs font-medium text-white">{dpo.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Email</span>
                  <span className="text-xs font-medium text-white">{dpo.email}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Teléfono</span>
                  <span className="text-xs font-medium text-white">{dpo.phone || "—"}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Shield className="mb-2 h-8 w-8 text-iris-500" />
                <p className="text-xs text-iris-400">No hay DPO asignado</p>
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-iris-warning" />
              <h3 className="text-sm font-semibold text-white">Requisitos Pendientes</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: "DPIAs pendientes de revisión", count: dpiaList.filter((x: any) => x.status === "pending_review").length, critical: dpiaList.filter((x: any) => x.status === "pending_review").length > 0 },
                { label: "Consentimientos por renovar", count: consents.filter((x: any) => x.status === "expiring").length, critical: consents.filter((x: any) => x.status === "expiring").length > 0 },
                { label: "Transferencias sin DPF", count: transfers.filter((x: any) => !x.dpf).length, critical: transfers.filter((x: any) => !x.dpf).length > 0 },
                { label: "DSR sin procesar", count: dsrList.filter((x: any) => x.status === "pending").length, critical: dsrList.filter((x: any) => x.status === "pending").length > 0 },
              ].filter((r) => r.count > 0).map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-300">{r.label}</span>
                  <span className={`badge text-[10px] ${r.critical ? "badge-critical" : "badge-high"}`}>{r.count}</span>
                </div>
              ))}
              {!dsrList.length && (
                <p className="text-center text-xs text-iris-500">Sin requisitos pendientes</p>
              )}
            </div>
          </GlassCard>

          {/* Recent DPIAs */}
          {dpiaList.length > 0 && (
            <GlassCard className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-iris-accent" />
                  <h3 className="text-sm font-semibold text-white">DPIAs Recientes</h3>
                </div>
                <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab("dpia")}>
                  Ver todas <ArrowRight className="ml-1 h-3 w-3" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-iris-600/30">
                      <th className="px-3 py-2 text-left text-iris-400">Título</th>
                      <th className="px-3 py-2 text-left text-iris-400">Departamento</th>
                      <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                      <th className="px-3 py-2 text-center text-iris-400">Riesgo</th>
                      <th className="px-3 py-2 text-right text-iris-400">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dpiaList.slice(0, 5).map((dpia: any) => (
                      <tr key={dpia.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                        <td className="px-3 py-2.5 font-medium text-white">{dpia.title}</td>
                        <td className="px-3 py-2.5 text-iris-400">{dpia.department}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`badge text-[10px] ${
                            dpia.status === "approved" ? "badge-low"
                            : dpia.status === "in_progress" ? "badge-medium"
                            : dpia.status === "pending_review" ? "badge-high"
                            : "badge-critical"
                          }`}>{dpia.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-semibold ${
                            dpia.riskLevel === "high" ? "text-iris-danger"
                            : dpia.riskLevel === "medium" ? "text-iris-warning"
                            : "text-iris-success"
                          }`}>{dpia.riskLevel || "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-iris-400">
                          {new Date(dpia.createdAt).toLocaleDateString("es")}
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

      {activeTab === "dpia" && (
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Data Protection Impact Assessments</h3>
              <p className="mt-0.5 text-xs text-iris-400">Evaluaciones de impacto en protección de datos</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : dpiaList.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <ClipboardCheck className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin DPIAs registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Título</th>
                    <th className="px-3 py-2 text-left text-iris-400">Departamento</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-center text-iris-400">Riesgo</th>
                    <th className="px-3 py-2 text-right text-iris-400">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {dpiaList.map((dpia: any) => (
                    <tr key={dpia.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{dpia.title}</td>
                      <td className="px-3 py-2.5 text-iris-400">{dpia.department}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          dpia.status === "approved" ? "badge-low"
                          : dpia.status === "in_progress" ? "badge-medium"
                          : dpia.status === "pending_review" ? "badge-high"
                          : "badge-critical"
                        }`}>{dpia.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-semibold ${
                          dpia.riskLevel === "high" ? "text-iris-danger"
                          : dpia.riskLevel === "medium" ? "text-iris-warning"
                          : "text-iris-success"
                        }`}>{dpia.riskLevel || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {new Date(dpia.createdAt).toLocaleDateString("es")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "consents" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Gestión de Consentimientos</h3>
            <p className="mt-0.5 text-xs text-iris-400">Consentimientos de usuarios para tratamiento de datos</p>
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
                    <th className="px-3 py-2 text-left text-iris-400">Tipo</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Concedido</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c: any) => (
                    <tr key={c.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 text-white">{c.userId || c.email}</td>
                      <td className="px-3 py-2.5 text-iris-400">{c.type || "generic"}</td>
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

      {activeTab === "transfers" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Transferencias Internacionales</h3>
            <p className="mt-0.5 text-xs text-iris-400">Transferencias de datos fuera del EEE</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : transfers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Globe className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin transferencias registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">País Destino</th>
                    <th className="px-3 py-2 text-left text-iris-400">Propósito</th>
                    <th className="px-3 py-2 text-center text-iris-400">DPF</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t: any) => (
                    <tr key={t.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{t.country}</td>
                      <td className="px-3 py-2.5 text-iris-400">{t.purpose}</td>
                      <td className="px-3 py-2.5 text-center">
                        {t.dpf ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-iris-success" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-iris-danger" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${t.status === "active" ? "badge-low" : "badge-critical"}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {new Date(t.createdAt).toLocaleDateString("es")}
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
            <p className="mt-0.5 text-xs text-iris-400">Solicitudes de titulares de datos (RGPD Art. 15-22)</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : dsrList.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <FileText className="mb-2 h-8 w-8 text-iris-500" />
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

      {activeTab === "exports" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Exportación de Datos</h3>
            <p className="mt-0.5 text-xs text-iris-400">Solicitudes de exportación de datos personales</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : exportRequests.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Download className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin exportaciones de datos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Usuario</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Solicitado</th>
                  </tr>
                </thead>
                <tbody>
                  {exportRequests.map((e: any) => (
                    <tr key={e.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{e.userId || e.email}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          e.status === "completed" ? "badge-low"
                          : e.status === "processing" ? "badge-medium"
                          : "badge-critical"
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {new Date(e.createdAt).toLocaleDateString("es")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "retention" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Políticas de Retención</h3>
            <p className="mt-0.5 text-xs text-iris-400">Políticas de retención y eliminación de datos</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : retentionPolicies.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Shield className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin políticas de retención configuradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Categoría</th>
                    <th className="px-3 py-2 text-center text-iris-400">Período</th>
                    <th className="px-3 py-2 text-center text-iris-400">Acción</th>
                    <th className="px-3 py-2 text-center text-iris-400">Activo</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionPolicies.map((p: any) => (
                    <tr key={p.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{p.category}</td>
                      <td className="px-3 py-2.5 text-center text-iris-400">{p.retentionPeriod}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="badge badge-info text-[10px]">{p.action || "archive"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {p.active ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-iris-success" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-iris-400" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-700/50 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-iris-400">
            <span className="status-dot active" />
            GDPR Module Active
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            {dpo?.name ? "DPO configured" : "DPO pending"}
          </span>
        </div>
        <span className="text-[10px] text-iris-500">GDPR Compliance Center v1</span>
      </div>
    </div>
  );
}
