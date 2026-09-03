import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { defaultInvestigator, demoInvestigators, demoPasswords } from "../data/demoInvestigators";
import { AUTH_INVALID_EVENT, loginInvestigator } from "../services/api";
import type { AuditEvent, GeneratedReport, Investigator } from "../types/investigator";

const SESSION_KEY = "veil.auth.session";
const AUDIT_KEY = "veil.audit.events";
const REPORT_KEY = "veil.generated.reports";

type AuthContextValue = {
  investigator: Investigator | null;
  auditEvents: AuditEvent[];
  reports: GeneratedReport[];
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => void;
  recordAudit: (event: Omit<AuditEvent, "id" | "investigator_id" | "investigator_name" | "created_at">) => void;
  generateReport: (report: Omit<GeneratedReport, "id" | "investigator_id" | "created_at">) => GeneratedReport | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredInvestigator(): Investigator | null {
  const raw = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { investigator_id?: string };
    if ("investigator" in parsed) return (parsed as { investigator: Investigator }).investigator;
    return demoInvestigators.find((item) => item.id === parsed.investigator_id) ?? null;
  } catch {
    return null;
  }
}

function readStoredList<T>(key: string): T[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function persistSession(investigator: Investigator, remember: boolean, accessToken = investigator.id) {
  const payload = JSON.stringify({ investigator_id: investigator.id, investigator, access_token: accessToken });
  window.sessionStorage.setItem(SESSION_KEY, payload);
  if (remember) window.localStorage.setItem(SESSION_KEY, payload);
  else window.localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [investigator, setInvestigator] = useState<Investigator | null>(() => readStoredInvestigator());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => readStoredList<AuditEvent>(AUDIT_KEY));
  const [reports, setReports] = useState<GeneratedReport[]>(() => readStoredList<GeneratedReport>(REPORT_KEY));

  useEffect(() => {
    const clearInvalidSession = () => setInvestigator(null);
    window.addEventListener(AUTH_INVALID_EVENT, clearInvalidSession);
    return () => window.removeEventListener(AUTH_INVALID_EVENT, clearInvalidSession);
  }, []);

  const appendAudit = useCallback((actor: Investigator, event: Omit<AuditEvent, "id" | "investigator_id" | "investigator_name" | "created_at">) => {
    const next: AuditEvent = {
      ...event,
      id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      investigator_id: actor.id,
      investigator_name: actor.name,
      created_at: new Date().toISOString(),
    };
    setAuditEvents((current) => {
      const updated = [next, ...current].slice(0, 100);
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    investigator,
    auditEvents,
    reports,
    async signIn(email, password, remember) {
      let account: Investigator | null = null;
      try {
        const response = await loginInvestigator(email, password);
        account = response.investigator;
        persistSession(account, remember, response.access_token);
      } catch (reason) {
        const normalized = email.trim().toLowerCase();
        const fallback = demoInvestigators.find((item) => item.email === normalized);
        if (!import.meta.env.DEV || !fallback || demoPasswords[normalized] !== password) {
          throw reason instanceof Error ? reason : new Error("Invalid investigator credentials.");
        }
        account = fallback;
        persistSession(account, remember);
      }
      setInvestigator(account);
      appendAudit(account, {
        action: "LOGIN",
        target_type: "AUTH",
        summary: "Investigator session opened in the synthetic VEIL environment.",
      });
    },
    async signInDemo() {
      const response = await loginInvestigator(defaultInvestigator.email, demoPasswords[defaultInvestigator.email]);
      persistSession(response.investigator, true, response.access_token);
      setInvestigator(response.investigator);
      appendAudit(response.investigator, {
        action: "LOGIN",
        target_type: "AUTH",
        summary: "Seeded senior investigator session opened.",
      });
    },
    signOut() {
      if (investigator) {
        appendAudit(investigator, {
          action: "LOGOUT",
          target_type: "AUTH",
          summary: "Investigator session closed.",
        });
      }
      window.localStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
      setInvestigator(null);
    },
    recordAudit(event) {
      if (investigator) appendAudit(investigator, event);
    },
    generateReport(report) {
      if (!investigator || !investigator.permissions.canGenerateReports) return null;
      const next: GeneratedReport = {
        ...report,
        id: `RPT-${Date.now()}`,
        investigator_id: investigator.id,
        created_at: new Date().toISOString(),
      };
      setReports((current) => {
        const updated = [next, ...current].slice(0, 30);
        window.localStorage.setItem(REPORT_KEY, JSON.stringify(updated));
        return updated;
      });
      appendAudit(investigator, {
        action: "GENERATE_REPORT",
        target_type: "REPORT",
        target_id: next.id,
        summary: `Generated intelligence report for ${report.case_number}.`,
      });
      return next;
    },
  }), [appendAudit, auditEvents, investigator, reports]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { investigator } = useAuth();
  const location = useLocation();
  if (!investigator) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
