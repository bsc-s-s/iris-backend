'use client';

import { useEffect, useState } from 'react';
import { admin } from '@/lib/api';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [licenseOrgId, setLicenseOrgId] = useState('');
  const [licensePlan, setLicensePlan] = useState('starter');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, sys, orgs, usrs, invs] = await Promise.all([
        admin.system.stats(), admin.system.health(), admin.organizations.list(),
        admin.users.list(), admin.invitations.list(),
      ]);
      setStats(s); setSystem(sys); setOrganizations(orgs || []);
      setUsers(usrs || []); setInvitations(invs || []);
    } catch {}
    setLoading(false);
  }

  async function createInvite() {
    try { await admin.invitations.create(inviteEmail, inviteRole); setInviteEmail(''); await loadAll(); } catch {}
  }

  async function assignLicense() {
    try { await admin.licenses.assign(licenseOrgId, licensePlan); setLicenseOrgId(''); await loadAll(); } catch {}
  }

  const tabs = ['overview', 'organizations', 'users', 'invitations', 'licenses', 'system'];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-lg font-bold">A</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 to-red-300 bg-clip-text text-transparent">SUPER_ADMIN</h1>
          </div>
          <p className="text-gray-400">Platform administration &amp; control panel</p>
        </motion.div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-all ${tab === t ? 'bg-amber-600 text-white' : 'border border-gray-700 text-gray-400 hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Organizations', value: stats.organizations },
                  { label: 'Users', value: stats.users },
                  { label: 'Scans', value: stats.scans },
                  { label: 'Scores', value: stats.scores },
                  { label: 'Signals', value: stats.signals },
                  { label: 'Alerts', value: stats.alerts },
                  { label: 'Predictions', value: stats.predictions },
                  { label: 'Reports', value: stats.reports },
                  { label: 'Avg. Score', value: stats.averageScore?.toFixed(1) || '0' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'organizations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Organizations</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Name</th><th className="text-left py-2 pr-4">Plan</th><th className="text-left py-2 pr-4">Users</th><th className="text-left py-2 pr-4">Scans</th><th className="text-left py-2">Created</th></tr></thead>
                <tbody>{organizations.map((o: any) => (
                  <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-3 pr-4 font-medium">{o.name}</td><td className="py-3 pr-4"><span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gray-700 text-gray-400">{o.license?.plan || 'none'}</span></td><td className="py-3 pr-4">{o._count?.users || 0}</td><td className="py-3 pr-4">{o._count?.irisScans || 0}</td><td className="py-3">{new Date(o.createdAt).toLocaleDateString()}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Email</th><th className="text-left py-2 pr-4">Name</th><th className="text-left py-2 pr-4">Role</th><th className="text-left py-2 pr-4">Active</th><th className="text-left py-2">Organization</th></tr></thead>
                <tbody>{users.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-3 pr-4">{u.email}</td><td className="py-3 pr-4">{u.name || '—'}</td><td className="py-3 pr-4"><span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gray-700 text-gray-400">{u.role}</span></td><td className="py-3 pr-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>{u.isActive ? 'Yes' : 'No'}</span></td><td className="py-3">{u.organization?.name || '—'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'invitations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Create Invitation</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <button onClick={createInvite} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">Send</button>
              </div>
            </div>
            {invitations.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Sent Invitations</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-gray-500 text-xs uppercase border-b border-gray-800"><th className="text-left py-2 pr-4">Email</th><th className="text-left py-2 pr-4">Role</th><th className="text-left py-2 pr-4">Status</th><th className="text-left py-2">Expires</th></tr></thead>
                    <tbody>{invitations.map((i: any) => (
                      <tr key={i.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-3 pr-4">{i.email}</td><td className="py-3 pr-4">{i.role}</td><td className="py-3 pr-4"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${i.status === 'accepted' ? 'bg-emerald-900/40 text-emerald-300' : i.status === 'pending' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-red-900/40 text-red-300'}`}>{i.status}</span></td><td className="py-3">{new Date(i.expiresAt).toLocaleDateString()}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'licenses' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Assign License</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Organization ID</label>
                  <input value={licenseOrgId} onChange={e => setLicenseOrgId(e.target.value)} placeholder="org_id" className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Plan</label>
                  <select value={licensePlan} onChange={e => setLicensePlan(e.target.value)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option><option value="enterprise_plus">Enterprise Plus</option>
                  </select>
                </div>
                <button onClick={assignLicense} className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">Assign</button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'system' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-6">
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">System Health</h2>
              {system && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4"><div className="text-xs text-gray-500">Status</div><div className={`text-lg font-semibold ${system.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}`}>{system.status}</div></div>
                  <div className="bg-gray-800/50 rounded-lg p-4"><div className="text-xs text-gray-500">Database</div><div className={`text-lg font-semibold ${system.database === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>{system.database}</div></div>
                  <div className="bg-gray-800/50 rounded-lg p-4"><div className="text-xs text-gray-500">Version</div><div className="text-lg font-semibold">{system.version}</div></div>
                  <div className="bg-gray-800/50 rounded-lg p-4"><div className="text-xs text-gray-500">Uptime</div><div className="text-lg font-semibold">{Math.floor(system.uptime)}s</div></div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <button onClick={() => admin.seed.questions()} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-sm font-medium hover:from-indigo-500 hover:to-purple-500 transition-all">Seed IRIS Questions</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
