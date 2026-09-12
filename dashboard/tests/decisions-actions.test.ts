import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApproveDecision, resetMockDecisions as resetApproveMocks } from '../../supabase/functions/decisions-approve/index';
import { handleRejectDecision, resetMockDecisions as resetRejectMocks } from '../../supabase/functions/decisions-reject/index';

describe('BACK-04: decisions-approve and decisions-reject Edge Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApproveMocks();
    resetRejectMocks();
  });

  describe('decisions-approve endpoint', () => {
    it('returns CORS headers for OPTIONS preflight request', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-approve/dec_a1b2c3', {
        method: 'OPTIONS',
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('returns 404 when decision ID is not found', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-approve/dec_non_existent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('DECISION_NOT_FOUND');
    });

    it('approves a pending decision using default AI draft and returns 200 with resend message ID', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions/dec_a1b2c3/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.decision_id).toBe('dec_a1b2c3');
      expect(json.resend_message_id).toBeDefined();
      expect(json.sent_at).toBeDefined();
    });

    it('approves a decision with custom edited subject and body containing invoice ID', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-approve/dec_c3d4e5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_subject: 'Urgent Payment Required for INV-007',
          edited_body: 'Dear Accounts Team, please settle INV-007 immediately ($7,200.00).',
        }),
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.decision_id).toBe('dec_c3d4e5');
    });

    it('returns 422 EMAIL_VALIDATION_FAILED when edited body omits the invoice ID', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-approve/dec_a1b2c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edited_subject: 'Payment notice',
          edited_body: 'Please send us your payment as soon as possible thank you.',
        }),
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error).toBe('EMAIL_VALIDATION_FAILED');
      expect(json.detail).toContain('invoice ID');
    });

    it('returns 409 DECISION_ALREADY_RESOLVED when decision is already approved or rejected', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-approve/dec_already_approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await handleApproveDecision(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('DECISION_ALREADY_RESOLVED');
      expect(json.current_status).toBe('APPROVED');
    });

    it('interacts with mock Supabase client and writes contact history and audit log', async () => {
      const mockDecision = {
        decision_id: 'dec_test_01',
        invoice_id: 'INV-005',
        tier: 'TIER_3',
        status: 'PENDING_APPROVAL',
        draft_subject: 'Notice for INV-005',
        draft_body: 'Body referencing INV-005',
        invoice: {
          client_name: 'DeltaWave Media',
          client_email: 'ap@deltawave.com',
          amount: 55000,
          days_overdue: 43,
          is_high_value: true,
        },
      };

      const updateDecisionMock = vi.fn().mockReturnValue({ error: null });
      const insertContactMock = vi.fn().mockReturnValue({ error: null });
      const updateInvoiceMock = vi.fn().mockReturnValue({ error: null });
      const insertAuditMock = vi.fn().mockReturnValue({ error: null });

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'decision_queue') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: mockDecision, error: null }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  updateDecisionMock(data, col, val);
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === 'contact_history') {
            return {
              insert: (data: any) => {
                insertContactMock(data);
                return Promise.resolve({ error: null });
              },
            };
          }
          if (table === 'invoices') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      invoice_id: 'INV-005',
                      contact_count: 1,
                      status: 'OVERDUE',
                      client: { email: 'billing@deltawave.com', name: 'DeltaWave Media' },
                    },
                    error: null,
                  }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  updateInvoiceMock(data, col, val);
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === 'audit_log') {
            return {
              insert: (data: any) => {
                insertAuditMock(data);
                return Promise.resolve({ error: null });
              },
            };
          }
          return {};
        },
      };

      const req = new Request('https://test.supabase.co/functions/v1/decisions/dec_test_01/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await handleApproveDecision(req, mockSupabase);
      expect(res.status).toBe(200);
      expect(updateDecisionMock).toHaveBeenCalled();
      expect(insertContactMock).toHaveBeenCalled();
      expect(insertAuditMock).toHaveBeenCalled();
    });
  });

  describe('decisions-reject endpoint', () => {
    it('returns CORS headers for OPTIONS preflight request', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-reject/dec_a1b2c3', {
        method: 'OPTIONS',
      });
      const res = await handleRejectDecision(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('returns 404 when decision ID is not found', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-reject/dec_non_existent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: 'Client called' }),
      });
      const res = await handleRejectDecision(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('DECISION_NOT_FOUND');
    });

    it('rejects a pending decision with a reason and returns 200', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions/dec_b2c3d4/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reject_reason: 'Client called — dispute resolved verbally. Invoice will be adjusted.',
        }),
      });
      const res = await handleRejectDecision(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.decision_id).toBe('dec_b2c3d4');
      expect(json.rejected_at).toBeDefined();
    });

    it('returns 409 DECISION_ALREADY_RESOLVED when decision is already resolved', async () => {
      const req = new Request('https://test.supabase.co/functions/v1/decisions-reject/dec_already_approved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: 'Duplicate check' }),
      });
      const res = await handleRejectDecision(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('DECISION_ALREADY_RESOLVED');
      expect(json.current_status).toBe('APPROVED');
    });

    it('interacts with mock Supabase client and writes audit log on rejection', async () => {
      const mockDecision = {
        decision_id: 'dec_test_02',
        invoice_id: 'INV-002',
        status: 'PENDING_APPROVAL',
      };

      const updateDecisionMock = vi.fn().mockReturnValue({ error: null });
      const insertAuditMock = vi.fn().mockReturnValue({ error: null });

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'decision_queue') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: mockDecision, error: null }),
                }),
              }),
              update: (data: any) => ({
                eq: (col: string, val: string) => {
                  updateDecisionMock(data, col, val);
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === 'audit_log') {
            return {
              insert: (data: any) => {
                insertAuditMock(data);
                return Promise.resolve({ error: null });
              },
            };
          }
          return {};
        },
      };

      const req = new Request('https://test.supabase.co/functions/v1/decisions-reject/dec_test_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: 'Payment confirmed in bank account' }),
      });

      const res = await handleRejectDecision(req, mockSupabase);
      expect(res.status).toBe(200);
      expect(updateDecisionMock).toHaveBeenCalled();
      expect(insertAuditMock).toHaveBeenCalled();
    });
  });
});
