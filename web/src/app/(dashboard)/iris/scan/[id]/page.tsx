'use client';

import { useEffect, useState } from 'react';
import { iris } from '@/lib/api';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';

export default function ScanSessionPage() {
  const { id } = useParams() as { id: string };
  const [scan, setScan] = useState<any>(null);
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const s = await iris.scan.get(id);
      setScan(s);
      if (s.status === 'completed') { setCompleted(true); return; }
      const n = await iris.questions.next(id);
      setCurrent(n);
    } catch {}
    setLoading(false);
  }

  async function submitResponse(value: number) {
    if (!current?.question) return;
    setSubmitting(true);
    try {
      await iris.scan.respond(id, current.question.id, { value, latency: 0, hesitation: 0, corrections: 0 });
      const n = await iris.questions.next(id);
      if (n.question) {
        setCurrent(n);
      } else {
        await iris.scan.complete(id);
        setCompleted(true);
      }
      const s = await iris.scan.get(id);
      setScan(s);
    } catch {}
    setSubmitting(false);
  }

  async function finishComplete() {
    try {
      await iris.scan.complete(id);
      setCompleted(true);
    } catch {}
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950"><div className="animate-spin h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>;
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg text-center space-y-6">
          <div className="text-6xl">✅</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">Scan Complete</h1>
          <p className="text-gray-400">Your organizational intelligence scan has been completed. IRIS is analyzing your responses for risk signals.</p>
          <div className="flex justify-center gap-4">
            <a href="/iris/scan" className="px-6 py-3 border border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all">New Scan</a>
            <a href="/iris" className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">View Dashboard</a>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = scan ? (scan.currentQuestion / scan.totalQuestions) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
          <span className="text-sm text-gray-400">{scan?.currentQuestion}/{scan?.totalQuestions}</span>
        </div>

        {/* Question */}
        {current?.question && (
          <motion.div key={current.question.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-8">
            <div className="text-xs text-indigo-400 uppercase tracking-wider mb-2">{current.question.category.replace(/_/g, ' ')} {current.question.depth > 1 && `· Depth ${current.question.depth}`}</div>
            <h2 className="text-2xl font-semibold mb-8">{current.question.text}</h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                { value: 1, label: 'Strongly Disagree', color: 'red' },
                { value: 2, label: 'Disagree', color: 'orange' },
                { value: 3, label: 'Neutral', color: 'gray' },
                { value: 4, label: 'Agree', color: 'lime' },
                { value: 5, label: 'Strongly Agree', color: 'green' },
              ].map(opt => (
                <button key={opt.value} onClick={() => submitResponse(opt.value)} disabled={submitting}
                  className="p-4 rounded-xl border border-gray-700 bg-gray-800/30 hover:bg-gray-800/60 hover:border-indigo-500 transition-all text-center disabled:opacity-50"
                >
                  <div className="text-2xl font-bold mb-1">{opt.value}</div>
                  <div className="text-[10px] text-gray-400 uppercase">{opt.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {!current?.question && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
            <p className="text-gray-400">All questions answered. Complete the scan to see your results.</p>
            <button onClick={finishComplete} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">Complete Scan</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
