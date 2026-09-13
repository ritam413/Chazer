'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { DecisionCard } from '../../components/DecisionCard';
import { DecisionSkeleton, EmptyDecisionsState } from '../../components/DecisionStates';
import { useChazerStore } from '../../lib/store';
import { ShieldAlert, RefreshCw, CheckCircle } from 'lucide-react';
import { EmailContent } from '../../lib/types';

export default function DecisionsPage() {
  const {
    decisions,
    isLoadingDecisions,
    fetchDecisions,
    approveDecision,
    rejectDecision,
  } = useChazerStore();

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleApprove = async (decisionId: string, content?: EmailContent) => {
    const target = decisions.find((d) => d.decision_id === decisionId);
    const invoiceLabel = target ? `${target.invoice_id} (${target.invoice?.client_name})` : decisionId;

    await approveDecision(decisionId, content);
    showToast(`✓ Approved & sent notice for ${invoiceLabel}.`, 'success');
  };

  const handleReject = async (decisionId: string, reason: string) => {
    const target = decisions.find((d) => d.decision_id === decisionId);
    const invoiceLabel = target ? `${target.invoice_id}` : decisionId;

    await rejectDecision(decisionId, reason);
    showToast(`✕ Suppressed notice for ${invoiceLabel}. Follow-up paused.`, 'info');
  };

  const pendingDecisions = decisions.filter((d) => d.status === 'PENDING_APPROVAL');

  return (
    <AppShell>
      <div className="space-y-8 max-w-5xl mx-auto w-full font-mono">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            data-testid="decisions-toast"
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-pill border text-xs font-mono shadow-2xl flex items-center gap-2.5 animate-slide-up"
            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-page)', borderColor: 'var(--border-card)' }}
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-mono-wide text-coral font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Human Oversight Safeguard
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-editorial flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
              <span>Needs Your Decision</span>
              {pendingDecisions.length > 0 && (
                <span
                  data-testid="pending-decisions-count-pill"
                  className="text-xs font-mono font-medium px-3 py-0.5 rounded-pill bg-coral/30 text-off-black border border-coral"
                >
                  {pendingDecisions.length} pending
                </span>
              )}
            </h1>
            <p className="text-xs leading-relaxed max-w-2xl pt-1" style={{ color: 'var(--text-sub)' }}>
              Human-in-the-loop escalation safeguard. Review and authorize AI-generated collection notices before client dispatch.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchDecisions()}
              disabled={isLoadingDecisions}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all disabled:opacity-50"
              style={{ borderColor: 'var(--border-card)', color: 'var(--text-main)', backgroundColor: 'var(--bg-card)' }}
              title="Refresh decisions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDecisions ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoadingDecisions ? (
          <DecisionSkeleton />
        ) : pendingDecisions.length === 0 ? (
          <EmptyDecisionsState />
        ) : (
          <div className="space-y-6" data-testid="decisions-list">
            {pendingDecisions.map((decision) => (
              <DecisionCard
                key={decision.decision_id}
                decision={decision}
                onApprove={handleApprove}
                onReject={handleReject}
                isSubmitting={false}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
