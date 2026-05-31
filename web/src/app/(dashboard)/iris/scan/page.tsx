import { cookies } from 'next/headers';
import { ScanClient } from './scan.client';

export default async function IrisScanPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let scans: any[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/iris/intelligence`, {
      headers: { Cookie: cookieStore.toString() },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const d = await res.json();
      scans = d.activeScans || [];
    }
  } catch {}

  return <ScanClient initialScans={scans} />;
}
