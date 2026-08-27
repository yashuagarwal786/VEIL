from __future__ import annotations

from collections import defaultdict

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.ml.communication_anomaly import score_communications
from app.ml.entity_scoring import priority_score
from app.ml.explanations import communication_reasons, priority_reasons, transaction_reasons
from app.ml.features import build_transaction_features
from app.ml.geographic import geographic_signals
from app.ml.temporal import temporal_signals
from app.ml.thresholds import MODEL_VERSION, severity_for
from app.ml.transaction_anomaly import score_transactions
from app.models.alert import Alert
from app.models.analytics_result import AnalyticsResult
from app.models.communication import Communication
from app.models.entity import CaseEntity
from app.models.location import Location
from app.models.transaction import Transaction


class BehavioralAnalyticsService:
    def __init__(self, session: Session): self.session = session

    def recalculate(self, case_id: int) -> dict:
        entities = set(self.session.scalars(select(CaseEntity.entity_id).where(CaseEntity.case_id == case_id, CaseEntity.entity_type == "person")).all())
        transactions = self.session.scalars(select(Transaction).where(Transaction.sender_entity_id.in_(entities)).order_by(Transaction.timestamp)).all()
        communications = self.session.scalars(select(Communication).where(Communication.caller_entity_id.in_(entities)).order_by(Communication.timestamp)).all()
        locations = {item.id: item for item in self.session.scalars(select(Location)).all()}
        transaction_rows = score_transactions(build_transaction_features(transactions)); communication_rows = score_communications(communications)
        temporal_rows = temporal_signals(transactions, communications); geographic_rows = geographic_signals(transactions, locations)
        self.session.execute(delete(AnalyticsResult).where(AnalyticsResult.case_id == case_id))
        signals: list[tuple[str, dict, list[str], str]] = []
        for row in transaction_rows:
            if row["anomaly_label"] == "ANOMALOUS": signals.append(("TRANSACTION_ANOMALY", row, transaction_reasons(row), "isolation_forest_transaction"))
        for row in communication_rows:
            if row["anomaly_label"] == "COMMUNICATION_SPIKE": signals.append(("COMMUNICATION_ANOMALY", row, communication_reasons(row), "communication_daily_deviation"))
        for row in temporal_rows: signals.append(("TEMPORAL_ANOMALY", row, [f"Observed {row['observed_events']} events on {row['date']} versus a daily baseline of {row['baseline_events']}."], "temporal_daily_deviation"))
        for row in geographic_rows: signals.append(("GEOGRAPHIC_DEVIATION", row, [f"Observed activity at {row['location']}, {row['distance_km']} km from the observed activity center."], "haversine_geographic_deviation"))
        entity_components: dict[int, dict[str, float]] = defaultdict(dict)
        mapping = {"TRANSACTION_ANOMALY": "transaction", "COMMUNICATION_ANOMALY": "communication", "TEMPORAL_ANOMALY": "temporal", "GEOGRAPHIC_DEVIATION": "geographic"}
        for kind, row, reasons, model in signals:
            score = float(row["anomaly_score"])
            entity_components[row["entity_id"]][mapping[kind]] = max(entity_components[row["entity_id"]].get(mapping[kind], 0), score)
            self._store(case_id, row["entity_id"], kind, score, {**row, "reasons": reasons, "data_sources": self._sources(row)}, model)
            self._upsert_alert(case_id, row["entity_id"], kind, score, reasons, row)
        communication_degree: dict[int, int] = defaultdict(int)
        for row in communications: communication_degree[row.caller_entity_id] += 1; communication_degree[row.receiver_entity_id] += 1
        maximum = max(communication_degree.values(), default=0)
        for entity_id in entities:
            if maximum: entity_components[entity_id]["network"] = round(100 * communication_degree[entity_id] / maximum, 2)
            profile = priority_score(entity_components[entity_id])
            reasons = priority_reasons(profile["components"])
            self._store(case_id, entity_id, "INVESTIGATION_PRIORITY", profile["score"], {**profile, "explanations": reasons}, "transparent_weighted_priority")
            if profile["score"] >= 70: self._upsert_alert(case_id, entity_id, "HIGH_INVESTIGATION_PRIORITY", profile["score"], reasons or ["Multiple available analytical signals indicate this entity merits review."], profile)
        self.session.commit()
        return {"case_id": case_id, "transactions_analyzed": len(transactions), "communication_events_analyzed": len(communications), "signals": len(signals), "alerts_generated": len([s for s in signals if s[1]["anomaly_score"] >= 45]), "high_priority_entities": sum(1 for values in entity_components.values() if priority_score(values)["score"] >= 70)}

    def _store(self, case_id: int, entity_id: int, kind: str, score: float, result: dict, model: str) -> None:
        self.session.add(AnalyticsResult(case_id=case_id, entity_id=entity_id, analysis_type=kind, score=score, result=result, model_name=model, model_version=MODEL_VERSION))

    def _upsert_alert(self, case_id: int, entity_id: int, alert_type: str, score: float, reasons: list[str], result: dict) -> None:
        window = result.get("date") or "case"
        existing = self.session.scalar(select(Alert).where(Alert.case_id == case_id, Alert.entity_id == entity_id, Alert.alert_type == alert_type, Alert.metadata_["window"].as_string() == window))
        metadata = {"window": window, "reasons": reasons, "supporting_metrics": result, "data_sources": self._sources(result), "analytical_signal": True}
        if existing:
            existing.score, existing.severity, existing.explanation, existing.metadata_ = score, severity_for(score), reasons[0], metadata
        else:
            self.session.add(Alert(case_id=case_id, entity_id=entity_id, alert_type=alert_type, severity=severity_for(score), score=score, explanation=reasons[0], metadata_=metadata))

    @staticmethod
    def _sources(row: dict) -> list[str]:
        return [f"TX{row['transaction_id']}" ] if row.get("transaction_id") else [f"COM{item}" for item in row.get("communication_ids", [])]
