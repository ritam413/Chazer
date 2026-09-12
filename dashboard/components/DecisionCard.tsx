'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  Loader2,
  Calendar,
  Building,
  Info,
} from 'lucide-react';
import { Decision, EmailContent, DecisionCardProps } from '../lib/types';
import { TierBadge } from './TierBadge';
import { EmailDraftPreview } from './EmailDraftPreview';
import { EditDraftModal } from './EditDraftModal';

export function DecisionCard({
  decision,
  onApprove,
  onReject,
  isSubmitting = false,
}: DecisionCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const {
    decision_id,
    invoice_id,
    invoice,
    escalation_reason,
    draft_subject,
    draft_body,
    tier,
    llm_confidence,
  } = decision;

  const clientName = invoice?.client_name || 'Client';
  const amount = invoice?.amount || 0;
  const daysOverdue = invoice?.days_overdue || 0;
  const isHighValue = Boolean(invoice?.is_high_value || amount >= 10000);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleApprove = async (customSubject?: string, customBody?: string) => {
    setLocalSubmitting(true);
    try {
      const content: EmailContent | undefined =
        customSubject || customBody
          ? { edited_subject: customSubject, edited_body: customBody }
          : undefined;
      await onApprove(decision_id, content);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) return;
    setLocalSubmitting(true);
    try {
      await onReject(decision_id, rejectReason.trim());
      setIsRejecting(false);
    } finally {
      setLocalSubmitting(false);
    }
  };

  const submitting = isSubmitting || localSubmitting;

  return (
    <div
      data-testid={`decision-card-${decision_id}`}
      className="monad-card border-l-4 border-l-coral p-8 space-y-6 transition-all duration-200"
    >
      {/* Card Header & Invoice Context */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs font-bold px-3 py-0.5 rounded-pill bg-coral/25 border border-coral" style={{ color: 'var(--text-main)' }}>
              {invoice_id}
            </span>
            <TierBadge tier={tier} isHighValue={isHighValue} />
          </div>
          <h3 className="text-2xl font-editorial flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Building className="w-4 h-4 opacity-50" />
            {clientName}
          </h3>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1">
          <div className="text-3xl font-editorial tracking-serif-tight" style={{ color: 'var(--text-main)' }}>
            {formatCurrency(amount)}
          </div>
          <div className="text-xs font-mono text-coral flex items-center gap-1 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {daysOverdue} days overdue
          </div>
        </div>
      </div>

      {/* Escalation Reason Box */}
      <div
        data-testid="escalation-reason-box"
        className="p-4 rounded-2xl bg-coral/15 border border-coral/40 text-xs space-y-1 font-mono"
      >
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-mono-wide text-[10px]" style={{ color: 'var(--text-main)' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-coral" />
          Escalation Trigger
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          {escalation_reason}
        </p>
      </div>

      {/* AI Draft Email Section */}
      <div className="space-y-2 font-mono">
        <div className="text-[11px] uppercase tracking-mono-wide flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <Info className="w-3.5 h-3.5 text-lake-blue" />
          AI-Drafted Notice Context
        </div>

        <EmailDraftPreview
          subject={draft_subject}
          body={draft_body}
          tier={tier}
          llmConfidence={llm_confidence}
        />
      </div>

      {/* Reject Reason Form (Conditional) */}
      {isRejecting ? (
        <div
          data-testid="reject-reason-form"
          className="p-4 rounded-2xl bg-coral/15 border border-coral/40 space-y-3 animate-fade-in font-mono"
        >
          <label className="text-xs font-bold uppercase tracking-mono-wide block" style={{ color: 'var(--text-main)' }}>
            Reason for Rejection
          </label>
          <input
            type="text"
            data-testid="reject-reason-input"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Client already promised check by Friday; pause reminder."
            className="w-full px-4 py-2 rounded-xl border text-xs focus:outline-none transition-all"
            style={{ backgroundColor: 'var(--bg-page)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRejecting(false)}
              className="px-4 py-1.5 rounded-btn border text-xs uppercase tracking-mono-tight font-medium"
              style={{ borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-reject-button"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || submitting}
              className="inline-flex items-center gap-1 px-5 py-1.5 rounded-btn bg-coral text-off-black text-xs uppercase tracking-mono-tight font-bold transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Confirm Reject
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons */
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 font-mono">
          <button
            type="button"
            data-testid="edit-draft-button"
            onClick={() => setIsEditModalOpen(true)}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all disabled:opacity-50"
            style={{ borderColor: 'var(--text-main)', color: 'var(--text-main)' }}
          >
            <Edit3 className="w-3.5 h-3.5 text-lake-blue" />
            Edit Draft
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="reject-decision-button"
              onClick={() => setIsRejecting(true)}
              disabled={submitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all disabled:opacity-50 hover:border-coral hover:text-coral"
              style={{ borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>

            <button
              type="button"
              data-testid="approve-decision-button"
              onClick={() => handleApprove()}
              disabled={submitting}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-btn bg-lake-blue hover:opacity-90 text-white text-xs uppercase tracking-mono-wide font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve &amp; Send ▸
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit Draft Modal */}
      <EditDraftModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialSubject={draft_subject}
        initialBody={draft_body}
        invoiceId={invoice_id}
        onSave={(newSubject, newBody) => {
          handleApprove(newSubject, newBody);
        }}
      />
    </div>
  );
}
