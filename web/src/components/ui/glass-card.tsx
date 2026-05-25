"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "card-premium animate-fade-in",
        hover && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
