# Development Notes

## Repository Inspection

The workspace was empty at the start of Phase 1. There was no existing git repository, frontend, backend, dependency manifest, Docker configuration, or reusable application code to preserve.

Based on that inspection, VEIL was initialized from scratch with a split `frontend/` and `backend/` structure, plus repo-level Docker, environment, synthetic data, scripts, and documentation.

## Current Scope

Phase 1 implemented the project foundation and data layer:

- FastAPI backend foundation
- React + TypeScript + Vite frontend foundation
- SQLAlchemy models and Alembic migration
- PostgreSQL and Neo4j configuration
- Deterministic synthetic demo data generation
- Repeatable demo seed script
- Health-check APIs
- Basic automated tests

## Phase 2 Notes

Phase 2 adds the knowledge graph and network intelligence foundation:

- PostgreSQL to Neo4j graph synchronization
- Stable graph node IDs and Neo4j constraints
- Provenance-preserving graph relationships
- Entity lookup, search, case graph, neighbors, shortest path, and relationship evidence APIs
- Degree centrality, betweenness centrality, PageRank, community detection, network summary, key-entity ranking, and bridge-entity detection
- Lightweight frontend graph test page at `/dev/graph`
- Unit tests for deterministic graph analytics and graph API validation

The analytics language is intentionally careful: results are structural signals and investigative leads, not claims of guilt or criminal probability.

## Phase 3 Notes

Phase 3 adds document intelligence:

- Upload validation for PDF, TXT, CSV, and JSON
- Local storage abstraction for uploaded files
- Text extraction and cleaning
- Rule-based extraction for people, locations, phone numbers, email, money, vehicles, bank-account-like values, dates, and case references
- Rule-based relationship extraction for calls, transfers, visits, and relationship assertions
- Entity normalization and transparent candidate matching
- Investigator review APIs with audit records
- Direct entity-extraction and relationship-extraction review endpoints
- Evidence creation tied to source documents and source references
- Accepted extraction sync through the existing graph synchronization layer
- Frontend Document Intelligence page at `/documents`

OCR, spaCy, transformer extraction, and LLM extraction are intentionally extension points. The working default path uses deterministic rules only.

## Phase 4 Notes

Calculate persisted behavioral analytics after seeding a database:

```bash
curl -X POST http://localhost:8000/api/analytics/recalculate -H "Content-Type: application/json" -d '{"case_id": 1}'
```

The deterministic demo includes P014 with a large late-hour transaction to a new counterparty, a communication spike, and a remote geographic observation after a local baseline. Open `/alerts` to inspect supporting metrics and mark signals reviewed or dismissed.

## Phase 5 Notes

Run both services and open `http://localhost:5173/dashboard`. The demo workflow starts with Project Eclipse and continues through case overview, network, P014 entity intelligence, alerts, evidence, documents, timeline, and map.

Visualization dependencies are Cytoscape.js, Leaflet/React Leaflet, and Lucide icons. Network and map pages are lazy-loaded. Investigation read endpoints are grouped below `/api/workspace` and apply validated limits.

Docker Desktop must be running for live PostgreSQL and Neo4j verification. Without it, the frontend displays retryable error states instead of invented dashboard or graph data.
