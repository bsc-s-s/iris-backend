'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

export default function IrisBenchmarkPage() {
  const { t } = useI18n();
  const [position, setPosition] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [industry, setIndustry] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [p, c] = await Promise.all([iris.benchmark.position(), iris.benchmark.compare({})]);
      setPosition(p);
      setComparison(c);
    } catch {}
    setLoading(false);
  }

  async function compare() {
    setLoading(true);
    try {
      const c = await iris.benchmark.compare({ industry: industry || undefined });
      setComparison(c);
    } catch {}
    setLoading(false);
  }

  const radarData = comparison?.organization && comparison?.dimensionAverages ? [
    { dimension: 'Anticipation', you: comparison.organization.anticipation, avg: comparison.dimensionAverages.anticipation || 0 },
    { dimension: 'Resilience', you: comparison.organization.resilience, avg: comparison.dimensionAverages.resilience || 0 },
    { dimension: 'Exposure', you: comparison.organization.exposure, avg: comparison.dimensionAverages.exposure || 0 },
    { dimension: 'Dependency', you: comparison.organization.dependency, avg: comparison.dimensionAverages.dependency || 0 },
    { dimension: 'Culture', you: comparison.organization.culture, avg: comparison.dimensionAverages.culture || 0 },
    { dimension: 'Governance', you: comparison.organization.governance, avg: comparison.dimensionAverages.governance || 0 },
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
            {position ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">#{position.rank}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('benchmark.of')} {position.total} {t('benchmark.organizations')}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400">{t('benchmark.percentile')}</div>
                  <div className="text-2xl font-bold">{position.percentile !== null ? `${position.percentile}th` : '—'}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400">{t('benchmark.your_score')}</div>
                  <div className="text-2xl font-bold">{position.score ?? '—'}</div>
                </div>
              </div>
            ) : <div className="text-gray-500 text-center py-8">{t('benchmark.no_data')}</div>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('benchmark.dimension_compare')}</h2>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Radar name={t('benchmark.your_org')} dataKey="you" stroke="#818CF8" fill="#818CF8" fillOpacity={0.15} />
                  <Radar name={t('benchmark.peer_avg')} dataKey="avg" stroke="#F472B6" fill="#F472B6" fillOpacity={0.1} />
                </RadarChart>
              </ResponsiveContainer>
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
            <button onClick={compare} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">{t('benchmark.compare_btn')}</button>
          </div>
          {comparison && (
            <div className="mt-4 text-sm text-gray-400">
              {t('benchmark.comparing')} <span className="text-white font-medium">{comparison.peerCount}</span> {t('benchmark.peer_count')}
              {comparison.industryAverage != null && <> · {t('benchmark.industry_avg')}: <span className="text-white font-medium">{comparison.industryAverage.toFixed(0)}</span></>}
              {comparison.percentile != null && <> · {t('benchmark.you_are')} <span className="text-indigo-400 font-medium">{comparison.percentile}th</span> {t('benchmark.percentile')}</>}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
