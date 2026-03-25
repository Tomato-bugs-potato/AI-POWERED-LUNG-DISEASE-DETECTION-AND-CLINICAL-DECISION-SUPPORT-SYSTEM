"""Add symptoms column to patients table.

Revision ID: 004
Revises: 003
"""
from alembic import op
import sqlalchemy as sa

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("patients", sa.Column("symptoms", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("patients", "symptoms")
