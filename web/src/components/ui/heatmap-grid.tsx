"use client";

import { cn } from "@/lib/utils";

interface HeatmapGridProps {
  data: { label: string; value: number; category: string }[];
  title?: string;
  loading?: boolean;
}

const INTENSITY = [
  "bg-iris-success/20 text-iris-success",
  "bg-iris-success/30 text-iris-success",
  "bg-iris-warning/20 text-iris-warning",
  "bg-iris-warning/30 text-iris-warning",
  "bg-iris-danger/20 text-iris-danger",
  "bg-iris-danger/30 text-iris-danger",
  "bg-iris-danger/40 text-iris-danger",
  "bg-iris-danger/50 text-iris-danger",
];

function getIntensity(value: number) {
  if (value >= 90) return 7;
  if (value >= 80) return 6;
  if (value >= 65) return 5;
  if (value >= 50) return 4;
  if (value >= 35) return 3;
  if (value >= 20) return 2;
  return value >= 10 ? 1 : 0;
}

export function HeatmapGrid({ data, title, loading }: HeatmapGridProps) {
  if (loading) {
    return (
      <div className="card-premium">
        {title && <div className="mb-4 h-4 w-32 animate-pulse rounded bg-iris-600" />}
        <div className="grid grid-cols-4 gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-iris-600" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium">
      {title && <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {data.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg p-3 text-center transition-all hover:scale-105",
              INTENSITY[getIntensity(item.value)]
            )}
          >
            <span className="text-xs font-semibold">{item.value}%</span>
            <span className="mt-1 text-[10px] opacity-80">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
