import { cookies } from 'next/headers';
import { AlertsClient } from './alerts.client';

export default async function IrisAlertsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  let alerts: any[] = [];

  try {
    const res = await fetch(`${apiUrl}/api/iris/alerts`, {
      headers: { Cookie: cookieStore.toString() },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) alerts = await res.json();
  } catch {}

  return <AlertsClient initialAlerts={alerts} />;
}
