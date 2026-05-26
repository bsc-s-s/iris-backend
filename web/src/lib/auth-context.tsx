"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, v1 } from "./api";
import { getDeviceId } from "./device-id";

type User = { id: string; email: string; name: string; role: string; title?: string; mfaEnabled?: boolean; securityLevel?: string };
type Organization = { id: string; name: string; slug: string; plan: string };

type AuthContextType = {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string, mfaToken?: string) => Promise<{ mfaRequired?: boolean; userId?: string } | void>;
  loginStep1: (email: string, password: string) => Promise<{ mfaRequired: boolean; userId: string; email: string }>;
  loginStep2: (userId: string, mfaToken: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; organizationName: string }) => Promise<void>;
  logout: () => Promise<void>;
  ssoLogin: (provider: string) => Promise<void>;
  setSsoSession: (accessToken: string, refreshToken: string, userData: any, orgData: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
      setOrganization(data.organization);
    } catch {
      localStorage.removeItem("iris_token");
      localStorage.removeItem("iris_refresh");
      setUser(null);
      setOrganization(null);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("iris_token");
    if (token) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string, mfaToken?: string) => {
    const deviceId = getDeviceId();
    const headers: Record<string, string> = { "x-device-id": deviceId };
    if (mfaToken) headers["x-mfa-token"] = mfaToken;

    const data = await api.auth.login({ email, password }, headers);
    localStorage.setItem("iris_token", data.accessToken);
    localStorage.setItem("iris_refresh", data.refreshToken);
    setUser(data.user);
    setOrganization(data.organization);
  };

  const loginStep1 = async (email: string, password: string) => {
    const deviceId = getDeviceId();
    return api.auth.loginStep1({ email, password }, { "x-device-id": deviceId });
  };

  const loginStep2 = async (userId: string, mfaToken: string) => {
    const deviceId = getDeviceId();
    const data = await api.auth.loginStep2({ userId, mfaToken }, { "x-device-id": deviceId });
    localStorage.setItem("iris_token", data.accessToken);
    localStorage.setItem("iris_refresh", data.refreshToken);
    setUser(data.user);
    setOrganization(data.organization);
  };

  const register = async (regData: { email: string; password: string; name: string; organizationName: string }) => {
    const data = await api.auth.register(regData);
    localStorage.setItem("iris_token", data.accessToken);
    localStorage.setItem("iris_refresh", data.refreshToken);
    setUser(data.user);
    setOrganization(data.organization);
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    localStorage.removeItem("iris_token");
    localStorage.removeItem("iris_refresh");
    localStorage.removeItem("iris_device_id");
    setUser(null);
    setOrganization(null);
  };

  const ssoLogin = async (provider: string) => {
    const result = await v1.sso.initiateLogin(provider);
    window.location.href = result.redirectUrl;
  };

  const setSsoSession = (accessToken: string, refreshToken: string, userData: any, orgData: any) => {
    localStorage.setItem("iris_token", accessToken);
    localStorage.setItem("iris_refresh", refreshToken);
    setUser(userData);
    setOrganization(orgData);
  };

  return (
    <AuthContext.Provider value={{ user, organization, loading, login, loginStep1, loginStep2, register, logout, ssoLogin, setSsoSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
