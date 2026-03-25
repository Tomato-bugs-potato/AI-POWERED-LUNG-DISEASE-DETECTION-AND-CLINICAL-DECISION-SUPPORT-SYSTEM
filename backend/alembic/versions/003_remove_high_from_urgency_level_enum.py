"""Remove High from urgency_level enum

Revision ID: 003
Revises: 002
Create Date: 2026-04-05

Requirements align: UrgencyLevel only has Critical and Non_Critical (FR-17).
'High' was an extra value that does not match the spec.
"""

from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL does not support removing enum values directly.
    # Strategy: rename old type, create new type, alter columns, drop old type.

    # Step 1: Rename existing enum type
    op.execute("ALTER TYPE urgencylevel RENAME TO urgencylevel_old")

    # Step 2: Create the new enum type (without 'High')
    op.execute("CREATE TYPE urgencylevel AS ENUM ('Critical', 'Non_Critical')")

    # Step 3: Update any existing rows that have 'High' to 'Critical' before altering
    op.execute("""
        UPDATE diagnoses
        SET urgency_level = 'Critical'
        WHERE urgency_level::text = 'High'
    """)

    # Step 4: Alter the diagnoses table column to use the new type
    op.execute("""
        ALTER TABLE diagnoses
        ALTER COLUMN urgency_level TYPE urgencylevel
        USING urgency_level::text::urgencylevel
    """)

    # Step 5: Drop the old enum type
    op.execute("DROP TYPE urgencylevel_old")


def downgrade() -> None:
    # Restore 'High' value to the enum
    op.execute("ALTER TYPE urgencylevel RENAME TO urgencylevel_old")
    op.execute("CREATE TYPE urgencylevel AS ENUM ('Critical', 'Non_Critical', 'High')")
    op.execute("""
        ALTER TABLE diagnoses
        ALTER COLUMN urgency_level TYPE urgencylevel
        USING urgency_level::text::urgencylevel
    """)
    op.execute("DROP TYPE urgencylevel_old")
