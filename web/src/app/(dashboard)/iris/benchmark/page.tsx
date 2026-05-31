import { cookies } from 'next/headers';
import { BenchmarkClient } from './benchmark.client';

export default async function IrisBenchmarkPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  async function fetchIris(path: string) {
    try {
      const res = await fetch(`${apiUrl}/api/iris${path}`, {
        headers: { Cookie: cookieHeader },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res.json();
    } catch {}
    return null;
  }

  const [position, comparison] = await Promise.all([
    fetchIris('/benchmark/position'),
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/iris/benchmark/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
          body: '{}',
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) return res.json();
      } catch {}
      return null;
    })(),
  ]);

  return <BenchmarkClient initialPosition={position} initialComparison={comparison} />;
}
