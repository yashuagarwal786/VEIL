import type { ConnectionState } from "../types/health";

type StatusRowProps = {
  label: string;
  state: ConnectionState;
};

const labelByState: Record<ConnectionState, string> = {
  checking: "Checking",
  connected: "Connected",
  disconnected: "Disconnected",
};

const classByState: Record<ConnectionState, string> = {
  checking: "bg-warning/15 text-warning",
  connected: "bg-signal/15 text-signal",
  disconnected: "bg-red-100 text-red-700",
};

export function StatusRow({ label, state }: StatusRowProps) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-md border border-ink/10 px-4">
      <span className="font-medium">{label}</span>
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${classByState[state]}`}>{labelByState[state]}</span>
    </div>
  );
}
