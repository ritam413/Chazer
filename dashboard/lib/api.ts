// dashboard/lib/api.ts
// Client API layer connecting Chazer dashboard to Supabase Edge Functions with resilient fallbacks

import {
  Invoice,
  Summary,
  Decision,
  AuditEntry,
  InvoicesResponse,
  DecisionsResponse,
  AuditLogResponse,
  SweepTriggerResponse,
  SeedDataResponse,
  ApproveDecisionResponse,
  RejectDecisionResponse,
  EmailContent,
} from './types';

// ============================================================================
// 1. Fallback Mock Datasets (for offline resilience and demo testing)
// ============================================================================

export const FALLBACK_INVOICES: Invoice[] = [
  {
    invoice_id: 'INV-001',
    client_id: 'CLI-001',
    client_name: 'Acme Corp',
    client_email: 'ap@acme.com',
    amount: 4800.0,
    currency: 'USD',
    due_date: '2026-08-15',
    days_overdue: 28,
    status: 'OVERDUE',
    tier: 'TIER_3',
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: 'UX Design Sprint — August 2026',
  },
  {
    invoice_id: 'INV-002',
    client_id: 'CLI-002',
    client_name: 'Bluebell Studios',
    client_email: 'finance@bluebell.io',
    amount: 12500.0,
    currency: 'USD',
    due_date: '2026-08-01',
    days_overdue: 42,
    status: 'OVERDUE',
    tier: 'TIER_3',
    is_high_value: true,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: 'Brand Identity Package',
  },
  {
    invoice_id: 'INV-003',
    client_id: 'CLI-003',
    client_name: 'Cascade Tech',
    client_email: 'sarah.l@cascade.com',
    amount: 890.0,
    currency: 'USD',
    due_date: '2026-08-28',
    days_overdue: 15,
    status: 'OVERDUE',
    tier: 'TIER_2',
    is_high_value: false,
    contact_count: 1,
    dispute_flag: false,
    last_contact_at: '2026-08-30T10:00:00Z',
    services_description: 'Landing Page — Revision 2',
  },
  {
    invoice_id: 'INV-004',
    client_id: 'CLI-001',
    client_name: 'Acme Corp',
    client_email: 'ap@acme.com',
    amount: 3200.0,
    currency: 'USD',
    due_date: '2026-09-01',
    days_overdue: 11,
    status: 'SENT',
    tier: 'TIER_1',
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: 'Monthly Retainer — September',
  },
  {
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
  },
  {
    invoice_id: 'INV-006',
    client_id: 'CLI-005',
    client_name: 'Ember Creative',
    client_email: 'jo@embercreative.co',
    amount: 1400.0,
    currency: 'USD',
    due_date: '2026-09-05',
    days_overdue: 7,
    status: 'SENT',
    tier: 'TIER_1',
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: 'Social Media Package',
  },
  {
    invoice_id: 'INV-007',
    client_id: 'CLI-002',
    client_name: 'Bluebell Studios',
    client_email: 'finance@bluebell.io',
    amount: 7200.0,
    currency: 'USD',
    due_date: '2026-08-10',
    days_overdue: 33,
    status: 'DISPUTED',
    tier: 'TIER_3',
    is_high_value: false,
    contact_count: 0,
    dispute_flag: true,
    last_contact_at: null,
    services_description: 'Web App Development Phase 1',
  },
  {
    invoice_id: 'INV-008',
    client_id: 'CLI-006',
    client_name: 'Foxglove Labs',
    client_email: 'accounts@foxglove.io',
    amount: 2100.0,
    currency: 'USD',
    due_date: '2026-08-22',
    days_overdue: 21,
    status: 'OVERDUE',
    tier: 'TIER_2',
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: 'API Integration Consulting',
  },
];

export const FALLBACK_SUMMARY: Summary = {
  total_overdue_amount: 87090.0,
  count_by_tier: {
    TIER_1: 2,
    TIER_2: 2,
    TIER_3: 4,
  },
  pending_decisions: 3,
  sent_this_week: 4,
};

