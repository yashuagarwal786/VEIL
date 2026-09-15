import { MapPin, Navigation, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import { getLocations } from "../services/api";
import type { LocationEvent } from "../types/workspace";

export function MapPage() {
  const { caseId } = useCaseContext();
  const [params] = useSearchParams();
  const initialEntity = Number(params.get("entity")) || undefined;
  const [events, setEvents] = useState<LocationEvent[] | null>(null);
  const [selected, setSelected] = useState<LocationEvent | null>(null);
  const [entity, setEntity] = useState<number | undefined>(initialEntity);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    getLocations(caseId, entity)
      .then((rows) => {
        setEvents(rows);
        const focus = Number(params.get("location"));
        if (focus) setSelected(rows.find((item) => item.location_id === focus) ?? rows[0] ?? null);
        else if (rows.length > 0 && !selected) setSelected(rows[0]);
      })
      .catch(() => setError(true));
  }, [caseId, entity, params]);

  useEffect(load, [load]);

  const path = useMemo(
    () => (events ?? []).map((item) => [item.latitude, item.longitude] as [number, number]),
    [events],
  );

  if (error) return <ErrorState label="Unable to load geospatial intelligence." retry={load} />;
  if (!events) return <LoadingState label="Loading geospatial coordinates..." />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Geospatial Intelligence · Spatial Topology</p>
          <h1>Geospatial Map</h1>
          <p className="muted">
            {entity ? `Filtered for Subject P${String(entity).padStart(3, "0")} · ` : ""}
            Observed transaction locales, ATM cashout coordinates, and geographic deviation paths
          </p>
        </div>
        <div className="quick-links">
          <div style={{ position: "relative", width: "200px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#6a8696" }} />
            <input
              className="veil-input"
              style={{ width: "100%", paddingLeft: "30px" }}
              aria-label="Filter by entity ID"
              type="number"
              min="1"
              placeholder="Entity ID (e.g. 78)"
              value={entity ?? ""}
              onChange={(e) => setEntity(e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          {entity && (
            <button
              className="veil-button secondary"
              style={{ height: "34px", fontSize: "11px" }}
              onClick={() => setEntity(undefined)}
            >
              Clear Filter
            </button>
          )}
        </div>
      </header>

      {events.length ? (
        <div className="map-layout">
          <div className="veil-panel map-panel" style={{ position: "relative" }}>
            <MapContainer
              center={[events[0].latitude, events[0].longitude]}
              zoom={6}
              scrollWheelZoom
              className="leaflet-map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {path.length > 1 ? (
                <Polyline positions={path} pathOptions={{ color: "#38bdf8", weight: 3, opacity: 0.8 }} />
              ) : null}
              {events.map((item) => (
                <CircleMarker
                  key={item.id}
                  center={[item.latitude, item.longitude]}
                  radius={item.geographic_deviation ? 10 : 7}
                  pathOptions={{
                    color: item.geographic_deviation ? "#f59e0b" : "#38bdf8",
                    fillColor: item.geographic_deviation ? "#ef4444" : "#0284c7",
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelected(item) }}
                >
                  <Popup>
                    <div style={{ fontSize: "12px" }}>
                      <strong style={{ color: "#38bdf8" }}>{item.name}</strong>
                      <br />
                      Subject: P{String(item.entity_id).padStart(3, "0")}
                      <br />
                      Amount: ₹{Number(item.amount).toLocaleString()}
                      <br />
                      <small>{new Date(item.timestamp).toLocaleString()}</small>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <aside className="veil-panel">
            <div className="panel-head">
              <h2>
                <MapPin size={14} style={{ display: "inline", marginRight: "6px", verticalAlign: "middle" }} className="text-pink-400" />
                Geospatial Signal Details
              </h2>
            </div>
            <div className="panel-body">
              {selected ? (
                <div>
                  <span className={`status-pill ${selected.geographic_deviation ? "ATTENTION" : "NORMAL"}`}>
                    {selected.geographic_deviation ? "GEOGRAPHIC DEVIATION" : "OBSERVED LOCATION"}
                  </span>
                  <h3 style={{ margin: "6px 0 2px 0", color: "#f8fafc", fontSize: "16px" }}>{selected.name}</h3>
                  <p style={{ fontFamily: "ui-monospace, monospace", color: "#38bdf8", fontSize: "12px", margin: "0 0 12px 0" }}>
                    Subject Entity: P{String(selected.entity_id).padStart(3, "0")}
                  </p>

                  <div style={{ background: "#060b11", padding: "10px", borderRadius: "4px", border: "1px solid #142434", marginBottom: "14px" }}>
                    <dl className="detail-list">
                      <dt>Latitude</dt>
                      <dd style={{ fontFamily: "ui-monospace, monospace" }}>{selected.latitude.toFixed(5)}</dd>
                      <dt>Longitude</dt>
                      <dd style={{ fontFamily: "ui-monospace, monospace" }}>{selected.longitude.toFixed(5)}</dd>
                      <dt>Event Timestamp</dt>
                      <dd>{new Date(selected.timestamp).toLocaleString()}</dd>
                      <dt>Financial Flow</dt>
                      <dd style={{ color: "#34d399", fontWeight: 700 }}>₹{Number(selected.amount).toLocaleString()}</dd>
                    </dl>
                  </div>

                  <div className="quick-links">
                    <Link className="veil-button" to={`/entities/P${String(selected.entity_id).padStart(3, "0")}`}>
                      View Subject Profile
                    </Link>
                    <Link className="veil-button secondary" to={`/timeline?entity=${selected.entity_id}`}>
                      Timeline
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="muted">Select a marker on the map to inspect location telemetry.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <EmptyState label="No geocoded telemetry available for the active selection." />
      )}

      <div className="disclaimer">
        <strong style={{ color: "#38bdf8" }}>Spatial Notice: </strong>
        Location paths show observed chronological transactions and CDR geo-tags. VEIL does not infer purpose or intent from movement.
      </div>
    </section>
  );
}
