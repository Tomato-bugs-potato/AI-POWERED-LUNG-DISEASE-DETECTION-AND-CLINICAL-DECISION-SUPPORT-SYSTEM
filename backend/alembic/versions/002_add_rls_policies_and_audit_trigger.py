"""Add Row-Level Security on Diagnoses table and insert-only trigger on Audit_Logs.

FR-19: Admin CANNOT access diagnosis data — enforced at PostgreSQL level.
NFR-13: Audit logs are immutable — insert-only trigger prevents UPDATE/DELETE.

Revision ID: 002
"""
from alembic import op

revision = "002"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # -----------------------------------------------------------------------
    # FR-19: Row-Level Security on Diagnoses table
    # -----------------------------------------------------------------------
    op.execute("ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE diagnoses FORCE ROW LEVEL SECURITY;")

    # Policy: Block Admin role from reading diagnosis data
    op.execute("""
        CREATE POLICY diagnoses_no_admin_read ON diagnoses
            FOR SELECT
            USING (current_setting('app.current_user_role', true) IS DISTINCT FROM 'Admin');
    """)

    # Policy: Only Doctor role can insert diagnoses
    op.execute("""
        CREATE POLICY diagnoses_doctor_insert ON diagnoses
            FOR INSERT
            WITH CHECK (current_setting('app.current_user_role', true) = 'Doctor');
    """)

    # Policy: Only Doctor role can update diagnoses
    op.execute("""
        CREATE POLICY diagnoses_doctor_update ON diagnoses
            FOR UPDATE
            USING (current_setting('app.current_user_role', true) = 'Doctor');
    """)

    # -----------------------------------------------------------------------
    # NFR-13: Insert-only trigger on Audit_Logs
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are prohibited.';
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        CREATE TRIGGER audit_logs_immutable
            BEFORE UPDATE OR DELETE ON audit_logs
            FOR EACH ROW
            EXECUTE FUNCTION prevent_audit_log_modification();
    """)

    # -----------------------------------------------------------------------
    # Indexes: B-tree on FK columns, GIN on JSONB columns
    # -----------------------------------------------------------------------
    # B-tree indexes on frequently queried FK columns
    op.execute("CREATE INDEX IF NOT EXISTS idx_cases_patient_id ON cases (patient_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_cases_upload_tech_id ON cases (upload_tech_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_images_case_id ON images (case_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_inference_results_image_id ON inference_results (image_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_radiologist_reviews_case_id ON radiologist_reviews (case_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_diagnoses_case_id ON diagnoses (case_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports (case_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);")

    # GIN indexes on JSONB columns
    op.execute("CREATE INDEX IF NOT EXISTS idx_images_metadata_gin ON images USING GIN (metadata_json);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_inference_predictions_gin ON inference_results USING GIN (predictions);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_reviews_annotations_gin ON radiologist_reviews USING GIN (annotations);")


def downgrade():
    # Remove indexes
    op.execute("DROP INDEX IF EXISTS idx_reviews_annotations_gin;")
    op.execute("DROP INDEX IF EXISTS idx_inference_predictions_gin;")
    op.execute("DROP INDEX IF EXISTS idx_images_metadata_gin;")
    op.execute("DROP INDEX IF EXISTS idx_sessions_expires_at;")
    op.execute("DROP INDEX IF EXISTS idx_sessions_user_id;")
    op.execute("DROP INDEX IF EXISTS idx_audit_logs_timestamp;")
    op.execute("DROP INDEX IF EXISTS idx_audit_logs_user_id;")
    op.execute("DROP INDEX IF EXISTS idx_reports_case_id;")
    op.execute("DROP INDEX IF EXISTS idx_diagnoses_case_id;")
    op.execute("DROP INDEX IF EXISTS idx_radiologist_reviews_case_id;")
    op.execute("DROP INDEX IF EXISTS idx_inference_results_image_id;")
    op.execute("DROP INDEX IF EXISTS idx_images_case_id;")
    op.execute("DROP INDEX IF EXISTS idx_cases_upload_tech_id;")
    op.execute("DROP INDEX IF EXISTS idx_cases_patient_id;")

    # Remove audit trigger
    op.execute("DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;")
    op.execute("DROP FUNCTION IF EXISTS prevent_audit_log_modification();")

    # Remove RLS
    op.execute("DROP POLICY IF EXISTS diagnoses_doctor_update ON diagnoses;")
    op.execute("DROP POLICY IF EXISTS diagnoses_doctor_insert ON diagnoses;")
    op.execute("DROP POLICY IF EXISTS diagnoses_no_admin_read ON diagnoses;")
    op.execute("ALTER TABLE diagnoses DISABLE ROW LEVEL SECURITY;")
