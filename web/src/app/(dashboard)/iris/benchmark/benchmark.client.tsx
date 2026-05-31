'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useIrisBenchmarkPosition, useIrisBenchmarkCompare } from '@/lib/queries';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./recharts-barrel').then(m => ({ default: m.BenchmarkRadar })), { ssr: false }) as any;

export function BenchmarkClient({ initialPosition, initialComparison }: { initialPosition: any; initialComparison: any }) {
  const { t } = useI18n();
  const [industry, setIndustry] = useState('');
  const [filters, setFilters] = useState<{ industry?: string }>({});

  const { data: position } = useIrisBenchmarkPosition();
  const { data: comparison } = useIrisBenchmarkCompare(filters);

  const pos = position || initialPosition;
  const comp = comparison || initialComparison;

  const radarData = comp?.organization && comp?.dimensionAverages ? [
    { dimension: 'Anticipation', you: comp.organization.anticipation, avg: comp.dimensionAverages.anticipation || 0 },
    { dimension: 'Resilience', you: comp.organization.resilience, avg: comp.dimensionAverages.resilience || 0 },
    { dimension: 'Exposure', you: comp.organization.exposure, avg: comp.dimensionAverages.exposure || 0 },
    { dimension: 'Dependency', you: comp.organization.dependency, avg: comp.dimensionAverages.dependency || 0 },
    { dimension: 'Culture', you: comp.organization.culture, avg: comp.dimensionAverages.culture || 0 },
    { dimension: 'Governance', you: comp.organization.governance, avg: comp.dimensionAverages.governance || 0 },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('benchmark.title')}</h1>
          <p className="text-gray-400 mt-1">{t('benchmark.subtitle')}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('benchmark.your_position')}</h2>
            {pos ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">#{pos.rank}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('benchmark.of')} {pos.total} {t('benchmark.organizations')}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400">{t('benchmark.percentile')}</div>
                  <div className="text-2xl font-bold">{pos.percentile !== null ? `${pos.percentile}th` : '—'}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400">{t('benchmark.your_score')}</div>
                  <div className="text-2xl font-bold">{pos.score ?? '—'}</div>
                </div>
              </div>
            ) : <div className="text-gray-500 text-center py-8">{t('benchmark.no_data')}</div>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('benchmark.dimension_compare')}</h2>
            {radarData.length > 0 ? (
              <Chart data={radarData} t={t} />
            ) : <div className="text-gray-500 text-center py-8">{t('benchmark.no_peers')}</div>}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('benchmark.filter')}</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{t('benchmark.industry')}</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g., technology, healthcare, finance" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
            <button onClick={() => setFilters({ industry: industry || undefined })} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">{t('benchmark.compare_btn')}</button>
          </div>
          {comp && (
            <div className="mt-4 text-sm text-gray-400">
              {t('benchmark.comparing')} <span className="text-white font-medium">{comp.peerCount}</span> {t('benchmark.peer_count')}
              {comp.industryAverage != null && <> · {t('benchmark.industry_avg')}: <span className="text-white font-medium">{comp.industryAverage.toFixed(0)}</span></>}
              {comp.percentile != null && <> · {t('benchmark.you_are')} <span className="text-indigo-400 font-medium">{comp.percentile}th</span> {t('benchmark.percentile')}</>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
