import cytoscape, { type Core } from "cytoscape";
import { Focus, LocateFixed, Network, RefreshCw, Route, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/AsyncState";
import { useCaseContext } from "../context/CaseContext";
import {
  findShortestPath,
  getBridgeEntities,
  getCaseGraph,
  getCases,
  getCommunities,
  getEntityNeighbors,
  getRelationshipEvidence,
  seedDemoData,
  syncDemoGraph,
} from "../services/api";
import type { BridgeEntity, Community, GraphEdge, GraphNode, GraphResponse, RelationshipEvidence } from "../types/graph";
import type { CaseSummary } from "../types/workspace";

const CYBER_CASE_NUMBER = "CYBER-2026-009";
const colors: Record<string, string> = {
  Person: "#4fc1d8",
  Organization: "#b6a26d",
  Phone: "#88a9b8",
  BankAccount: "#d09168",
  Vehicle: "#87ad86",
  Location: "#cf8fa6",
  Document: "#8997cf",
  Case: "#d8dde0",
};

function graphCaseId(caseId: number) {
  return `C${String(caseId).padStart(3, "0")}`;
}

function graphPersonId(value: unknown) {
  if (typeof value === "number") return `P${String(value).padStart(3, "0")}`;
  const raw = String(value ?? "");
  return /^\d+$/.test(raw) ? `P${raw.padStart(3, "0")}` : raw;
}

export function NetworkExplorerPage() {
  const { caseId, setCaseId } = useCaseContext();
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [params] = useSearchParams();
  const [caseItem, setCaseItem] = useState<CaseSummary | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [evidence, setEvidence] = useState<RelationshipEvidence | null>(null);
  const [entityType, setEntityType] = useState("ALL");
  const [relationshipType, setRelationshipType] = useState("ALL");
  const [depth, setDepth] = useState(1);
  const [source, setSource] = useState("P076");
  const [target, setTarget] = useState("P080");
  const [pathMessage, setPathMessage] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [bridges, setBridges] = useState<BridgeEntity[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const activeGraphCaseId = caseItem ? graphCaseId(caseItem.id) : graphCaseId(caseId);

  const load = useCallback(() => {
    setError("");
    setPathMessage("");
    getCases()
      .then(async (caseRows) => {
        const requested = params.get("case");
        const selected =
          caseRows.find((item) => item.case_number === requested) ??
          caseRows.find((item) => item.case_number === CYBER_CASE_NUMBER) ??
          caseRows.find((item) => item.id === caseId) ??
          caseRows[0] ??
          null;

        setCaseItem(selected);
        if (!selected) {
          setGraph({ nodes: [], edges: [] });
          setCommunities([]);
          setBridges([]);
          return;
        }

        if (selected.id !== caseId) setCaseId(selected.id);
        const graphId = graphCaseId(selected.id);
        const [graphResult, communityResult, bridgeResult] = await Promise.allSettled([
          getCaseGraph(graphId),
          getCommunities(graphId),
          getBridgeEntities(graphId),
        ]);

        if (graphResult.status === "rejected") throw graphResult.reason;
        setGraph(graphResult.value);
        setCommunities(communityResult.status === "fulfilled" ? communityResult.value.communities : []);
        setBridges(bridgeResult.status === "fulfilled" ? bridgeResult.value : []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load network data."));
  }, [caseId, params, setCaseId]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!container.current || !graph) return;
    cyRef.current?.destroy();
    const visibleNodes = graph.nodes.filter((node) => entityType === "ALL" || node.type === entityType);
    const ids = new Set(visibleNodes.map((node) => node.id));
    const visibleEdges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target) && (relationshipType === "ALL" || edge.type === relationshipType));
    const cy = cytoscape({
      container: container.current,
      elements: [
        ...visibleNodes.map((node) => ({ data: { id: node.id, label: node.label, type: node.type, raw: node } })),
        ...visibleEdges.map((edge) => ({ data: { id: edge.id, source: edge.source, target: edge.target, label: edge.type, raw: edge } })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (element) => colors[String(element.data("type"))] ?? "#879da8",
            label: "data(label)",
            color: "#dce9ec",
            "font-size": 10,
            "text-valign": "bottom",
            "text-margin-y": 7,
            width: 22,
            height: 22,
            shape: (element) => (element.data("type") === "Person" ? "ellipse" : element.data("type") === "Organization" ? "round-rectangle" : element.data("type") === "Location" ? "diamond" : "hexagon"),
            "border-width": 2,
            "border-color": "#09151c",
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": "#36515d",
            "target-arrow-color": "#36515d",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            width: 1.2,
            label: "data(label)",
            "font-size": 7,
            color: "#6e8792",
            "text-background-color": "#09151c",
            "text-background-opacity": 0.8,
            "text-background-padding": "2px",
          },
        },
        { selector: ":selected", style: { "border-color": "#ffffff", "border-width": 3, "line-color": "#67d3e7", "target-arrow-color": "#67d3e7", width: 3 } },
        { selector: ".path", style: { "background-color": "#ffffff", "line-color": "#f2b861", "target-arrow-color": "#f2b861", width: 4, "z-index": 10 } },
      ],
      layout: { name: "cose", animate: false, padding: 35, nodeRepulsion: () => 7500, idealEdgeLength: () => 90 },
    });

    cy.on("tap", "node", (event) => {
      setSelectedNode(event.target.data("raw") as GraphNode);
      setSelectedEdge(null);
      setEvidence(null);
    });
    cy.on("tap", "edge", (event) => {
      const edge = event.target.data("raw") as GraphEdge;
      setSelectedEdge(edge);
      setSelectedNode(null);
      getRelationshipEvidence(edge.id).then(setEvidence).catch(() => setEvidence(null));
    });

    cyRef.current = cy;
    const focus = params.get("focus");
    if (focus) {
      const element = cy.$id(focus);
      if (element.length) {
        element.select();
        cy.animate({ center: { eles: element }, zoom: 1.7 }, { duration: 300 });
      }
    }
    return () => cy.destroy();
  }, [graph, entityType, relationshipType, params]);

  const entityTypes = useMemo(() => ["ALL", ...new Set((graph?.nodes ?? []).map((item) => item.type))], [graph]);
  const relationshipTypes = useMemo(() => ["ALL", ...new Set((graph?.edges ?? []).map((item) => item.type))], [graph]);

  async function seedAndSync() {
    setWorking(true);
    setError("");
    try {
      const result = await seedDemoData(true);
      if (result.graph_warning) setPathMessage(`Postgres seeded. Neo4j sync warning: ${result.graph_warning}`);
      else setPathMessage("Cyber case seeded and Neo4j sync requested.");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to seed cyber case graph.");
    } finally {
      setWorking(false);
    }
  }

  async function syncGraph() {
    setWorking(true);
    setError("");
    try {
      const result = await syncDemoGraph(false);
      setPathMessage(`Neo4j synced: ${result.nodes} nodes, ${result.relationships} relationships, ${result.cases} cases.`);
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to synchronize Neo4j graph.");
    } finally {
      setWorking(false);
    }
  }

  async function expand() {
    if (!selectedNode) return;
    try {
      const extra = await getEntityNeighbors(selectedNode.id, depth);
      setGraph((current) =>
        current
          ? {
              nodes: [...new Map([...current.nodes, ...extra.nodes].map((item) => [item.id, item])).values()],
              edges: [...new Map([...current.edges, ...extra.edges].map((item) => [item.id, item])).values()],
            }
          : extra,
      );
    } catch {
      setPathMessage("Unable to expand neighbors.");
    }
  }

  async function findPath() {
    if (!source || !target) return;
    try {
      const result = await findShortestPath(source, target);
      const cy = cyRef.current;
      cy?.elements().removeClass("path");
      if (result.path_length === null) {
        setPathMessage("No connection found within the selected depth.");
        return;
      }
      result.nodes.forEach((node) => cy?.$id(node.id).addClass("path"));
      result.relationships.forEach((edge) => cy?.$id(edge.id).addClass("path"));
      setPathMessage(`Path length ${result.path_length}: ${result.path?.join(" -> ")}`);
    } catch {
      setPathMessage("Unable to calculate connection path.");
    }
  }

  if (error) return <ErrorState label="Unable to load network data." detail={error} retry={load} />;
  if (!graph) return <LoadingState label="Loading knowledge graph..." />;

  if (!caseItem || !graph.nodes.length) {
    return (
      <section className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Knowledge graph - {caseItem?.case_number ?? CYBER_CASE_NUMBER}</p>
            <h1>{caseItem?.title ?? "India Voice Phishing Call Network"}</h1>
            <p className="muted">Seed the cyber case and synchronize Neo4j to display the caller, victim, fund-router, mule-account, and cash-out graph.</p>
          </div>
          <div className="quick-links">
            <button className="veil-button" disabled={working} onClick={seedAndSync}><RefreshCw size={15} /> {working ? "Working..." : "Seed and sync graph"}</button>
            {caseItem ? <button className="veil-button secondary" disabled={working} onClick={syncGraph}><Network size={15} /> Sync Neo4j</button> : null}
          </div>
        </header>
        <EmptyState label={caseItem ? "No Neo4j graph data found for this case yet." : "Cyber scam case is not present in Postgres yet."} />
      </section>
    );
  }

  return (
    <section className="page network-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Neo4j knowledge graph - {activeGraphCaseId}</p>
          <h1>{caseItem.title}</h1>
          <p className="muted">{caseItem.case_number} - callers, victims, fund router, mule coordinator, cash-out account, phones, documents, and locations.</p>
        </div>
        <div className="graph-toolbar">
          <button aria-label="Zoom in" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}><ZoomIn size={17} /></button>
          <button aria-label="Zoom out" onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}><ZoomOut size={17} /></button>
          <button aria-label="Fit graph" onClick={() => cyRef.current?.fit(undefined, 30)}><Focus size={17} /></button>
          <button aria-label="Reset layout" onClick={() => cyRef.current?.layout({ name: "cose", animate: true }).run()}><LocateFixed size={17} /></button>
        </div>
      </header>

      <div className="quick-links">
        <Link className="veil-button secondary" to={`/cases/${caseItem.id}`}>Case overview</Link>
        <Link className="veil-button secondary" to={`/cases/${caseItem.id}/intelligence`}>Intelligence dossier</Link>
        <button className="veil-button" disabled={working} onClick={syncGraph}><Network size={15} /> {working ? "Syncing..." : "Sync Neo4j"}</button>
      </div>

      <div className="network-layout">
        <aside className="network-filters veil-panel">
          <div className="panel-head"><h2>Graph controls</h2></div>
          <div className="panel-body form-stack">
            <label>Entity type<select className="veil-select" value={entityType} onChange={(event) => setEntityType(event.target.value)}>{entityTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Relationship<select className="veil-select" value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}>{relationshipTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Expansion depth<select className="veil-select" value={depth} onChange={(event) => setDepth(Number(event.target.value))}><option value={1}>1-hop</option><option value={2}>2-hop</option><option value={3}>3-hop</option></select></label>
            <hr />
            <label>Path source<input className="veil-input" placeholder="P076" value={source} onChange={(event) => setSource(event.target.value.toUpperCase())} /></label>
            <label>Path target<input className="veil-input" placeholder="P080" value={target} onChange={(event) => setTarget(event.target.value.toUpperCase())} /></label>
            <div className="quick-links">
              <button className="veil-button secondary" onClick={() => { setSource("P076"); setTarget("P081"); }}>Caller to victim</button>
              <button className="veil-button secondary" onClick={() => { setSource("P081"); setTarget("P080"); }}>Victim to cashout</button>
            </div>
            <button className="veil-button" onClick={() => void findPath()}><Route size={15} /> Find connection</button>
            {pathMessage ? <p className="muted small">{pathMessage}</p> : null}
          </div>
          <div className="panel-head"><h2>Communities</h2></div>
          <div className="community-list">{communities.map((group) => <button key={group.id} onClick={() => { const ids = group.members.map((member) => graphPersonId(member.entity_id ?? member.id)); cyRef.current?.nodes().unselect(); ids.forEach((id) => cyRef.current?.$id(id).select()); }}><span>Community {group.id}</span><strong>{group.size}</strong></button>)}</div>
          <div className="panel-head"><h2>Potential bridges</h2></div>
          <div className="community-list">{bridges.map((item, index) => <button key={index} onClick={() => { const id = graphPersonId(item.entity.entity_id ?? item.entity.id); cyRef.current?.$id(id).select(); }}><span>{String(item.entity.name ?? item.entity.entity_id ?? "Entity")}</span><strong>{item.bridge_score.toFixed(2)}</strong></button>)}</div>
        </aside>
        <div className="graph-stage veil-panel">
          <div ref={container} className="cytoscape-canvas" role="img" aria-label={`Knowledge graph with ${graph.nodes.length} entities and ${graph.edges.length} relationships`} />
          <span className="graph-count">{graph.nodes.length} entities - {graph.edges.length} relationships - {caseItem.case_number}</span>
        </div>
      </div>

      <section className="veil-panel selection-panel">
        <div className="panel-head"><h2>{selectedNode ? "Selected entity" : selectedEdge ? "Selected relationship" : "Selection details"}</h2></div>
        <div className="panel-body">
          {selectedNode ? (
            <div className="selection-grid">
              <div><p className="eyebrow">{selectedNode.type} - {selectedNode.id}</p><h3>{selectedNode.label}</h3><p className="muted">{Object.keys(selectedNode.properties).length} recorded properties</p></div>
              <div className="quick-links">
                {selectedNode.type === "Person" ? <Link className="veil-button" to={`/entities/${selectedNode.id}`}>Open profile</Link> : null}
                <button className="veil-button secondary" onClick={() => void expand()}><Network size={15} /> Expand neighbors</button>
                {selectedNode.type === "Person" ? <Link className="veil-button secondary" to={`/timeline?entity=${selectedNode.id.replace(/\D/g, "")}`}>Timeline</Link> : null}
                {selectedNode.type === "Person" ? <Link className="veil-button secondary" to={`/map?entity=${selectedNode.id.replace(/\D/g, "")}`}>Map</Link> : null}
              </div>
            </div>
          ) : selectedEdge ? (
            <div>
              <p className="eyebrow">{selectedEdge.type}</p>
              <h3>{selectedEdge.source} {"->"} {selectedEdge.target}</h3>
              <pre>{JSON.stringify(selectedEdge.properties, null, 2)}</pre>
              <h4>Supporting evidence</h4>
              {evidence?.evidence_sources.length ? <pre>{JSON.stringify(evidence.evidence_sources, null, 2)}</pre> : <p className="muted">No linked evidence records found for this relationship.</p>}
            </div>
          ) : (
            <p className="muted"><Search size={15} /> Select a node or relationship to inspect intelligence and provenance.</p>
          )}
        </div>
      </section>
    </section>
  );
}
