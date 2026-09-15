import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSearch,
  Files,
  Gauge,
  LogOut,
  Map,
  Network,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GlobalSearch } from "../components/GlobalSearch";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/cases", label: "Cases", icon: BriefcaseBusiness },
  { to: "/network", label: "Network", icon: Network },
  { to: "/entities", label: "Entities", icon: Users },
  { to: "/evidence", label: "Evidence", icon: FileSearch },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/documents", label: "Documents", icon: Files },
  { to: "/timeline", label: "Timeline", icon: Clock3 },
  { to: "/map", label: "Map", icon: Map },
];

export function MainLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const { caseId } = useCaseContext();
  const [accountOpen, setAccountOpen] = useState(false);
  const { investigator, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <header className="app-header">
        <NavLink className="brand" to="/dashboard">
          <span className="brand-mark">V</span>
          <span>VEIL</span>
          <span className="brand-tag">INTEL</span>
        </NavLink>

        <GlobalSearch />

        <div className="header-context">
          <span className="clearance-chip">
            <ShieldAlert size={12} />
            <span>{investigator?.clearance ?? "CONFIDENTIAL"}</span>
          </span>

          <NavLink to={`/cases/${caseId}`} className="case-chip" title="Active Investigation Scope">
            <span>CASE-{String(caseId).padStart(3, "0")}</span>
          </NavLink>

          <NavLink aria-label="Open alert center" className="icon-link" to="/alerts" title="Alert Center">
            <Bell size={16} />
          </NavLink>

          <div className="account-menu">
            <button
              className="investigator account-trigger"
              onClick={() => setAccountOpen((value) => !value)}
              aria-label="Investigator profile options"
            >
              <ShieldCheck size={16} className="text-cyber-cyan" />
              <span>{investigator?.name}</span>
              <ChevronDown size={13} className="text-veil-textMuted" />
            </button>

            {accountOpen ? (
              <div className="account-popover">
                <div>
                  <p className="eyebrow" style={{ fontSize: "10px", margin: 0 }}>
                    INVESTIGATOR ID: {investigator?.id}
                  </p>
                  <strong>{investigator?.name}</strong>
                  <div style={{ color: "#8fa8b7", fontSize: "11px", marginTop: "2px" }}>
                    {investigator?.role_label} · {investigator?.department}
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid #142434", margin: "4px 0" }} />

                <NavLink to="/profile" onClick={() => setAccountOpen(false)}>
                  <UserCircle size={14} /> Profile & Audit Trail
                </NavLink>
                <NavLink to="/cases" onClick={() => setAccountOpen(false)}>
                  <BriefcaseBusiness size={14} /> Assigned Case Queue
                </NavLink>
                <button
                  onClick={() => {
                    signOut();
                    setAccountOpen(false);
                    navigate("/login");
                  }}
                  style={{ color: "#f87171" }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <aside className="app-sidebar">
        <nav aria-label="Primary navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="collapse-button"
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Collapse</span></>}
        </button>
      </aside>

      <main className="app-content">{children}</main>
    </div>
  );
}
