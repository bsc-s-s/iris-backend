"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Building2, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { organization, user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (organization?.name) setOrgName(organization.name);
  }, [organization]);

  const save = async () => {
    setSaving(true);
    try {
      await api.organizations.update({ name: orgName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-1 text-sm text-iris-400">Gestiona la configuración de tu organización</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-iris-accent" />
          <h3 className="text-sm font-semibold text-white">Organización</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre</label>
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Plan</label>
            <input value={organization?.plan || "free"} className="input" disabled />
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn btn-primary">
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-iris-accent" />
          <h3 className="text-sm font-semibold text-white">Perfil</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre</label>
            <input value={user?.name || ""} className="input" disabled />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Email</label>
            <input value={user?.email || ""} className="input" disabled />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Rol</label>
            <input value={user?.role || ""} className="input" disabled />
          </div>
        </div>
      </div>
    </div>
  );
}
