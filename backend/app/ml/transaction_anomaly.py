from __future__ import annotations

from sklearn.ensemble import IsolationForest

from app.core.config import settings


def score_transactions(features: list[dict]) -> list[dict]:
    if len(features) < 4:
        return [{**row, "anomaly_score": None, "anomaly_label": "INSUFFICIENT_DATA"} for row in features]
    matrix = [[row["amount"], row["sender_frequency"], row["amount_deviation"], row["new_counterparty"], row["transaction_hour"]] for row in features]
    model = IsolationForest(contamination=settings.anomaly_contamination, n_estimators=settings.anomaly_estimators, random_state=settings.anomaly_random_state)
    raw = -model.fit(matrix).score_samples(matrix); low, high = min(raw), max(raw); labels = model.predict(matrix)
    scores = [50.0 if high == low else round(100 * (value - low) / (high - low), 2) for value in raw]
    return [{**row, "anomaly_score": score, "anomaly_label": "ANOMALOUS" if label == -1 or score >= 70 else "NORMAL"} for row, score, label in zip(features, scores, labels)]
