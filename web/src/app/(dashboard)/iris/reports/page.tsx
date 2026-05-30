'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { motion } from 'framer-motion';

export default function IrisReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setReports((await iris.reports.list()) || []); } catch {}
    setLoading(false);
  }

  async function generate(type: string) {
    setGenerating(true);
    try {
      const r = await iris.reports.generate(type);
      setSelectedReport(r);
      await load();
    } catch {}
    setGenerating(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">IRIS&trade; Reports</h1>
          <p className="text-gray-400 mt-1">Generate executive intelligence reports</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { type: 'executive', label: 'Executive Summary', desc: 'High-level organizational intelligence overview' },
            { type: 'board', label: 'Board Presentation', desc: 'Strategic risk summary for board meetings' },
            { type: 'compliance', label: 'Compliance Report', desc: 'Governance and compliance assessment' },
            { type: 'risk_assessment', label: 'Risk Assessment', desc: 'Detailed risk analysis with mitigation plan' },
          ].map(t => (
            <button key={t.type} onClick={() => generate(t.type)} disabled={generating}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-5 text-left hover:border-indigo-500/50 transition-all disabled:opacity-50"
            >
              <h3 className="font-semibold text-sm">{t.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
            </button>
          ))}
        </div>

        {selectedReport && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-indigo-800/50 bg-indigo-900/20 backdrop-blur-xl p-6">
            <h2 className="font-semibold text-indigo-300 mb-2">Report Generated</h2>
            <p className="text-sm text-gray-400">{selectedReport.title}</p>
            <p className="text-xs text-gray-500 mt-1">Type: {selectedReport.type} · Status: {selectedReport.status}</p>
          </motion.div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : reports.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Generated Reports</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Title</th><th className="text-left py-2 pr-4">Type</th><th className="text-left py-2 pr-4">Status</th><th className="text-left py-2">Date</th></tr></thead>
                <tbody>{reports.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer" onClick={() => setSelectedReport(r)}>
                    <td className="py-3 pr-4">{r.title}</td><td className="py-3 pr-4 capitalize">{r.type.replace(/_/g, ' ')}</td>
                    <td className="py-3 pr-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${r.status === 'completed' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>{r.status}</span></td>
                    <td className="py-3">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : r.generatedAt ? new Date(r.generatedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">📊</div>
            <p>Generate your first report to see it here</p>
          </div>
        )}
      </div>
    </div>
  );
}
