# Synthetic Data

This directory is reserved for deterministic VEIL demo data.

Run:

```bash
python scripts/seed_demo.py --export-only
```

The command writes `demo_dataset.json` with synthetic cases, persons, phones, bank accounts, locations, vehicles, communications, transactions, documents, evidence, and alerts. The generator uses a fixed seed and does not include real personal information.
