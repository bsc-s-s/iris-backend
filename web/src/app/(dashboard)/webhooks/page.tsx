"use client";

import { useState, useEffect } from "react";
import {
  Webhook, Plus, Trash2, TestTube, Check, XCircle,
  Activity, Clock, RefreshCw,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

const AVAILABLE_EVENTS = [
  { id: "risk.score_changed", label: "Score de riesgo cambiado" },
  { id: "risk.threshold_breached", label: "Umbral de riesgo superado" },
  { id: "anomaly.detected", label: "Anomalía detectada" },
  { id: "compliance.finding", label: "Hallazgo de compliance" },
  { id: "assessment.completed", label: "Evaluación completada" },
  { id: "incident.reported", label: "Incidente reportado" },
  { id: "pattern.detected", label: "Patrón organizacional detectado" },
  { id: "user.suspicious_activity", label: "Actividad sospechosa de usuario" },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", events: [] as string[], retryCount: 3, timeout: 5000 });
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [w, e] = await Promise.all([
        v1.webhooks.list().catch(() => []),
        v1.webhooks.events().catch(() => []),
      ]);
      setWebhooks(w);
      setEvents(e);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createWebhook = async () => {
    if (!form.name || !form.url || form.events.length === 0) return;
    setSaving(true);
    try {
      await v1.webhooks.create(form);
      setShowForm(false);
      setForm({ name: "", url: "", events: [], retryCount: 3, timeout: 5000 });
      load();
    } catch {}
    setSaving(false);
  };

  const deleteWebhook = async (id: string) => {
    try {
      await v1.webhooks.delete(id);
      load();
    } catch {}
  };

  const testWebhook = async (id: string) => {
    setTestResult(id);
    try {
      await v1.webhooks.test(id);
      setTimeout(() => setTestResult(null), 2000);
    } catch {
      setTestResult(null);
    }
  };

  const toggleEvent = (eventId: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(eventId)
        ? f.events.filter((e) => e !== eventId)
        : [...f.events, eventId],
    }));
  };

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="Webhooks Configuration"
        subtitle="Configura endpoints para recibir eventos en tiempo real de IRIS"
        action={
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            Nuevo Webhook
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold text-white">Nuevo Webhook Endpoint</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Mi webhook" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="input" placeholder="https://ejemplo.com/webhook" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Reintentos</label>
              <input type="number" value={form.retryCount} onChange={(e) => setForm({ ...form, retryCount: parseInt(e.target.value) || 3 })} className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Timeout (ms)</label>
              <input type="number" value={form.timeout} onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) || 5000 })} className="input" />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Eventos a suscribir</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev.id} className="flex items-center gap-2 rounded-lg border border-iris-600/30 bg-iris-600/20 px-3 py-2 cursor-pointer hover:bg-iris-600/40">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                    className="rounded border-iris-500 bg-iris-700 text-iris-accent"
                  />
                  <span className="text-xs text-iris-300">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={createWebhook} disabled={saving || !form.name || !form.url || form.events.length === 0} className="btn btn-primary">
              {saving ? "Creando..." : "Crear Webhook"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
          </div>
        </GlassCard>
      )}

      {/* Webhooks list */}
      <GlassCard>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Endpoints ({webhooks.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Webhook className="mb-2 h-8 w-8 text-iris-500" />
            <p className="text-sm text-iris-400">Sin webhooks configurados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh: any) => (
              <div key={wh.id} className="rounded-lg border border-iris-600/30 bg-iris-600/20 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Webhook className={`h-4 w-4 ${wh.enabled ? "text-iris-accent" : "text-iris-400"}`} />
                      <span className="text-sm font-medium text-white">{wh.name}</span>
                      <span className={`badge text-[10px] ${wh.enabled ? "badge-low" : "badge-critical"}`}>
                        {wh.enabled ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <code className="mt-1 block text-xs text-iris-400">{wh.url}</code>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {wh.events.map((ev: string) => (
                        <span key={ev} className="badge badge-info text-[10px]">{ev}</span>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-iris-400">
                      <span>Timeout: {wh.timeout}ms</span>
                      <span>Reintentos: {wh.retryCount}</span>
                      {wh.lastDeliveryAt && <span>Último delivery: {new Date(wh.lastDeliveryAt).toLocaleString("es")}</span>}
                    </div>
                    {wh.lastStatus && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className={`status-dot ${wh.lastStatus === "success" ? "active" : "critical"}`} />
                        <span className="text-[10px] text-iris-400">{wh.lastStatus === "success" ? "Último delivery exitoso" : "Último delivery fallido"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button onClick={() => testWebhook(wh.id)} className="btn btn-ghost btn-sm">
                      {testResult === wh.id ? <Check className="h-3.5 w-3.5 text-iris-success" /> : <TestTube className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => deleteWebhook(wh.id)} className="btn btn-ghost btn-sm text-iris-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Event Log */}
      {events.length > 0 && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-iris-accent" />
            <h3 className="text-sm font-semibold text-white">Event Log ({events.length})</h3>
          </div>
          <div className="space-y-2">
            {events.slice(0, 20).map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg bg-iris-600/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`status-dot ${ev.status === "delivered" ? "active" : ev.status === "failed" ? "critical" : "warning"}`} />
                  <span className="text-xs text-iris-300">{ev.event}</span>
                  {ev.responseCode && (
                    <span className={`text-[10px] ${ev.responseCode < 300 ? "text-iris-success" : "text-iris-danger"}`}>
                      {ev.responseCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-iris-400">
                  <span>Intentos: {ev.attempts}</span>
                  <span>{new Date(ev.createdAt).toLocaleString("es")}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
