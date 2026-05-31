'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export function IrisRadarChart({ radar }: { radar: { dimension: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={radar}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
        <Radar name="Score" dataKey="value" stroke="#818CF8" fill="#818CF8" fillOpacity={0.2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function IrisAreaChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} /><stop offset="100%" stopColor="#818CF8" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
        <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
        <Area type="monotone" dataKey="score" stroke="#818CF8" fill="url(#scoreGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
