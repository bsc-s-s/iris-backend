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
  Languages,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";

const NAV_ITEMS: { href: string; labelKey: string; icon: any; iris?: boolean }[] = [
  // IRIS Organizational Intelligence
  { href: "/iris", labelKey: "sidebar.intelligence", icon: Brain, iris: true },
  { href: "/iris/scan", labelKey: "sidebar.scan", icon: ScanEye, iris: true },
  { href: "/iris/alerts", labelKey: "sidebar.alerts", icon: AlertTriangle, iris: true },
  { href: "/iris/signals", labelKey: "sidebar.signals", icon: TrendingUp, iris: true },
  { href: "/iris/monitor", labelKey: "sidebar.monitor", icon: Radio, iris: true },
  { href: "/iris/predict", labelKey: "sidebar.predict", icon: TrendingUp, iris: true },
  { href: "/iris/benchmark", labelKey: "sidebar.benchmark", icon: BarChart3, iris: true },
  { href: "/iris/reports", labelKey: "sidebar.reports", icon: FileText, iris: true },
  // Legacy
  { href: "/dashboard", labelKey: "sidebar.dashboard", icon: BarChart3 },
  { href: "/assessments", labelKey: "sidebar.assessments", icon: ClipboardCheck },
  { href: "/risk-forecast", labelKey: "sidebar.forecast", icon: TrendingUp },
  { href: "/compliance", labelKey: "sidebar.compliance", icon: ShieldCheck },
  { href: "/compliance-center", labelKey: "sidebar.compliance_center", icon: Building2 },
  { href: "/gdpr", labelKey: "sidebar.gdpr", icon: Lock },
  { href: "/iso27001", labelKey: "sidebar.iso27001", icon: Shield },
  { href: "/privacy", labelKey: "sidebar.privacy", icon: Eye },
  { href: "/anomalies", labelKey: "sidebar.anomalies", icon: ScanEye },
  { href: "/api-keys", labelKey: "sidebar.api_keys", icon: Key },
  { href: "/webhooks", labelKey: "sidebar.webhooks", icon: Radio },
  { href: "/security-planning", labelKey: "sidebar.planning", icon: Shield },
  { href: "/threat-simulation", labelKey: "sidebar.simulation", icon: Swords },
  { href: "/ai-analyst", labelKey: "sidebar.ai_analyst", icon: Brain },
  { href: "/billing", labelKey: "sidebar.billing", icon: CreditCard },
  { href: "/sso", labelKey: "sidebar.sso", icon: Globe },
  { href: "/users", labelKey: "sidebar.users", icon: Users },
  { href: "/audit", labelKey: "sidebar.audit", icon: FileText },
  { href: "/security", labelKey: "sidebar.zero_trust", icon: Fingerprint },
  { href: "/settings", labelKey: "sidebar.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { organization, user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-iris-600 bg-iris-900">
      <div className="flex items-center gap-3 border-b border-iris-600 px-6 py-4">
        <img src="/logo-sm.png" alt="IRIS" className="h-10 w-10 object-contain" />
        <div>
          <h1 className="text-sm font-semibold text-white">IRIS</h1>
          <p className="text-xs text-iris-400">{t('sidebar.enterprise_v5')}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-iris-600 px-6 py-3">
        <Building2 className="h-4 w-4 text-iris-400" />
          <span className="truncate text-xs text-iris-300">{organization?.name || t('sidebar.loading')}</span>
        <span className="badge badge-medium ml-auto text-[10px]">{organization?.plan}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">{t('sidebar.iris')}</div>
        {NAV_ITEMS.filter(i => i.iris).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link mb-0.5 ${isActive ? "active iris-active" : "iris-link"}`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
        <div className="my-3 border-t border-gray-800" />
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{t('sidebar.legacy')}</div>
        {NAV_ITEMS.filter(i => !i.iris).map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link mb-0.5 ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
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
        <button onClick={toggle} className="sidebar-link w-full text-iris-400 hover:text-white mb-1">
          <Languages className="h-4 w-4" />
          {lang === 'es' ? 'English' : 'Español'}
        </button>
        <button onClick={logout} className="sidebar-link w-full text-iris-400 hover:text-iris-danger">
          <LogOut className="h-4 w-4" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}
