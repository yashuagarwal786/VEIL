import { Bell, BriefcaseBusiness, ChevronLeft, ChevronRight, Clock3, FileSearch, Files, Gauge, Map, Network, ShieldCheck, Users } from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { GlobalSearch } from "../components/GlobalSearch";
import { useCaseContext } from "../context/CaseContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge }, { to: "/cases", label: "Cases", icon: BriefcaseBusiness }, { to: "/network", label: "Network", icon: Network }, { to: "/entities", label: "Entities", icon: Users }, { to: "/evidence", label: "Evidence", icon: FileSearch }, { to: "/alerts", label: "Alerts", icon: Bell }, { to: "/documents", label: "Documents", icon: Files }, { to: "/timeline", label: "Timeline", icon: Clock3 }, { to: "/map", label: "Map", icon: Map },
];

export function MainLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false); const { caseId } = useCaseContext();
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}><header className="app-header"><NavLink className="brand" to="/dashboard"><span className="brand-mark">V</span><span>VEIL</span></NavLink><GlobalSearch/><div className="header-context"><span className="demo-chip">Synthetic demo</span><span className="case-chip">VEIL-2026-{String(caseId).padStart(3, "0")}</span><NavLink aria-label="Open alerts" className="icon-link" to="/alerts"><Bell size={18}/></NavLink><span className="investigator"><ShieldCheck size={17}/> Demo Investigator</span></div></header><aside className="app-sidebar"><nav aria-label="Primary navigation">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={collapsed ? label : undefined}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="collapse-button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={18}/> : <><ChevronLeft size={18}/><span>Collapse</span></>}</button></aside><main className="app-content">{children}</main></div>;
}
