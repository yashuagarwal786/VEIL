# VEIL Deployment

## Architecture

```text
Vercel
  -> React + Vite
      -> FastAPI API
          -> Managed PostgreSQL
          -> Hosted Neo4j
```

The frontend and API must use HTTPS. Only synthetic demo data may be seeded in public environments.

## Environment Variables

Backend:

```text
APP_ENV=production
DATABASE_URL=postgresql://...
FRONTEND_URL=https://your-vercel-domain.example
CORS_ORIGINS=https://your-vercel-domain.example
SECRET_KEY=<at least 32 random characters>
NEO4J_URI=neo4j+s://...
NEO4J_USER=...
NEO4J_PASSWORD=...
```

Frontend:

```text
VITE_API_BASE_URL=https://your-api-domain.example
```

Never commit these values. Production startup rejects a missing database URL, frontend URL, weak secret, or wildcard CORS origin.

## Frontend/API Contract

The deployed React app calls FastAPI through `VITE_API_BASE_URL`. Vite embeds this value during the frontend build, so changing it in Vercel requires a frontend redeploy. Leave off the trailing slash; the client normalizes it, but the canonical value should look like:

```text
VITE_API_BASE_URL=https://veil-api.example.com
```

The backend allows browser calls from `FRONTEND_URL` and `CORS_ORIGINS`. These values must match the frontend origin, not the API URL:

```text
FRONTEND_URL=https://veil.example.com
CORS_ORIGINS=https://veil.example.com
```

If `VITE_API_BASE_URL` is missing in production, the frontend falls back to relative `/api/...` requests. That only works when the host is configured to proxy `/api` to the FastAPI service; otherwise set `VITE_API_BASE_URL` explicitly.

## Backend

`backend/Dockerfile` starts the API with:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

`render.yaml` is a Render Blueprint for the API and PostgreSQL. In Render, create the Blueprint from the existing GitHub repository, provide the frontend and Neo4j variables, then deploy. Equivalent container-capable Python services are compatible. The container uses the repository root as its Docker context so the API, Alembic migrations, demo seed scripts, and synthetic data are available in the deployed image. It runs Alembic migrations before starting the API so an empty managed PostgreSQL database has the required tables before dashboard traffic arrives.

For manual maintenance, migrations can also be run from the backend directory:

```bash
alembic upgrade head
```

For the synthetic demo only:

```bash
python scripts/seed_demo.py
python scripts/sync_graph.py
```

Re-run `sync_graph.py` to confirm idempotent Neo4j `MERGE` behavior, then calculate Phase 4 snapshots through `POST /api/analytics/recalculate` with `{"case_id": 1}`.

## PostgreSQL

Provision PostgreSQL 16 or a compatible managed version. Set its connection string as `DATABASE_URL`. Run all Alembic migrations before seeding. Do not expose the database directly to browsers.

## Neo4j

Provision Neo4j 5 AuraDB or another compatible hosted instance. Use an encrypted `neo4j+s://` URI when provided. `scripts/sync_graph.py` creates constraints and synchronizes the canonical PostgreSQL projection.

## Vercel Frontend

Import the existing `yashuagarwal786/VEIL` repository into Vercel and set the project root to `frontend`. Set `VITE_API_BASE_URL` to the public FastAPI URL, then redeploy so Vite rebuilds with the correct endpoint. `frontend/vercel.json` provides the SPA fallback required for direct navigation to `/dashboard`, `/network`, `/entities/P001`, `/timeline`, and `/map`.

## Verification

Verify public endpoints:

```text
GET /api/health
GET /api/health/database
GET /api/health/neo4j
```

Then test the dashboard, case overview, synthetic document upload and processing, entity review, graph synchronization, Network Explorer, evidence navigation, alerts, timeline, map, and global search. Do not mark deployment complete until the public frontend and API pass these checks.

Run the deployment connection verifier after both services are live:

```bash
python scripts/verify_deployment.py --api-url https://your-api-domain.example --frontend-url https://your-vercel-domain.example
```

## Troubleshooting

- Database health fails: verify `DATABASE_URL`, network access, TLS requirements, and migrations.
- Neo4j health fails: verify URI scheme, credentials, allowlists, and hosted instance status.
- Browser calls localhost in production: set `VITE_API_BASE_URL` in Vercel and redeploy the frontend.
- Browser receives HTML instead of JSON from `/api/...`: set `VITE_API_BASE_URL` to the backend URL instead of relying on same-origin `/api` calls.
- Browser CORS errors: make `FRONTEND_URL` and `CORS_ORIGINS` match the Vercel origin, and make sure they do not point at the backend URL.
- Nested Vercel routes return 404: confirm the project root is `frontend` and `vercel.json` is deployed.
- Empty analytics: seed synthetic data and call the recalculation API.
