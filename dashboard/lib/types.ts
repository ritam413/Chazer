// dashboard/lib/types.ts
// Unified domain types, API contracts, and UI component interfaces for Chazer

import React from 'react';

// ============================================================================
// 1. Domain Enums & Status Types
// ============================================================================

export type InvoiceStatus =
  | 'DRAFT'
  | 'SENT'
  | 'OVERDUE'
  | 'PAID'
  | 'DISPUTED'
  | 'FINAL_NOTICE_SENT'
  | 'CLOSED';

export type EscalationTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNCLASSIFIED';

export type DecisionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type ContactHistoryStatus = 'SENT' | 'FAILED';

export type SweepStatus = 'RUNNING' | 'COMPLETED' | 'COMPLETE' | 'FAILED' | 'STARTED';

export type AuditAction =
  | 'INVOICE_CLASSIFIED'
  | 'EMAIL_DRAFTED'
  | 'TIER1_EMAIL_SENT'
  | 'TIER2_EMAIL_SENT'
  | 'TIER3_DRAFT_CREATED'
  | 'TIER3_ESCALATED'
  | 'HIGH_VALUE_ESCALATED'
  | 'DISPUTE_ESCALATED'
  | 'OWNER_APPROVED'
  | 'OWNER_REJECTED'
  | 'SWEEP_STARTED'
  | 'SWEEP_COMPLETED'
  | 'SWEEP_COMPLETE'
  | 'SWEEP_FAILED'
  | 'SEED_DATA_INGESTED'
  | 'SEND_FAILED'
  | 'LLM_FAILED'
  | 'DEMO_ENVIRONMENT_RESET'
  | (string & {});

export type AuditStatus =
  | 'SUCCESS'
  | 'SENT'
  | 'ESCALATED'
  | 'FAILED'
  | 'RUNNING'
  | 'COMPLETED'
  | (string & {});

// ============================================================================
// 2. Core Entities
// ============================================================================

export interface Invoice {
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
  services_description?: string;
}

export interface Summary {
  total_overdue_amount: number;
  count_by_tier: {
    TIER_1: number;
    TIER_2: number;
    TIER_3: number;
  };
  pending_decisions: number;
  sent_this_week?: number;
}

export interface DecisionInvoiceContext {
  client_name: string;
  amount: number;
  days_overdue: number;
  is_high_value: boolean;
}

export interface Decision {
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
  resolved_at?: string | null;
  reject_reason?: string | null;
}

export interface AuditEntry {
  log_id: string;
  sweep_id?: string | null;
  invoice_id?: string | null;
  action: AuditAction | string;
  status: AuditStatus | string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

// ============================================================================
// 3. API Responses & Request Payloads
// ============================================================================

export interface InvoicesResponse {
  invoices: Invoice[];
  summary: Summary;
}

export interface DecisionsResponse {
  decisions: Decision[];
  total?: number;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  pagination: Pagination;
}

export interface SweepTriggerResponse {
  sweep_id: string;
  status: SweepStatus | string;
  message?: string;
  invoices_processed?: number;
  emails_sent?: number;
  escalated_count?: number;
}

export interface SeedDataResponse {
  seeded: number;
  skipped: number;
  invalid: number;
  invalid_rows: Array<{ row: any; errors: string[] }>;
}

export interface ApproveDecisionResponse {
  success: boolean;
  resend_message_id: string;
  sent_at: string;
  decision_id: string;
}

export interface RejectDecisionResponse {
  success: boolean;
  decision_id: string;
  rejected_at: string;
}

export interface EmailContent {
  edited_subject?: string;
  edited_body?: string;
}

export type InvoiceSortField = 'days_overdue' | 'amount' | 'due_date' | 'status' | 'client_name';
export type SortOrder = 'asc' | 'desc';

// ============================================================================
// 4. UI Component Props
// ============================================================================

export interface AppShellProps {
  children: React.ReactNode;
}

export interface NavLinkItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface SweepStatusIndicatorProps {
  lastSweepAt: string | null;
  isSweeping: boolean;
}

export interface TriggerSweepButtonProps {
  onTrigger: () => void;
  isDisabled?: boolean;
  isSweeping?: boolean;
}

export interface AgingBarProps {
  daysOverdue: number;
  maxDays?: number;
  tier?: EscalationTier;
}

export interface TierBadgeProps {
  tier: EscalationTier;
  isHighValue?: boolean;
  className?: string;
}

export interface StatsBarProps {
  totalOverdue: number;
  pendingDecisions: number;
  sentThisWeek: number;
  isLoading?: boolean;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  accentColor?: 'purple' | 'red' | 'amber' | 'green' | string;
  isLoading?: boolean;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
  onRowClick?: (invoiceId: string) => void;
}

export interface EmailDraftPreviewProps {
  subject: string;
  body: string;
  tier?: EscalationTier;
  llmConfidence?: number;
  className?: string;
}

export interface EditDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: string, body: string) => void;
  initialSubject: string;
  initialBody: string;
  invoiceId?: string;
  amount?: number;
  dueDate?: string;
}

export interface DecisionCardProps {
  decision: Decision;
  onApprove: (id: string, content?: EmailContent) => Promise<void> | void;
  onReject: (id: string, reason: string) => Promise<void> | void;
  isSubmitting?: boolean;
}

export interface AuditEntryProps {
  entry: AuditEntry;
}

export interface AuditTimelineProps {
  entries: AuditEntry[];
  isLoading?: boolean;
}
