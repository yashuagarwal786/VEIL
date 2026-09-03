"""add investigator accounts

Revision ID: 202609030001
Revises: 202608270003
"""
from alembic import op
import sqlalchemy as sa

revision = "202609030001"
down_revision = "202608270003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "investigators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("investigator_id", sa.String(length=30), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("role_label", sa.String(length=80), nullable=False),
        sa.Column("department", sa.String(length=160), nullable=False),
        sa.Column("clearance", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="ACTIVE"),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("can_view_all_cases", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("can_assign_cases", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("can_generate_reports", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("can_review_audit_trail", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_investigators_investigator_id", "investigators", ["investigator_id"], unique=True)
    op.create_index("ix_investigators_email", "investigators", ["email"], unique=True)
    op.create_index("ix_investigators_role", "investigators", ["role"])
    op.create_index("ix_investigators_status", "investigators", ["status"])


def downgrade() -> None:
    op.drop_table("investigators")
