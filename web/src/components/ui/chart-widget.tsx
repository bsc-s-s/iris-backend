"use client";

import { useState, useEffect, useRef } from "react";

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  height?: number;
  loading?: boolean;
  action?: React.ReactNode;
}

export function ChartWidget({ title, subtitle, children, className, height = 280, loading, action }: ChartWidgetProps) {
  return (
    <div className={`card-premium ${className || ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-iris-400">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {loading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-iris-accent border-t-transparent" />
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}

export function MiniAreaChart({ data, color = "#3b82f6", height = 60 }: { data: number[]; color?: string; height?: number }) {
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 40;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d / max) * h}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
