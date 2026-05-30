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
  Gauge,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Globe,
  Key,
  Radio,
  ScanEye,
  Eye,
  Lock,
  Fingerprint,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  // IRIS Organizational Intelligence
  { href: "/iris", label: "IRIS Intelligence", icon: Brain, iris: true },
  { href: "/iris/scan", label: "IRIS Scan", icon: ScanEye, iris: true },
  { href: "/iris/alerts", label: "IRIS Alerts", icon: AlertTriangle, iris: true },
  { href: "/iris/signals", label: "Risk Signals", icon: TrendingUp, iris: true },
  { href: "/iris/monitor", label: "IRIS Monitor", icon: Radio, iris: true },
  { href: "/iris/predict", label: "IRIS Predict", icon: TrendingUp, iris: true },
  { href: "/iris/benchmark", label: "Benchmark", icon: BarChart3, iris: true },
  { href: "/iris/reports", label: "Reports", icon: FileText, iris: true },
  // Legacy
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/assessments", label: "Evaluaciones", icon: ClipboardCheck },
  { href: "/risk-forecast", label: "Pronóstico", icon: TrendingUp },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/compliance-center", label: "Compliance Center", icon: Building2 },
  { href: "/gdpr", label: "GDPR", icon: Lock },
  { href: "/iso27001", label: "ISO 27001", icon: Shield },
  { href: "/privacy", label: "Privacidad", icon: Eye },
  { href: "/anomalies", label: "Anomalías", icon: ScanEye },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/webhooks", label: "Webhooks", icon: Radio },
  { href: "/security-planning", label: "Planificación", icon: Shield },
  { href: "/threat-simulation", label: "Simulación", icon: Swords },
  { href: "/ai-analyst", label: "AI Analyst", icon: Brain },
  { href: "/billing", label: "Facturación", icon: CreditCard },
  { href: "/sso", label: "SSO", icon: Globe },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/audit", label: "Auditoría", icon: FileText },
  { href: "/security", label: "Zero Trust", icon: Fingerprint },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { organization, user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-iris-600 bg-iris-900">
      <div className="flex items-center gap-3 border-b border-iris-600 px-6 py-4">
        <img src="/logo-sm.png" alt="IRIS" className="h-10 w-10 object-contain" />
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
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">IRIS&trade; Platform</div>
        {NAV_ITEMS.filter(i => i.iris).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link mb-0.5 ${isActive ? "active iris-active" : "iris-link"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <div className="my-3 border-t border-gray-800" />
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Legacy</div>
        {NAV_ITEMS.filter(i => !i.iris).map((item) => {
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
