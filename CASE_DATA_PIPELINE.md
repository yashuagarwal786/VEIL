# VEIL Case Assignment and Data Pipeline

## Case Lifecycle

VEIL stores cases in PostgreSQL as the authoritative system of record. A case includes a reference, title, type, priority, status, creator, assigned investigator, assignment timestamp, jurisdiction, sensitivity, and timestamps.

Supported workflow statuses are represented in the model as `NEW`, `ASSIGNED`, `ACTIVE`, `ON_HOLD`, `CLOSED`, and `ARCHIVED`.

## Assignment Architecture

Investigators are persisted in the `investigators` table. The frontend login calls `/api/auth/login`; the backend validates the investigator account and returns a bearer token currently represented by the investigator id. Case access is enforced on backend workspace endpoints by resolving the token against PostgreSQL and checking the case assignment or administrative permissions.

Roles:

- `SENIOR_INVESTIGATOR`: assigned case access, intake, review, reports.
- `INVESTIGATOR`: assigned case access with narrower audit visibility.
- `ADMINISTRATOR`: case creation and reassignment.

## Supported Data Sources

Case data sources are implemented on top of the existing `documents` table so provenance remains connected to existing extraction, evidence, and graph code.

Stored source metadata includes filename, original filename, file type, data category, description, uploaded investigator, upload timestamp, processing status, processing timestamps, error message, checksum, storage reference, extraction counts, relationship counts, and review counts.

Supported upload extensions follow the existing document validator: PDF, TXT, CSV, JSON, and XLSX where the loader supports the file content.

## Ingestion Flow

The case workspace calls:

1. `POST /api/workspace/cases/{case_id}/sources`
2. Backend validates file type and size.
3. Backend stores the file through `LocalStorage`.
4. Backend creates the data source record.
5. Frontend calls `POST /api/workspace/sources/{source_id}/process`.
6. The existing `DocumentProcessingService` extracts text, entities, relationships, evidence, entity matches, and syncs Neo4j.
7. Behavioral analytics are recalculated after processing.
8. The workspace reloads source counts, activity, alerts, findings, graph, evidence, and timeline.

The current implementation uses a synchronous processing abstraction behind the process endpoint. It is intentionally isolated so it can be replaced by Celery, RQ, or a managed queue without changing the frontend API shape.

## Entity Extraction

VEIL reuses the existing rule-based NLP pipeline:

- `RuleBasedEntityExtractor`
- `EntityResolver`
- `RuleBasedRelationshipExtractor`
- `extract_text`

Each extraction stores document id, case id, entity type, raw text, normalized value, confidence, page number, offsets, source reference, source context, review status, resolved entity pointers, and metadata.

## Entity Resolution

Entity matches are stored in `entity_matches` and classified with the existing match types:

- `EXACT_MATCH`
- `HIGH_CONFIDENCE_MATCH`
- `POSSIBLE_MATCH`
- `NO_MATCH`

Uncertain matches remain reviewable. Accept/reject/defer decisions are persisted through the existing review endpoints and audit table.

## Graph Synchronization

PostgreSQL remains authoritative. `GraphSyncService` syncs persisted case data to Neo4j after document processing. Graph APIs continue to power network exploration, centrality, communities, bridge entities, path finding, and relationship evidence.

## Provenance

The provenance chain is:

`Case -> Data Source/Document -> Extraction or Relationship -> Evidence -> Graph Relationship`

Evidence records retain document id, source reference, content, confidence, and extractor metadata. Graph relationship evidence can be inspected from the network explorer.

## Authorization

Workspace case and source endpoints require an `Authorization: Bearer <token>` header. The backend resolves that token to an active investigator and checks case assignment or administrative permission.

Current hardened endpoints include assigned cases, case detail, dashboard with auth header, source upload, source processing, source status, source detail, case activity, and case findings.

Remaining hardening work: extend the same dependency to every older Phase 1-5 endpoint, including graph neighbors, analytics routes, alert updates, document detail, and global search.

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/investigators`
- `GET /api/auth/me/{investigator_id}`
- `GET /api/workspace/cases`
- `POST /api/workspace/cases`
- `GET /api/workspace/cases/{case_id}`
- `POST /api/workspace/cases/{case_id}/assign`
- `GET /api/workspace/cases/{case_id}/sources`
- `POST /api/workspace/cases/{case_id}/sources`
- `GET /api/workspace/sources/{source_id}`
- `POST /api/workspace/sources/{source_id}/process`
- `GET /api/workspace/sources/{source_id}/status`
- `GET /api/workspace/cases/{case_id}/activity`
- `GET /api/workspace/cases/{case_id}/findings`

## Demo Workflow

Seeded senior investigator:

```text
Email: yash.agarwal@synthetic.veil
Password: veil-demo-1042
```

Seeded admin:

```text
Email: admin@synthetic.veil
Password: veil-admin-0001
```

The seed includes `CASE-2026-0142` titled `Financial Network Investigation`, assigned to `INV-1042`, plus deterministic sources, people, communications, transactions, evidence, alerts, and graph-synchronizable relationships.

Run locally or in Render shell:

```bash
alembic upgrade head
python scripts/seed_demo.py --sync-graph
```

For a clean demo database only:

```bash
python scripts/seed_demo.py --reset --sync-graph
```

## Limitations

- Authentication uses DB-backed investigator accounts but not signed JWTs yet.
- Processing is exposed through a queue-shaped API but runs synchronously in the current process endpoint.
- Malware scanning is represented by validation/storage boundaries; no external scanner is integrated.
- CSV/JSON/XLSX configurable field mapping is not fully interactive yet.
- Case-level auth is implemented for the new assignment/intake workspace endpoints; older graph/analytics/document endpoints still need the same dependency applied everywhere.
