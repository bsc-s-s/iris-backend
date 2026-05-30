'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function IrisDashboard() {
  const { t } = useI18n();
  const [data, setData] = useState<any>({ score: null, radar: [], scoreHistory: [], signals: [], alerts: [], recentScans: [], predictions: [], benchmarkPosition: null, classification: 'loading' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setData(await iris.dashboard()); } catch {}
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  const { score, radar, scoreHistory, signals, alerts, recentScans, predictions } = data;
  const classificationColors: Record<string, string> = { critical: 'text-red-400', high_risk: 'text-orange-400', moderate_risk: 'text-yellow-400', stable: 'text-emerald-400', resilient: 'text-indigo-400', not_evaluated: 'text-gray-500', unknown: 'text-gray-500' };
  const classificationLabels: Record<string, string> = { critical: 'Critical', high_risk: 'High Risk', moderate_risk: 'Moderate Risk', stable: 'Stable', resilient: 'Resilient', not_evaluated: 'Not Evaluated', unknown: 'Unknown' };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold">I</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('iris.title')}</h1>
          </div>
          <p className="text-gray-400">{t('iris.subtitle')}</p>
        </motion.div>

        {/* Score Card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="relative flex items-center gap-8 flex-wrap">
            <div className="text-center">
              <div className="text-6xl font-bold bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">{score?.overallScore ?? '—'}</div>
              <div className={`text-sm font-medium mt-1 ${classificationColors[data.classification] || 'text-gray-400'}`}>{classificationLabels[data.classification] || data.classification}</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t('iris.ten_dimensions')}</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {radar.map((d: any) => (
                  <div key={d.dimension} className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-500 uppercase">{d.dimension}</div>
                    <div className="text-lg font-semibold">{Math.round(d.value)}</div>
                    <div className="h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${d.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {score?.confidence && <div className="text-xs text-gray-500">{t('iris.confidence')}: {(score.confidence * 100).toFixed(0)}%</div>}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('iris.radar')}</h2>
            {radar.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radar}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="#818CF8" fill="#818CF8" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="text-gray-500 text-center py-12">{t('iris.no_radar')}</div>}
          </motion.div>

          {/* Alerts */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('iris.active_alerts')}</h2>
            {alerts.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {alerts.map((a: any) => (
                  <div key={a.id} className={`p-3 rounded-lg border ${a.severity === 'critical' ? 'border-red-800 bg-red-900/20' : a.severity === 'high' ? 'border-orange-800 bg-orange-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{a.title}</div>
                        <div className="text-xs text-gray-400 mt-1">{a.message?.slice(0, 120)}</div>
                      </div>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${a.severity === 'critical' ? 'bg-red-900/40 text-red-300' : a.severity === 'high' ? 'bg-orange-900/40 text-orange-300' : 'bg-gray-700 text-gray-400'}`}>{t(`severity.${a.severity}`)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-gray-500 text-center py-8">{t('iris.no_alerts')}</div>}
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score History */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('iris.score_trend')}</h2>
            {scoreHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={scoreHistory}>
                  <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} /><stop offset="100%" stopColor="#818CF8" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }} />
                  <Area type="monotone" dataKey="score" stroke="#818CF8" fill="url(#scoreGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="text-gray-500 text-center py-8">{t('iris.no_trend')}</div>}
          </motion.div>

          {/* Predictions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('iris.predictive_models')}</h2>
            {predictions.length > 0 ? (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize">{p.model.replace(/_/g, ' ')}</div>
                      <div className="text-xs text-gray-500">{p.timeHorizon} &middot; {(p.probability * 100).toFixed(0)}% {t('predict.horizon')}</div>
                    </div>
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${p.probability > 0.5 ? 'bg-red-500' : p.probability > 0.3 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${p.probability * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="text-gray-500 text-center py-8">{t('iris.no_predictions')}</div>}
          </motion.div>
        </div>

        {/* Recent Signals */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('iris.recent_signals')}</h2>
          {signals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Signal</th><th className="text-left py-2 pr-4">Category</th><th className="text-left py-2 pr-4">Severity</th><th className="text-left py-2">Confidence</th></tr></thead>
                <tbody>{signals.slice(0, 10).map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-3 pr-4">{s.title}</td><td className="py-3 pr-4 capitalize">{s.category}</td><td className="py-3 pr-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${s.severity === 'critical' ? 'bg-red-900/40 text-red-300' : s.severity === 'high' ? 'bg-orange-900/40 text-orange-300' : s.severity === 'medium' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>{t(`severity.${s.severity}`)}</span></td><td className="py-3">{(s.confidence * 100).toFixed(0)}%</td></tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="text-gray-500 text-center py-8">{t('iris.no_signals')}</div>}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="flex flex-wrap gap-4">
          <a href="/iris/scan" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">{t('iris.start_scan')}</a>
          <a href="/iris/reports" className="px-6 py-3 border border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all">{t('iris.view_reports')}</a>
          <a href="/iris/benchmark" className="px-6 py-3 border border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all">{t('iris.benchmark')}</a>
        </motion.div>
      </div>
    </div>
  );
}
