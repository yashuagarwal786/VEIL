import { FormEvent, useEffect, useState } from "react";
import { LogIn, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSetupRequired } from "../services/api";

export function LoginPage() {
  const { investigator, setupInitialAccount, signIn, signInDemo } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupInvestigatorId, setSetupInvestigatorId] = useState("");
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  useEffect(() => {
    let active = true;
    getSetupRequired()
      .then((response) => {
        if (active) setSetupRequired(response.required);
      })
      .catch(() => {
        if (active) setSetupRequired(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (investigator) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const targetEmail = email.trim() || "yash.agarwal@synthetic.veil";
      const targetPassword = password || "veil-demo-1042";
      await signIn(targetEmail, targetPassword, remember);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to sign in.";
      if (message.includes("401")) {
        setError("Invalid investigator credentials.");
      } else if (message.includes("API connection failed")) {
        setError("Backend API connection timed out. Click 'Use Seeded Senior Investigator Account' below to sign in.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function setupAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await setupInitialAccount({
        name: setupName,
        email: setupEmail,
        password: setupPassword,
        investigator_id: setupInvestigatorId || undefined,
        remember,
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to create investigator account.";
      setError(message.includes("409") ? "Initial setup is already complete. Sign in with the account that was created." : message);
    } finally {
      setBusy(false);
    }
  }

  async function openSeededAccount() {
    setBusy(true);
    setError("");
    try {
      await signInDemo();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open seeded investigator account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand">
          <span className="brand-mark">V</span>
          <span>VEIL</span>
          <span className="brand-tag">INTEL</span>
        </div>
        <p className="eyebrow" style={{ letterSpacing: "0.18em" }}>Forensic Investigation Console · Authentication</p>
        <h1>Investigator Sign In</h1>
        <p className="muted" style={{ fontSize: "12px", lineHeight: 1.5 }}>
          Access case intelligence with an investigator clearance profile, scoped case docket, chain-of-custody audit logs, and forensic report generation.
        </p>

        {setupRequired ? (
          <form className="form-stack login-form" onSubmit={setupAccount}>
            <label>
              Full Name *
              <input
                className="veil-input"
                value={setupName}
                onChange={(event) => setSetupName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label>
              Official Agency Email *
              <input
                className="veil-input"
                type="email"
                value={setupEmail}
                onChange={(event) => setSetupEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password (Min 8 characters) *
              <input
                className="veil-input"
                type="password"
                value={setupPassword}
                onChange={(event) => setSetupPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </label>
            <label>
              Badge / Investigator ID (Optional)
              <input
                className="veil-input"
                value={setupInvestigatorId}
                onChange={(event) => setSetupInvestigatorId(event.target.value)}
                placeholder="e.g. INV-1042"
              />
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>Keep me signed in on this secure terminal</span>
            </label>

            {error ? <p className="veil-error">{error}</p> : null}

            <button className="veil-button" disabled={busy} type="submit" style={{ height: "38px" }}>
              <LogIn size={15} /> {busy ? "Creating clearance profile..." : "Create Clearance Profile & Sign In"}
            </button>
          </form>
        ) : (
          <form className="form-stack login-form" onSubmit={submit}>
            <label>
              Official Email
              <input
                className="veil-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                placeholder="yash.agarwal@synthetic.veil"
              />
            </label>
            <label>
              Password
              <input
                className="veil-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••••"
              />
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              <span>Keep me signed in on this secure terminal</span>
            </label>

            {error ? <p className="veil-error">{error}</p> : null}

            <button className="veil-button" disabled={busy} type="submit" style={{ height: "38px" }}>
              <LogIn size={15} /> {busy ? "Authenticating credentials..." : "Authenticate & Sign In"}
            </button>

            <button
              className="veil-button secondary"
              disabled={busy}
              type="button"
              onClick={openSeededAccount}
              style={{ height: "38px", border: "1px solid #1c364d" }}
            >
              <ShieldCheck size={16} className="text-cyber-cyan" />
              Use Seeded Senior Investigator Account (INV-1042)
            </button>
          </form>
        )}

        <div className="disclaimer" style={{ marginTop: "12px", fontSize: "11px" }}>
          <strong style={{ color: "#38bdf8" }}>Restricted Access: </strong>
          Authorized forensic personnel only. All access, graph queries, and dossier exports are cryptographically audited.
        </div>
      </section>
    </main>
  );
}
