"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ email, password, name, organizationName: orgName });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
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
          <p className="mt-1 text-sm text-iris-400">Crear nueva organización</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <h2 className="text-lg font-semibold text-white">Registrarse</h2>

          {error && (
            <div className="rounded-lg border border-iris-danger/30 bg-iris-danger/10 px-4 py-2 text-sm text-iris-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre completo</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Dr. Brian Burgoa" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="admin@ejemplo.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Mín. 6 caracteres" required minLength={6} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-iris-300">Organización</label>
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input" placeholder="Nombre de la empresa" required />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="text-center text-xs text-iris-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-iris-accent hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
