-- =============================================================================
-- Migration: 002_demo_utilities.sql
-- Description: Demo reset stored procedures and diagnostic helper functions
-- Ticket: DEVOPS-05
-- =============================================================================

-- =============================================================================
-- Function: reset_demo(p_owner_id TEXT)
-- Resets all autonomous agent state, contact history, decision queue, sweep runs,
-- and invoice contact timestamps back to their pre-sweep demo state.
--
-- Usage:
--   1. From Supabase SQL Editor:
--      SELECT reset_demo();
--
--   2. From Terminal via PostgREST RPC:
--      curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/reset_demo" \
--        -H "apikey: <service-role-key>" \
--        -H "Authorization: Bearer <service-role-key>" \
--        -H "Content-Type: application/json" \
--        -d '{"p_owner_id": "demo_owner"}'
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_demo(p_owner_id TEXT DEFAULT 'demo_owner')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoices_reset INT;
  v_contacts_deleted INT;
  v_decisions_deleted INT;
  v_sweeps_deleted INT;
  v_audit_deleted INT;
BEGIN
  -- 1. Reset invoice contact state and restore default status
  UPDATE invoices
  SET
    last_contact_at = NULL,
    contact_count = 0,
    status = CASE
      WHEN status IN ('PAID', 'CLOSED') THEN status
      ELSE 'OVERDUE'
    END,
    updated_at = NOW()
  WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_invoices_reset = ROW_COUNT;

  -- 2. Purge contact history
  DELETE FROM contact_history
  WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_contacts_deleted = ROW_COUNT;

  -- 3. Purge decision queue
  DELETE FROM decision_queue
  WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_decisions_deleted = ROW_COUNT;

  -- 4. Purge sweep execution history
  DELETE FROM sweep_runs
  WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_sweeps_deleted = ROW_COUNT;

  -- 5. Purge previous audit logs
  DELETE FROM audit_log
  WHERE owner_id = p_owner_id;
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  -- 6. Record immutable reset audit event
  INSERT INTO audit_log (
    sweep_id,
    invoice_id,
    owner_id,
    action,
    status,
    metadata,
    created_at
  ) VALUES (
    'demo_reset_' || to_char(NOW(), 'YYYYMMDD_HH24MISS'),
    NULL,
    p_owner_id,
    'DEMO_ENVIRONMENT_RESET',
    'SUCCESS',
    jsonb_build_object(
      'invoices_reset', v_invoices_reset,
      'contacts_deleted', v_contacts_deleted,
      'decisions_deleted', v_decisions_deleted,
      'sweeps_deleted', v_sweeps_deleted,
      'previous_audit_logs_deleted', v_audit_deleted,
      'reset_timestamp', NOW()
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Demo environment successfully reset to pristine state',
    'owner_id', p_owner_id,
    'invoices_reset', v_invoices_reset,
    'contacts_deleted', v_contacts_deleted,
    'decisions_deleted', v_decisions_deleted,
    'sweeps_deleted', v_sweeps_deleted,
    'timestamp', NOW()
  );
END;
$$;

-- Grant execution permission for authenticated and service_role callers
GRANT EXECUTE ON FUNCTION reset_demo(TEXT) TO anon, authenticated, service_role;

-- =============================================================================
-- Function: get_demo_summary(p_owner_id TEXT)
-- Quick diagnostic inspector returning live counts across all tables
-- =============================================================================
CREATE OR REPLACE FUNCTION get_demo_summary(p_owner_id TEXT DEFAULT 'demo_owner')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_invoices INT;
  v_overdue_invoices INT;
  v_pending_decisions INT;
  v_total_contacts INT;
  v_total_sweeps INT;
  v_total_audit_logs INT;
  v_total_overdue_amount DECIMAL(10,2);
BEGIN
  SELECT COUNT(*), COALESCE(SUM(amount) FILTER (WHERE status = 'OVERDUE'), 0)
  INTO v_total_invoices, v_total_overdue_amount
  FROM invoices
  WHERE owner_id = p_owner_id;

  SELECT COUNT(*)
  INTO v_overdue_invoices
  FROM invoices
  WHERE owner_id = p_owner_id AND status = 'OVERDUE';

  SELECT COUNT(*)
  INTO v_pending_decisions
  FROM decision_queue
  WHERE owner_id = p_owner_id AND status = 'PENDING_APPROVAL';

  SELECT COUNT(*)
  INTO v_total_contacts
  FROM contact_history
  WHERE owner_id = p_owner_id;

  SELECT COUNT(*)
  INTO v_total_sweeps
  FROM sweep_runs
  WHERE owner_id = p_owner_id;

  SELECT COUNT(*)
  INTO v_total_audit_logs
  FROM audit_log
  WHERE owner_id = p_owner_id;

  RETURN jsonb_build_object(
    'owner_id', p_owner_id,
    'total_invoices', v_total_invoices,
    'overdue_invoices', v_overdue_invoices,
    'total_overdue_amount', v_total_overdue_amount,
    'pending_decisions', v_pending_decisions,
    'total_contacts_sent', v_total_contacts,
    'total_sweeps_run', v_total_sweeps,
    'total_audit_logs', v_total_audit_logs,
    'queried_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_demo_summary(TEXT) TO anon, authenticated, service_role;
