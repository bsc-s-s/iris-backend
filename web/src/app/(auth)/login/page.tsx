"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { v1 } from "@/lib/api";

const SSO_PROVIDER_ICONS: Record<string, string> = {
  google: "G",
  microsoft: "M",
  oidc: "O",
  saml: "S",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<any[]>([]);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const { login, ssoLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    v1.sso.providers().then(setSsoProviders).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-iris-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo-md.png" alt="IRIS" className="mx-auto mb-4 h-24 w-24 object-contain" />
          <h1 className="text-xl font-bold text-white">IRIS Enterprise</h1>
          <p className="mt-1 text-sm text-iris-400">Arquitectura de Riesgo y Seguridad Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Iniciar sesión</h2>

          {error && (
            <div className="rounded-lg border border-iris-danger/30 bg-iris-danger/10 px-4 py-2 text-sm text-iris-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@ejemplo.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-iris-400 hover:text-iris-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

          {ssoProviders.length > 0 && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-iris-600/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-iris-800 px-2 text-iris-400">O continúa con</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ssoProviders.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={ssoLoading !== null}
                    onClick={async () => {
                      setSsoLoading(p.id);
                      try { await ssoLogin(p.id); } catch { setSsoLoading(null); }
                    }}
                    className="btn btn-ghost flex items-center justify-center gap-2 text-xs"
                  >
                    {ssoLoading === p.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-iris-400 border-t-transparent" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    {p.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="text-center text-xs text-iris-400">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-iris-accent hover:underline">
              Registrarse
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