export const FALLBACK_DECISIONS: Decision[] = [
  {
    decision_id: 'dec-001',
    invoice_id: 'INV-005',
    invoice: {
      client_name: 'DeltaWave Media',
      amount: 55000.0,
      days_overdue: 43,
      is_high_value: true,
    },
    escalation_reason:
      'Invoice 43 days overdue. Amount exceeds $10,000 threshold. Auto-held for owner approval.',
    draft_subject: 'Final Notice: Invoice #INV-005 — $55,000.00 Overdue',
    draft_body:
      'Dear Accounts Payable team,\n\nThis is a formal notice regarding outstanding invoice #INV-005 for $55,000.00, which is now 43 days overdue.\n\nPlease arrange immediate settlement to keep your account in good standing.\n\nBest regards,\nAccounts Receivable',
    tier: 'TIER_3',
    llm_confidence: 0.96,
    status: 'PENDING_APPROVAL',
    created_at: '2026-09-12T09:02:11Z',
  },
  {
    decision_id: 'dec-002',
    invoice_id: 'INV-002',
    invoice: {
      client_name: 'Bluebell Studios',
      amount: 12500.0,
      days_overdue: 42,
      is_high_value: true,
    },
    escalation_reason:
      'Invoice 42 days overdue exceeds 22-day Tier 3 threshold and high-value threshold.',
    draft_subject: 'Urgent: Outstanding Invoice #INV-002 ($12,500.00)',
    draft_body:
      'Dear Bluebell Studios Finance,\n\nWe are writing to follow up on overdue invoice #INV-002 for $12,500.00 due on 2026-08-01.\n\nPlease remit payment at your earliest convenience.\n\nThank you,\nFinance Department',
    tier: 'TIER_3',
    llm_confidence: 0.94,
    status: 'PENDING_APPROVAL',
    created_at: '2026-09-12T09:03:00Z',
  },
  {
    decision_id: 'dec-003',
    invoice_id: 'INV-001',
    invoice: {
      client_name: 'Acme Corp',
      amount: 4800.0,
      days_overdue: 28,
      is_high_value: false,
    },
    escalation_reason: 'Invoice is 28 days overdue (Tier 3 final notice required).',
    draft_subject: 'Final Notice: Invoice #INV-001 — $4,800.00',
    draft_body:
      'Dear Acme Corp Team,\n\nInvoice #INV-001 for $4,800.00 remains unpaid 28 days past the due date.\n\nPlease let us know when payment will be issued.\n\nSincerely,\nChazer Billing',
    tier: 'TIER_3',
    llm_confidence: 0.98,
    status: 'PENDING_APPROVAL',
    created_at: '2026-09-12T09:04:15Z',
  },
];

