export function LoadingState({ label = "Loading intelligence..." }: { label?: string }) { return <div className="veil-state" role="status"><span className="veil-spinner" />{label}</div>; }
export function ErrorState({ label, retry }: { label: string; retry?: () => void }) { return <div className="veil-state veil-error"><span>{label}</span>{retry ? <button className="veil-button secondary" onClick={retry}>Retry</button> : null}</div>; }
export function EmptyState({ label }: { label: string }) { return <div className="veil-state">{label}</div>; }
