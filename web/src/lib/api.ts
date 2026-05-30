const API_BASE = "/api";

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
};

function getDeviceHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const id = localStorage.getItem("iris_device_id");
  return id ? { "x-device-id": id } : {};
}

let isRefreshing = false;
let pendingRequests: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("iris_refresh");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem("iris_token");
    localStorage.removeItem("iris_refresh");
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  localStorage.setItem("iris_token", data.accessToken);
  if (data.refreshToken) localStorage.setItem("iris_refresh", data.refreshToken);
  return data.accessToken;
}

async function handleRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      pendingRequests.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const token = await refreshAccessToken();
    pendingRequests.forEach((p) => p.resolve(token));
    return token;
  } catch (err) {
    pendingRequests.forEach((p) => p.reject(err));
    pendingRequests = [];
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw err;
  } finally {
    pendingRequests = [];
    isRefreshing = false;
  }
}

function buildUrl(base: string, path: string, params?: Record<string, string>): string {
  let url = `${base}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...getDeviceHeader(), ...extraHeaders };
  const token = typeof window !== "undefined" ? localStorage.getItem("iris_token") : null;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestOptions & { headers?: Record<string, string> } = {}): Promise<T> {
  const { method = "GET", body, params, headers: extraHeaders } = options;
  const url = buildUrl(API_BASE, path, params);
  let headers = buildHeaders(extraHeaders);
  let res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if (res.status === 401) {
    try {
      const newToken = await handleRefresh();
      headers = { ...buildHeaders(extraHeaders), Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error("Sesión expirada. Redirigiendo al login...");
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

const V1_BASE = "/api/v1";

async function v1Request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options;
  const url = buildUrl(V1_BASE, path, params);
  let headers = buildHeaders();
  let res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if (res.status === 401) {
    try {
      const newToken = await handleRefresh();
      headers = { ...buildHeaders(), Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error("Sesión expirada. Redirigiendo al login...");
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

export const v1 = {
  intelligence: {
    overview: () => v1Request<any>("/intelligence"),
  },
  risk: {
    score: () => v1Request<any>("/risk/score"),
    analyze: (data: any) => v1Request<any>("/risk/analyze", { method: "POST", body: data }),
    report: (id: string) => v1Request<any>(`/risk/report/${id}`),
    predict: (data?: any) => v1Request<any>("/risk/predict", { method: "POST", body: data || {} }),
    organizationalPatterns: () => v1Request<any>("/risk/organizational-patterns"),
    benchmark: () => v1Request<any>("/risk/benchmark"),
  },
  ai: {
    insight: (data: { question: string; contextType?: string; riskData?: any }) =>
      v1Request<any>("/ai/insight", { method: "POST", body: data }),
  },
  analytics: {
    dashboard: () => v1Request<any>("/analytics/dashboard"),
  },
  compliance: {
    health: () => v1Request<any>("/compliance/health"),
    gdpr: () => v1Request<any>("/compliance/gdpr"),
    iso27001: () => v1Request<any>("/compliance/iso27001"),
    nist: () => v1Request<any>("/compliance/nist"),
    soc2: () => v1Request<any>("/compliance/soc2"),
    esg: () => v1Request<any>("/compliance/esg"),
    evaluate: (data: { framework: string; controls?: string[] }) =>
      v1Request<any>("/compliance/evaluate", { method: "POST", body: data }),
    evaluateAll: (data?: { controls?: Record<string, string[]> }) =>
      v1Request<any>("/compliance/evaluate-all", { method: "POST", body: data || {} }),
  },
  anomalies: {
    detect: (data: any) => v1Request<any>("/anomalies/detect", { method: "POST", body: data }),
    overview: () => v1Request<any>("/anomalies/overview"),
  },
  predict: {
    incidentProbability: () => v1Request<any>("/predict/incident-probability"),
  },
  correlations: {
    all: () => v1Request<any>("/correlations"),
  },
  indexes: {
    proprietary: () => v1Request<any>("/indexes"),
  },
  billing: {
    plans: () => v1Request<any[]>("/billing/plans"),
    checkout: (data: { planId: string; successUrl: string; cancelUrl: string }) =>
      v1Request<any>("/billing/checkout", { method: "POST", body: data }),
    capture: (orderId: string) =>
      v1Request<any>("/billing/capture", { method: "POST", body: { orderId } }),
  },
  apiKeys: {
    list: () => v1Request<any[]>("/api-keys"),
    create: (data: { name: string; scopes?: string; rateLimit?: number }) =>
      v1Request<any>("/api-keys", { method: "POST", body: data }),
    revoke: (id: string) => v1Request<any>(`/api-keys/${id}/revoke`, { method: "POST" }),
    delete: (id: string) => v1Request<any>(`/api-keys/${id}`, { method: "DELETE" }),
  },
  webhooks: {
    list: () => v1Request<any[]>("/webhooks"),
    create: (data: { name: string; url: string; events: string[]; retryCount?: number; timeout?: number }) =>
      v1Request<any>("/webhooks", { method: "POST", body: data }),
    update: (id: string, data: any) => v1Request<any>(`/webhooks/${id}`, { method: "PUT", body: data }),
    delete: (id: string) => v1Request<any>(`/webhooks/${id}`, { method: "DELETE" }),
    events: (endpointId?: string) => v1Request<any>(endpointId ? `/webhooks/events/${endpointId}` : "/webhooks/events"),
    test: (id: string) => v1Request<any>(`/webhooks/test/${id}`, { method: "POST" }),
  },
  mfa: {
    setup: () => v1Request<any>("/mfa/setup", { method: "POST" }),
    verify: (token: string) => v1Request<any>("/mfa/verify", { method: "POST", body: { token } }),
    disable: () => v1Request<any>("/mfa/disable", { method: "POST" }),
    status: () => v1Request<any>("/mfa/status"),
  },
  sso: {
    providers: () => v1Request<any[]>("/sso/providers"),
    config: () => v1Request<any[]>("/sso/config"),
    saveConfig: (data: any) => v1Request<any>("/sso/config", { method: "PUT", body: data }),
    deleteConfig: (provider: string) => v1Request<any>(`/sso/config/${provider}`, { method: "DELETE" }),
    initiateLogin: (provider: string, orgSlug?: string) =>
      v1Request<{ redirectUrl: string }>(`/sso/login/${provider}${orgSlug ? `?org=${orgSlug}` : ""}`, { method: "POST" }),
  },
  reports: {
    executive: () => v1Request<any>("/compliance/generate-report", { method: "POST" }),
    assessment: (id: string) => v1Request<any>(`/reports/assessment/${id}`, { method: "POST" }),
  },
  gdpr: {
    dashboard: () => request<any>("/gdpr/dashboard"),
    dpo: {
      get: () => v1Request<any>("/gdpr/dpo"),
      set: (data: any) => v1Request<any>("/gdpr/dpo", { method: "POST", body: data }),
      remove: () => v1Request<any>("/gdpr/dpo", { method: "DELETE" }),
    },
    dpia: {
      list: (status?: string) => v1Request<any[]>("/gdpr/dpia", { params: status ? { status } : {} }),
      create: (data: any) => v1Request<any>("/gdpr/dpia", { method: "POST", body: data }),
      get: (id: string) => v1Request<any>(`/gdpr/dpia/${id}`),
      update: (id: string, data: any) => v1Request<any>(`/gdpr/dpia/${id}`, { method: "PUT", body: data }),
      review: (id: string, data: any) => v1Request<any>(`/gdpr/dpia/${id}/review`, { method: "PUT", body: data }),
      delete: (id: string) => v1Request<any>(`/gdpr/dpia/${id}`, { method: "DELETE" }),
    },
    export: {
      create: (data?: any) => v1Request<any>("/gdpr/export", { method: "POST", body: data || {} }),
      list: () => v1Request<any[]>("/gdpr/exports"),
    },
    consent: {
      list: (userId?: string) => v1Request<any[]>("/gdpr/consents", { params: userId ? { userId } : {} }),
      withdraw: (id: string) => v1Request<any>(`/gdpr/consent/withdraw/${id}`, { method: "POST" }),
    },
    userConsent: {
      list: () => v1Request<any[]>("/gdpr/user-consents"),
      accept: (data: any) => v1Request<any>("/gdpr/user-consent", { method: "POST", body: data }),
    },
    transfers: {
      list: () => v1Request<any[]>("/gdpr/transfers"),
      create: (data: any) => v1Request<any>("/gdpr/transfers", { method: "POST", body: data }),
      update: (id: string, data: any) => v1Request<any>(`/gdpr/transfers/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => v1Request<any>(`/gdpr/transfers/${id}`, { method: "DELETE" }),
    },
    dsr: {
      create: (data: any) => v1Request<any>("/gdpr/subject-request", { method: "POST", body: data }),
      list: (status?: string) => v1Request<any[]>("/gdpr/subject-requests", { params: status ? { status } : {} }),
      process: (id: string, data: any) => v1Request<any>(`/gdpr/subject-request/${id}/process`, { method: "PUT", body: data }),
    },
    privacyPolicy: {
      get: (version?: string) => v1Request<any>("/gdpr/privacy-policy", { params: version ? { version } : {} }),
      list: () => v1Request<any[]>("/gdpr/privacy-policies"),
      create: (data: any) => v1Request<any>("/gdpr/privacy-policy", { method: "POST", body: data }),
    },
    settings: {
      get: () => v1Request<any>("/gdpr/settings"),
      update: (data: any) => v1Request<any>("/gdpr/settings", { method: "PUT", body: data }),
    },
    retention: {
      list: () => v1Request<any[]>("/gdpr/retention-policies"),
      upsert: (data: any) => v1Request<any>("/gdpr/retention-policy", { method: "POST", body: data }),
    },
  },
  iso27001: {
    dashboard: () => request<any>("/iso27001/dashboard"),
    backup: {
      get: () => v1Request<any>("/iso27001/backup"),
      update: (data: any) => v1Request<any>("/iso27001/backup", { method: "PUT", body: data }),
      record: (data: any) => v1Request<any>("/iso27001/backup/record", { method: "POST", body: data }),
    },
    drp: {
      get: () => v1Request<any>("/iso27001/drp"),
      update: (data: any) => v1Request<any>("/iso27001/drp", { method: "PUT", body: data }),
      test: (data: any) => v1Request<any>("/iso27001/drp/test", { method: "POST", body: data }),
    },
    providers: {
      list: () => v1Request<any[]>("/iso27001/providers"),
      create: (data: any) => v1Request<any>("/iso27001/providers", { method: "POST", body: data }),
      update: (id: string, data: any) => v1Request<any>(`/iso27001/providers/${id}`, { method: "PUT", body: data }),
      delete: (id: string) => v1Request<any>(`/iso27001/providers/${id}`, { method: "DELETE" }),
    },
    encryptionKeys: {
      list: () => v1Request<any[]>("/iso27001/encryption-keys"),
      create: (data: any) => v1Request<any>("/iso27001/encryption-keys", { method: "POST", body: data }),
      rotate: (id: string) => v1Request<any>(`/iso27001/encryption-keys/${id}/rotate`, { method: "POST" }),
      revoke: (id: string) => v1Request<any>(`/iso27001/encryption-keys/${id}/revoke`, { method: "POST" }),
    },
    sensitiveFields: {
      list: () => v1Request<any[]>("/iso27001/sensitive-fields"),
      upsert: (data: any) => v1Request<any>("/iso27001/sensitive-fields", { method: "PUT", body: data }),
      delete: (id: string) => v1Request<any>(`/iso27001/sensitive-fields/${id}`, { method: "DELETE" }),
    },
  },
  enterpriseCompliance: {
    dashboard: () => request<any>("/enterprise-compliance/dashboard"),
    summary: () => v1Request<any>("/enterprise-compliance/summary"),
    auditTrail: (params?: Record<string, string>) => v1Request<any>("/enterprise-compliance/audit-trail", { params }),
  },
};

