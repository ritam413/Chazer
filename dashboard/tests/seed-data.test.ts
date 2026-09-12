import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseCSV,
  validateRow,
  validateAndTransform,
  extractUniqueClients,
  transformToInvoiceRecord,
  handleSeedData,
  DEFAULT_SEED_CSV,
} from '../../supabase/functions/seed-data/index';

describe('BACK-02: seed-data Edge Function & CSV Pipeline', () => {
  const sampleCsv = `invoice_id,client_id,client_name,client_email,amount,currency,due_date,status,services_description
INV-001,CLI-001,Acme Corp,ap@acme.com,4800.00,USD,2026-08-15,OVERDUE,UX Design Sprint — August 2026
INV-002,CLI-002,Bluebell Studios,finance@bluebell.io,12500.00,USD,2026-08-01,OVERDUE,Brand Identity Package`;

  describe('1. CSV Parsing and Row Extraction', () => {
    it('parses structured CSV text into raw row objects correctly', () => {
      const rows = parseCSV(sampleCsv);
      expect(rows).toHaveLength(2);
      expect(rows[0].invoice_id).toBe('INV-001');
      expect(rows[0].client_name).toBe('Acme Corp');
      expect(rows[0].amount).toBe('4800.00');
      expect(rows[1].invoice_id).toBe('INV-002');
      expect(rows[1].client_email).toBe('finance@bluebell.io');
    });

    it('parses default seed CSV containing all 8 canonical invoices', () => {
      const rows = parseCSV(DEFAULT_SEED_CSV);
      expect(rows).toHaveLength(8);
      expect(rows.map((r) => r.invoice_id)).toEqual([
        'INV-001',
        'INV-002',
        'INV-003',
        'INV-004',
        'INV-005',
        'INV-006',
        'INV-007',
        'INV-008',
      ]);
    });
  });

  describe('2. Row Validation and Sanitization', () => {
    it('validates correct row successfully', () => {
      const row = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: ' Acme Corp ',
        client_email: 'AP@ACME.COM ',
        amount: '4800.00',
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE',
        services_description: 'UX Design Sprint',
      };
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedRow.client_name).toBe('Acme Corp');
      expect(result.sanitizedRow.client_email).toBe('ap@acme.com');
      expect(result.sanitizedRow.amount).toBe(4800.0);
    });

    it('rejects row with invalid invoice_id format', () => {
      const row = {
        invoice_id: 'BAD_ID_1',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'ap@acme.com',
        amount: '4800.00',
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE',
        services_description: 'UX Design Sprint',
      };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('invoice_id'))).toBe(true);
    });

    it('rejects row with invalid amount (negative or exceeding maximum)', () => {
      const rowNeg = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'ap@acme.com',
        amount: '-50.00',
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE',
        services_description: 'UX Design Sprint',
      };
      expect(validateRow(rowNeg).valid).toBe(false);

      const rowExceed = { ...rowNeg, amount: '1000000.00' };
      expect(validateRow(rowExceed).valid).toBe(false);
    });

    it('rejects row with malformed email', () => {
      const row = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'not-an-email',
        amount: '100.00',
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE',
        services_description: 'UX Design Sprint',
      };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('email'))).toBe(true);
    });

    it('rejects row with invalid status', () => {
      const row = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'ap@acme.com',
        amount: '100.00',
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'INVALID_STATUS',
        services_description: 'UX Design Sprint',
      };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('status'))).toBe(true);
    });

    it('isolates invalid rows without failing entire batch', () => {
      const mixedRows = [
        {
          invoice_id: 'INV-001',
          client_id: 'CLI-001',
          client_name: 'Acme Corp',
          client_email: 'ap@acme.com',
          amount: '4800.00',
          currency: 'USD',
          due_date: '2026-08-15',
          status: 'OVERDUE',
          services_description: 'Valid row 1',
        },
        {
          invoice_id: 'INV-BAD',
          client_id: 'CLI-002',
          client_name: 'Bad Corp',
          client_email: 'invalid-email',
          amount: '0',
          currency: 'USD',
          due_date: 'invalid-date',
          status: 'BAD',
          services_description: 'Invalid row',
        },
        {
          invoice_id: 'INV-003',
          client_id: 'CLI-003',
          client_name: 'Cascade Tech',
          client_email: 'sarah.l@cascade.com',
          amount: '890.00',
          currency: 'USD',
          due_date: '2026-08-28',
          status: 'OVERDUE',
          services_description: 'Valid row 2',
        },
      ];

      const { valid, invalid } = validateAndTransform(mixedRows);
      expect(valid).toHaveLength(2);
      expect(invalid).toHaveLength(1);
      expect(invalid[0].errors.length).toBeGreaterThan(0);
      expect(valid[0].invoice_id).toBe('INV-001');
      expect(valid[1].invoice_id).toBe('INV-003');
    });
  });

  describe('3. Transformation and Client De-duplication', () => {
    it('extracts unique clients deduplicating by client_id', () => {
      const rows = parseCSV(DEFAULT_SEED_CSV);
      const { valid } = validateAndTransform(rows);
      const clients = extractUniqueClients(valid);

      // Default CSV has 6 unique clients for 8 invoices (CLI-001 and CLI-002 appear twice)
      expect(clients).toHaveLength(6);
      const clientIds = clients.map((c) => c.client_id);
      expect(new Set(clientIds).size).toBe(6);
      expect(clientIds).toContain('CLI-001');
      expect(clientIds).toContain('CLI-006');
    });

    it('transforms valid row to canonical invoice record with default fields', () => {
      const row = {
        invoice_id: 'INV-001',
        client_id: 'CLI-001',
        client_name: 'Acme Corp',
        client_email: 'ap@acme.com',
        amount: 4800.0,
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'OVERDUE' as const,
        services_description: 'UX Design Sprint',
      };
      const record = transformToInvoiceRecord(row);
      expect(record.invoice_id).toBe('INV-001');
      expect(record.client_id).toBe('CLI-001');
      expect(record.owner_id).toBe('demo_owner');
      expect(record.amount).toBe(4800.0);
      expect(record.contact_count).toBe(0);
      expect(record.dispute_flag).toBe(false);
      expect(record.last_contact_at).toBeNull();
    });
  });

  describe('4. handleSeedData Request & Auth Guard', () => {
    const mockEnv = {
      SEED_SECRET: 'test-secret-123',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    };

    it('returns 401 Unauthorized when x-seed-secret is missing or incorrect', async () => {
      const reqNoSecret = new Request('http://localhost/functions/v1/seed-data', {
        method: 'POST',
      });
      const res1 = await handleSeedData(reqNoSecret, mockEnv);
      expect(res1.status).toBe(401);

      const reqBadSecret = new Request('http://localhost/functions/v1/seed-data', {
        method: 'POST',
        headers: { 'x-seed-secret': 'wrong-secret' },
      });
      const res2 = await handleSeedData(reqBadSecret, mockEnv);
      expect(res2.status).toBe(401);
    });

    it('handles CORS OPTIONS preflight request with 200/204 and CORS headers', async () => {
      const optionsReq = new Request('http://localhost/functions/v1/seed-data', {
        method: 'OPTIONS',
      });
      const res = await handleSeedData(optionsReq, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('seeds successfully with valid secret and returns standard SeedDataResponse payload', async () => {
      const mockSupabaseClient = {
        from: vi.fn((table: string) => ({
          upsert: vi.fn(async () => ({ data: null, error: null })),
        })),
        storage: {
          from: vi.fn(() => ({
            download: vi.fn(async () => ({
              data: { text: async () => DEFAULT_SEED_CSV },
              error: null,
            })),
          })),
        },
      };

      const req = new Request('http://localhost/functions/v1/seed-data', {
        method: 'POST',
        headers: { 'x-seed-secret': 'test-secret-123' },
      });

      const res = await handleSeedData(req, mockEnv, mockSupabaseClient);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.seeded).toBe(8);
      expect(body.skipped).toBe(0);
      expect(body.invalid).toBe(0);
      expect(body.invalid_rows).toEqual([]);
    });

    it('supports custom CSV text in request body when provided', async () => {
      const mockSupabaseClient = {
        from: vi.fn((table: string) => ({
          upsert: vi.fn(async () => ({ data: null, error: null })),
        })),
      };

      const req = new Request('http://localhost/functions/v1/seed-data', {
        method: 'POST',
        headers: {
          'x-seed-secret': 'test-secret-123',
          'Content-Type': 'text/csv',
        },
        body: sampleCsv,
      });

      const res = await handleSeedData(req, mockEnv, mockSupabaseClient);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.seeded).toBe(2);
      expect(body.invalid).toBe(0);
    });
  });
});
