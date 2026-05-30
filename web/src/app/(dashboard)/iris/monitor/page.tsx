'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { motion } from 'framer-motion';

export default function IrisMonitorPage() {
  const [status, setStatus] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [s, c] = await Promise.all([iris.monitor.status(), iris.monitor.cycles()]);
      setStatus(s);
      setCycles(c || []);
    } catch {}
    setLoading(false);
  }

  async function runCycle(freq: string) {
    setRunning(true);
    try {
      await iris.monitor.run(freq);
      await load();
    } catch {}
    setRunning(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">IRIS&trade; Monitor</h1>
          <p className="text-gray-400 mt-1">Continuous organizational health monitoring</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Status</h2>
          {status ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className={`text-2xl font-bold ${status.status === 'active' ? 'text-emerald-400' : status.status === 'overdue' ? 'text-orange-400' : 'text-gray-400'}`}>{status.status === 'never_run' ? '—' : status.status}</div>
                <div className="text-xs text-gray-500 mt-1">Status</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{status.daysSinceLastCycle ?? '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Days Since Last Cycle</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{status.lastScore?.overallScore ?? '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Current Score</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold capitalize">{status.lastScore?.classification || '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Classification</div>
              </div>
            </div>
          ) : <div className="text-gray-500 text-center py-4">Unable to load status</div>}
        </motion.div>

        <div className="flex gap-4">
          {['weekly', 'monthly', 'quarterly'].map(freq => (
            <button key={freq} onClick={() => runCycle(freq)} disabled={running} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 capitalize">
              {running ? 'Running...' : `Run ${freq}`}
            </button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Cycle History</h2>
          {cycles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Frequency</th><th className="text-left py-2 pr-4">Status</th><th className="text-left py-2 pr-4">Started</th><th className="text-left py-2 pr-4">Signals</th><th className="text-left py-2">Alerts</th></tr></thead>
                <tbody>{cycles.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-3 pr-4 capitalize">{c.frequency}</td><td className="py-3 pr-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${c.status === 'completed' ? 'bg-emerald-900/40 text-emerald-300' : c.status === 'running' ? 'bg-blue-900/40 text-blue-300' : c.status === 'failed' ? 'bg-red-900/40 text-red-300' : 'bg-gray-700 text-gray-400'}`}>{c.status}</span></td><td className="py-3 pr-4">{c.startedAt ? new Date(c.startedAt).toLocaleDateString() : '—'}</td><td className="py-3 pr-4">{c.signalsCount}</td><td className="py-3">{c.alertsGenerated}</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="text-gray-500 text-center py-8">No monitor cycles run yet</div>}
        </motion.div>
      </div>
    </div>
  );
}
