"use client";

import { cn } from "@/lib/utils";

interface ScaleBarProps {
  value: number;
  max?: number;
  color?: "accent" | "danger" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const BAR_COLORS = {
  accent: "bg-iris-accent",
  danger: "bg-iris-danger",
  success: "bg-iris-success",
  warning: "bg-iris-warning",
};

function getColor(value: number) {
  if (value >= 70) return "danger";
  if (value >= 40) return "warning";
  return "success";
}

export function RiskGauge({ value, max = 100, color, size = "md", showLabel = true, label }: ScaleBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const c = color || getColor(pct);

  return (
    <div className="space-y-1.5">
      {(showLabel || label) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-iris-400">{label}</span>}
          <span className={cn("text-xs font-semibold", {
            "text-iris-success": pct < 40,
            "text-iris-warning": pct >= 40 && pct < 70,
            "text-iris-danger": pct >= 70,
          })}>{Math.round(pct)}</span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-iris-600/50 overflow-hidden", {
        "h-1.5": size === "sm",
        "h-2": size === "md",
        "h-3": size === "lg",
      })}>
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", BAR_COLORS[c])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
