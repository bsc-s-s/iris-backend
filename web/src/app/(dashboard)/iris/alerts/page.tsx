'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { motion } from 'framer-motion';

export default function IrisAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setAlerts((await iris.alerts.list()) || []); } catch {}
    setLoading(false);
  }

  async function dismiss(id: string) {
    setDismissing(id);
    try { await iris.alerts.dismiss(id); setAlerts(prev => prev.filter(a => a.id !== id)); } catch {}
    setDismissing(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">IRIS&trade; Alerts</h1>
          <p className="text-gray-400 mt-1">Intelligent alerts from continuous monitoring</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : alerts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🔔</div>
            <p>No active alerts</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {alerts.map((a: any) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`rounded-2xl border p-6 ${a.severity === 'critical' ? 'border-red-800 bg-red-900/10' : a.severity === 'high' ? 'border-orange-800 bg-orange-900/10' : 'border-gray-700 bg-gray-800/30'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${a.severity === 'critical' ? 'bg-red-900/40 text-red-300' : a.severity === 'high' ? 'bg-orange-900/40 text-orange-300' : a.severity === 'medium' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>{a.severity}</span>
                      <span className="text-xs text-gray-500 capitalize">{a.category}</span>
                      <span className="text-xs text-gray-600">{a.source}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{a.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{a.message}</p>
                    {a.metric && <div className="text-xs text-gray-500 mt-2">Metric: {a.metric} · Current: {a.currentValue} · Threshold: {a.threshold}</div>}
                  </div>
                  <button onClick={() => dismiss(a.id)} disabled={dismissing === a.id} className="px-4 py-2 border border-gray-700 rounded-lg text-xs hover:bg-gray-700 transition-all disabled:opacity-50 whitespace-nowrap">
                    {dismissing === a.id ? '...' : 'Dismiss'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
