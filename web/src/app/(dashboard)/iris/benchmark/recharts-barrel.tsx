'use client';

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export function BenchmarkRadar({ data, t }: { data: any[]; t: (k: string) => string }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#374151" />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
        <Radar name={t('benchmark.your_org')} dataKey="you" stroke="#818CF8" fill="#818CF8" fillOpacity={0.15} />
        <Radar name={t('benchmark.peer_avg')} dataKey="avg" stroke="#F472B6" fill="#F472B6" fillOpacity={0.1} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

