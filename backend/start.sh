#!/bin/sh
set -e

alembic upgrade head

python scripts/bootstrap_investigator.py

if [ "$SEED_DEMO_ON_STARTUP" = "true" ]; then
  python scripts/seed_demo.py --sync-graph
fi

uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
