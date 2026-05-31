import { cookies } from 'next/headers';
import { PredictClient } from './predict.client';

export default async function IrisPredictPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  let predictions: any[] = [];
  try {
    const res = await fetch(`${apiUrl}/api/iris/predict/results`, {
      headers: { Cookie: cookieHeader },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) predictions = await res.json();
  } catch {}

  return <PredictClient initialPredictions={predictions} />;
}
