"use client";

import { useState, useEffect } from "react";
import { Globe, CheckCircle, XCircle, Shield, Plus, Trash2, RefreshCw } from "lucide-react";
import { v1 } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PROVIDER_META: Record<string, { name: string; color: string; fields: string[] }> = {
  saml: {
    name: "SAML 2.0",
    color: "text-blue-400",
    fields: ["issuer", "entryPoint", "certificate"],
  },
  oidc: {
    name: "OpenID Connect",
    color: "text-purple-400",
    fields: ["issuer", "entryPoint", "clientId", "clientSecret"],
  },
  google: {
    name: "Google Workspace",
    color: "text-green-400",
    fields: ["issuer", "entryPoint", "clientId", "clientSecret"],
  },
  microsoft: {
    name: "Microsoft Entra ID",
    color: "text-amber-400",
    fields: ["issuer", "entryPoint", "clientId", "clientSecret"],
  },
};

type ProviderConfig = {
  id: string;
  provider: string;
  issuer: string;
  entryPoint: string;
  certificate?: string;
  clientId?: string;
  enabled: boolean;
};

export default function SsoPage() {
  const { organization } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([v1.sso.providers(), v1.sso.config()])
      .then(([provs, cfgs]) => {
        setProviders(provs);
        setConfigs(cfgs || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeConfigs = configs.filter((c) => c.enabled);
  const inactiveProviders = providers.filter(
    (p: any) => !configs.find((c) => c.provider === p.id && c.enabled),
  );

  const startEdit = (provider: string) => {
    const existing = configs.find((c) => c.provider === provider);
    setForm({
      provider,
      issuer: existing?.issuer || "",
      entryPoint: existing?.entryPoint || "",
      certificate: existing?.certificate || "",
      clientId: existing?.clientId || "",
      clientSecret: "",
      enabled: true,
    });
    setEditing(provider);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await v1.sso.saveConfig(form);
      setConfigs((prev) => {
        const idx = prev.findIndex((c) => c.provider === saved.provider);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setEditing(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider: string) => {
    try {
      await v1.sso.deleteConfig(provider);
      setConfigs((prev) => prev.filter((c) => c.provider !== provider));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SSO</h1>
        <p className="mt-1 text-sm text-iris-400">Autenticación single sign-on para tu organización</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="text-2xl font-bold text-white">{activeConfigs.length}</div>
          <p className="text-xs text-iris-400">Proveedores activos</p>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-white">{providers.length}</div>
          <p className="text-xs text-iris-400">Proveedores disponibles</p>
        </div>
        <div className="card">
          <div className="text-2xl font-bold text-white">{organization?.name || "-"}</div>
          <p className="text-xs text-iris-400">Organización</p>
        </div>
      </div>

      {activeConfigs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Proveedores configurados</h2>
          <div className="space-y-3">
            {activeConfigs.map((cfg) => {
              const meta = PROVIDER_META[cfg.provider] || { name: cfg.provider, color: "text-iris-400", fields: [] };
              return (
                <div key={cfg.provider} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-iris-600/30 ${meta.color}`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{meta.name}</p>
                      <p className="text-xs text-iris-400">{cfg.issuer}</p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-iris-success" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(cfg.provider)} className="btn btn-ghost text-xs">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(cfg.provider)} className="btn btn-ghost text-xs text-iris-danger">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {inactiveProviders.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Agregar proveedor</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {inactiveProviders.map((p: any) => {
              const meta = PROVIDER_META[p.id] || { name: p.name, color: "text-iris-400", fields: [] };
              return (
                <div key={p.id} className="card flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-iris-600/30 ${meta.color}`}>
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{meta.name}</p>
                      <p className="text-xs text-iris-400">{p.description}</p>
                    </div>
                  </div>
                  <button onClick={() => startEdit(p.id)} className="btn btn-primary text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Configurar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-white">
            Configurar {PROVIDER_META[editing]?.name || editing}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Issuer URL</label>
              <input
                className="input"
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="https://accounts.google.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-iris-300">Entry Point</label>
              <input
                className="input"
                value={form.entryPoint}
                onChange={(e) => setForm({ ...form, entryPoint: e.target.value })}
                placeholder="https://accounts.google.com/o/oauth2/v2/auth"
              />
            </div>
            {(editing === "oidc" || editing === "google" || editing === "microsoft") && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-iris-300">Client ID</label>
                  <input
                    className="input"
                    value={form.clientId}
                    onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-iris-300">Client Secret</label>
                  <input
                    className="input"
                    type="password"
                    value={form.clientSecret}
                    onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}
            {editing === "saml" && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Certificate (X.509)</label>
                <textarea
                  className="input font-mono text-xs"
                  value={form.certificate}
                  onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                  rows={4}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-iris-300">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded border-iris-600 bg-iris-700"
              />
              Proveedor activo
            </label>
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="btn btn-ghost text-xs">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary text-xs">
                {saving ? "Guardando..." : "Guardar configuración"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Redirect URLs</h3>
        <div className="space-y-2">
          {providers.map((p: any) => (
            <div key={p.id} className="rounded-lg bg-iris-600/20 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-white">{PROVIDER_META[p.id]?.name || p.name}</p>
              <code className="block text-[10px] text-iris-400">
                {p.id === "saml"
                  ? `${window.location.origin}/api/v1/sso/callback/saml`
                  : `${window.location.origin}/api/v1/sso/callback/${p.id}`}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
