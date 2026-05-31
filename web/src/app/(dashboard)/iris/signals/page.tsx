import { cookies } from 'next/headers';
import { SignalsClient } from './signals.client';

export default async function IrisSignalsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let signals: any[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/iris/signals`, {
      headers: { Cookie: cookieStore.toString() },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) signals = await res.json();
  } catch {}

  return <SignalsClient initialSignals={signals} />;
}
