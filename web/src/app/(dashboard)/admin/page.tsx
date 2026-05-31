import { cookies } from 'next/headers';
import { AdminClient } from './admin.client';

export default async function AdminPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  async function fetchAdmin(path: string) {
    try {
      const res = await fetch(`${apiUrl}/api/admin${path}`, {
        headers: { Cookie: cookieHeader },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return res.json();
    } catch {}
    return null;
  }

  const [stats, system, organizations, users, invitations] = await Promise.all([
    fetchAdmin('/system/stats'),
    fetchAdmin('/system/health'),
    fetchAdmin('/organizations'),
    fetchAdmin('/users'),
    fetchAdmin('/invitations'),
  ]);

  return (
    <AdminClient
      initialData={{
        stats,
        system,
        organizations: organizations || [],
        users: users || [],
        invitations: invitations || [],
      }}
    />
  );
}
