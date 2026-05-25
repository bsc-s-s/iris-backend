"use client";

import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  type: "critical" | "warning" | "success" | "info" | "neutral";
}

interface TimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const DOT_COLORS = {
  critical: "bg-iris-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  warning: "bg-iris-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]",
  success: "bg-iris-success shadow-[0_0_8px_rgba(16,185,129,0.5)]",
  info: "bg-iris-info shadow-[0_0_8px_rgba(6,182,212,0.5)]",
  neutral: "bg-iris-400",
};

const LINE_COLORS = {
  critical: "border-iris-danger/30",
  warning: "border-iris-warning/30",
  success: "border-iris-success/30",
  info: "border-iris-info/30",
  neutral: "border-iris-500/30",
};

export function Timeline({ events, loading }: TimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex animate-pulse gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-iris-600" />
              <div className="mt-1 h-12 w-0.5 bg-iris-600" />
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-3 w-32 rounded bg-iris-600" />
              <div className="h-2.5 w-48 rounded bg-iris-600" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn("h-3 w-3 rounded-full", DOT_COLORS[event.type])} />
              {!isLast && <div className={cn("mt-1 h-full w-px border-l border-dashed", LINE_COLORS[event.type])} />}
            </div>
            <div className={cn("pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{event.title}</span>
                <span className="text-[10px] text-iris-500">
                  {new Date(event.timestamp).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {event.description && <p className="mt-0.5 text-xs text-iris-400">{event.description}</p>}
            </div>
          </div>
        );
      })}
      {events.length === 0 && (
        <p className="py-8 text-center text-sm text-iris-500">Sin eventos registrados</p>
      )}
    </div>
  );
}
