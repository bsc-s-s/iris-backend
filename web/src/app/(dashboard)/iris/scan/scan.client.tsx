'use client';

import { useState } from 'react';
import { iris } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function ScanClient({ initialScans }: { initialScans: any[] }) {
  const { t } = useI18n();
  const [scans, setScans] = useState<any[]>(initialScans);
  const [starting, setStarting] = useState(false);

  async function startScan() {
    setStarting(true);
    try {
      const result = await iris.scan.start({ title: 'Organizational Intelligence Scan' });
      window.location.href = `/iris/scan/${result.id}`;
    } catch {}
    setStarting(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('scan.title')}</h1>
          <p className="text-gray-400 mt-1">{t('scan.subtitle')}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-xl font-semibold">{t('scan.start_title')}</h2>
            <p className="text-gray-400 text-sm">{t('scan.start_desc')}</p>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
              <div className="bg-gray-800/50 rounded-lg p-3"><span className="text-indigo-400 font-semibold">10</span> {t('scan.dimensions')}</div>
              <div className="bg-gray-800/50 rounded-lg p-3"><span className="text-indigo-400 font-semibold">3</span> {t('scan.depth_levels')}</div>
              <div className="bg-gray-800/50 rounded-lg p-3"><span className="text-indigo-400 font-semibold">~25</span> {t('scan.minutes')}</div>
              <div className="bg-gray-800/50 rounded-lg p-3"><span className="text-indigo-400 font-semibold">{t('scan.real_time')}</span></div>
            </div>
            <button onClick={startScan} disabled={starting} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50">
              {starting ? t('scan.initializing') : t('scan.start')}
            </button>
          </div>
        </motion.div>

        {scans.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('scan.active_scans')}</h2>
            <div className="space-y-3">
              {scans.map((s: any) => (
                <Link key={s.id} href={`/iris/scan/${s.id}`} className="flex items-center justify-between p-4 rounded-xl border border-gray-700 bg-gray-800/30 hover:bg-gray-800/50 transition-all">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-gray-500">{s.currentQuestion}/{s.totalQuestions} {t('scan.questions_completed')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(s.currentQuestion / s.totalQuestions) * 100}%` }} />
                    </div>
                    <span className="text-xs text-indigo-400">{Math.round((s.currentQuestion / s.totalQuestions) * 100)}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
