-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Chazer Autonomous Accounts Receivable Agent
-- Tables: clients, invoices, contact_history, audit_log, decision_queue, sweep_runs
-- Views: v_invoices_enriched
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- =============================================================================
-- Table: clients
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  client_id       TEXT PRIMARY KEY,
  owner_id        TEXT NOT NULL DEFAULT 'demo_owner',
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_id);

-- =============================================================================
-- Table: invoices
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id           TEXT PRIMARY KEY,
  client_id            TEXT NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  owner_id             TEXT NOT NULL DEFAULT 'demo_owner',
  amount               DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'SENT'
                       CHECK (status IN ('DRAFT','SENT','OVERDUE','PAID','DISPUTED','FINAL_NOTICE_SENT','CLOSED')),
  services_description TEXT NOT NULL,
  contact_count        INT NOT NULL DEFAULT 0,
  dispute_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  last_contact_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_last_contact ON invoices(last_contact_at);

-- =============================================================================
-- Table: contact_history
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_history (
  contact_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      TEXT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  owner_id        TEXT NOT NULL DEFAULT 'demo_owner',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier            TEXT NOT NULL CHECK (tier IN ('TIER_1','TIER_2','TIER_3')),
  email_subject   TEXT NOT NULL,
  email_body      TEXT NOT NULL,
  resend_msg_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_contact_invoice ON contact_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_contact_sent_at ON contact_history(sent_at DESC);

-- =============================================================================
-- Table: audit_log (Immutable execution stream)
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sweep_id     TEXT,
  invoice_id   TEXT REFERENCES invoices(invoice_id) ON DELETE SET NULL,
  owner_id     TEXT NOT NULL DEFAULT 'demo_owner',
  action       TEXT NOT NULL,
  status       TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_invoice ON audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);

-- =============================================================================
-- Table: decision_queue
-- =============================================================================
CREATE TABLE IF NOT EXISTS decision_queue (
  decision_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       TEXT NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  owner_id         TEXT NOT NULL DEFAULT 'demo_owner',
  escalation_reason TEXT NOT NULL,
  draft_subject    TEXT NOT NULL,
  draft_body       TEXT NOT NULL,
  tier             TEXT NOT NULL,
  llm_confidence   DECIMAL(4,3),
  status           TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
                   CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED')),
  resolved_at      TIMESTAMPTZ,
  reject_reason    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dq_status ON decision_queue(status);
CREATE INDEX IF NOT EXISTS idx_dq_invoice ON decision_queue(invoice_id);

-- =============================================================================
-- Table: sweep_runs
-- =============================================================================
CREATE TABLE IF NOT EXISTS sweep_runs (
  sweep_id           TEXT PRIMARY KEY,
  owner_id           TEXT NOT NULL DEFAULT 'demo_owner',
  started_at         TIMESTAMPTZ NOT NULL,
  completed_at       TIMESTAMPTZ,
  invoices_processed INT DEFAULT 0,
  emails_sent        INT DEFAULT 0,
  escalated_count    INT DEFAULT 0,
  failed_count       INT DEFAULT 0,
  duration_ms        INT,
  status             TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETE','FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_sweep_runs_owner ON sweep_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_sweep_runs_started ON sweep_runs(started_at DESC);

-- =============================================================================
-- View: v_invoices_enriched
-- Dynamic calculation of days overdue and tiered classification
-- =============================================================================
CREATE OR REPLACE VIEW v_invoices_enriched AS
SELECT
  i.*,
  c.name AS client_name,
  c.email AS client_email,
  GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) AS days_overdue,
  CASE
    WHEN i.dispute_flag THEN 'TIER_3'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) BETWEEN 1 AND 7
         AND i.contact_count = 0 THEN 'TIER_1'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) BETWEEN 8 AND 21
         AND i.contact_count >= 1 THEN 'TIER_2'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) >= 22 THEN 'TIER_3'
    ELSE 'UNCLASSIFIED'
  END AS tier
FROM invoices i
JOIN clients c ON c.client_id = i.client_id;

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sweep_runs ENABLE ROW LEVEL SECURITY;

-- Demo policies for demo_owner access
CREATE POLICY "demo_owner_clients_read" ON clients FOR SELECT USING (owner_id = 'demo_owner');
CREATE POLICY "demo_owner_invoices_read" ON invoices FOR SELECT USING (owner_id = 'demo_owner');
CREATE POLICY "demo_owner_contact_read" ON contact_history FOR SELECT USING (owner_id = 'demo_owner');
CREATE POLICY "demo_owner_audit_read" ON audit_log FOR SELECT USING (owner_id = 'demo_owner');
CREATE POLICY "demo_owner_decisions_read" ON decision_queue FOR SELECT USING (owner_id = 'demo_owner');
CREATE POLICY "demo_owner_sweeps_read" ON sweep_runs FOR SELECT USING (owner_id = 'demo_owner');

-- =============================================================================
-- pg_cron Daily Autonomous Collection Sweep Schedule (BACK-05)
-- Runs daily at 09:00 UTC via pg_net HTTP POST to agent-sweep Edge Function
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Unschedule existing job if already present to ensure idempotency
    PERFORM cron.unschedule('daily-chazer-sweep')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'daily-chazer-sweep'
    );

    -- Register daily 09:00 UTC sweep schedule
    PERFORM cron.schedule(
      'daily-chazer-sweep',
      '0 9 * * *',
      $cron$
      SELECT net.http_post(
        url := COALESCE(
          NULLIF(current_setting('app.supabase_url', true), ''),
          'http://localhost:54321'
        ) || '/functions/v1/agent-sweep',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', COALESCE(NULLIF(current_setting('app.cron_secret', true), ''), 'ch-cron-secret-demo')
        ),
        body := jsonb_build_object(
          'owner_id', 'demo_owner',
          'high_value_threshold', 10000,
          'contact_window_hours', 72
        )
      );
      $cron$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron scheduling skipped during migration: %', SQLERRM;
END $$;

