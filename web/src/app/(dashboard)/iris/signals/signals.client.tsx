'use client';

import { useState } from 'react';
import { iris } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';

export function SignalsClient({ initialSignals }: { initialSignals: any[] }) {
  const { t } = useI18n();
  const [signals, setSignals] = useState<any[]>(initialSignals);
  const [filter, setFilter] = useState<string>('all');

  async function acknowledge(id: string) {
    try { await iris.signals.acknowledge(id); setSignals(prev => prev.filter(s => s.id !== id)); } catch {}
  }

  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const filtered = filter === 'all' ? signals : signals.filter(s => s.severity === filter);
  const sorted = [...filtered].sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('signals.title')}</h1>
          <p className="text-gray-400 mt-1">{t('signals.subtitle')}</p>
        </motion.div>

        <div className="flex gap-2">
          {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
            <button key={sev} onClick={() => setFilter(sev)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${filter === sev ? 'bg-indigo-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-white'}`}>
              {sev === 'all' ? t('signals.all') : t(`severity.${sev}`)}
            </button>
          ))}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🛡️</div>
            <p>{t('signals.no_signals')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s: any) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${s.severity === 'critical' ? 'bg-red-900/40 text-red-300' : s.severity === 'high' ? 'bg-orange-900/40 text-orange-300' : s.severity === 'medium' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>{t(`severity.${s.severity}`)}</span>
                      <span className="text-xs text-gray-500 capitalize">{s.category}</span>
                      <span className="text-xs text-gray-600">{s.source}</span>
                      <span className="text-xs text-gray-600">{(s.confidence * 100).toFixed(0)}% {t('signals.confidence')}</span>
                    </div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{s.description}</p>
                  </div>
                  {!s.acknowledgedAt && (
                    <button onClick={() => acknowledge(s.id)} className="px-4 py-2 border border-gray-700 rounded-lg text-xs hover:bg-gray-700 transition-all whitespace-nowrap">{t('signals.acknowledge')}</button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
