"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Users as UsersIcon, UserPlus, Shield, Ban, X } from "lucide-react";
import { api } from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("analyst");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => api.users.list().then(setUsers).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.users.create({ email, password, name, title, role });
      setShowModal(false);
      setName(""); setEmail(""); setPassword(""); setTitle(""); setRole("analyst");
      await load();
    } catch (err: any) {
      setError(err.message || "Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="mt-1 text-sm text-iris-400">Gestiona los usuarios de tu organización</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <UserPlus className="h-4 w-4" /> Invitar usuario
        </button>
      </div>

      <div className="card">
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <UsersIcon className="mb-3 h-10 w-10 text-iris-500" />
              <p className="text-sm text-iris-400">No hay usuarios además de ti</p>
            </div>
          ) : (
            users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-iris-600/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-iris-500 text-sm font-semibold text-white">
                    {u.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name}</p>
                    <p className="text-xs text-iris-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge badge-medium">{u.role}</span>
                  {!u.isActive && <span className="badge badge-critical">Inactivo</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-iris-600 bg-iris-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Crear usuario</h2>
              <button onClick={() => setShowModal(false)} className="text-iris-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-iris-danger/30 bg-iris-danger/10 px-4 py-2 text-sm text-iris-danger">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Nombre completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Nombre del usuario" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="usuario@ejemplo.com" required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Contraseña temporal</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Mín. 6 caracteres" required minLength={6} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Cargo / Título</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Ej: Analista de Seguridad" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-iris-300">Rol</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                  <option value="analyst">Analista</option>
                  <option value="admin">Administrador</option>
                  <option value="viewer">Visor</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? "Creando..." : "Crear usuario"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
