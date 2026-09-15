import { Building, CreditCard, Filter, MapPin, Phone, Search, Shield, User, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getEntities } from "../services/api";
import type { EntitySummary } from "../types/workspace";

function getEntityIcon(type: string) {
  switch (type.toUpperCase()) {
    case "PERSON":
      return <User size={14} className="text-cyber-cyan" />;
    case "ORGANIZATION":
      return <Building size={14} className="text-cyber-amber" />;
    case "BANKACCOUNT":
    case "BANK_ACCOUNT":
      return <CreditCard size={14} className="text-cyber-teal" />;
    case "PHONE":
      return <Phone size={14} className="text-cyber-indigo" />;
    case "LOCATION":
      return <MapPin size={14} className="text-pink-400" />;
    default:
      return <Shield size={14} className="text-cyber-cyan" />;
  }
}

export function EntitiesPage() {
  const { caseId } = useCaseContext();
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [rows, setRows] = useState<EntitySummary[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getEntities(caseId, query)
        .then(setRows)
        .catch(() => setError(true));
    }, 200);
    return () => clearTimeout(timer);
  }, [caseId, query]);

  const entityTypes = useMemo(() => {
    if (!rows) return ["ALL"];
    const types = new Set(rows.map((r) => r.type));
    return ["ALL", ...Array.from(types)];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (selectedType !== "ALL" && r.type !== selectedType) return false;
      return true;
    });
  }, [rows, selectedType]);

  if (error) return <ErrorState label="Unable to load entity registry." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Investigation Workspace · Entity Intelligence</p>
          <h1>Entity Registry</h1>
          <p className="muted">Master repository of suspects, accounts, phones, organizations, and linked nodes</p>
        </div>
        <div className="quick-links">
          <div style={{ position: "relative", width: "260px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#6a8696" }} />
            <input
              className="veil-input"
              style={{ width: "100%", paddingLeft: "30px" }}
              aria-label="Search entities"
              placeholder="Filter by name or contact..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Type Filter Tabs */}
      {rows && rows.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#6a8696", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px", marginRight: "4px" }}>
            <Filter size={12} /> Type:
          </span>
          {entityTypes.map((t) => (
            <button
              key={t}
              className={`veil-button ${selectedType === t ? "" : "secondary"}`}
              style={{ height: "28px", padding: "0 10px", fontSize: "11px" }}
              onClick={() => setSelectedType(t)}
            >
              {t === "ALL" ? `All Types (${rows.length})` : `${t} (${rows.filter((r) => r.type === t).length})`}
            </button>
          ))}
        </div>
      )}

      {!rows ? (
        <LoadingState label="Loading entity registry..." />
      ) : filteredRows.length ? (
        <div className="veil-panel veil-table-wrap">
          <table className="veil-table">
            <thead>
              <tr>
                <th>Entity / Subject</th>
                <th>Type</th>
                <th>ID</th>
                <th>Primary Contact</th>
                <th>Known Aliases</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {getEntityIcon(item.type)}
                      <div>
                        <Link to={`/entities/${item.id}`} style={{ fontWeight: 700, fontSize: "13px" }}>
                          {item.name}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill NORMAL">{item.type}</span>
                  </td>
                  <td style={{ fontFamily: "ui-monospace, monospace", color: "#38bdf8", fontSize: "11px" }}>
                    {item.id}
                  </td>
                  <td style={{ color: item.phone || item.email ? "#d1e2eb" : "#567082" }}>
                    {item.phone || item.email || "No contact on record"}
                  </td>
                  <td>
                    {item.aliases && item.aliases.length > 0 ? (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {item.aliases.map((a) => (
                          <span key={a} style={{ background: "#0c1822", color: "#9fc3d6", padding: "1px 5px", borderRadius: "3px", fontSize: "10px", border: "1px solid #142838" }}>
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: "#4a6273", fontSize: "11px" }}>None</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="quick-links" style={{ justifyContent: "flex-end" }}>
                      <Link className="veil-button" style={{ height: "26px", padding: "0 8px", fontSize: "11px" }} to={`/entities/${item.id}`}>
                        Profile
                      </Link>
                      <Link className="veil-button secondary" style={{ height: "26px", padding: "0 8px", fontSize: "11px" }} to={`/network?focus=${item.id}`}>
                        Graph
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState label={rows.length ? "No entities match the selected type or search filter." : "No entities registered in this case workspace."} />
      )}
    </section>
  );
}
