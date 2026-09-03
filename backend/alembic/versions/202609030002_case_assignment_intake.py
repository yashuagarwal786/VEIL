"""add case assignment and intake metadata

Revision ID: 202609030002
Revises: 202609030001
"""
from alembic import op
import sqlalchemy as sa

revision = "202609030002"
down_revision = "202609030001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for value in ("NEW", "ASSIGNED", "ON_HOLD"):
            op.execute(f"ALTER TYPE casestatus ADD VALUE IF NOT EXISTS '{value}'")
        for value in ("UPLOADED", "QUEUED", "PROCESSED", "PARTIALLY_PROCESSED", "REQUIRES_REVIEW"):
            op.execute(f"ALTER TYPE processingstatus ADD VALUE IF NOT EXISTS '{value}'")

    op.add_column("cases", sa.Column("case_type", sa.String(length=100), nullable=False, server_default="GENERAL"))
    op.add_column("cases", sa.Column("priority", sa.String(length=30), nullable=False, server_default="MEDIUM"))
    op.add_column("cases", sa.Column("created_by_investigator_id", sa.String(length=30), nullable=True))
    op.add_column("cases", sa.Column("assigned_investigator_id", sa.String(length=30), nullable=True))
    op.add_column("cases", sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("cases", sa.Column("jurisdiction", sa.String(length=120), nullable=True))
    op.add_column("cases", sa.Column("sensitivity", sa.String(length=80), nullable=False, server_default="INTERNAL"))
    op.create_index("ix_cases_priority", "cases", ["priority"])
    op.create_index("ix_cases_created_by_investigator_id", "cases", ["created_by_investigator_id"])
    op.create_index("ix_cases_assigned_investigator_id", "cases", ["assigned_investigator_id"])

    op.add_column("documents", sa.Column("original_filename", sa.String(length=255), nullable=True))
    op.add_column("documents", sa.Column("data_category", sa.String(length=100), nullable=False, server_default="OTHER"))
    op.add_column("documents", sa.Column("source_description", sa.Text(), nullable=True))
    op.add_column("documents", sa.Column("uploaded_by_investigator_id", sa.String(length=30), nullable=True))
    op.add_column("documents", sa.Column("checksum_sha256", sa.String(length=64), nullable=True))
    op.create_index("ix_documents_data_category", "documents", ["data_category"])
    op.create_index("ix_documents_uploaded_by_investigator_id", "documents", ["uploaded_by_investigator_id"])
    op.create_index("ix_documents_checksum_sha256", "documents", ["checksum_sha256"])


def downgrade() -> None:
    op.drop_column("documents", "checksum_sha256")
    op.drop_column("documents", "uploaded_by_investigator_id")
    op.drop_column("documents", "source_description")
    op.drop_column("documents", "data_category")
    op.drop_column("documents", "original_filename")
    op.drop_column("cases", "sensitivity")
    op.drop_column("cases", "jurisdiction")
    op.drop_column("cases", "assigned_at")
    op.drop_column("cases", "assigned_investigator_id")
    op.drop_column("cases", "created_by_investigator_id")
    op.drop_column("cases", "priority")
    op.drop_column("cases", "case_type")
