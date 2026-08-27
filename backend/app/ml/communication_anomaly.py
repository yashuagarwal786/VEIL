from __future__ import annotations

from collections import defaultdict


def score_communications(rows: list) -> list[dict]:
    groups: dict[tuple[int, str], list] = defaultdict(list)
    for row in rows: groups[(row.caller_entity_id, row.timestamp.date().isoformat())].append(row)
    counts: dict[int, list[int]] = defaultdict(list)
    for (entity, _), values in groups.items(): counts[entity].append(len(values))
    result = []
    for (entity, day), values in groups.items():
        average = sum(counts[entity]) / len(counts[entity]); score = min(100.0, round(100 * max(0, len(values) - average) / max(average, 1), 2)) if len(counts[entity]) > 1 else None
        result.append({"entity_id": entity, "date": day, "communication_ids": [item.id for item in values], "call_count": len(values), "average_calls_per_day": round(average, 2), "anomaly_score": score, "anomaly_label": "COMMUNICATION_SPIKE" if score is not None and score >= 70 else "NORMAL"})
    return result
