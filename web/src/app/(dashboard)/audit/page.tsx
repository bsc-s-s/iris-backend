"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Filter } from "lucide-react";
import { api } from "@/lib/api";

const ACTION_LABELS: Record<string, string> = {
  create: "Creación", update: "Actualización", delete: "Eliminación",
  login: "Inicio de sesión", export: "Exportación", simulate: "Simulación",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<any>({ items: [] });
  const [stats, setStats] = useState<any>(null);
  const [entityFilter, setEntityFilter] = useState("");

  useEffect(() => {
    api.audit.list(entityFilter ? { entity: entityFilter } : undefined).then(setLogs).catch(() => {});
    api.audit.stats().then(setStats).catch(() => {});
  }, [entityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Auditoría</h1>
          <p className="mt-1 text-sm text-iris-400">Registro completo de actividad del sistema</p>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-iris-400">Eventos totales</p>
          </div>
          {stats.byAction?.slice(0, 3).map((a: any) => (
            <div key={a.action} className="card text-center">
              <p className="text-2xl font-bold text-white">{a._count}</p>
              <p className="text-xs text-iris-400">{ACTION_LABELS[a.action] || a.action}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iris-400" />
          <input className="input pl-9" placeholder="Buscar en auditoría..." />
        </div>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input w-40">
          <option value="">Todo</option>
          <option value="assessment">Evaluaciones</option>
          <option value="user">Usuarios</option>
          <option value="organization">Organización</option>
          <option value="protocol">Protocolos</option>
          <option value="simulation">Simulaciones</option>
        </select>
      </div>

      <div className="card">
        <div className="space-y-1">
          {logs.items?.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-iris-500" />
              <p className="text-sm text-iris-400">No hay eventos de auditoría</p>
            </div>
          ) : (
            logs.items?.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between rounded-lg px-4 py-2.5 hover:bg-iris-600/30">
                <div className="flex items-center gap-3">
                  <span className="badge badge-medium text-[10px]">{ACTION_LABELS[log.action] || log.action}</span>
                  <div>
                    <p className="text-sm text-iris-200">{log.description || `${log.action} en ${log.entity}`}</p>
                    <p className="text-xs text-iris-400">{log.user?.name} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <span className="text-xs text-iris-400">{log.entity}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
