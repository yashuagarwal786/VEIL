export type ConnectionState = "checking" | "connected" | "disconnected";

export type HealthResponse = {
  status: string;
  service: string;
};

export type DatabaseHealthResponse = {
  status: string;
  database: string;
  detail?: string | null;
};
