"""Add avatar_url column to users table.

Revision ID: 005
Revises: 004
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_url")
