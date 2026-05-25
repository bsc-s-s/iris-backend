"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Building2, User, Shield, Key, Copy, Check, Eye, EyeOff } from "lucide-react";
import { api, v1 } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GlassCard } from "@/components/ui/glass-card";

export default function SettingsPage() {
  const { organization, user } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // MFA state
  const [mfaStatus, setMfaStatus] = useState<any>(null);
  const [mfaSetup, setMfaSetup] = useState<any>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    if (organization?.name) setOrgName(organization.name);
    v1.mfa.status().then(setMfaStatus).catch(() => {});
  }, [organization]);

  const saveOrg = async () => {
    setSaving(true);
    try {
      await api.organizations.update({ name: orgName });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const setupMfa = async () => {
    setMfaError("");
    try {
      const data = await v1.mfa.setup();
      setMfaSetup(data);
    } catch (e: any) {
      setMfaError(e.message || "Error al configurar MFA");
    }
  };

  const verifyMfa = async () => {
    if (!mfaToken) return;
    setMfaVerifying(true);
    setMfaError("");
    try {
      await v1.mfa.verify(mfaToken);
      setMfaSuccess("MFA habilitado exitosamente");
      setMfaSetup(null);
      setMfaToken("");
      const status = await v1.mfa.status();
      setMfaStatus(status);
    } catch (e: any) {
      setMfaError(e.message || "Código inválido");
    }
    setMfaVerifying(false);
  };

  const disableMfa = async () => {
    try {
      await v1.mfa.disable();
      setMfaStatus({ enabled: false, hasSecret: false, recoveryCodesCount: 0 });
      setMfaSuccess("MFA deshabilitado");
    } catch (e: any) {
      setMfaError(e.message || "Error al deshabilitar MFA");
    }
  };

  const copyRecoveryCodes = () => {
    if (mfaSetup?.recoveryCodes) {
      navigator.clipboard.writeText(mfaSetup.recoveryCodes.join("\n"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-1 text-sm text-iris-400">Gestiona la configuración de tu organización y seguridad</p>
      </div>

      {/* Organization Settings */}
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
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
        <button onClick={saveOrg} disabled={saving} className="btn btn-primary mt-4">
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </GlassCard>

      {/* Profile */}
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-iris-accent" />
          <h3 className="text-sm font-semibold text-white">Perfil</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
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
      </GlassCard>

      {/* MFA Section */}
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-iris-purple" />
          <h3 className="text-sm font-semibold text-white">Autenticación Multifactor (MFA)</h3>
        </div>

        {mfaSuccess && (
          <div className="mb-4 rounded-lg border border-iris-success/30 bg-iris-success/10 px-4 py-2 text-sm text-iris-success">
            {mfaSuccess}
          </div>
        )}

        {mfaError && (
          <div className="mb-4 rounded-lg border border-iris-danger/30 bg-iris-danger/10 px-4 py-2 text-sm text-iris-danger">
            {mfaError}
          </div>
        )}

        {!mfaSetup && (
          <div>
            <div className="flex items-center gap-3">
              <div className={`status-dot ${mfaStatus?.enabled ? "active" : "inactive"}`} />
              <span className="text-sm text-iris-300">
                {mfaStatus?.enabled ? "MFA habilitado" : "MFA no configurado"}
              </span>
              {mfaStatus?.enabled && (
                <span className="text-xs text-iris-400">
                  ({mfaStatus.recoveryCodesCount} códigos de recuperación restantes)
                </span>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              {!mfaStatus?.enabled && (
                <button onClick={setupMfa} className="btn btn-primary">
                  <Key className="h-4 w-4" />
                  Configurar MFA
                </button>
              )}
              {mfaStatus?.enabled && (
                <button onClick={disableMfa} className="btn btn-danger">
                  Deshabilitar MFA
                </button>
              )}
            </div>
          </div>
        )}

        {/* MFA Setup Flow */}
        {mfaSetup && (
          <div className="space-y-4">
            <div className="rounded-lg border border-iris-accent/30 bg-iris-accent-dim p-4">
              <p className="text-sm font-medium text-iris-accent">Configuración de MFA</p>
              <p className="mt-1 text-xs text-iris-400">
                Escanea el código QR con Google Authenticator o Authy, o ingresa el secreto manualmente.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-lg border border-iris-600/30 bg-iris-600/20 p-4">
                <p className="mb-2 text-xs text-iris-400">Código QR</p>
                <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-white p-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(mfaSetup.qrCodeUrl)}`}
                    alt="QR Code"
                    className="h-full w-full"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-iris-300">Secreto TOTP</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-iris-800 px-3 py-2 text-sm text-iris-accent">
                      {mfaSetup.secret}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(mfaSetup.secret)}
                      className="btn btn-ghost btn-sm"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Recovery Codes */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="mb-1.5 block text-xs font-medium text-iris-300">
                      Códigos de recuperación (guárdalos en un lugar seguro)
                    </label>
                    <button onClick={() => setShowRecovery(!showRecovery)} className="text-xs text-iris-accent hover:underline">
                      {showRecovery ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                  {showRecovery && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        {mfaSetup.recoveryCodes.map((code: string, i: number) => (
                          <code key={i} className="rounded bg-iris-800 px-2 py-1 text-xs text-iris-300 font-mono">{code}</code>
                        ))}
                      </div>
                      <button onClick={copyRecoveryCodes} className="btn btn-ghost btn-sm mt-1">
                        <Copy className="h-3 w-3" />
                        Copiar todos
                      </button>
                    </div>
                  )}
                </div>

                {/* Verify token */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-iris-300">
                    Ingresa el código de 6 dígitos de tu app Authenticator
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="input w-32 text-center text-lg tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                    />
                    <button onClick={verifyMfa} disabled={mfaToken.length !== 6 || mfaVerifying} className="btn btn-primary">
                      {mfaVerifying ? "Verificando..." : "Verificar y activar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
