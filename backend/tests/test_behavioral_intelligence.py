from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.ml.entity_scoring import priority_score
from app.ml.explanations import transaction_reasons
from app.ml.geographic import haversine_km
from app.ml.features import build_transaction_features
from app.ml.transaction_anomaly import score_transactions


def transaction(identifier: int, amount: float) -> SimpleNamespace:
    return SimpleNamespace(id=identifier, sender_entity_id=14, receiver_entity_id=identifier + 100, amount=amount, timestamp=datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=identifier))


def test_isolation_forest_ranks_obvious_outlier_higher() -> None:
    rows = score_transactions(build_transaction_features([transaction(index, amount) for index, amount in enumerate([1000, 1200, 900, 1100, 1050, 500000], 1)]))
    assert rows[-1]["anomaly_score"] > max(row["anomaly_score"] for row in rows[:-1])
    assert rows[-1]["anomaly_label"] == "ANOMALOUS"


def test_priority_reweights_missing_components_without_suspicion() -> None:
    result = priority_score({"transaction": 80, "communication": None, "temporal": None, "geographic": None, "network": None})
    assert result["score"] == 80
    assert result["data_sufficiency"] == "LOW"


def test_deterministic_explanation_and_haversine_distance() -> None:
    assert "significantly above" in transaction_reasons({"amount_deviation": 6, "new_counterparty": 1, "transaction_hour": 2})[0]
    assert 170 < haversine_km(28.6139, 77.2090, 27.1767, 78.0081) < 190
