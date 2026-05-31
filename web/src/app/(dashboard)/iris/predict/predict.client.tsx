'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useIrisPredictResults } from '@/lib/queries';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { iris } from '@/lib/api';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./recharts-barrel').then(m => ({ default: m.PredictBarChart })), { ssr: false }) as any;

export function PredictClient({ initialPredictions }: { initialPredictions: any[] }) {
  const { t } = useI18n();
  const { data: predictionsData } = useIrisPredictResults();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const predictions = predictionsData || initialPredictions;
  const loading = !predictionsData && initialPredictions.length === 0;

  const runMutation = useMutation({
    mutationFn: () => iris.predict.run(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iris', 'predict'] }),
  });

  async function runPredictions() {
    setRunning(true);
    try { await runMutation.mutateAsync(); } catch {}
    setRunning(false);
  }

  const chartData = predictions.slice(0, 6).map((p: any) => ({
    model: p.model.replace(/_/g, ' '),
    probability: Math.round(p.probability * 100),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{t('predict.title')}</h1>
          <p className="text-gray-400 mt-1">{t('predict.subtitle')}</p>
        </motion.div>

        <button onClick={runPredictions} disabled={running} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50">
          {running ? t('predict.running') : t('predict.run')}
        </button>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
        ) : chartData.length > 0 ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{t('predict.probability')}</h2>
              <Chart data={chartData} />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {predictions.slice(0, 6).map((p: any) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold capitalize">{p.model.replace(/_/g, ' ')}</h3>
                      <div className="text-xs text-gray-500 mt-0.5">{p.timeHorizon} {t('predict.horizon')}</div>
                    </div>
                    <div className={`text-lg font-bold ${p.probability > 0.5 ? 'text-red-400' : p.probability > 0.3 ? 'text-yellow-400' : 'text-emerald-400'}`}>{(p.probability * 100).toFixed(0)}%</div>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full ${p.probability > 0.5 ? 'bg-red-500' : p.probability > 0.3 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${p.probability * 100}%` }} />
                  </div>
                  {p.causalFactors?.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 uppercase mb-1">{t('predict.causal_factors')}</div>
                      <div className="flex flex-wrap gap-1">
                        {p.causalFactors.map((f: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">{f}</span>)}
                      </div>
                    </div>
                  )}
                  {p.recommendations?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">{t('predict.recommendations')}</div>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {p.recommendations.map((r: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">·</span>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🔮</div>
            <p>{t('predict.no_predictions')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
