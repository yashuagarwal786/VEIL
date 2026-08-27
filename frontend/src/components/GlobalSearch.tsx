import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../services/api";
import type { SearchResult } from "../types/workspace";

export function GlobalSearch() {
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SearchResult[]>([]); const [open, setOpen] = useState(false); const navigate = useNavigate();
  useEffect(() => { if (query.trim().length < 2) { setResults([]); return; } const timer = window.setTimeout(() => { globalSearch(query).then((items) => { setResults(items); setOpen(true); }).catch(() => setResults([])); }, 280); return () => window.clearTimeout(timer); }, [query]);
  return <div className="global-search"><Search size={17} aria-hidden="true"/><input aria-label="Search cases, entities, documents, and locations" placeholder="Search investigation data" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setOpen(true)}/>{open && query.length >= 2 ? <div className="search-results">{results.length ? results.map((item) => <button key={`${item.type}-${item.id}`} onClick={() => { navigate(item.url); setOpen(false); setQuery(""); }}><span className="search-kind">{item.type}</span><strong>{item.label}</strong><small>{item.context}</small></button>) : <p>No matching investigation records</p>}</div> : null}</div>;
}
