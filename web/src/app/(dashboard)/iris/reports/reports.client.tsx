'use client';

import { useState } from 'react';
import { iris } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';

export function ReportsClient({ initialReports }: { initialReports: any[] }) {
  const { t } = useI18n();
  const [reports, setReports] = useState<any[]>(initialReports);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  async function generate(type: string) {
    setGenerating(true);
    try {
      const r = await iris.reports.generate(type);
      setSelectedReport(r);
      const data = await iris.reports.list();
      setReports(data || []);
    } catch {}
    setGenerating(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('reports.title')}</h1>
          <p className="text-gray-400 mt-1">{t('reports.subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { type: 'executive', labelKey: 'reports.executive', descKey: 'reports.executive_desc' },
            { type: 'board', labelKey: 'reports.board', descKey: 'reports.board_desc' },
            { type: 'compliance', labelKey: 'reports.compliance', descKey: 'reports.compliance_desc' },
            { type: 'risk_assessment', labelKey: 'reports.risk_assessment', descKey: 'reports.risk_desc' },
          ].map(item => (
            <button key={item.type} onClick={() => generate(item.type)} disabled={generating}
              className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-5 text-left hover:border-indigo-500/50 transition-all disabled:opacity-50"
            >
              <h3 className="font-semibold text-sm">{t(item.labelKey)}</h3>
              <p className="text-xs text-gray-500 mt-1">{t(item.descKey)}</p>
            </button>
          ))}
        </div>

        {selectedReport && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-indigo-800/50 bg-indigo-900/20 backdrop-blur-xl p-6">
          <h2 className="font-semibold text-indigo-300 mb-2">{t('reports.generated')}</h2>
          <p className="text-sm text-gray-400">{selectedReport.title}</p>
          <p className="text-xs text-gray-500 mt-1">{t('reports.type')}: {selectedReport.type} · {t('reports.status')}: {selectedReport.status}</p>
          </motion.div>
        )}

        {reports.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('reports.generated_reports')}</h2>
            <p className="text-xs text-gray-500 mb-2">{t('reports.click_for_details')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">{t('reports.table_title')}</th><th className="text-left py-2 pr-4">{t('reports.table_type')}</th><th className="text-left py-2 pr-4">{t('reports.table_status')}</th><th className="text-left py-2">{t('reports.table_date')}</th></tr></thead>
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
            <p>{t('reports.no_reports')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
