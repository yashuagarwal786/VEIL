"""initial schema

Revision ID: 202608270001
Revises:
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202608270001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    case_status = sa.Enum("ACTIVE", "CLOSED", "ARCHIVED", name="casestatus")
    processing_status = sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="processingstatus")
    alert_severity = sa.Enum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="alertseverity")
    alert_status = sa.Enum("OPEN", "REVIEWED", "DISMISSED", name="alertstatus")

    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", case_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("case_number"),
    )
    op.create_index("ix_cases_case_number", "cases", ["case_number"])

    op.create_table(
        "persons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_persons_name", "persons", ["name"])
    op.create_index("ix_persons_phone", "persons", ["phone"])

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("organization_type", sa.String(length=100), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"])

    op.create_table(
        "phones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=40), nullable=False),
        sa.Column("carrier", sa.String(length=100), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("number"),
    )
    op.create_index("ix_phones_number", "phones", ["number"])

    op.create_table(
        "bank_accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("account_number_masked", sa.String(length=40), nullable=False),
        sa.Column("bank_name", sa.String(length=255), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("account_number_masked"),
    )

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("registration_number", sa.String(length=80), nullable=False),
        sa.Column("vehicle_type", sa.String(length=100), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("registration_number"),
    )
    op.create_index("ix_vehicles_registration_number", "vehicles", ["registration_number"])

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_locations_name", "locations", ["name"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sender_entity_id", sa.Integer(), nullable=False),
        sa.Column("receiver_entity_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("transaction_type", sa.String(length=100), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_transactions_sender_entity_id", "transactions", ["sender_entity_id"])
    op.create_index("ix_transactions_receiver_entity_id", "transactions", ["receiver_entity_id"])
    op.create_index("ix_transactions_timestamp", "transactions", ["timestamp"])

    op.create_table(
        "communications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("caller_entity_id", sa.Integer(), nullable=False),
        sa.Column("receiver_entity_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("communication_type", sa.String(length=100), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_communications_caller_entity_id", "communications", ["caller_entity_id"])
    op.create_index("ix_communications_receiver_entity_id", "communications", ["receiver_entity_id"])
    op.create_index("ix_communications_timestamp", "communications", ["timestamp"])

    op.create_table(
        "case_entities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.UniqueConstraint("case_id", "entity_type", "entity_id", name="uq_case_entity"),
    )
    op.create_index("ix_case_entities_case_id", "case_entities", ["case_id"])
    op.create_index("ix_case_entities_entity_id", "case_entities", ["entity_id"])

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("document_type", sa.String(length=100), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("upload_timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("processing_status", processing_status, nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_documents_case_id", "documents", ["case_id"])

    op.create_table(
        "evidence",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("evidence_type", sa.String(length=100), nullable=False),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_evidence_confidence"),
    )
    op.create_index("ix_evidence_case_id", "evidence", ["case_id"])
    op.create_index("ix_evidence_document_id", "evidence", ["document_id"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("alert_type", sa.String(length=100), nullable=False),
        sa.Column("severity", alert_severity, nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("status", alert_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.CheckConstraint("score >= 0 AND score <= 1", name="ck_alert_score"),
    )
    op.create_index("ix_alerts_case_id", "alerts", ["case_id"])
    op.create_index("ix_alerts_entity_id", "alerts", ["entity_id"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("evidence")
    op.drop_table("documents")
    op.drop_table("case_entities")
    op.drop_table("communications")
    op.drop_table("transactions")
    op.drop_table("locations")
    op.drop_table("vehicles")
    op.drop_table("bank_accounts")
    op.drop_table("phones")
    op.drop_table("organizations")
    op.drop_table("persons")
    op.drop_table("cases")
    sa.Enum(name="alertstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="alertseverity").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="processingstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="casestatus").drop(op.get_bind(), checkfirst=True)
