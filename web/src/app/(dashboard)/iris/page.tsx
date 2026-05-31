import { cookies } from 'next/headers';
import { IrisDashboardClient } from './iris.client';

export default async function IrisDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let data: any = { score: null, radar: [], scoreHistory: [], signals: [], alerts: [], predictions: [], classification: 'unknown' };

  try {
    const res = await fetch(`${apiUrl}/api/iris/dashboard`, {
      headers: { Cookie: cookieStore.toString() },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      data = { ...data, ...json };
    }
  } catch {}

  return <IrisDashboardClient data={data} />;
}
