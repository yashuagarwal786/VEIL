from __future__ import annotations

from collections import Counter


def temporal_signals(transactions: list, communications: list) -> list[dict]:
    counters: dict[int, Counter] = {}
    for row, entity in [(item, item.sender_entity_id) for item in transactions] + [(item, item.caller_entity_id) for item in communications]: counters.setdefault(entity, Counter())[row.timestamp.date().isoformat()] += 1
    result = []
    for entity, days in counters.items():
        if len(days) < 2: continue
        average = sum(days.values()) / len(days)
        for day, count in days.items():
            score = min(100.0, round(100 * max(0, count - average) / max(average, 1), 2))
            if score >= 50: result.append({"entity_id": entity, "date": day, "observed_events": count, "baseline_events": round(average, 2), "anomaly_score": score})
    return result
