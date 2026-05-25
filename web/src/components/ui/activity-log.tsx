"use client";

import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle, Info, XCircle, Activity } from "lucide-react";

interface ActivityLogProps {
  items: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  description?: string;
  createdAt: string;
  type?: "critical" | "warning" | "success" | "info" | "error";
  user?: string;
}

const TYPE_CONFIG = {
  critical: { icon: XCircle, color: "text-iris-danger", bg: "bg-iris-danger/10" },
  warning: { icon: AlertTriangle, color: "text-iris-warning", bg: "bg-iris-warning/10" },
  success: { icon: CheckCircle, color: "text-iris-success", bg: "bg-iris-success/10" },
  info: { icon: Info, color: "text-iris-info", bg: "bg-iris-info/10" },
  error: { icon: Activity, color: "text-iris-rose", bg: "bg-iris-rose/10" },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}min`;
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${days}d`;
}

export function ActivityLog({ items, loading, maxItems = 20 }: ActivityLogProps) {
  const displayed = items?.slice(0, maxItems) || [];

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex animate-pulse gap-3">
            <div className="h-8 w-8 rounded-full bg-iris-600" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-iris-600" />
              <div className="h-2.5 w-1/2 rounded bg-iris-600" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayed.map((item) => {
        const config = TYPE_CONFIG[item.type || "info"];
        const Icon = config.icon;
        return (
          <div key={item.id} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-iris-600/30">
            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-white">{item.action}</span>
                <span className="shrink-0 text-[10px] text-iris-400">{timeAgo(item.createdAt)}</span>
              </div>
              <p className="truncate text-xs text-iris-400">
                {item.entity}{item.description ? ` — ${item.description}` : ""}
              </p>
            </div>
            {item.user && <span className="hidden shrink-0 text-[10px] text-iris-500 group-hover:block">{item.user}</span>}
          </div>
        );
      })}
      {displayed.length === 0 && (
        <p className="py-8 text-center text-sm text-iris-500">Sin actividad reciente</p>
      )}
    </div>
  );
}
