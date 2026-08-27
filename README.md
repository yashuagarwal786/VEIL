# VEIL

Visualizing Evidence & Intelligence Links

**Unveiling what the data hides.**

## Overview

VEIL is an evidence-centered investigation intelligence platform for exploring relationships, source provenance, behavioral anomalies, timelines, and locations. It helps investigators prioritize review of observable data without predicting guilt or criminality.

## Current Phase

Phases 1–5 - Data, graph, document intelligence, behavioral analytics, and unified investigation interface.

The evidence-grounded AI assistant is intentionally deferred to Phase 6 and is not implemented.

## Architecture

```text
React
  -> FastAPI
      -> PostgreSQL
      -> Graph Sync
      -> Neo4j
```

- `frontend/`: React, TypeScript, Vite, Tailwind CSS
- `backend/`: FastAPI, Pydantic, SQLAlchemy, Alembic
- `backend/app/graph/`: Neo4j repository, graph sync, graph queries, NetworkX analytics
- `backend/app/nlp/`: document loading, text extraction, cleaning, rule-based entity and relationship extraction, normalization, entity resolution
- `backend/app/storage/`: local document storage abstraction
- `data/synthetic/`: deterministic demo dataset output
- `scripts/`: demo data generation and seeding
- `docker-compose.yml`: PostgreSQL and Neo4j for local development

Production uses Vercel for the React frontend, a container-capable Python host for FastAPI, managed PostgreSQL, and hosted Neo4j. See `DEPLOYMENT.md`.

## Ports

- Frontend: `5173`
- Backend: `8000`
- PostgreSQL: `5432`
- Neo4j browser: `7474`
- Neo4j Bolt: `7687`

## Setup

1. Create local environment configuration:

   ```bash
   cp .env.example .env
   ```

2. Start infrastructure:

   ```bash
   docker compose up -d postgres neo4j
   ```

3. Install backend dependencies:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. Run migrations:

   ```bash
   alembic upgrade head
   ```

5. Seed demo data:

   ```bash
   cd ..
   python scripts/seed_demo.py --reset
   ```

6. Synchronize Neo4j graph data:

   ```bash
   python scripts/sync_graph.py --reset
   ```

7. Start the backend:

   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

8. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

9. Start the frontend:

   ```bash
   npm run dev
   ```

## Demo Credentials

Authentication is not implemented in Phase 1. It will be added in a later phase. No fake credentials are provided.

## API Documentation

FastAPI documentation is available when the backend is running:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Graph APIs

- `GET /api/graph/entities/{entity_id}`
- `GET /api/graph/entities/{entity_id}/neighbors`
- `GET /api/graph/cases/{case_id}`
- `GET /api/graph/path?source_id=P001&target_id=P023`
- `GET /api/graph/search?query=demo`
- `GET /api/graph/relationships/{relationship_id}/evidence`

## Analytics APIs

- `GET /api/analytics/centrality/degree`
- `GET /api/analytics/centrality/betweenness`
- `GET /api/analytics/centrality/pagerank`
- `GET /api/analytics/communities`
- `GET /api/analytics/networks/{case_id}`
- `GET /api/analytics/key-entities?case_id=C001`
- `GET /api/analytics/bridge-entities?case_id=C001`

Degree centrality measures direct connectivity. Betweenness centrality identifies entities that sit on paths between other entities. PageRank is used only as a structural graph-importance measure, not a criminality score. Community detection groups densely connected graph areas. Bridge detection identifies potential connectors across communities as investigative leads.

## Graph Model

Node labels: `Person`, `Organization`, `Phone`, `BankAccount`, `Vehicle`, `Location`, `Case`, `Document`.

Relationship types include `CALLS`, `COMMUNICATED_WITH`, `TRANSFERRED_TO`, `LINKED_TO_CASE`, `MENTIONED_IN`, and extension points for `KNOWS`, `ASSOCIATED_WITH`, `OWNS`, `USES`, `VISITED`, `LOCATED_AT`, `WORKS_FOR`, and `RELATED_TO`.

Relationship properties preserve provenance such as `source_id`, `communication_id`, `transaction_id`, `source_document_id`, `timestamp`, and `confidence`.

## Document Intelligence APIs

- `POST /api/documents/upload`
- `POST /api/documents/{document_id}/process`
- `GET /api/documents/{document_id}`
- `GET /api/documents/{document_id}/status`
- `GET /api/documents/{document_id}/extractions`
- `POST /api/documents/extractions/{extraction_id}/review`
- `POST /api/documents/relationships/{relationship_id}/review`
- `GET /api/entities/matches`
- `POST /api/entities/matches/{match_id}/review`

Supported uploads: PDF, TXT, CSV, JSON. PDF text extraction supports text-based PDFs. Scanned PDFs return a graceful OCR-unavailable message until an OCR provider is configured.

The frontend document page is available at `http://localhost:5173/documents`. Document details are available at `/documents/{id}` after upload and processing.

## Synthetic Demo Dataset

The deterministic generator creates:

- 12 cases
- 75 persons
- 25 phone numbers
- 20 bank accounts
- 25 locations
- 18 vehicles
- 220 communications
- 150 transactions
- 30 documents
- 60 evidence records
- 2 alerts

The polished demo case is `VEIL-2026-001`, titled `Project Eclipse`.

## Testing

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run test
npm run build
```

The frontend graph integration page is available at `http://localhost:5173/dev/graph`.

## Behavioral Intelligence

Phase 4 identifies unusual observed patterns for investigator review. It does not predict guilt, criminality, or future behavior. The ML layer uses a fixed-seed Isolation Forest for transaction patterns; communication and temporal signals use observed daily baselines; geographic deviation uses Haversine distance. Results are stored in `analytics_results` with model name, version, and generated time.

Investigation Priority is a transparent, reweighted blend of available signals: transaction 30%, communication 20%, temporal 20%, geographic 15%, and network structural importance 15%. These are engineering/demo weights, not validated risk probabilities. Missing observations lower data sufficiency; they are never treated as suspicious.

Run `POST /api/analytics/recalculate` with `{ "case_id": 1 }`, then use `/api/alerts` and the frontend Alert Center at `http://localhost:5173/alerts`. Alerts can be reviewed or dismissed and are deduplicated by entity, signal type, and analysis window.

## Unified Investigation Interface

Phase 5 provides a coherent investigation workspace with a responsive dark shell, case context, debounced global search, API-driven dashboard, case overview, Cytoscape network explorer, entity profiles, evidence and document explorers, chronological timeline, Leaflet map, and explainable Alert Center.

Primary routes are `/dashboard`, `/cases`, `/cases/:caseId`, `/network`, `/entities`, `/entities/:entityId`, `/evidence`, `/documents`, `/documents/:documentId`, `/alerts`, `/timeline`, and `/map`.

The Network Explorer supports pan, zoom, fit, layout reset, node and edge selection, entity/relationship filters, 1-3 hop neighbor expansion, communities, bridge entities, shortest-path highlighting, and relationship provenance. Requests remain bounded to 500 nodes. Cytoscape and Leaflet are route-level lazy chunks.

Timeline and map records come from `/api/workspace/timeline` and `/api/workspace/locations`. They represent observed source activity and do not infer intent. All dashboard metrics and displayed intelligence originate from backend APIs.
