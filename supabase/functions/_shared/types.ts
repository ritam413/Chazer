// supabase/functions/_shared/types.ts
// Central unified domain types, entity records, and API contracts for all Supabase Edge Functions.

// ============================================================================
// 1. Domain Enums & Status Literals
// ============================================================================

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "OVERDUE"
  | "PAID"
  | "DISPUTED"
  | "FINAL_NOTICE_SENT"
  | "CLOSED";

export type EscalationTier = "TIER_1" | "TIER_2" | "TIER_3" | "UNCLASSIFIED";

export type DecisionStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type ContactHistoryStatus = "SENT" | "FAILED";

export type SweepStatus = "RUNNING" | "COMPLETED" | "COMPLETE" | "FAILED" | "STARTED";

export type AuditAction =
  | "INVOICE_CLASSIFIED"
  | "EMAIL_DRAFTED"
  | "TIER1_EMAIL_SENT"
  | "TIER2_EMAIL_SENT"
  | "TIER3_DRAFT_CREATED"
  | "TIER3_ESCALATED"
  | "HIGH_VALUE_ESCALATED"
  | "DISPUTE_ESCALATED"
  | "OWNER_APPROVED"
  | "OWNER_REJECTED"
  | "SWEEP_STARTED"
  | "SWEEP_COMPLETED"
  | "SWEEP_FAILED"
  | "SEED_DATA_INGESTED"
  | "SEND_FAILED"
  | "LLM_FAILED"
  | "DEMO_ENVIRONMENT_RESET"
  | (string & {});

export type AuditStatus =
  | "SUCCESS"
  | "SENT"
  | "ESCALATED"
  | "FAILED"
  | "RUNNING"
  | "COMPLETED"
  | (string & {});

// ============================================================================
// 2. HTTP & CORS Constants
// ============================================================================

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const CRON_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const SEED_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

// ============================================================================
// 3. Database Entity Records
// ============================================================================

export interface ClientRecord {
  client_id: string;
  owner_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface InvoiceRecord {
  invoice_id: string;
  client_id: string;
  owner_id?: string;
  client_name?: string;
  client_email?: string;
  amount: number;
  currency: string;
  due_date: string;
  days_overdue?: number;
  status: InvoiceStatus | string;
  services_description?: string;
  contact_count: number;
  dispute_flag: boolean;
  last_contact_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContactHistoryRecord {
  contact_id?: string;
  invoice_id: string;
  tier: EscalationTier;
  channel?: "EMAIL";
  recipient_email: string;
  subject: string;
  body: string;
  status: ContactHistoryStatus;
  resend_message_id?: string | null;
  sent_at: string;
}

export interface DecisionRecord {
  decision_id: string;
  invoice_id: string;
  owner_id?: string;
  escalation_reason: string;
  draft_subject: string;
  draft_body: string;
  tier: EscalationTier;
  llm_confidence: number;
  status: DecisionStatus;
  created_at: string;
  resolved_at?: string | null;
  reject_reason?: string | null;
}

export interface AuditEntryRecord {
  log_id: string;
  sweep_id?: string | null;
  invoice_id?: string | null;
  action: AuditAction | string;
  status: AuditStatus | string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SweepRunRecord {
  sweep_id: string;
  owner_id: string;
  status: SweepStatus;
  invoices_processed: number;
  emails_sent: number;
  escalated_count: number;
  duration_ms: number;
  started_at: string;
  completed_at?: string | null;
}

// ============================================================================
// 4. Enriched View Models & API Entities
// ============================================================================

export interface EnrichedInvoice {
  invoice_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  due_date: string;
  days_overdue: number;
  status: InvoiceStatus;
  tier: EscalationTier;
  is_high_value: boolean;
  contact_count: number;
  dispute_flag: boolean;
  last_contact_at: string | null;
  services_description: string;
}

export interface TierCounts {
  TIER_1: number;
  TIER_2: number;
  TIER_3: number;
}

export interface InvoicesSummary {
  total_overdue_amount: number;
  count_by_tier: TierCounts;
  pending_decisions: number;
  sent_this_week?: number;
}

export interface DecisionInvoiceContext {
  client_name: string;
  amount: number;
  days_overdue: number;
  is_high_value: boolean;
}

export interface DecisionItem {
  decision_id: string;
  invoice_id: string;
  invoice: DecisionInvoiceContext;
  escalation_reason: string;
  draft_subject: string;
  draft_body: string;
  tier: EscalationTier;
  llm_confidence: number;
  status: DecisionStatus;
  created_at: string;
}

export interface AuditEntryItem {
  log_id: string;
  sweep_id?: string | null;
  invoice_id?: string | null;
  action: AuditAction | string;
  status: AuditStatus | string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// 5. Agent Tools & Sweep Pipeline Types
// ============================================================================

export interface ClassificationResult {
  tier: EscalationTier;
  auto_send_eligible: boolean;
  escalate: boolean;
  escalation_reason: string;
  confidence: number;
}

export interface EmailDraft {
  subject: string;
  body: string;
  word_count: number;
  validation_passed: boolean;
  tier: EscalationTier;
}

export interface SweepRequestBody {
  owner_id?: string;
  high_value_threshold?: number;
  contact_window_hours?: number;
  sandbox?: boolean;
}

export interface SweepDetailItem {
  invoice_id: string;
  action: string;
  tier?: string;
  resend_id?: string;
  decision_id?: string;
  reason?: string;
  error?: string;
}

export interface SweepResponse {
  success: boolean;
  sweep_id: string;
  owner_id: string;
  status: "COMPLETED" | "FAILED" | "RUNNING";
  invoices_processed: number;
  emails_sent: number;
  escalated_count: number;
  skipped_count: number;
  failed_count: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  details: SweepDetailItem[];
}

// ============================================================================
// 6. Action Endpoints Payloads (Approve, Reject, Seed)
// ============================================================================

export interface ApproveDecisionBody {
  edited_subject?: string;
  edited_body?: string;
  decision_id?: string;
}

export interface ApproveDecisionResponse {
  success: boolean;
  resend_message_id: string;
  sent_at: string;
  decision_id: string;
}

export interface RejectDecisionBody {
  reject_reason?: string;
  decision_id?: string;
}

export interface RejectDecisionResponse {
  success: boolean;
  decision_id: string;
  rejected_at: string;
}

export interface RawCSVRow {
  invoice_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: string;
  currency?: string;
  due_date: string;
  status: string;
  services_description: string;
}

export interface SanitizedRow {
  invoice_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  services_description: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitizedRow: SanitizedRow;
  rawRow: RawCSVRow;
}

export interface SeedResponse {
  seeded: number;
  skipped: number;
  invalid: number;
  invalid_rows: Array<{ row: RawCSVRow; errors: string[] }>;
}

// ============================================================================
// 7. Query Parameters, Pagination & Error Schemas
// ============================================================================

export interface InvoicesQueryParams {
  status?: string;
  tier?: string;
  sort?: "days_overdue" | "amount" | "due_date" | "status";
  order?: "asc" | "desc";
  owner_id?: string;
}

export interface DecisionsQueryParams {
  status?: string;
  owner_id?: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  invoice_id?: string;
  action?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export interface InvoicesResponse {
  invoices: EnrichedInvoice[];
  summary: InvoicesSummary;
}

export interface DecisionsResponse {
  decisions: DecisionItem[];
  total: number;
}

export interface AuditLogResponse {
  entries: AuditEntryItem[];
  pagination: Pagination;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: any;
}
