import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleAgentSweep,
  resetMockSweepState,
  getMockSweepState,
  classifyInvoiceTs,
  validateDraftTs,
} from '../../supabase/functions/agent-sweep/index';

describe('AGENT-05: agent-sweep Edge Function (Native TypeScript)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSweepState();
  });

  describe('CORS and Preflight', () => {
    it('returns CORS headers for OPTIONS preflight request', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/agent-sweep', {
        method: 'OPTIONS',
      });
      const res = await handleAgentSweep(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('returns health / status information on GET request', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/agent-sweep', {
        method: 'GET',
      });
      const res = await handleAgentSweep(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.service).toBe('chazer-agent-sweep');
      expect(json.status).toBe('ready');
    });
  });

  describe('Classification and Validation Unit Logic', () => {
    it('classifies dispute flag as TIER_3 with escalate=true and auto_send=false', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-100',
        amount: 500,
        days_overdue: 2,
        contact_count: 0,
        dispute_flag: true,
      });
      expect(result.tier).toBe('TIER_3');
      expect(result.escalate).toBe(true);
      expect(result.auto_send_eligible).toBe(false);
      expect(result.escalation_reason).toContain('dispute');
    });

    it('classifies high-value invoice >= threshold as escalate=true regardless of overdue days', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-101',
        amount: 25000,
        days_overdue: 4,
        contact_count: 0,
        dispute_flag: false,
        owner_high_value_threshold: 10000,
      });
      expect(result.tier).toBe('TIER_1');
      expect(result.escalate).toBe(true);
      expect(result.auto_send_eligible).toBe(false);
      expect(result.escalation_reason).toContain('High-Value');
    });

    it('classifies Tier 1 first contact (1-7 days, 0 contacts) as auto-send', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-102',
        amount: 1400,
        days_overdue: 7,
        contact_count: 0,
        dispute_flag: false,
      });
      expect(result.tier).toBe('TIER_1');
      expect(result.escalate).toBe(false);
      expect(result.auto_send_eligible).toBe(true);
    });

    it('classifies Tier 2 firm reminder (8-21 days, >=1 contacts) as auto-send', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-103',
        amount: 890,
        days_overdue: 15,
        contact_count: 1,
        dispute_flag: false,
      });
      expect(result.tier).toBe('TIER_2');
      expect(result.escalate).toBe(false);
      expect(result.auto_send_eligible).toBe(true);
    });

    it('classifies Tier 2 late start (8-21 days, 0 contacts) as Tier 1 first contact', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-104',
        amount: 3200,
        days_overdue: 11,
        contact_count: 0,
        dispute_flag: false,
      });
      expect(result.tier).toBe('TIER_1');
      expect(result.escalate).toBe(false);
      expect(result.auto_send_eligible).toBe(true);
      expect(result.escalation_reason).toContain('late start');
    });

    it('classifies Tier 3 final notice (>= 22 days) as escalate=true', () => {
      const result = classifyInvoiceTs({
        invoice_id: 'INV-105',
        amount: 4800,
        days_overdue: 28,
        contact_count: 1,
        dispute_flag: false,
      });
      expect(result.tier).toBe('TIER_3');
      expect(result.escalate).toBe(true);
      expect(result.auto_send_eligible).toBe(false);
    });

    it('validates draft rules accurately (invoice id, amount, due date, word count, no legal threats)', () => {
      const validBody = 'Hi Client, this is a reminder regarding invoice INV-001 for $4,800.00 due on 2026-08-15. Thank you!';
      expect(validateDraftTs(validBody, 'INV-001', 4800, '2026-08-15')).toBe(true);

      const missingId = 'Hi Client, this is a reminder for $4,800.00 due on 2026-08-15.';
      expect(validateDraftTs(missingId, 'INV-001', 4800, '2026-08-15')).toBe(false);

      const prohibitedThreat = 'Hi Client, regarding INV-001 for $4,800.00 due on 2026-08-15, we will sue in court.';
      expect(validateDraftTs(prohibitedThreat, 'INV-001', 4800, '2026-08-15')).toBe(false);
    });
  });

  describe('Full Sweep Execution Flow', () => {
    it('executes a full sweep across seeded invoices and produces identical classification and escalation metrics as Python agent', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/agent-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: 'demo_owner',
          high_value_threshold: 10000,
          contact_window_hours: 72,
        }),
      });

      const res = await handleAgentSweep(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('COMPLETED');
      expect(json.invoices_processed).toBe(8);
      expect(json.emails_sent).toBe(4);
      expect(json.escalated_count).toBe(4);
      expect(json.skipped_count).toBe(0);
      expect(json.failed_count).toBe(0);

      // Inspect mock database state
      const state = getMockSweepState();

      // Verify high-value ($55k INV-005, $12.5k INV-002) and Tier 3 (INV-001, INV-007) in decision queue
      expect(state.decisionQueue.length).toBe(4);
      const decInv5 = state.decisionQueue.find((d) => d.invoice_id === 'INV-005');
      expect(decInv5).toBeDefined();
      expect(decInv5?.is_high_value).toBe(true);
      expect(decInv5?.status).toBe('PENDING_APPROVAL');

      // Verify auto-sent invoices (INV-003, INV-004, INV-006, INV-008) created contact_history
      expect(state.contactHistory.length).toBe(4);
      const contactInv6 = state.contactHistory.find((c) => c.invoice_id === 'INV-006');
      expect(contactInv6).toBeDefined();
      expect(contactInv6?.tier).toBe('TIER_1');

      // Verify sweep_runs record
      expect(state.sweepRuns.length).toBe(1);
      expect(state.sweepRuns[0].status).toBe('COMPLETED');
      expect(state.sweepRuns[0].emails_sent).toBe(4);
      expect(state.sweepRuns[0].escalated_count).toBe(4);

      // Verify audit log has lifecycle events
      const actions = state.auditLog.map((a) => a.action);
      expect(actions).toContain('SWEEP_STARTED');
      expect(actions).toContain('SWEEP_COMPLETED');
      expect(actions).toContain('TIER1_EMAIL_SENT');
      expect(actions).toContain('TIER2_EMAIL_SENT');
      expect(actions).toContain('HIGH_VALUE_ESCALATED');
      expect(actions).toContain('TIER3_ESCALATED');
    });

    it('enforces idempotency: consecutive sweeps produce 0 new email sends', async () => {
      const makeReq = () =>
        new Request('https://test.supabase.co/functions/v1/agent-sweep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: 'demo_owner' }),
        });

      const firstRes = await handleAgentSweep(makeReq());
      const firstJson = await firstRes.json();
      expect(firstJson.emails_sent).toBe(4);

      // Second immediate sweep
      const secondRes = await handleAgentSweep(makeReq());
      const secondJson = await secondRes.json();
      expect(secondJson.emails_sent).toBe(0);
      expect(secondJson.skipped_count).toBe(4); // 4 previously sent invoices guarded
    });

    it('skips invoices within active contact window', async () => {
      const state = getMockSweepState();
      // Set INV-006 to contacted 2 hours ago
      const inv6 = state.invoices.find((i) => i.invoice_id === 'INV-006');
      if (inv6) {
        inv6.last_contact_at = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
        inv6.contact_count = 1;
      }

      const req = new Request('https://test.supabase.co/functions/v1/agent-sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: 'demo_owner' }),
      });

      const res = await handleAgentSweep(req);
      const json = await res.json();
      expect(json.invoices_processed).toBe(8);
      expect(json.skipped_count).toBe(1);
      expect(json.emails_sent).toBe(3); // only INV-003, INV-004, INV-008
    });
  });
});
