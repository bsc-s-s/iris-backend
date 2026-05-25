"use client";

interface ExecutiveHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string };
  action?: React.ReactNode;
}

export function ExecutiveHeader({ title, subtitle, badge, action }: ExecutiveHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          {badge && (
            <span className={`badge ${badge.color} text-[10px]`}>{badge.text}</span>
          )}
        </div>
        {subtitle && <p className="text-sm text-iris-400">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
