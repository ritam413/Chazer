import { describe, it, expect, vi } from 'vitest';
import {
  handleApiRouter,
  computeEnrichedInvoice,
  calculateInvoicesSummary,
  MOCK_INVOICES,
  MOCK_DECISIONS,
  MOCK_AUDIT_LOG,
} from '../../supabase/functions/api-router/index';

describe('BACK-03: api-router Edge Function', () => {
  describe('1. Enrichment and Calculation Logic', () => {
    it('computes days_overdue and tier correctly for overdue invoice', () => {
      const baseInvoice = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'ap@acme.com',
        amount: 4800.0,
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE' as const,
        contact_count: 0,
        dispute_flag: false,
        last_contact_at: null,
        services_description: 'UX Design Sprint',
      };

      // Relative to reference date 2026-09-12 (28 days overdue)
      const enriched = computeEnrichedInvoice(baseInvoice, new Date('2026-09-12T00:00:00Z'));
      expect(enriched.days_overdue).toBe(28);
      expect(enriched.tier).toBe('TIER_3');
      expect(enriched.is_high_value).toBe(false);
    });

    it('flags high-value invoices with amount >= 10000', () => {
      const highValInvoice = {
        invoice_id: 'INV-005',
        client_id: 'CLI-004',
        client_name: 'DeltaWave Media',
        client_email: 'billing@deltawave.com',
        amount: 55000.0,
        currency: 'USD',
        due_date: '2026-07-31',
        status: 'OVERDUE' as const,
        contact_count: 1,
        dispute_flag: false,
        last_contact_at: '2026-08-15T09:04:22Z',
        services_description: 'IT Infrastructure Audit',
      };

      const enriched = computeEnrichedInvoice(highValInvoice, new Date('2026-09-12T00:00:00Z'));
      expect(enriched.is_high_value).toBe(true);
      expect(enriched.tier).toBe('TIER_3');
    });

    it('calculates summary totals and tier counts accurately', () => {
      const summary = calculateInvoicesSummary(MOCK_INVOICES, 3);
      expect(summary.total_overdue_amount).toBeGreaterThan(0);
      expect(summary.count_by_tier).toHaveProperty('TIER_1');
      expect(summary.count_by_tier).toHaveProperty('TIER_2');
      expect(summary.count_by_tier).toHaveProperty('TIER_3');
      expect(summary.pending_decisions).toBe(3);
    });
  });

  describe('2. Route Dispatching & CORS', () => {
    it('handles OPTIONS preflight request with 200 and CORS headers', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/invoices', {
        method: 'OPTIONS',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('returns 404 for unknown route', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/unknown-path', {
        method: 'GET',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('Route not found');
    });
  });

  describe('3. GET /invoices Endpoint', () => {
    it('returns all invoices with summary metadata', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/invoices', {
        method: 'GET',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('invoices');
      expect(data).toHaveProperty('summary');
      expect(Array.isArray(data.invoices)).toBe(true);
      expect(data.invoices.length).toBeGreaterThanOrEqual(8);

      const inv005 = data.invoices.find((i: any) => i.invoice_id === 'INV-005');
      expect(inv005).toBeDefined();
      expect(inv005.is_high_value).toBe(true);
      expect(inv005.client_name).toBe('DeltaWave Media');
    });

    it('filters invoices by status correctly', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/invoices?status=SENT', {
        method: 'GET',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoices.every((i: any) => i.status === 'SENT')).toBe(true);
    });

    it('filters invoices by tier correctly', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/invoices?tier=TIER_3', {
        method: 'GET',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoices.every((i: any) => i.tier === 'TIER_3')).toBe(true);
    });

    it('sorts invoices by amount in ascending and descending order', async () => {
      const reqAsc = new Request(
        'http://localhost/functions/v1/api-router/invoices?sort=amount&order=asc',
        { method: 'GET' }
      );
      const resAsc = await handleApiRouter(reqAsc);
      const dataAsc = await resAsc.json();
      expect(dataAsc.invoices[0].amount).toBeLessThanOrEqual(
        dataAsc.invoices[dataAsc.invoices.length - 1].amount
      );

      const reqDesc = new Request(
        'http://localhost/functions/v1/api-router/invoices?sort=amount&order=desc',
        { method: 'GET' }
      );
      const resDesc = await handleApiRouter(reqDesc);
      const dataDesc = await resDesc.json();
      expect(dataDesc.invoices[0].amount).toBeGreaterThanOrEqual(
        dataDesc.invoices[dataDesc.invoices.length - 1].amount
      );
    });
  });

  describe('4. GET /decisions Endpoint', () => {
    it('returns decisions array matching DecisionsResponse schema', async () => {
      const req = new Request('http://localhost/functions/v1/api-router/decisions', {
        method: 'GET',
      });
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('decisions');
      expect(data.decisions.length).toBeGreaterThan(0);

      const decision = data.decisions[0];
      expect(decision).toHaveProperty('decision_id');
      expect(decision).toHaveProperty('invoice_id');
      expect(decision).toHaveProperty('invoice');
      expect(decision.invoice).toHaveProperty('client_name');
      expect(decision.invoice).toHaveProperty('amount');
      expect(decision).toHaveProperty('draft_subject');
      expect(decision).toHaveProperty('draft_body');
    });

    it('filters decisions by status query param', async () => {
      const req = new Request(
        'http://localhost/functions/v1/api-router/decisions?status=PENDING_APPROVAL',
        { method: 'GET' }
      );
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(
        data.decisions.every((d: any) => d.status === 'PENDING_APPROVAL')
      ).toBe(true);
    });
  });

  describe('5. GET /audit-log Endpoint', () => {
    it('returns paginated entries with pagination metadata', async () => {
      const req = new Request(
        'http://localhost/functions/v1/api-router/audit-log?page=1&limit=2',
        { method: 'GET' }
      );
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('pagination');
      expect(data.entries).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.has_more).toBe(true);
    });

    it('filters audit logs by invoice_id and action', async () => {
      const req = new Request(
        'http://localhost/functions/v1/api-router/audit-log?invoice_id=INV-005',
        { method: 'GET' }
      );
      const res = await handleApiRouter(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.entries.every((e: any) => e.invoice_id === 'INV-005')).toBe(true);
    });
  });

  describe('6. Supabase Client Integration', () => {
    it('queries Supabase database when client is provided', async () => {
      const mockInvoiceData = [
        {
          invoice_id: 'INV-001',
          client_id: 'CLI-001',
          client_name: 'Acme Corp',
          client_email: 'ap@acme.com',
          amount: 4800.0,
          currency: 'USD',
          due_date: '2026-08-15',
          status: 'OVERDUE',
          contact_count: 0,
          dispute_flag: false,
          last_contact_at: null,
          services_description: 'UX Design Sprint',
          days_overdue: 28,
          tier: 'TIER_3',
        },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'v_invoices_enriched' || table === 'invoices') {
            const queryBuilder: any = {
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockInvoiceData, error: null }),
              then: (resolve: any) => resolve({ data: mockInvoiceData, error: null }),
            };
            return {
              select: vi.fn(() => queryBuilder),
            };
          }
          if (table === 'decision_queue') {
            const queryBuilder: any = {
              eq: vi.fn().mockResolvedValue({
                data: [{ count: 1 }],
                count: 1,
                error: null,
              }),
              then: (resolve: any) =>
                resolve({
                  data: [{ count: 1 }],
                  count: 1,
                  error: null,
                }),
            };
            return {
              select: vi.fn(() => queryBuilder),
            };
          }
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }),
      };

      const req = new Request('http://localhost/functions/v1/api-router/invoices', {
        method: 'GET',
      });
      const res = await handleApiRouter(req, {}, mockSupabase);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.invoices).toHaveLength(1);
      expect(data.invoices[0].invoice_id).toBe('INV-001');
    });
  });
});