export const FALLBACK_AUDIT_LOG: AuditEntry[] = [
  {
    log_id: 'log_xyz789',
    sweep_id: 'sweep_20260912_090000',
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
  {
    log_id: 'log_xyz788',
    sweep_id: 'sweep_20260912_090000',
    invoice_id: 'INV-003',
    action: 'TIER2_EMAIL_SENT',
    status: 'SENT',
    timestamp: '2026-09-12T09:01:54Z',
    metadata: {
      resend_message_id: 're_def456',
      email_subject: 'Second Reminder: Invoice #INV-003',
    },
  },
  {
    log_id: 'log_xyz787',
    sweep_id: 'sweep_20260912_090000',
    invoice_id: 'INV-006',
    action: 'TIER1_EMAIL_SENT',
    status: 'SENT',
    timestamp: '2026-09-12T09:01:20Z',
    metadata: {
      resend_message_id: 're_ghi789',
      email_subject: 'Friendly Reminder: Invoice #INV-006',
    },
  },
  {
    log_id: 'log_xyz786',
    sweep_id: 'sweep_20260912_090000',
    invoice_id: null,
    action: 'SWEEP_COMPLETE',
    status: 'SUCCESS',
    timestamp: '2026-09-12T09:02:30Z',
    metadata: {
      invoices_processed: 8,
      emails_sent: 2,
      escalated_count: 3,
      duration_ms: 1250,
    },
  },
];

// ============================================================================
// 2. HTTP Helper Functions
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

// ============================================================================
// 3. API Functions
// ============================================================================

export async function fetchInvoicesApi(params?: {
  status?: string;
  tier?: string;
  sort?: string;
  order?: string;
}): Promise<InvoicesResponse> {
  if (!SUPABASE_URL) {
    let invoices = [...FALLBACK_INVOICES];
    if (params?.status) {
      invoices = invoices.filter((i) => i.status === params.status);
    }
    if (params?.tier) {
      invoices = invoices.filter((i) => i.tier === params.tier);
    }
    return {
      invoices,
      summary: FALLBACK_SUMMARY,
    };
  }

  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.tier) searchParams.set('tier', params.tier);
  if (params?.sort) searchParams.set('sort', params.sort);
  if (params?.order) searchParams.set('order', params.order);

  const url = `${SUPABASE_URL}/functions/v1/api-router/invoices?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch invoices: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchDecisionsApi(params?: {
  status?: string;
}): Promise<DecisionsResponse> {
  if (!SUPABASE_URL) {
    let decisions = [...FALLBACK_DECISIONS];
    if (params?.status) {
      decisions = decisions.filter((d) => d.status === params.status);
    }
    return {
      decisions,
      total: decisions.length,
    };
  }

  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);

  const url = `${SUPABASE_URL}/functions/v1/api-router/decisions?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch decisions: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAuditLogApi(params?: {
  page?: number;
  limit?: number;
  invoice_id?: string;
  action?: string;
}): Promise<AuditLogResponse> {
  if (!SUPABASE_URL) {
    let entries = [...FALLBACK_AUDIT_LOG];
    if (params?.invoice_id) {
      entries = entries.filter((e) => e.invoice_id === params.invoice_id);
    }
    if (params?.action) {
      entries = entries.filter((e) => e.action === params.action);
    }
    return {
      entries,
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 50,
        total: entries.length,
        has_more: false,
      },
    };
  }

  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.invoice_id) searchParams.set('invoice_id', params.invoice_id);
  if (params?.action) searchParams.set('action', params.action);

  const url = `${SUPABASE_URL}/functions/v1/api-router/audit-log?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audit log: ${response.statusText}`);
  }

  return response.json();
}

export async function approveDecisionApi(
  decisionId: string,
  content?: EmailContent
): Promise<ApproveDecisionResponse> {
  if (!SUPABASE_URL) {
    return {
      success: true,
      decision_id: decisionId,
      resend_message_id: `re_mock_${Date.now()}`,
      sent_at: new Date().toISOString(),
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/decisions-approve/${decisionId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(content || {}),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to approve decision: ${response.statusText}`);
  }

  return response.json();
}

export async function rejectDecisionApi(
  decisionId: string,
  reason?: string
): Promise<RejectDecisionResponse> {
  if (!SUPABASE_URL) {
    return {
      success: true,
      decision_id: decisionId,
      rejected_at: new Date().toISOString(),
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/decisions-reject/${decisionId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ reject_reason: reason }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to reject decision: ${response.statusText}`);
  }

  return response.json();
}

export async function triggerSweepApi(
  params?: Record<string, any>
): Promise<SweepTriggerResponse> {
  if (!SUPABASE_URL) {
    return {
      sweep_id: `sweep_${Date.now()}`,
      status: 'COMPLETE',
      message: 'Autonomous sweep executed successfully in demo mode.',
      invoices_processed: 8,
      emails_sent: 2,
      escalated_count: 3,
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/agent-sweep`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params || {}),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to trigger sweep: ${response.statusText}`);
  }

  return response.json();
}

export async function seedDataApi(): Promise<SeedDataResponse> {
  if (!SUPABASE_URL) {
    return {
      seeded: 8,
      skipped: 0,
      invalid: 0,
      invalid_rows: [],
    };
  }

  const url = `${SUPABASE_URL}/functions/v1/seed-data`;
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Failed to seed data: ${response.statusText}`);
  }

  return response.json();
}
