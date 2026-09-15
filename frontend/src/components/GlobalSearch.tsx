import { FileText, MapPin, Network, Search, ShieldAlert, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../services/api";
import type { SearchResult } from "../types/workspace";

function getCategoryIcon(type: string) {
  switch (type.toUpperCase()) {
    case "PERSON":
    case "ENTITY":
      return <User size={13} className="text-cyber-cyan" />;
    case "CASE":
      return <ShieldAlert size={13} className="text-cyber-amber" />;
    case "DOCUMENT":
      return <FileText size={13} className="text-cyber-indigo" />;
    case "LOCATION":
      return <MapPin size={13} className="text-cyber-purple" />;
    default:
      return <Network size={13} className="text-cyber-teal" />;
  }
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      globalSearch(query)
        .then((items) => {
          setResults(items);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="global-search" ref={containerRef}>
      <Search size={15} className="text-veil-textMuted" aria-hidden="true" />
      <input
        ref={inputRef}
        aria-label="Search cases, entities, documents, and locations"
        placeholder="Omni-search entities, accounts, phones, FIR records..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResults([]);
            setOpen(false);
          }}
          style={{ background: "transparent", border: 0, color: "#6b8292", cursor: "pointer", padding: "2px" }}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      ) : (
        <span className="search-shortcut">⌘K</span>
      )}

      {open && query.length >= 2 ? (
        <div className="search-results">
          {results.length ? (
            results.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  navigate(item.url);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="search-kind">
                  {getCategoryIcon(item.type)}
                  <span style={{ marginLeft: "6px" }}>{item.type}</span>
                </span>
                <strong>{item.label}</strong>
                <small>{item.context}</small>
              </button>
            ))
          ) : (
            <p>No matching intelligence records for &ldquo;{query}&rdquo;</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
