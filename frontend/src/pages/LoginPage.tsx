import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { investigator, signIn, signInDemo } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("yash.agarwal@synthetic.veil");
  const [password, setPassword] = useState("veil-demo-1042");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  if (investigator) return <Navigate to={from} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password, remember);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to sign in.";
      setError(message.includes("401") ? "Backend investigator account is not seeded yet. In Render backend shell run: alembic upgrade head && python scripts/seed_demo.py --sync-graph" : message);
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
      setError(reason instanceof Error ? `${reason.message}. Run backend migrations and seed investigator accounts on Render.` : "Unable to open seeded investigator account.");
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
        <form className="form-stack login-form" onSubmit={submit}>
          <label>Email<input className="veil-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
          <label>Password<input className="veil-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <label className="inline-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Keep me signed in on this device</label>
          {error ? <p className="veil-error">{error}</p> : null}
          <button className="veil-button" disabled={busy} type="submit"><LogIn size={16} /> {busy ? "Signing in..." : "Sign in"}</button>
          <button className="veil-button secondary" disabled={busy} type="button" onClick={openSeededAccount}><ShieldCheck size={16} /> Use seeded senior investigator account</button>
        </form>
        <p className="disclaimer">Seeded credentials are synthetic for demonstration data. Do not use this flow for regulated production work without hardened token authentication and administrator-managed accounts.</p>
      </section>
    </main>
  );
}
