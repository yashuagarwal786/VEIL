"""add behavioral intelligence snapshots

Revision ID: 202608270003
Revises: 202608270002
"""
from alembic import op
import sqlalchemy as sa

revision = "202608270003"
down_revision = "202608270002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_alert_score", "alerts", type_="check")
    op.create_check_constraint("ck_alert_score", "alerts", "score >= 0 AND score <= 100")
    op.create_table("analytics_results", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("case_id", sa.Integer(), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=False), sa.Column("entity_id", sa.Integer(), nullable=True), sa.Column("analysis_type", sa.String(length=100), nullable=False), sa.Column("score", sa.Float(), nullable=True), sa.Column("result", sa.JSON(), nullable=False), sa.Column("model_name", sa.String(length=100), nullable=False), sa.Column("model_version", sa.String(length=30), nullable=False), sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    for name, columns in (("ix_analytics_results_case_id", ["case_id"]), ("ix_analytics_results_entity_id", ["entity_id"]), ("ix_analytics_results_analysis_type", ["analysis_type"]), ("ix_analytics_results_case_type", ["case_id", "analysis_type"]), ("ix_analytics_results_entity_type", ["entity_id", "analysis_type"])): op.create_index(name, "analytics_results", columns)


def downgrade() -> None:
    op.drop_table("analytics_results")
    op.drop_constraint("ck_alert_score", "alerts", type_="check")
    op.create_check_constraint("ck_alert_score", "alerts", "score >= 0 AND score <= 1")
