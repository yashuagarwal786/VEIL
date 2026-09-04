import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSetupRequired } from "../services/api";

export function LoginPage() {
  const { investigator, signIn, signInDemo, setupInitialAccount } = useAuth();
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
        setError("Backend API is currently offline. Please click 'Use seeded senior investigator account' below to log in.");
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
        <div className="brand login-brand"><span className="brand-mark">V</span><span>VEIL</span></div>
        <p className="eyebrow">Synthetic demonstration environment</p>
        <h1>Investigator Sign In</h1>
        <p className="muted">Access case intelligence with an investigator profile, scoped case ownership, audit history, and report generation.</p>
        {setupRequired ? (
          <form className="form-stack login-form" onSubmit={setupAccount}>
            <label>Name<input className="veil-input" value={setupName} onChange={(event) => setSetupName(event.target.value)} autoComplete="name" required /></label>
            <label>Email<input className="veil-input" value={setupEmail} onChange={(event) => setSetupEmail(event.target.value)} autoComplete="username" required /></label>
            <label>Password<input className="veil-input" type="password" value={setupPassword} onChange={(event) => setSetupPassword(event.target.value)} autoComplete="new-password" required minLength={8} /></label>
            <label>Investigator ID<input className="veil-input" value={setupInvestigatorId} onChange={(event) => setSetupInvestigatorId(event.target.value)} placeholder="Optional, for example INV-1042" /></label>
            <label className="inline-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Keep me signed in on this device</label>
            {error ? <p className="veil-error">{error}</p> : null}
            <button className="veil-button" disabled={busy} type="submit"><LogIn size={16} /> {busy ? "Creating account..." : "Create account and sign in"}</button>
          </form>
        ) : (
          <form className="form-stack login-form" onSubmit={submit}>
            <label>Email<input className="veil-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
            <label>Password<input className="veil-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
            <label className="inline-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Keep me signed in on this device</label>
            {error ? <p className="veil-error">{error}</p> : null}
            <button className="veil-button" disabled={busy} type="submit"><LogIn size={16} /> {busy ? "Signing in..." : "Sign in"}</button>
            <button className="veil-button secondary" disabled={busy} type="button" onClick={openSeededAccount}><ShieldCheck size={16} /> Use seeded senior investigator account</button>
          </form>
        )}
        <p className="disclaimer">Create the first investigator only on your own trusted deployment. Demonstration data remains synthetic and should not be used as regulated production evidence.</p>
      </section>
    </main>
  );
}
