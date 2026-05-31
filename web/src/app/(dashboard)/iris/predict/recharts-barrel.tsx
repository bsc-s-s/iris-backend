'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function PredictBarChart({ data }: { data: { model: string; probability: number }[] }) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
        <YAxis type="category" dataKey="model" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={160} />
        <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
        <Bar dataKey="probability" fill="#818CF8" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
