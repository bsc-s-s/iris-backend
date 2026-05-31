import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { iris, admin, v1, api } from './api';

export function useIrisDashboard() {
  return useQuery({
    queryKey: ['iris', 'dashboard'],
    queryFn: () => iris.dashboard(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useIrisSignals(severity?: string, type?: string) {
  return useQuery({
    queryKey: ['iris', 'signals', severity, type],
    queryFn: () => iris.signals.list(severity, type),
  });
}

export function useIrisAlerts() {
  return useQuery({
    queryKey: ['iris', 'alerts'],
    queryFn: () => iris.alerts.list(),
    staleTime: 30 * 1000,
  });
}

export function useIrisScans() {
  return useQuery({
    queryKey: ['iris', 'scans'],
    queryFn: () => iris.scan.get(''),
  });
}

export function useIrisScan(id: string) {
  return useQuery({
    queryKey: ['iris', 'scan', id],
    queryFn: () => iris.scan.get(id),
    enabled: !!id,
  });
}

export function useIrisNextQuestion(scanId: string) {
  return useQuery({
    queryKey: ['iris', 'questions', 'next', scanId],
    queryFn: () => iris.questions.next(scanId),
    enabled: !!scanId,
  });
}

export function useIrisReports() {
  return useQuery({
    queryKey: ['iris', 'reports'],
    queryFn: () => iris.reports.list(),
  });
}

export function useIrisMonitorStatus() {
  return useQuery({
    queryKey: ['iris', 'monitor', 'status'],
    queryFn: () => iris.monitor.status(),
    staleTime: 30 * 1000,
  });
}

export function useIrisMonitorCycles() {
  return useQuery({
    queryKey: ['iris', 'monitor', 'cycles'],
    queryFn: () => iris.monitor.cycles(),
  });
}

export function useIrisPredictResults(model?: string) {
  return useQuery({
    queryKey: ['iris', 'predict', 'results', model],
    queryFn: () => iris.predict.results(model),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIrisBenchmarkPosition() {
  return useQuery({
    queryKey: ['iris', 'benchmark', 'position'],
    queryFn: () => iris.benchmark.position(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useIrisBenchmarkCompare(filters?: { industry?: string; size?: string; region?: string }) {
  return useQuery({
    queryKey: ['iris', 'benchmark', 'compare', filters],
    queryFn: () => iris.benchmark.compare(filters),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => admin.system.stats(),
  });
}

export function useAdminHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => admin.system.health(),
  });
}

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: () => admin.organizations.list(),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => admin.users.list(),
  });
}

export function useAdminInvitations() {
  return useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: () => admin.invitations.list(),
  });
}

export function useExecutiveIntel() {
  return useQuery({
    queryKey: ['v1', 'intelligence'],
    queryFn: () => v1.intelligence.overview(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useExecutiveAnalytics() {
  return useQuery({
    queryKey: ['v1', 'analytics'],
    queryFn: () => v1.analytics.dashboard(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useProprietaryIndexes() {
  return useQuery({
    queryKey: ['v1', 'indexes'],
    queryFn: () => v1.indexes.proprietary(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditLogs(limit = 20) {
  return useQuery({
    queryKey: ['audit', 'list', limit],
    queryFn: () => api.audit.list({ limit: String(limit) }),
  });
}

export function useRecentAssessments() {
  return useQuery({
    queryKey: ['assessments', 'list'],
    queryFn: () => api.assessments.list(),
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => iris.alerts.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iris', 'alerts'] }),
  });
}

export function useAcknowledgeSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => iris.signals.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iris', 'signals'] }),
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role?: string }) => admin.invitations.create(email, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  });
}

export function useAssignLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ organizationId, plan }: { organizationId: string; plan: string }) => admin.licenses.assign(organizationId, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] }),
  });
}
