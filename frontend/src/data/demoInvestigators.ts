import type { Investigator } from "../types/investigator";

export const demoInvestigators: Investigator[] = [
  {
    id: "INV-1042",
    name: "Yash Agarwal",
    email: "yash.agarwal@synthetic.veil",
    role: "SENIOR_INVESTIGATOR",
    role_label: "Senior Investigator",
    department: "Digital Intelligence Unit",
    clearance: "Level 3 - Case Intelligence",
    status: "ACTIVE",
    last_login: "2026-09-02T21:42:00+05:30",
    permissions: {
      canViewAllCases: true,
      canAssignCases: false,
      canGenerateReports: true,
      canReviewAuditTrail: true,
    },
  },
  {
    id: "INV-2031",
    name: "Aarav Mehta",
    email: "aarav.mehta@synthetic.veil",
    role: "INVESTIGATOR",
    role_label: "Investigator",
    department: "Financial Crimes Cell",
    clearance: "Level 2 - Evidence Review",
    status: "ACTIVE",
    last_login: "2026-09-01T18:20:00+05:30",
    permissions: {
      canViewAllCases: false,
      canAssignCases: false,
      canGenerateReports: true,
      canReviewAuditTrail: false,
    },
  },
  {
    id: "INV-0001",
    name: "Operations Admin",
    email: "admin@synthetic.veil",
    role: "ADMINISTRATOR",
    role_label: "Administrator",
    department: "VEIL Operations",
    clearance: "Level 4 - Administration",
    status: "ACTIVE",
    last_login: "2026-09-02T09:05:00+05:30",
    permissions: {
      canViewAllCases: true,
      canAssignCases: true,
      canGenerateReports: true,
      canReviewAuditTrail: true,
    },
  },
];

export const demoPasswords: Record<string, string> = {
  "yash.agarwal@synthetic.veil": "veil-demo-1042",
  "aarav.mehta@synthetic.veil": "veil-demo-2031",
  "admin@synthetic.veil": "veil-admin-0001",
};

export const defaultInvestigator = demoInvestigators[0];
