export type AlertItem = {
  id: number;
  case_id: number;
  entity_id: number | null;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number;
  title: string;
  explanation: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  generated_at: string;
  details: { reasons?: string[]; supporting_metrics?: Record<string, unknown>; data_sources?: string[] };
};

export type AnalyticsOverview = { total_anomalies: number; high_severity_alerts: number; anomalous_transactions: number; communication_spikes: number; geographic_deviations: number; high_priority_entities: number };
