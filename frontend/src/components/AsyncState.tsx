import { AlertTriangle, Database, RefreshCw, Search } from "lucide-react";

export function LoadingState({ label = "Loading intelligence dossier..." }: { label?: string }) {
  return (
    <div className="veil-state" role="status" style={{ minHeight: "180px", gap: "14px" }}>
      <span className="veil-spinner" style={{ width: "24px", height: "24px", borderWidth: "2.5px" }} />
      <span style={{ fontSize: "12px", color: "#8fa8b7", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

export function ErrorState({
  label,
  detail,
  retry,
}: {
  label: string;
  detail?: string;
  retry?: () => void;
}) {
  return (
    <div className="veil-state veil-error" style={{ padding: "28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f87171", fontWeight: 700 }}>
        <AlertTriangle size={18} />
        <span style={{ fontSize: "14px" }}>{label}</span>
      </div>
      {detail ? (
        <small style={{ color: "#e2a4a4", maxWidth: "600px", margin: "4px 0", fontSize: "11px", lineHeight: 1.4 }}>
          {detail}
        </small>
      ) : null}
      {retry ? (
        <button
          className="veil-button secondary"
          style={{ marginTop: "8px", height: "30px", fontSize: "11px" }}
          onClick={retry}
        >
          <RefreshCw size={12} /> Retry Operation
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ label = "No intelligence records found." }: { label?: string }) {
  return (
    <div className="veil-state" style={{ minHeight: "160px", gap: "10px" }}>
      <Search size={22} style={{ color: "#4a6273" }} />
      <span style={{ color: "#7995a5", fontSize: "13px" }}>{label}</span>
    </div>
  );
}
