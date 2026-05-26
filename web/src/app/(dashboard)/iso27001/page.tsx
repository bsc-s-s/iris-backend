"use client";

import { useState, useEffect } from "react";
import {
  Shield, Server, RefreshCw, Users, Database, Key,
  AlertTriangle, CheckCircle, XCircle, Eye,
  Clock, HardDrive, Activity, FileText, Globe,
  Lock, Unlock, RotateCcw, Play, Plus, ArrowRight,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

export default function ISO27001Page() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  useEffect(() => {
    v1.iso27001.dashboard().then(setDashboard).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const d = dashboard || {};
  const backup = d.backup || {};
  const drp = d.drp || {};
  const providers = d.providers || [];
  const encryptionKeys = d.encryptionKeys || [];
  const sensitiveFields = d.sensitiveFields || [];

  const overviewKpis = [
    { title: "Backup Status", value: backup.lastBackup ? 1 : 0, subtitle: backup.lastBackup ? `${backup.frequency || "N/A"}` : "Sin backups", icon: <HardDrive className="h-5 w-5" />, color: backup.lastBackup ? "success" : "danger" as any },
    { title: "DRP Status", value: drp.status === "active" ? 1 : 0, subtitle: drp.status || "No configurado", icon: <Activity className="h-5 w-5" />, color: drp.status === "active" ? "success" : drp.status === "in_review" ? "warning" : "danger" as any },
    { title: "Proveedores", value: providers.length, subtitle: `${providers.filter((p: any) => p.riskLevel === "high").length} alto riesgo`, icon: <Globe className="h-5 w-5" />, color: providers.filter((p: any) => p.riskLevel === "high").length > 0 ? "warning" : "accent" as any },
    { title: "Claves Cifrado", value: encryptionKeys.length, subtitle: `${encryptionKeys.filter((k: any) => k.status === "active").length} activas`, icon: <Key className="h-5 w-5" />, color: "info" as any },
    { title: "Campos Sensibles", value: sensitiveFields.length, subtitle: "Clasificados", icon: <Lock className="h-5 w-5" />, color: "success" as any },
    { title: "Último Backup", value: backup.lastBackup ? new Date(backup.lastBackup).toLocaleDateString("es") : "—", subtitle: backup.lastDuration || "", icon: <Clock className="h-5 w-5" />, color: "accent" as any },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "backup", label: "Backup", icon: HardDrive },
    { id: "drp", label: "DRP", icon: Activity },
    { id: "providers", label: "Proveedores", icon: Globe },
    { id: "keys", label: "Claves Cifrado", icon: Key },
    { id: "fields", label: "Campos Sensibles", icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="ISO 27001 Management Center"
        subtitle="Sistema de Gestión de Seguridad de la Información"
        badge={{
          text: backup.lastBackup && drp.status === "active" ? "Protegido" : "Requiere Atención",
          color: backup.lastBackup && drp.status === "active" ? "badge-low" : "badge-critical",
        }}
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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {overviewKpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Backup Status Card */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Backup Status</h3>
            </div>
            {backup.lastBackup ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Último Backup</span>
                  <span className="text-xs font-medium text-white">{new Date(backup.lastBackup).toLocaleString("es")}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Frecuencia</span>
                  <span className="badge badge-info text-[10px]">{backup.frequency || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Duración</span>
                  <span className="text-xs font-medium text-white">{backup.lastDuration || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Tamaño</span>
                  <span className="text-xs font-medium text-white">{backup.lastSize || "—"}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Tipo:</span>
                  <span className="badge badge-info text-[10px]">{backup.type || "incremental"}</span>
                  <span className="text-xs text-iris-400">Retención:</span>
                  <span className="badge badge-info text-[10px]">{backup.retention || "30d"}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Server className="mb-2 h-8 w-8 text-iris-500" />
                <p className="text-xs text-iris-400">Backup no configurado</p>
              </div>
            )}
          </GlassCard>

          {/* DRP Status Card */}
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-iris-accent" />
              <h3 className="text-sm font-semibold text-white">Disaster Recovery Plan</h3>
            </div>
            {drp.status ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Estado</span>
                  <span className={`badge text-[10px] ${
                    drp.status === "active" ? "badge-low"
                    : drp.status === "in_review" ? "badge-medium"
                    : "badge-critical"
                  }`}>{drp.status}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">RTO</span>
                  <span className="text-xs font-medium text-white">{drp.rto || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">RPO</span>
                  <span className="text-xs font-medium text-white">{drp.rpo || "—"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-3">
                  <span className="text-xs text-iris-400">Último Test</span>
                  <span className="text-xs font-medium text-white">
                    {drp.lastTestDate ? new Date(drp.lastTestDate).toLocaleDateString("es") : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-center">
                <Activity className="mb-2 h-8 w-8 text-iris-500" />
                <p className="text-xs text-iris-400">DRP no configurado</p>
              </div>
            )}
          </GlassCard>

          {/* Encryption Keys Summary */}
          {encryptionKeys.length > 0 && (
            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <Key className="h-4 w-4 text-iris-accent" />
                <h3 className="text-sm font-semibold text-white">Claves de Cifrado</h3>
              </div>
              <div className="space-y-2">
                {encryptionKeys.slice(0, 5).map((k: any) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {k.status === "active" ? (
                        <Lock className="h-3.5 w-3.5 text-iris-success" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5 text-iris-danger" />
                      )}
                      <span className="text-xs text-white">{k.name || k.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${k.status === "active" ? "badge-low" : "badge-critical"}`}>{k.status}</span>
                      <span className="text-[10px] text-iris-400">A{k.algorithm?.toUpperCase() || "ES-256"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Sensitive Fields Summary */}
          {sensitiveFields.length > 0 && (
            <GlassCard>
              <div className="mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-iris-accent" />
                <h3 className="text-sm font-semibold text-white">Campos Sensibles</h3>
              </div>
              <div className="space-y-2">
                {sensitiveFields.slice(0, 5).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-4 py-2.5">
                    <div>
                      <span className="text-xs font-medium text-white">{f.fieldName}</span>
                      <span className="ml-2 text-[10px] text-iris-400">{f.table}</span>
                    </div>
                    <span className={`badge text-[10px] ${
                      f.classification === "critical" ? "badge-critical"
                      : f.classification === "sensitive" ? "badge-high"
                      : "badge-medium"
                    }`}>{f.classification}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {activeTab === "backup" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Configuración de Backup</h3>
            <p className="mt-0.5 text-xs text-iris-400">Política de respaldo y recuperación</p>
          </div>
          {backup.lastBackup ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Estado", value: "Configurado", color: "text-iris-success" },
                { label: "Frecuencia", value: backup.frequency || "diaria" },
                { label: "Tipo", value: backup.type || "incremental" },
                { label: "Retención", value: backup.retention || "30 días" },
                { label: "Último Backup", value: backup.lastBackup ? new Date(backup.lastBackup).toLocaleDateString("es") : "—" },
                { label: "Duración", value: backup.lastDuration || "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <p className="text-[10px] text-iris-400">{item.label}</p>
                  <p className={`mt-1 text-sm font-semibold text-white ${item.color || ""}`}>{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Server className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Backup no configurado — usa la API para configurarlo</p>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "drp" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Disaster Recovery Plan</h3>
            <p className="mt-0.5 text-xs text-iris-400">Plan de recuperación ante desastres</p>
          </div>
          {drp.status ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Estado", value: drp.status || "—" },
                { label: "RTO", value: drp.rto || "—" },
                { label: "RPO", value: drp.rpo || "—" },
                { label: "Último Test", value: drp.lastTestDate ? new Date(drp.lastTestDate).toLocaleDateString("es") : "—" },
                { label: "Resultado Test", value: drp.lastTestResult || "—" },
                { label: "DRP Documentado", value: drp.documented ? "Sí" : "No" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                  <p className="text-[10px] text-iris-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Activity className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">DRP no configurado</p>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "providers" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Proveedores Externos</h3>
            <p className="mt-0.5 text-xs text-iris-400">Proveedores de servicios evaluados (ISO 27001 A.15)</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : providers.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Globe className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin proveedores registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Nombre</th>
                    <th className="px-3 py-2 text-left text-iris-400">Servicio</th>
                    <th className="px-3 py-2 text-center text-iris-400">Riesgo</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-right text-iris-400">Evaluado</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p: any) => (
                    <tr key={p.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{p.name}</td>
                      <td className="px-3 py-2.5 text-iris-400">{p.service}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          p.riskLevel === "high" ? "badge-critical"
                          : p.riskLevel === "medium" ? "badge-high"
                          : "badge-low"
                        }`}>{p.riskLevel}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${p.active ? "badge-low" : "badge-critical"}`}>
                          {p.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-iris-400">
                        {p.lastAssessment ? new Date(p.lastAssessment).toLocaleDateString("es") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "keys" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Claves de Cifrado</h3>
            <p className="mt-0.5 text-xs text-iris-400">Gestión de claves criptográficas (ISO 27001 A.10)</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : encryptionKeys.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Key className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin claves de cifrado registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Nombre</th>
                    <th className="px-3 py-2 text-center text-iris-400">Algoritmo</th>
                    <th className="px-3 py-2 text-center text-iris-400">Estado</th>
                    <th className="px-3 py-2 text-center text-iris-400">Creada</th>
                    <th className="px-3 py-2 text-center text-iris-400">Rota</th>
                  </tr>
                </thead>
                <tbody>
                  {encryptionKeys.map((k: any) => (
                    <tr key={k.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{k.name || k.id}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="badge badge-info text-[10px]">{k.algorithm || "AES-256"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          k.status === "active" ? "badge-low"
                          : k.status === "rotated" ? "badge-medium"
                          : "badge-critical"
                        }`}>{k.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-iris-400">
                        {new Date(k.createdAt).toLocaleDateString("es")}
                      </td>
                      <td className="px-3 py-2.5 text-center text-iris-400">
                        {k.lastRotated ? new Date(k.lastRotated).toLocaleDateString("es") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "fields" && (
        <GlassCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Campos de Datos Sensibles</h3>
            <p className="mt-0.5 text-xs text-iris-400">Inventario de campos con datos sensibles (ISO 27001 A.8)</p>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-iris-600" />)}</div>
          ) : sensitiveFields.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <Database className="mb-2 h-8 w-8 text-iris-500" />
              <p className="text-sm text-iris-400">Sin campos sensibles clasificados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iris-600/30">
                    <th className="px-3 py-2 text-left text-iris-400">Campo</th>
                    <th className="px-3 py-2 text-left text-iris-400">Tabla</th>
                    <th className="px-3 py-2 text-center text-iris-400">Clasificación</th>
                    <th className="px-3 py-2 text-center text-iris-400">Encriptado</th>
                    <th className="px-3 py-2 text-center text-iris-400">Enmascarado</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitiveFields.map((f: any) => (
                    <tr key={f.id} className="border-b border-iris-600/20 hover:bg-iris-600/20">
                      <td className="px-3 py-2.5 font-medium text-white">{f.fieldName}</td>
                      <td className="px-3 py-2.5 text-iris-400">{f.table}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`badge text-[10px] ${
                          f.classification === "critical" ? "badge-critical"
                          : f.classification === "sensitive" ? "badge-high"
                          : "badge-medium"
                        }`}>{f.classification}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {f.encrypted ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-iris-success" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-iris-danger" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {f.masked ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-iris-success" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-iris-warning" />
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
            ISO 27001 Module Active
          </span>
          <span className="text-[10px] text-iris-500">|</span>
          <span className="text-[10px] text-iris-400">
            A.12 Backup: {backup.lastBackup ? "OK" : "Pendiente"} · A.17 DRP: {drp.status || "Pendiente"} · A.15 Proveedores: {providers.length} · A.10 Cifrado: {encryptionKeys.length}
          </span>
        </div>
        <span className="text-[10px] text-iris-500">ISO 27001:2022 Management Center v1</span>
      </div>
    </div>
  );
}
