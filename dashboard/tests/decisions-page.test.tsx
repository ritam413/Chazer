import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EmailDraftPreview } from '../components/EmailDraftPreview';
import { EditDraftModal } from '../components/EditDraftModal';
import { DecisionCard } from '../components/DecisionCard';
import { EmptyDecisionsState, DecisionSkeleton } from '../components/DecisionStates';
import DecisionsPage from '../app/decisions/page';
import { useChazerStore } from '../lib/store';
import { FALLBACK_DECISIONS } from '../lib/api';

describe('FRONT-03: Decisions Components & Page', () => {
  beforeEach(() => {
    useChazerStore.setState({
      decisions: [...FALLBACK_DECISIONS],
      isLoadingDecisions: false,
      fetchDecisions: async () => {},
    });
  });

  describe('EmailDraftPreview Component', () => {
    it('renders subject, body, and AI confidence badge', () => {
      render(
        <EmailDraftPreview
          subject="Final Notice: Invoice #INV-005"
          body="Dear Accounts Payable, please pay immediately."
          tier="TIER_3"
          llmConfidence={0.96}
        />
      );

      expect(screen.getByTestId('draft-subject')).toHaveTextContent('Final Notice: Invoice #INV-005');
      expect(screen.getByTestId('draft-body')).toHaveTextContent('Dear Accounts Payable, please pay immediately.');
      expect(screen.getByTestId('ai-confidence-badge')).toHaveTextContent('96%');
    });
  });

  describe('EditDraftModal Component', () => {
    it('renders form inputs with initial values when open', () => {
      render(
        <EditDraftModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Overdue Notice"
          initialBody="Please pay INV-005 now."
          onSave={vi.fn()}
          invoiceId="INV-005"
        />
      );

      expect(screen.getByTestId('edit-draft-subject-input')).toHaveValue('Overdue Notice');
      expect(screen.getByTestId('edit-draft-body-textarea')).toHaveValue('Please pay INV-005 now.');
      expect(screen.getByTestId('edit-draft-word-count')).toHaveTextContent('4 / 200 words');
    });

    it('enforces safety rule requiring presence of invoice ID in edited body', () => {
      const handleSave = vi.fn();
      render(
        <EditDraftModal
          isOpen={true}
          onClose={vi.fn()}
          initialSubject="Overdue Notice"
          initialBody="Please pay your invoice."
          onSave={handleSave}
          invoiceId="INV-005"
        />
      );

      const saveBtn = screen.getByTestId('edit-draft-save-button');
      fireEvent.click(saveBtn);

      expect(screen.getByTestId('edit-modal-error')).toHaveTextContent('Safety Rule: The email body must contain the Invoice ID (INV-005)');
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('invokes onSave and closes when payload is valid', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();
      render(
        <EditDraftModal
          isOpen={true}
          onClose={handleClose}
          initialSubject="Overdue Notice"
          initialBody="Please settle invoice INV-005 immediately."
          onSave={handleSave}
          invoiceId="INV-005"
        />
      );

      const saveBtn = screen.getByTestId('edit-draft-save-button');
      fireEvent.click(saveBtn);

      expect(handleSave).toHaveBeenCalledWith('Overdue Notice', 'Please settle invoice INV-005 immediately.');
      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('DecisionCard Component', () => {
    it('renders invoice context, escalation reason, and actions', () => {
      render(
        <DecisionCard
          decision={FALLBACK_DECISIONS[0]}
          onApprove={vi.fn()}
          onReject={vi.fn()}
          isSubmitting={false}
        />
      );

      expect(screen.getByText('INV-005')).toBeInTheDocument();
      expect(screen.getByText('DeltaWave Media')).toBeInTheDocument();
      expect(screen.getByText('$55,000.00')).toBeInTheDocument();
      expect(screen.getByTestId('escalation-reason-box')).toHaveTextContent(/Amount exceeds \$10,000/);
      expect(screen.getByTestId('approve-decision-button')).toBeInTheDocument();
      expect(screen.getByTestId('reject-decision-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-draft-button')).toBeInTheDocument();
    });

    it('triggers onApprove when Approve & Send is clicked', async () => {
      const handleApprove = vi.fn().mockResolvedValue(undefined);
      render(
        <DecisionCard
          decision={FALLBACK_DECISIONS[0]}
          onApprove={handleApprove}
          onReject={vi.fn()}
          isSubmitting={false}
        />
      );

      const approveBtn = screen.getByTestId('approve-decision-button');
      await act(async () => {
        fireEvent.click(approveBtn);
      });

      expect(handleApprove).toHaveBeenCalledWith('dec-001', undefined);
    });

    it('prompts for reject reason and triggers onReject upon confirmation', async () => {
      const handleReject = vi.fn().mockResolvedValue(undefined);
      render(
        <DecisionCard
          decision={FALLBACK_DECISIONS[0]}
          onApprove={vi.fn()}
          onReject={handleReject}
          isSubmitting={false}
        />
      );

      const rejectBtn = screen.getByTestId('reject-decision-button');
      fireEvent.click(rejectBtn);

      expect(screen.getByTestId('reject-reason-form')).toBeInTheDocument();

      const reasonInput = screen.getByTestId('reject-reason-input');
      fireEvent.change(reasonInput, { target: { value: 'Client promised wire today.' } });

      const confirmBtn = screen.getByTestId('confirm-reject-button');
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      expect(handleReject).toHaveBeenCalledWith('dec-001', 'Client promised wire today.');
    });
  });

  describe('DecisionsPage Integration', () => {
    it('renders all pending decisions from store', async () => {
      render(<DecisionsPage />);

      expect(screen.getByText('Needs Your Decision')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('pending-decisions-count-pill')).toHaveTextContent('3 pending');
        expect(screen.getByTestId('decision-card-dec-001')).toBeInTheDocument();
        expect(screen.getByTestId('decision-card-dec-002')).toBeInTheDocument();
        expect(screen.getByTestId('decision-card-dec-003')).toBeInTheDocument();
      });
    });

    it('renders empty state when there are no decisions', () => {
      useChazerStore.setState({ decisions: [], fetchDecisions: async () => {} });
      render(<DecisionsPage />);

      expect(screen.getByTestId('empty-decisions-state')).toBeInTheDocument();
      expect(screen.getByText('No decisions needed')).toBeInTheDocument();
    });

    it('renders skeleton during loading', () => {
      useChazerStore.setState({ isLoadingDecisions: true, fetchDecisions: async () => {} });
      render(<DecisionsPage />);

      expect(screen.getByTestId('decision-skeleton')).toBeInTheDocument();
    });

    it('removes card optimistically and triggers feedback on approval', async () => {
      render(<DecisionsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('decision-card-dec-001')).toBeInTheDocument();
      });

      const approveBtn = screen.getAllByTestId('approve-decision-button')[0];
      await act(async () => {
        fireEvent.click(approveBtn);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('decision-card-dec-001')).not.toBeInTheDocument();
        expect(screen.getByTestId('decisions-toast')).toBeInTheDocument();
      });
    });
  });
});
