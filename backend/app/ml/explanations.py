def transaction_reasons(row: dict) -> list[str]:
    reasons = []
    if row.get("amount_deviation", 0) >= 5: reasons.append("Transaction amount is significantly above the observed historical baseline.")
    if row.get("new_counterparty"): reasons.append("Counterparty has not appeared in the entity's observed prior activity.")
    if row.get("transaction_hour", 12) < 5: reasons.append("Transaction occurred outside typical daytime activity hours.")
    return reasons or ["Transaction differs from the observed behavioral distribution."]


def communication_reasons(row: dict) -> list[str]:
    return [f"Observed {row['call_count']} communications on {row['date']} versus an average of {row['average_calls_per_day']} per active day."]


def priority_reasons(components: dict[str, float]) -> list[str]:
    labels = {"transaction": "unusual transaction activity", "communication": "communication spike", "temporal": "unusual temporal activity", "geographic": "geographic deviation", "network": "structural network importance"}
    return [f"Elevated {labels[key]}." for key, value in components.items() if value >= 60]
