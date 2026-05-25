"use client";

import { useState, useEffect } from "react";
import { Users as UsersIcon, UserPlus, Shield, Ban } from "lucide-react";
import { api } from "@/lib/api";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    api.users.list().then(setUsers).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <p className="mt-1 text-sm text-iris-400">Gestiona los usuarios de tu organización</p>
        </div>
        <button className="btn btn-primary">
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
    </div>
  );
}
