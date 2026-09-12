import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChazerStore } from '../lib/store';
import * as api from '../lib/api';

describe('FRONT-05: Zustand Store & API Wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state before each test
    useChazerStore.setState({
      invoices: api.FALLBACK_INVOICES,
      decisions: api.FALLBACK_DECISIONS,
      auditEntries: [],
      summary: api.FALLBACK_SUMMARY,
      isSidebarCollapsed: false,
      activeFilter: {},
      sortField: 'days_overdue',
      sortOrder: 'desc',
      isLoadingInvoices: false,
      isLoadingDecisions: false,
      isLoadingAudit: false,
      isSweeping: false,
      lastSweepAt: null,
      error: null,
    });
  });

  describe('Initial State & Navigation Actions', () => {
    it('has initial default values populated', () => {
      const state = useChazerStore.getState();
      expect(state.invoices.length).toBeGreaterThan(0);
      expect(state.decisions.length).toBeGreaterThan(0);
      expect(state.summary).not.toBeNull();
      expect(state.isSidebarCollapsed).toBe(false);
      expect(state.sortField).toBe('days_overdue');
    });

    it('toggles and sets sidebar collapsed state', () => {
      const { toggleSidebar, setSidebarCollapsed } = useChazerStore.getState();

      toggleSidebar();
      expect(useChazerStore.getState().isSidebarCollapsed).toBe(true);

      toggleSidebar();
      expect(useChazerStore.getState().isSidebarCollapsed).toBe(false);

      setSidebarCollapsed(true);
      expect(useChazerStore.getState().isSidebarCollapsed).toBe(true);
    });

    it('updates filters and sorting', () => {
      const { setFilter, setSorting } = useChazerStore.getState();

      setFilter({ status: 'OVERDUE', tier: 'TIER_3' });
      expect(useChazerStore.getState().activeFilter).toEqual({
        status: 'OVERDUE',
        tier: 'TIER_3',
      });

      setSorting('amount', 'asc');
      expect(useChazerStore.getState().sortField).toBe('amount');
      expect(useChazerStore.getState().sortOrder).toBe('asc');
    });
  });

  describe('fetchInvoices action', () => {
    it('calls fetchInvoicesApi and updates invoices and summary with loading state', async () => {
      const mockInvoices = [
        {
          invoice_id: 'INV-TEST-1',
          client_id: 'CLI-1',
          client_name: 'Test Client',
          client_email: 'test@client.com',
          amount: 5000,
          currency: 'USD',
          due_date: '2026-08-01',
          days_overdue: 40,
          status: 'OVERDUE' as const,
          tier: 'TIER_3' as const,
          is_high_value: false,
          contact_count: 1,
          dispute_flag: false,
          last_contact_at: null,
          services_description: 'Consulting',
        },
      ];
      const mockSummary = {
        total_overdue_amount: 5000,
        count_by_tier: { TIER_1: 0, TIER_2: 0, TIER_3: 1 },
        pending_decisions: 1,
        sent_this_week: 0,
      };

      const spy = vi.spyOn(api, 'fetchInvoicesApi').mockResolvedValueOnce({
        invoices: mockInvoices,
        summary: mockSummary,
      });

      const promise = useChazerStore.getState().fetchInvoices();
      expect(useChazerStore.getState().isLoadingInvoices).toBe(true);

      await promise;

      expect(spy).toHaveBeenCalled();
      expect(useChazerStore.getState().isLoadingInvoices).toBe(false);
      expect(useChazerStore.getState().invoices).toEqual(mockInvoices);
      expect(useChazerStore.getState().summary).toEqual(mockSummary);
      expect(useChazerStore.getState().error).toBeNull();
    });

    it('handles fetchInvoicesApi failure gracefully and sets error state', async () => {
      vi.spyOn(api, 'fetchInvoicesApi').mockRejectedValueOnce(new Error('Network error'));

      await useChazerStore.getState().fetchInvoices();

      expect(useChazerStore.getState().isLoadingInvoices).toBe(false);
      expect(useChazerStore.getState().error).toBe('Network error');
    });
  });

  describe('fetchDecisions action', () => {
    it('calls fetchDecisionsApi and updates decisions with loading state', async () => {
      const mockDecisions = [
        {
          decision_id: 'DEC-99',
          invoice_id: 'INV-005',
          invoice: {
            client_name: 'DeltaWave',
            amount: 55000,
            days_overdue: 43,
            is_high_value: true,
          },
          escalation_reason: 'High value',
          draft_subject: 'Subject',
          draft_body: 'Body',
          tier: 'TIER_3' as const,
          llm_confidence: 0.95,
          status: 'PENDING_APPROVAL' as const,
          created_at: '2026-09-12T00:00:00Z',
        },
      ];

      const spy = vi.spyOn(api, 'fetchDecisionsApi').mockResolvedValueOnce({
        decisions: mockDecisions,
      });

      const promise = useChazerStore.getState().fetchDecisions();
      expect(useChazerStore.getState().isLoadingDecisions).toBe(true);

      await promise;

      expect(spy).toHaveBeenCalledWith({ status: 'PENDING_APPROVAL' });
      expect(useChazerStore.getState().isLoadingDecisions).toBe(false);
      expect(useChazerStore.getState().decisions).toEqual(mockDecisions);
    });

    it('handles fetchDecisionsApi failure and sets error state', async () => {
      vi.spyOn(api, 'fetchDecisionsApi').mockRejectedValueOnce(new Error('Fetch decisions failed'));

      await useChazerStore.getState().fetchDecisions();

      expect(useChazerStore.getState().isLoadingDecisions).toBe(false);
      expect(useChazerStore.getState().error).toBe('Fetch decisions failed');
    });
  });

  describe('fetchAuditLog action', () => {
    it('calls fetchAuditLogApi and updates auditEntries', async () => {
      const mockEntries = [
        {
          log_id: 'LOG-1',
          sweep_id: 'SWP-1',
          invoice_id: 'INV-1',
          action: 'TIER1_EMAIL_SENT' as const,
          status: 'SUCCESS' as const,
          metadata: {},
          timestamp: '2026-09-12T09:00:00Z',
        },
      ];

      vi.spyOn(api, 'fetchAuditLogApi').mockResolvedValueOnce({
        entries: mockEntries,
        pagination: { total: 1, page: 1, limit: 20, has_more: false },
      });

      const promise = useChazerStore.getState().fetchAuditLog();
      expect(useChazerStore.getState().isLoadingAudit).toBe(true);

      await promise;

      expect(useChazerStore.getState().isLoadingAudit).toBe(false);
      expect(useChazerStore.getState().auditEntries).toEqual(mockEntries);
    });
  });

  describe('approveDecision action', () => {
    it('optimistically removes decision and decrements pending count, calling API', async () => {
      const initialDecisions = [
        {
          decision_id: 'DEC-01',
          invoice_id: 'INV-005',
          invoice: { client_name: 'Client 1', amount: 5000, days_overdue: 30, is_high_value: false },
          escalation_reason: 'Overdue',
          draft_subject: 'Sub',
          draft_body: 'Body',
          tier: 'TIER_3' as const,
          llm_confidence: 0.9,
          status: 'PENDING_APPROVAL' as const,
          created_at: '2026-09-12T00:00:00Z',
        },
        {
          decision_id: 'DEC-02',
          invoice_id: 'INV-002',
          invoice: { client_name: 'Client 2', amount: 3000, days_overdue: 20, is_high_value: false },
          escalation_reason: 'Overdue',
          draft_subject: 'Sub 2',
          draft_body: 'Body 2',
          tier: 'TIER_3' as const,
          llm_confidence: 0.9,
          status: 'PENDING_APPROVAL' as const,
          created_at: '2026-09-12T00:00:00Z',
        },
      ];

      useChazerStore.setState({
        decisions: initialDecisions,
        summary: { total_overdue_amount: 8000, count_by_tier: { TIER_1: 0, TIER_2: 0, TIER_3: 2 }, pending_decisions: 2, sent_this_week: 1 },
      });

      const apiSpy = vi.spyOn(api, 'approveDecisionApi').mockResolvedValueOnce({
        success: true,
        decision_id: 'DEC-01',
        resend_message_id: 're_123',
        sent_at: '2026-09-12T10:00:00Z',
      });

      await useChazerStore.getState().approveDecision('DEC-01', {
        edited_subject: 'New Sub',
        edited_body: 'New Body INV-005 $5,000.00 2026-08-01',
      });

      expect(apiSpy).toHaveBeenCalledWith('DEC-01', {
        edited_subject: 'New Sub',
        edited_body: 'New Body INV-005 $5,000.00 2026-08-01',
      });

      const state = useChazerStore.getState();
      expect(state.decisions.length).toBe(1);
      expect(state.decisions[0].decision_id).toBe('DEC-02');
      expect(state.summary?.pending_decisions).toBe(1);
    });

    it('rolls back decision and restored pending count when approveDecisionApi throws', async () => {
      const targetDecision = {
        decision_id: 'DEC-ROLLBACK',
        invoice_id: 'INV-005',
        invoice: { client_name: 'Client 1', amount: 5000, days_overdue: 30, is_high_value: false },
        escalation_reason: 'Overdue',
        draft_subject: 'Sub',
        draft_body: 'Body',
        tier: 'TIER_3' as const,
        llm_confidence: 0.9,
        status: 'PENDING_APPROVAL' as const,
        created_at: '2026-09-12T00:00:00Z',
      };

      useChazerStore.setState({
        decisions: [targetDecision],
        summary: { total_overdue_amount: 5000, count_by_tier: { TIER_1: 0, TIER_2: 0, TIER_3: 1 }, pending_decisions: 1, sent_this_week: 0 },
      });

      vi.spyOn(api, 'approveDecisionApi').mockRejectedValueOnce(new Error('Resend API dispatch failed'));

      await useChazerStore.getState().approveDecision('DEC-ROLLBACK');

      const state = useChazerStore.getState();
      expect(state.decisions.length).toBe(1);
      expect(state.decisions[0].decision_id).toBe('DEC-ROLLBACK');
      expect(state.summary?.pending_decisions).toBe(1);
      expect(state.error).toBe('Resend API dispatch failed');
    });
  });

  describe('rejectDecision action', () => {
    it('optimistically removes decision and decrements pending count, calling API', async () => {
      const targetDecision = {
        decision_id: 'DEC-REJECT',
        invoice_id: 'INV-007',
        invoice: { client_name: 'Client 1', amount: 5000, days_overdue: 30, is_high_value: false },
        escalation_reason: 'Dispute',
        draft_subject: 'Sub',
        draft_body: 'Body',
        tier: 'TIER_3' as const,
        llm_confidence: 0.9,
        status: 'PENDING_APPROVAL' as const,
        created_at: '2026-09-12T00:00:00Z',
      };

      useChazerStore.setState({
        decisions: [targetDecision],
        summary: { total_overdue_amount: 5000, count_by_tier: { TIER_1: 0, TIER_2: 0, TIER_3: 1 }, pending_decisions: 1, sent_this_week: 0 },
      });

      const apiSpy = vi.spyOn(api, 'rejectDecisionApi').mockResolvedValueOnce({
        success: true,
        decision_id: 'DEC-REJECT',
        rejected_at: '2026-09-12T10:00:00Z',
      });

      await useChazerStore.getState().rejectDecision('DEC-REJECT', 'Client promised payment tomorrow');

      expect(apiSpy).toHaveBeenCalledWith('DEC-REJECT', 'Client promised payment tomorrow');

      const state = useChazerStore.getState();
      expect(state.decisions.length).toBe(0);
      expect(state.summary?.pending_decisions).toBe(0);
    });

    it('rolls back decision on reject failure', async () => {
      const targetDecision = {
        decision_id: 'DEC-REJ-ERR',
        invoice_id: 'INV-007',
        invoice: { client_name: 'Client 1', amount: 5000, days_overdue: 30, is_high_value: false },
        escalation_reason: 'Dispute',
        draft_subject: 'Sub',
        draft_body: 'Body',
        tier: 'TIER_3' as const,
        llm_confidence: 0.9,
        status: 'PENDING_APPROVAL' as const,
        created_at: '2026-09-12T00:00:00Z',
      };

      useChazerStore.setState({
        decisions: [targetDecision],
        summary: { total_overdue_amount: 5000, count_by_tier: { TIER_1: 0, TIER_2: 0, TIER_3: 1 }, pending_decisions: 1, sent_this_week: 0 },
      });

      vi.spyOn(api, 'rejectDecisionApi').mockRejectedValueOnce(new Error('Database conflict'));

      await useChazerStore.getState().rejectDecision('DEC-REJ-ERR', 'Reason');

      const state = useChazerStore.getState();
      expect(state.decisions.length).toBe(1);
      expect(state.decisions[0].decision_id).toBe('DEC-REJ-ERR');
      expect(state.summary?.pending_decisions).toBe(1);
      expect(state.error).toBe('Database conflict');
    });
  });

  describe('triggerSweep action', () => {
    it('sets isSweeping=true, triggers sweep API, refetches all data, and updates lastSweepAt', async () => {
      const sweepSpy = vi.spyOn(api, 'triggerSweepApi').mockResolvedValueOnce({
        sweep_id: 'swp-test-123',
        status: 'COMPLETE',
        message: 'Sweep complete',
      });
      const fetchInvoicesSpy = vi.spyOn(useChazerStore.getState(), 'fetchInvoices');
      const fetchDecisionsSpy = vi.spyOn(useChazerStore.getState(), 'fetchDecisions');
      const fetchAuditSpy = vi.spyOn(useChazerStore.getState(), 'fetchAuditLog');

      await useChazerStore.getState().triggerSweep();

      expect(sweepSpy).toHaveBeenCalled();
      expect(fetchInvoicesSpy).toHaveBeenCalled();
      expect(fetchDecisionsSpy).toHaveBeenCalled();
      expect(fetchAuditSpy).toHaveBeenCalled();
      expect(useChazerStore.getState().isSweeping).toBe(false);
      expect(useChazerStore.getState().lastSweepAt).not.toBeNull();
    });

    it('handles triggerSweep failure gracefully and resets isSweeping', async () => {
      vi.spyOn(api, 'triggerSweepApi').mockRejectedValueOnce(new Error('Sweep execution failed'));

      await useChazerStore.getState().triggerSweep();

      expect(useChazerStore.getState().isSweeping).toBe(false);
      expect(useChazerStore.getState().error).toBe('Sweep execution failed');
    });
  });
});
