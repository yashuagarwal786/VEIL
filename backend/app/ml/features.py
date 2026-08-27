from __future__ import annotations

from statistics import median, pstdev
from typing import Any, Iterable


def build_transaction_features(transactions: Iterable[Any]) -> list[dict[str, Any]]:
    rows = sorted(transactions, key=lambda item: item.timestamp)
    history: dict[int, list[float]] = {}; counterparties: dict[int, set[int]] = {}; output = []
    for item in rows:
        amounts = history.setdefault(item.sender_entity_id, []); known = counterparties.setdefault(item.sender_entity_id, set())
        prior_median = median(amounts) if amounts else 0.0; amount = float(item.amount); spread = pstdev(amounts) if len(amounts) > 1 else 0.0
        output.append({"transaction_id": item.id, "entity_id": item.sender_entity_id, "counterparty_id": item.receiver_entity_id, "amount": amount, "sender_frequency": len(amounts), "amount_zscore": (amount - sum(amounts) / len(amounts)) / spread if spread else 0.0, "amount_deviation": amount / prior_median if prior_median else 1.0, "new_counterparty": int(item.receiver_entity_id not in known), "transaction_hour": item.timestamp.hour, "timestamp": item.timestamp.isoformat()})
        amounts.append(amount); known.add(item.receiver_entity_id)
    return output
