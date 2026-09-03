export type InvestigatorRole = "INVESTIGATOR" | "SENIOR_INVESTIGATOR" | "ADMINISTRATOR";

export type RolePermissions = {
  canViewAllCases: boolean;
  canAssignCases: boolean;
  canGenerateReports: boolean;
  canReviewAuditTrail: boolean;
};

export type Investigator = {
  id: string;
  name: string;
  email: string;
  role: InvestigatorRole;
  role_label: string;
  department: string;
  clearance: string;
  status: "ACTIVE" | "SUSPENDED";
  last_login: string;
  permissions: RolePermissions;
};

export type AuditEvent = {
  id: string;
  investigator_id: string;
  investigator_name: string;
  action: string;
  target_type: "AUTH" | "CASE" | "ENTITY" | "EVIDENCE" | "REPORT" | "SYSTEM";
  target_id?: string;
  summary: string;
  created_at: string;
};

export type GeneratedReport = {
  id: string;
  case_id: number;
  case_number: string;
  title: string;
  investigator_id: string;
  created_at: string;
  content: string;
};
