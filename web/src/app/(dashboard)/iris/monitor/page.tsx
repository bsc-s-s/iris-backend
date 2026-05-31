import { cookies } from 'next/headers';
import { MonitorClient } from './monitor.client';

export default async function IrisMonitorPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let status: any = null;
  let cycles: any[] = [];

  try {
    const [sRes, cRes] = await Promise.all([
      fetch(`${apiUrl}/api/iris/monitor/status`, { headers: { Cookie: cookieStore.toString() }, signal: AbortSignal.timeout(10000) }),
      fetch(`${apiUrl}/api/iris/monitor/cycles`, { headers: { Cookie: cookieStore.toString() }, signal: AbortSignal.timeout(10000) }),
    ]);
    if (sRes.ok) status = await sRes.json();
    if (cRes.ok) cycles = await cRes.json();
  } catch {}

  return <MonitorClient initialStatus={status} initialCycles={cycles} />;
}
