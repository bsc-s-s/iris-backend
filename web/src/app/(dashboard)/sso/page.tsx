"use client";

import { useState, useEffect } from "react";
import { Globe, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { v1 } from "@/lib/api";

const PROVIDER_META: Record<string, { name: string; color: string }> = {
  saml: { name: "SAML 2.0", color: "text-blue-400" },
  oidc: { name: "OpenID Connect", color: "text-purple-400" },
  google: { name: "Google Workspace", color: "text-green-400" },
  microsoft: { name: "Microsoft Entra ID", color: "text-amber-400" },
};

export default function SsoPage() {
  const [providers, setProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    v1.sso.providers().then((data) => { setProviders(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const testProvider = async (provider: string) => {
    setTestResult(null);
    const mockResponse = { email: "sso@empresa.com", name: "SSO User" };
    try {
      const result = await v1.sso.callback({ provider, response: mockResponse });
      setTestResult({ provider, success: result.valid, data: result });
    } catch { setTestResult({ provider, success: false }); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SSO</h1>
        <p className="mt-1 text-sm text-iris-400">Autenticación single sign-on para empresas</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-iris-400" />
          <div>
            <p className="text-sm font-medium text-white">Proveedores SSO disponibles</p>
            <p className="text-xs text-iris-400">Configura los proveedores vía variables de entorno (SSO_{"{PROVIDER}"}_ISSUER, etc.)</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-400 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => {
            const meta = PROVIDER_META[provider] || { name: provider, color: "text-iris-400" };
            return (
              <div key={provider} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-iris-600/30 ${meta.color}`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{meta.name}</p>
                    <p className="text-xs text-iris-400">{provider}</p>
                  </div>
                </div>
                <button onClick={() => testProvider(provider)} className="btn btn-ghost text-xs">
                  Probar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {testResult && (
        <div className={`card ${testResult.success ? "border-iris-success/30" : "border-iris-danger/30"}`}>
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle className="h-5 w-5 shrink-0 text-iris-success" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-iris-danger" />
            )}
            <div>
              <p className="text-sm font-medium text-white">
                {testResult.success ? `SSO ${PROVIDER_META[testResult.provider]?.name || testResult.provider} configurado correctamente` : "Error de conexión"}
              </p>
              <p className="mt-1 text-xs text-iris-400">
                {testResult.success
                  ? `Email verificado: ${testResult.data?.email} | Proveedor: ${testResult.data?.provider}`
                  : "Revisa las variables de entorno del proveedor"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Configuración requerida</h3>
        <div className="space-y-3">
          {providers.map((provider) => (
            <div key={provider} className="rounded-lg bg-iris-600/20 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-white">{PROVIDER_META[provider]?.name || provider}</p>
              <code className="block text-[10px] text-iris-400">
                SSO_{provider.toUpperCase()}_ISSUER, SSO_{provider.toUpperCase()}_ENTRY_POINT
                {provider === "saml" ? ", SSO_SAML_CERT" : ", SSO_{provider.toUpperCase()}_CLIENT_ID, SSO_{provider.toUpperCase()}_CLIENT_SECRET"}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
