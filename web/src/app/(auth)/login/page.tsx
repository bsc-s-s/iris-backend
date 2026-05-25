"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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