export const api = {
  auth: {
    login: (data: { email: string; password: string }, headers?: Record<string, string>) =>
      request<{ user: any; organization: any; accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body: data, headers }),
    loginStep1: (data: { email: string; password: string }, headers?: Record<string, string>) =>
      request<{ mfaRequired: boolean; userId: string; email: string }>("/auth/login/step1", { method: "POST", body: data, headers }),
    loginStep2: (data: { userId: string; mfaToken: string }, headers?: Record<string, string>) =>
      request<{ user: any; organization: any; accessToken: string; refreshToken: string }>("/auth/login/step2", { method: "POST", body: data, headers }),
    register: (data: { email: string; password: string; name: string; organizationName: string }) =>
      request<{ user: any; organization: any; accessToken: string; refreshToken: string }>("/auth/register", { method: "POST", body: data }),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>("/auth/refresh", { method: "POST", body: { refreshToken } }),
    me: () => request<{ user: any; organization: any }>("/auth/me", { method: "POST" }),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  },
  assessments: {
    list: (status?: string) => request<any[]>("/assessments", { params: status ? { status } : {} }),
    get: (id: string) => request<any>(`/assessments/${id}`),
    create: (data: { title: string; facilityId?: string; methodology?: string }) =>
      request<any>("/assessments", { method: "POST", body: data }),
    submitResponse: (id: string, data: { questionId: string; questionKey: string; response: any }) =>
      request<any>(`/assessments/${id}/responses`, { method: "POST", body: data }),
    calculate: (id: string) => request<any>(`/assessments/${id}/calculate`, { method: "POST" }),
    generatePlan: (id: string) => request<any>(`/assessments/${id}/plan`, { method: "POST" }),
    trends: () => request<any>("/assessments/trends"),
  },
  facilities: {
    list: () => request<any[]>("/assessments/facilities/list"),
    create: (data: { name: string; type: string; address?: string; country?: string; city?: string }) =>
      request<any>("/assessments/facilities", { method: "POST", body: data }),
  },
  organizations: {
    current: () => request<any>("/organizations/current"),
    update: (data: any) => request<any>("/organizations/current", { method: "PUT", body: data }),
    stats: () => request<any>("/organizations/stats"),
  },
  users: {
    list: () => request<any[]>("/users"),
    create: (data: { email: string; password: string; name: string; title?: string; role?: string }) =>
      request<any>("/users", { method: "POST", body: data }),
    update: (id: string, data: any) => request<any>(`/users/${id}`, { method: "PUT", body: data }),
    remove: (id: string) => request<any>(`/users/${id}`, { method: "DELETE" }),
  },
  aiAnalyst: {
    analyze: (data: { assessmentId?: string; question: string; contextType?: string }) =>
      request<any>("/ai-analyst/analyze", { method: "POST", body: data }),
    report: (assessmentId: string) =>
      request<any>("/ai-analyst/report", { method: "POST", body: { assessmentId } }),
  },
  securityPlanning: {
    generate: (data: { assessmentId?: string; scope?: string; timeframeMonths?: number }) =>
      request<any>("/security-planning/generate", { method: "POST", body: data }),
    protocols: () => request<any[]>("/security-planning/protocols"),
    updateProtocol: (id: string, data: any) =>
      request<any>(`/security-planning/protocols/${id}`, { method: "PUT", body: data }),
  },
  threatSimulation: {
    types: () => request<any[]>("/threat-simulation/types"),
    run: (assessmentId: string, type: string) =>
      request<any>(`/threat-simulation/run/${assessmentId}/${type}`, { method: "POST" }),
    history: (assessmentId: string) =>
      request<any[]>(`/threat-simulation/history/${assessmentId}`),
  },
  audit: {
    list: (params?: Record<string, string>) => request<any>("/audit", { params }),
    stats: () => request<any>("/audit/stats"),
  },
  security: {
    dashboard: () => request<any>("/security/dashboard"),
    events: (params?: Record<string, string>) => request<any>("/security/events", { params }),
    users: (userId?: string) => request<any>("/security/users", { params: userId ? { userId } : {} }),
    verifyChain: () => request<any>("/security/verify-chain", { method: "POST" }),
    sessions: () => request<any>("/security/sessions"),
    revokeSession: (sessionId: string) => request<any>("/security/revoke-session", { method: "POST", body: { sessionId } }),
    lockUser: (userId: string, reason?: string) => request<any>("/security/lock-user", { method: "POST", body: { userId, reason } }),
    unlockUser: (userId: string) => request<any>("/security/unlock-user", { method: "POST", body: { userId } }),
  },
};
