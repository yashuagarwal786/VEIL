import { Bell, BriefcaseBusiness, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileSearch, Files, Gauge, LogOut, Map, Network, ShieldCheck, UserCircle, Users } from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GlobalSearch } from "../components/GlobalSearch";
import { useAuth } from "../context/AuthContext";
import { useCaseContext } from "../context/CaseContext";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge }, { to: "/cases", label: "Cases", icon: BriefcaseBusiness }, { to: "/network", label: "Network", icon: Network }, { to: "/entities", label: "Entities", icon: Users }, { to: "/evidence", label: "Evidence", icon: FileSearch }, { to: "/alerts", label: "Alerts", icon: Bell }, { to: "/documents", label: "Documents", icon: Files }, { to: "/timeline", label: "Timeline", icon: Clock3 }, { to: "/map", label: "Map", icon: Map },
];

export function MainLayout({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false); const { caseId } = useCaseContext();
  const [accountOpen, setAccountOpen] = useState(false); const { investigator, signOut } = useAuth(); const navigate = useNavigate();
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}><header className="app-header"><NavLink className="brand" to="/dashboard"><span className="brand-mark">V</span><span>VEIL</span></NavLink><GlobalSearch/><div className="header-context"><span className="demo-chip">Synthetic demonstration</span><span className="case-chip">VEIL-2026-{String(caseId).padStart(3, "0")}</span><NavLink aria-label="Open alerts" className="icon-link" to="/alerts"><Bell size={18}/></NavLink><div className="account-menu"><button className="investigator account-trigger" onClick={() => setAccountOpen((value) => !value)}><ShieldCheck size={17}/> <span>{investigator?.name}</span><ChevronDown size={14}/></button>{accountOpen?<div className="account-popover"><p className="eyebrow">{investigator?.id}</p><strong>{investigator?.role_label}</strong><small>{investigator?.department}</small><NavLink to="/profile" onClick={() => setAccountOpen(false)}><UserCircle size={15}/> Profile and audit</NavLink><NavLink to="/cases" onClick={() => setAccountOpen(false)}><BriefcaseBusiness size={15}/> Assigned cases</NavLink><button onClick={() => { signOut(); setAccountOpen(false); navigate("/login"); }}><LogOut size={15}/> Sign out</button></div>:null}</div></div></header><aside className="app-sidebar"><nav aria-label="Primary navigation">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} title={collapsed ? label : undefined}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="collapse-button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={18}/> : <><ChevronLeft size={18}/><span>Collapse</span></>}</button></aside><main className="app-content">{children}</main></div>;
}
