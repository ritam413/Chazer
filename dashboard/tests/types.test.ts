import { describe, it, expect } from 'vitest';
import {
  InvoiceStatus,
  EscalationTier,
  DecisionStatus,
  ContactHistoryStatus,
  SweepStatus,
  AuditAction,
  AuditStatus,
  Invoice,
  Summary,
  Decision,
  InvoicesResponse,
  DecisionsResponse,
  AuditLogResponse,
  SweepTriggerResponse,
  SeedDataResponse,
  ApproveDecisionResponse,
  RejectDecisionResponse,
} from '@/lib/types';

describe('TypeScript Domain Types & API Contracts Seam Verification', () => {
  it('validates escalation tiers match specification', () => {
    const validTiers: EscalationTier[] = ['TIER_1', 'TIER_2', 'TIER_3', 'UNCLASSIFIED'];
    expect(validTiers).toHaveLength(4);
    expect(validTiers).toContain('TIER_1');
    expect(validTiers).toContain('TIER_2');
    expect(validTiers).toContain('TIER_3');
    expect(validTiers).toContain('UNCLASSIFIED');
  });

  it('validates invoice status enumeration', () => {
    const validStatuses: InvoiceStatus[] = [
      'DRAFT',
      'SENT',
      'OVERDUE',
      'PAID',
      'DISPUTED',
      'FINAL_NOTICE_SENT',
      'CLOSED',
    ];
    expect(validStatuses).toHaveLength(7);
    expect(validStatuses).toContain('OVERDUE');
    expect(validStatuses).toContain('DISPUTED');
    expect(validStatuses).toContain('FINAL_NOTICE_SENT');
  });

  it('validates decision and contact statuses', () => {
    const decisionStatuses: DecisionStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'];
    expect(decisionStatuses).toEqual(['PENDING_APPROVAL', 'APPROVED', 'REJECTED']);

    const contactStatuses: ContactHistoryStatus[] = ['SENT', 'FAILED'];
    expect(contactStatuses).toEqual(['SENT', 'FAILED']);

    const sweepStatuses: SweepStatus[] = ['RUNNING', 'COMPLETE', 'FAILED', 'STARTED'];
    expect(sweepStatuses).toContain('RUNNING');
  });

  it('validates InvoicesResponse shape against docs/06 specification', () => {
    const sampleInvoice: Invoice = {
      invoice_id: 'INV-005',
      client_id: 'CLI-004',
      client_name: 'DeltaWave Media',
      client_email: 'billing@deltawave.com',
      amount: 55000.0,
      currency: 'USD',
      due_date: '2026-07-31',
      days_overdue: 43,
      status: 'OVERDUE',
      tier: 'TIER_3',
      is_high_value: true,
      contact_count: 1,
      dispute_flag: false,
      last_contact_at: '2026-08-15T09:04:22Z',
      services_description: 'IT Infrastructure Audit',
    };

    const sampleSummary: Summary = {
      total_overdue_amount: 83890.0,
      count_by_tier: {
        TIER_1: 2,
        TIER_2: 2,
        TIER_3: 4,
      },
      pending_decisions: 3,
    };

    const response: InvoicesResponse = {
      invoices: [sampleInvoice],
      summary: sampleSummary,
    };

    expect(response.invoices[0].invoice_id).toBe('INV-005');
    expect(response.invoices[0].is_high_value).toBe(true);
    expect(response.summary.total_overdue_amount).toBe(83890.0);
    expect(response.summary.count_by_tier.TIER_3).toBe(4);
  });

  it('validates DecisionsResponse shape against docs/06 specification', () => {
    const sampleDecision: Decision = {
      decision_id: 'dec_a1b2c3',
      invoice_id: 'INV-005',
      invoice: {
        client_name: 'DeltaWave Media',
        amount: 55000.0,
        days_overdue: 43,
        is_high_value: true,
      },
      escalation_reason: 'Invoice 43 days overdue. High-value invoice exceeds $10,000 threshold.',
      draft_subject: 'Final Notice: Invoice #INV-005 — $55,000.00 Overdue',
      draft_body: 'Dear Accounts Payable,\n\nThis is a formal final notice...',
      tier: 'TIER_3',
      llm_confidence: 0.96,
      status: 'PENDING_APPROVAL',
      created_at: '2026-09-12T09:02:11Z',
    };

    const response: DecisionsResponse = {
      decisions: [sampleDecision],
    };

    expect(response.decisions[0].decision_id).toBe('dec_a1b2c3');
    expect(response.decisions[0].tier).toBe('TIER_3');
    expect(response.decisions[0].llm_confidence).toBe(0.96);
  });

  it('validates AuditLogResponse, SweepTriggerResponse, SeedDataResponse, and Decision mutations', () => {
    const auditResponse: AuditLogResponse = {
      entries: [
        {
          log_id: 'log_xyz789',
          invoice_id: 'INV-005',
          action: 'HIGH_VALUE_ESCALATED',
          status: 'ESCALATED',
          timestamp: '2026-09-12T09:02:11Z',
          metadata: {
            tier: 'TIER_3',
            amount: 55000.0,
            threshold: 10000,
            llm_confidence: 0.96,
          },
        },
      ],
      pagination: {
        total: 24,
        page: 1,
        limit: 50,
        has_more: false,
      },
    };

    expect(auditResponse.entries).toHaveLength(1);
    expect(auditResponse.pagination.total).toBe(24);

    const sweepTrigger: SweepTriggerResponse = {
      sweep_id: 'sweep_20260912_142200',
      status: 'STARTED',
      message: 'Sweep started. Check audit log for progress.',
    };
    expect(sweepTrigger.status).toBe('STARTED');

    const seedResponse: SeedDataResponse = {
      seeded: 8,
      skipped: 0,
      invalid: 0,
      invalid_rows: [],
    };
    expect(seedResponse.seeded).toBe(8);

    const approveResponse: ApproveDecisionResponse = {
      success: true,
      resend_message_id: 're_abc123def456',
      sent_at: '2026-09-12T14:22:01Z',
      decision_id: 'dec_a1b2c3',
    };
    expect(approveResponse.success).toBe(true);

    const rejectResponse: RejectDecisionResponse = {
      success: true,
      decision_id: 'dec_a1b2c3',
      rejected_at: '2026-09-12T14:30:00Z',
    };
    expect(rejectResponse.success).toBe(true);
  });
});

