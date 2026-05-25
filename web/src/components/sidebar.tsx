"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  ClipboardCheck,
  Swords,
  Brain,
  BarChart3,
  Settings,
  Users,
  FileText,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/assessments", label: "Evaluaciones", icon: ClipboardCheck },
  { href: "/security-planning", label: "Planificación", icon: Shield },
  { href: "/threat-simulation", label: "Simulación", icon: Swords },
  { href: "/ai-analyst", label: "AI Analyst", icon: Brain },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/audit", label: "Auditoría", icon: FileText },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { organization, user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-iris-600 bg-iris-900">
      <div className="flex items-center gap-3 border-b border-iris-600 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-iris-accent">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">IRIS</h1>
          <p className="text-xs text-iris-400">Enterprise v5</p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-iris-600 px-6 py-3">
        <Building2 className="h-4 w-4 text-iris-400" />
        <span className="truncate text-xs text-iris-300">{organization?.name || "Cargando..."}</span>
        <span className="badge badge-medium ml-auto text-[10px]">{organization?.plan}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link mb-0.5 ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-iris-600 px-4 py-3">
        <div className="mb-2 flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-iris-500 text-xs font-semibold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 truncate">
            <p className="text-xs font-medium text-white">{user?.name}</p>
            <p className="text-[10px] text-iris-400">{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link w-full text-iris-400 hover:text-iris-danger">
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
