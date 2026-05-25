"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ArrowRight, Filter, Building2, ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function AssessmentsPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => {
    api.assessments.list(filterStatus || undefined).then(setAssessments).catch(() => {});
    api.facilities.list().then(setFacilities).catch(() => {});
  };

  useEffect(() => { load(); }, [filterStatus]);

  const create = async () => {
    if (!title) return;
    setCreating(true);
    try {
      const a = await api.assessments.create({ title, facilityId: facilityId || undefined });
      setShowCreate(false);
      setTitle("");
      setFacilityId("");
      router.push(`/assessments/${a.id}`);
    } catch {}
    setCreating(false);
  };

  const filtered = assessments.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Evaluaciones</h1>
          <p className="mt-1 text-sm text-iris-400">Gestiona las evaluaciones de riesgo de tu organización</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          <Plus className="h-4 w-4" /> Nueva evaluación
        </button>
      </div>

      {showCreate && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-white">Nueva evaluación</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Título</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Ej: Evaluación anual 2026" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Instalación (opcional)</label>
              <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className="input">
                <option value="">Todas las instalaciones</option>
                {facilities.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={create} disabled={creating} className="btn btn-primary flex-1">
                {creating ? "Creando..." : "Crear"}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iris-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Buscar evaluaciones..."
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-40">
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="in_progress">En curso</option>
          <option value="completed">Completado</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-center">
            <ClipboardCheck className="mb-3 h-10 w-10 text-iris-500" />
            <p className="text-sm text-iris-400">No hay evaluaciones aún</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary mt-4">
              Crear primera evaluación
            </button>
          </div>
        ) : (
          filtered.map((a: any) => (
            <div
              key={a.id}
              onClick={() => router.push(`/assessments/${a.id}`)}
              className="card card-hover flex cursor-pointer items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-iris-accent/10">
                  <ClipboardCheck className="h-5 w-5 text-iris-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{a.title}</p>
                  <p className="text-xs text-iris-400">
                    {a.facility?.name && `${a.facility.name} · `}
                    {new Date(a.createdAt).toLocaleDateString()} · {a.createdBy?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${a.status === "completed" ? "badge-low" : a.status === "in_progress" ? "badge-medium" : "badge-high"}`}>
                  {a.status === "completed" ? "Completado" : a.status === "in_progress" ? "En curso" : "Borrador"}
                </span>
                <ArrowRight className="h-4 w-4 text-iris-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


