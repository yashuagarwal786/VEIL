"""document intelligence

Revision ID: 202608270002
Revises: 202608270001
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "202608270002"
down_revision: Union[str, None] = "202608270001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    extractionkind = sa.Enum("ENTITY", "RELATIONSHIP", name="extractionkind")
    extractionreviewstatus = sa.Enum("AUTO_ACCEPT", "REVIEW_REQUIRED", "REJECTED", name="extractionreviewstatus")
    matchstatus = sa.Enum("PENDING", "ACCEPTED", "REJECTED", "DEFERRED", name="matchstatus")
    matchtype = sa.Enum("EXACT_MATCH", "HIGH_CONFIDENCE_MATCH", "POSSIBLE_MATCH", "NO_MATCH", name="matchtype")

    op.add_column("documents", sa.Column("storage_path", sa.String(length=500), nullable=True))
    op.add_column("documents", sa.Column("mime_type", sa.String(length=150), nullable=True))
    op.add_column("documents", sa.Column("file_size_bytes", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("documents", sa.Column("processing_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("documents", sa.Column("error_message", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("extracted_text_length", sa.Integer(), nullable=True))

    op.create_table(
        "document_extractions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", extractionkind, nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("extracted_text", sa.String(length=500), nullable=False),
        sa.Column("normalized_value", sa.String(length=500), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("start_offset", sa.Integer(), nullable=True),
        sa.Column("end_offset", sa.Integer(), nullable=True),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("source_context", sa.Text(), nullable=True),
        sa.Column("review_status", extractionreviewstatus, nullable=False),
        sa.Column("resolved_entity_type", sa.String(length=80), nullable=True),
        sa.Column("resolved_entity_id", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_document_extractions_document_id", "document_extractions", ["document_id"])
    op.create_index("ix_document_extractions_case_id", "document_extractions", ["case_id"])
    op.create_index("ix_document_extractions_entity_type", "document_extractions", ["entity_type"])
    op.create_index("ix_document_extractions_normalized_value", "document_extractions", ["normalized_value"])
    op.create_index("ix_document_extractions_review_status", "document_extractions", ["review_status"])

    op.create_table(
        "extracted_relationships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("relationship_type", sa.String(length=100), nullable=False),
        sa.Column("source_text", sa.String(length=500), nullable=False),
        sa.Column("source_entity_text", sa.String(length=255), nullable=False),
        sa.Column("target_entity_text", sa.String(length=255), nullable=False),
        sa.Column("source_normalized", sa.String(length=255), nullable=False),
        sa.Column("target_normalized", sa.String(length=255), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("review_status", extractionreviewstatus, nullable=False),
        sa.Column("evidence_id", sa.Integer(), sa.ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True),
        sa.Column("graph_relationship_id", sa.String(length=120), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_extracted_relationships_document_id", "extracted_relationships", ["document_id"])
    op.create_index("ix_extracted_relationships_case_id", "extracted_relationships", ["case_id"])
    op.create_index("ix_extracted_relationships_relationship_type", "extracted_relationships", ["relationship_type"])
    op.create_index("ix_extracted_relationships_review_status", "extracted_relationships", ["review_status"])

    op.create_table(
        "entity_matches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("extraction_id", sa.Integer(), sa.ForeignKey("document_extractions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("candidate_entity_type", sa.String(length=80), nullable=False),
        sa.Column("candidate_entity_id", sa.Integer(), nullable=True),
        sa.Column("candidate_label", sa.String(length=255), nullable=True),
        sa.Column("match_type", matchtype, nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("signals", sa.JSON(), nullable=True),
        sa.Column("status", matchstatus, nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actor_type", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_entity_matches_extraction_id", "entity_matches", ["extraction_id"])
    op.create_index("ix_entity_matches_case_id", "entity_matches", ["case_id"])
    op.create_index("ix_entity_matches_candidate_entity_type", "entity_matches", ["candidate_entity_type"])
    op.create_index("ix_entity_matches_candidate_entity_id", "entity_matches", ["candidate_entity_id"])
    op.create_index("ix_entity_matches_match_type", "entity_matches", ["match_type"])
    op.create_index("ix_entity_matches_status", "entity_matches", ["status"])

    op.create_table(
        "review_audit",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("match_id", sa.Integer(), sa.ForeignKey("entity_matches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("extraction_id", sa.Integer(), sa.ForeignKey("document_extractions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("decision", sa.String(length=40), nullable=False),
        sa.Column("actor_type", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
    )
    op.create_index("ix_review_audit_match_id", "review_audit", ["match_id"])
    op.create_index("ix_review_audit_extraction_id", "review_audit", ["extraction_id"])


def downgrade() -> None:
    op.drop_table("review_audit")
    op.drop_table("entity_matches")
    op.drop_table("extracted_relationships")
    op.drop_table("document_extractions")
    for column in [
        "extracted_text_length",
        "error_message",
        "processing_completed_at",
        "processing_started_at",
        "file_size_bytes",
        "mime_type",
        "storage_path",
    ]:
        op.drop_column("documents", column)
    sa.Enum(name="matchtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="matchstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="extractionreviewstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="extractionkind").drop(op.get_bind(), checkfirst=True)
