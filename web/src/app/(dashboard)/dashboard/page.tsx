import { cookies } from 'next/headers';
import { ExecutiveDashboardClient } from './dashboard.client';

export default async function ExecutiveDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  async function fetchApi(path: string) {
    try {
      const res = await fetch(`${apiUrl}/api${path}`, {
        headers: { Cookie: cookieHeader },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res.json();
    } catch {}
    return null;
  }

  async function fetchV1(path: string) {
    try {
      const res = await fetch(`${apiUrl}/api/v1${path}`, {
        headers: { Cookie: cookieHeader },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res.json();
    } catch {}
    return null;
  }

  const [intel, analytics, indexes, audit, assessments] = await Promise.all([
    fetchV1('/intelligence'),
    fetchV1('/analytics/dashboard'),
    fetchV1('/indexes'),
    fetchApi('/audit?limit=20'),
    fetchApi('/assessments'),
  ]);

  return (
    <ExecutiveDashboardClient
      initialData={{
        intel,
        analytics,
        indexes,
        auditLogs: audit?.items || [],
        recentAssessments: assessments || [],
      }}
    />
  );
}
