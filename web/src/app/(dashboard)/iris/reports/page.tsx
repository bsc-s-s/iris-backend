import { cookies } from 'next/headers';
import { ReportsClient } from './reports.client';

export default async function IrisReportsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let reports: any[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/iris/reports`, {
      headers: { Cookie: cookieStore.toString() },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) reports = await res.json();
  } catch {}

  return <ReportsClient initialReports={reports} />;
}
