"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: "accent" | "danger" | "success" | "warning" | "info" | "purple";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const COLOR_MAP = {
  accent: { bar: "bg-iris-accent", glow: "shadow-glow-accent", text: "text-iris-accent" },
  danger: { bar: "bg-iris-danger", glow: "shadow-[0_0_20px_-4px_rgba(239,68,68,0.15)]", text: "text-iris-danger" },
  success: { bar: "bg-iris-success", glow: "", text: "text-iris-success" },
  warning: { bar: "bg-iris-warning", glow: "", text: "text-iris-warning" },
  info: { bar: "bg-iris-info", glow: "", text: "text-iris-info" },
  purple: { bar: "bg-iris-purple", glow: "", text: "text-iris-purple" },
};

export function KpiCard({ title, value, subtitle, icon, trend, color = "accent", size = "md", loading }: KpiCardProps) {
  const c = COLOR_MAP[color];
  const sizes = { sm: "p-4", md: "p-5", lg: "p-6" };

  if (loading) {
    return (
      <div className={cn("card-premium animate-pulse", sizes[size])}>
        <div className="mb-3 h-3 w-24 rounded bg-iris-600" />
        <div className="mb-1 h-8 w-20 rounded bg-iris-600" />
        <div className="h-3 w-32 rounded bg-iris-600" />
      </div>
    );
  }

  return (
    <div className={cn("card-premium relative overflow-hidden group", sizes[size])}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${c.bar}`} />
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wider text-iris-400 uppercase">{title}</p>
          <p className={cn("font-bold tracking-tight", size === "lg" ? "text-3xl" : "text-2xl")}>{value}</p>
          {subtitle && <p className="text-xs text-iris-400">{subtitle}</p>}
        </div>
        {icon && <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-iris-accent-dim", c.text)}>{icon}</div>}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn("text-xs font-medium", trend.positive ? "text-iris-success" : "text-iris-danger")}>
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
          <span className="text-xs text-iris-400">vs período anterior</span>
        </div>
      )}
    </div>
  );
}
