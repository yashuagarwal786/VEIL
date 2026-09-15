import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="login-shell">
      <section className="login-panel" style={{ textAlign: "center", maxWidth: "440px" }}>
        <div style={{ display: "grid", placeItems: "center", width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", margin: "0 auto 8px auto" }}>
          <ShieldAlert size={24} />
        </div>
        <p className="eyebrow" style={{ color: "#f87171" }}>404 · Unmapped Intelligence Route</p>
        <h1 style={{ fontSize: "22px" }}>Target Dossier Not Found</h1>
        <p className="muted" style={{ fontSize: "12px", lineHeight: 1.5 }}>
          The requested investigation endpoint or record does not exist or has been restricted by judicial custody rules.
        </p>
        <div style={{ marginTop: "12px" }}>
          <Link className="veil-button" style={{ display: "inline-flex" }} to="/dashboard">
            <ArrowLeft size={14} /> Return to Investigator Cockpit
          </Link>
        </div>
      </section>
    </main>
  );
}
