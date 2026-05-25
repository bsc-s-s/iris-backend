"use client";

import { useState, useEffect } from "react";
import {
  Key, Plus, Copy, Check, Trash2, Eye, EyeOff,
  AlertTriangle, Shield, Clock, XCircle,
} from "lucide-react";
import { v1 } from "@/lib/api";
import { GlassCard } from "@/components/ui/glass-card";
import { ExecutiveHeader } from "@/components/ui/executive-header";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newKey, setNewKey] = useState<any>(null);
  const [form, setForm] = useState({ name: "", scopes: "read", rateLimit: 100 });
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    try { setKeys(await v1.apiKeys.list()); } catch {}
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const createKey = async () => {
    if (!form.name) return;
    setCreating(true);
    try {
      const result = await v1.apiKeys.create(form);
      setNewKey(result);
      setShowNew(false);
      setForm({ name: "", scopes: "read", rateLimit: 100 });
      loadKeys();
    } catch {}
    setCreating(false);
  };

  const revokeKey = async (id: string) => {
    try {
      await v1.apiKeys.revoke(id);
      loadKeys();
    } catch {}
  };

  const deleteKey = async (id: string) => {
    try {
      await v1.apiKeys.delete(id);
      loadKeys();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <ExecutiveHeader
        title="API Keys Management"
        subtitle="Gestiona las claves de API para integraciones externas"
        action={
          <button onClick={() => { setShowNew(true); setNewKey(null); }} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            Nueva API Key
          </button>
        }
      />

      {/* New Key Form */}
      {showNew && !newKey && (
        <GlassCard>
          <h3 className="mb-4 text-sm font-semibold text-white">Crear Nueva API Key</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Producción, Staging, etc." />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Scope</label>
              <select value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} className="input">
                <option value="read">Solo lectura</option>
                <option value="read:write">Lectura y escritura</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Rate Limit (req/min)</label>
              <input type="number" value={form.rateLimit} onChange={(e) => setForm({ ...form, rateLimit: parseInt(e.target.value) || 100 })} className="input" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={createKey} disabled={creating || !form.name} className="btn btn-primary">
              {creating ? "Creando..." : "Crear API Key"}
            </button>
            <button onClick={() => setShowNew(false)} className="btn btn-ghost">Cancelar</button>
          </div>
        </GlassCard>
      )}

      {/* New Key Display */}
      {newKey && (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-iris-warning/30 bg-iris-warning/10 p-4">
            <AlertTriangle className="h-5 w-5 text-iris-warning" />
            <div>
              <p className="text-sm font-medium text-iris-warning">Guarda esta clave — no se mostrará de nuevo</p>
              <p className="text-xs text-iris-400">Esta es la única oportunidad de ver el secreto completo</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-iris-800 px-3 py-2.5 text-sm text-iris-accent break-all">{newKey.key}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey.key); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn btn-ghost btn-sm">
                  {copied ? <Check className="h-3.5 w-3.5 text-iris-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-iris-400">
              <span>Prefijo: <code className="text-iris-300">{newKey.prefix}</code></span>
              <span>Scope: {newKey.scopes}</span>
              <span>Rate Limit: {newKey.rateLimit}/min</span>
            </div>
          </div>
          <button onClick={() => setNewKey(null)} className="btn btn-primary mt-4">Entendido, cerrar</button>
        </GlassCard>
      )}

      {/* Keys List */}
      <GlassCard>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Tus API Keys ({keys.length})</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Key className="mb-2 h-8 w-8 text-iris-500" />
            <p className="text-sm text-iris-400">No hay API keys. Crea una para integraciones externas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k: any) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-iris-600/30 bg-iris-600/20 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{k.name}</span>
                    <code className="rounded bg-iris-800 px-1.5 py-0.5 text-[10px] text-iris-400">{k.prefix}...</code>
                    <span className={`badge text-[10px] ${k.enabled ? "badge-low" : "badge-critical"}`}>
                      {k.enabled ? "Activa" : "Revocada"}
                    </span>
                    <span className="badge badge-medium text-[10px]">{k.scopes}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-iris-400">
                    <span>Rate: {k.rateLimit}/min</span>
                    <span>Usos: {k.usageCount}</span>
                    {k.lastUsedAt && <span>Último uso: {new Date(k.lastUsedAt).toLocaleDateString("es")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {k.enabled && (
                    <button onClick={() => revokeKey(k.id)} className="btn btn-ghost btn-sm text-iris-warning">
                      Revocar
                    </button>
                  )}
                  <button onClick={() => deleteKey(k.id)} className="btn btn-ghost btn-sm text-iris-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
