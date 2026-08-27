import { useState } from "react";

import {
  getBetweennessCentrality,
  getBridgeEntities,
  getCaseGraph,
  getCommunities,
  getDegreeCentrality,
  getEntityNeighbors,
  getNetworkSummary,
  getPagerank,
} from "../services/api";
import type { BridgeEntity, CentralityResult, CommunitiesResponse, GraphNode, GraphResponse, NetworkSummary } from "../types/graph";

const demoCases = ["C001", "C002", "C003"];

export function GraphDevPage() {
  const [caseId, setCaseId] = useState("C001");
  const [caseGraph, setCaseGraph] = useState<GraphResponse | null>(null);
  const [neighbors, setNeighbors] = useState<GraphResponse | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [degree, setDegree] = useState<CentralityResult[]>([]);
  const [betweenness, setBetweenness] = useState<CentralityResult[]>([]);
  const [pagerank, setPagerank] = useState<CentralityResult[]>([]);
  const [communities, setCommunities] = useState<CommunitiesResponse | null>(null);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [bridges, setBridges] = useState<BridgeEntity[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadCase() {
    setError(null);
    try {
      const graph = await getCaseGraph(caseId);
      setCaseGraph(graph);
      setSelectedEntity(graph.nodes[0]?.id ?? "");
      const [degreeRows, betweennessRows, pagerankRows, communityRows, summaryRow, bridgeRows] = await Promise.all([
        getDegreeCentrality(caseId),
        getBetweennessCentrality(caseId),
        getPagerank(caseId),
        getCommunities(caseId),
        getNetworkSummary(caseId),
        getBridgeEntities(caseId),
      ]);
      setDegree(degreeRows);
      setBetweenness(betweennessRows);
      setPagerank(pagerankRows);
      setCommunities(communityRows);
      setSummary(summaryRow);
      setBridges(bridgeRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load graph data.");
    }
  }

  async function loadNeighbors(entityId = selectedEntity) {
    if (!entityId) {
      return;
    }
    setError(null);
    try {
      setNeighbors(await getEntityNeighbors(entityId, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load neighbors.");
    }
  }

  return (
    <section className="flex flex-col gap-6 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-signal">Internal Graph Test</p>
        <h1 className="mt-2 text-3xl font-semibold">Knowledge Graph</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Demo case
          <select className="h-10 rounded-md border border-ink/15 bg-white px-3" value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            {demoCases.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button className="h-10 rounded-md bg-signal px-4 font-semibold text-white" onClick={() => void loadCase()}>
          Fetch Case Graph
        </button>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Nodes" value={caseGraph?.nodes.length ?? 0} />
        <Metric label="Relationships" value={caseGraph?.edges.length ?? 0} />
        <Metric label="Communities" value={communities?.communities.length ?? 0} />
      </div>

      {summary ? (
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">Network Summary</h2>
          <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-surface p-3 text-xs">{JSON.stringify(summary, null, 2)}</pre>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <EntityList nodes={caseGraph?.nodes ?? []} selectedEntity={selectedEntity} onSelect={(nodeId) => setSelectedEntity(nodeId)} onLoadNeighbors={loadNeighbors} />
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">Neighbors</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-md bg-surface p-3 text-xs">{JSON.stringify(neighbors, null, 2)}</pre>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankList title="Top Degree Entities" rows={degree} />
        <RankList title="Top Betweenness Entities" rows={betweenness} />
        <RankList title="Top PageRank Entities" rows={pagerank} />
      </div>

      <div className="rounded-lg border border-ink/10 bg-white p-4">
        <h2 className="font-semibold">Potential Bridge Entities</h2>
        <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-surface p-3 text-xs">{JSON.stringify(bridges, null, 2)}</pre>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function EntityList({
  nodes,
  selectedEntity,
  onSelect,
  onLoadNeighbors,
}: {
  nodes: GraphNode[];
  selectedEntity: string;
  onSelect: (nodeId: string) => void;
  onLoadNeighbors: (nodeId?: string) => void;
}) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Entities</h2>
        <button className="rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold" onClick={() => void onLoadNeighbors()}>
          Fetch Neighbors
        </button>
      </div>
      <div className="mt-3 max-h-96 overflow-auto">
        {nodes.map((node) => (
          <button
            key={node.id}
            className={`mb-2 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm ${
              selectedEntity === node.id ? "border-signal bg-signal/10" : "border-ink/10 bg-white"
            }`}
            onClick={() => onSelect(node.id)}
          >
            <span>{node.label}</span>
            <span className="text-ink/55">{node.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: CentralityResult[] }) {
  return (
    <div className="rounded-lg border border-ink/10 bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.entity_id} className="rounded-md bg-surface p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span>{row.name}</span>
              <span>{row.score.toFixed(4)}</span>
            </div>
            <div className="mt-1 text-xs text-ink/55">{row.entity_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
