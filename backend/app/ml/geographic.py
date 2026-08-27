from __future__ import annotations

from math import asin, cos, radians, sin, sqrt


def haversine_km(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    d_lat, d_lon = radians(latitude_b - latitude_a), radians(longitude_b - longitude_a)
    value = sin(d_lat / 2) ** 2 + cos(radians(latitude_a)) * cos(radians(latitude_b)) * sin(d_lon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(value))


def geographic_signals(transactions: list, locations: dict[int, object]) -> list[dict]:
    grouped: dict[int, list] = {}
    for row in transactions:
        location_id = (row.metadata_ or {}).get("location_id")
        if location_id in locations: grouped.setdefault(row.sender_entity_id, []).append(locations[location_id])
    result = []
    for entity, observed in grouped.items():
        if len(observed) < 3: continue
        baseline, current = observed[:-1], observed[-1]; lat = sum(float(item.latitude) for item in baseline) / len(baseline); lon = sum(float(item.longitude) for item in baseline) / len(baseline)
        distance = haversine_km(lat, lon, float(current.latitude), float(current.longitude))
        if distance >= 25: result.append({"entity_id": entity, "location": current.name, "distance_km": round(distance, 1), "anomaly_score": min(100.0, round(distance, 2))})
    return result
