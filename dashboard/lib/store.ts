// dashboard/lib/store.ts
// Zustand store for Chazer client state, optimistic actions, and API synchronization

import { create } from 'zustand';
import {
  Invoice,
  Summary,
  Decision,
  AuditEntry,
  InvoiceSortField,
  SortOrder,
  EmailContent,
} from './types';
import {
  FALLBACK_INVOICES,
  FALLBACK_DECISIONS,
  FALLBACK_SUMMARY,
  fetchInvoicesApi,
  fetchDecisionsApi,
  fetchAuditLogApi,
  approveDecisionApi,
  rejectDecisionApi,
  triggerSweepApi,
} from './api';

export interface ChazerStoreState {
  // Data
  invoices: Invoice[];
  decisions: Decision[];
  auditEntries: AuditEntry[];
  summary: Summary | null;

  // UI State
  isSidebarCollapsed: boolean;
  activeFilter: { status?: string; tier?: string };
  sortField: InvoiceSortField | string;
  sortOrder: SortOrder;

  // Loading & Async
  isLoadingInvoices: boolean;
  isLoadingDecisions: boolean;
  isLoadingAudit: boolean;
  isSweeping: boolean;
  lastSweepAt: string | null;
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setFilter: (filter: { status?: string; tier?: string }) => void;
  setSorting: (field: InvoiceSortField | string, order: SortOrder) => void;
  fetchInvoices: () => Promise<void>;
  fetchDecisions: () => Promise<void>;
  fetchAuditLog: () => Promise<void>;
  approveDecision: (decisionId: string, content?: EmailContent) => Promise<void>;
  rejectDecision: (decisionId: string, reason?: string) => Promise<void>;
  triggerSweep: () => Promise<void>;
}

export const useChazerStore = create<ChazerStoreState>((set, get) => ({
  // Default Initial State
  invoices: FALLBACK_INVOICES,
  decisions: FALLBACK_DECISIONS,
  auditEntries: [],
  summary: FALLBACK_SUMMARY,

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

  toggleSidebar: () => {
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ isSidebarCollapsed: collapsed });
  },

  setFilter: (filter: { status?: string; tier?: string }) => {
    set({ activeFilter: filter });
  },

  setSorting: (field: InvoiceSortField | string, order: SortOrder) => {
    set({ sortField: field, sortOrder: order });
  },

  fetchInvoices: async () => {
    set({ isLoadingInvoices: true, error: null });
    try {
      const { activeFilter, sortField, sortOrder } = get();
      const res = await fetchInvoicesApi({
        ...activeFilter,
        sort: String(sortField),
        order: sortOrder,
      });
      set({
        invoices: res.invoices,
        summary: res.summary,
        isLoadingInvoices: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoadingInvoices: false,
        error: err.message || 'Failed to fetch invoices',
      });
    }
  },

  fetchDecisions: async () => {
    set({ isLoadingDecisions: true, error: null });
    try {
      const res = await fetchDecisionsApi({ status: 'PENDING_APPROVAL' });
      set({
        decisions: res.decisions,
        isLoadingDecisions: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoadingDecisions: false,
        error: err.message || 'Failed to fetch decisions',
      });
    }
  },

  fetchAuditLog: async () => {
    set({ isLoadingAudit: true, error: null });
    try {
      const res = await fetchAuditLogApi({ limit: 50 });
      set({
        auditEntries: res.entries,
        isLoadingAudit: false,
        error: null,
      });
    } catch (err: any) {
      set({
        isLoadingAudit: false,
        error: err.message || 'Failed to fetch audit log',
      });
    }
  },

  approveDecision: async (decisionId: string, content?: EmailContent) => {
    const prevDecisions = get().decisions;
    const prevSummary = get().summary;

    // Optimistic Update
    set({
      decisions: prevDecisions.filter((d) => d.decision_id !== decisionId),
      summary: prevSummary
        ? {
            ...prevSummary,
            pending_decisions: Math.max(0, prevSummary.pending_decisions - 1),
          }
        : null,
      error: null,
    });

    try {
      await approveDecisionApi(decisionId, content);
    } catch (err: any) {
      // Rollback on failure
      set({
        decisions: prevDecisions,
        summary: prevSummary,
        error: err.message || 'Failed to approve decision',
      });
    }
  },

  rejectDecision: async (decisionId: string, reason?: string) => {
    const prevDecisions = get().decisions;
    const prevSummary = get().summary;

    // Optimistic Update
    set({
      decisions: prevDecisions.filter((d) => d.decision_id !== decisionId),
      summary: prevSummary
        ? {
            ...prevSummary,
            pending_decisions: Math.max(0, prevSummary.pending_decisions - 1),
          }
        : null,
      error: null,
    });

    try {
      await rejectDecisionApi(decisionId, reason);
    } catch (err: any) {
      // Rollback on failure
      set({
        decisions: prevDecisions,
        summary: prevSummary,
        error: err.message || 'Failed to reject decision',
      });
    }
  },

  triggerSweep: async () => {
    set({ isSweeping: true, error: null });
    try {
      await triggerSweepApi();
      await Promise.all([
        get().fetchInvoices(),
        get().fetchDecisions(),
        get().fetchAuditLog(),
      ]);
      set({
        isSweeping: false,
        lastSweepAt: new Date().toISOString(),
      });
    } catch (err: any) {
      set({
        isSweeping: false,
        error: err.message || 'Failed to trigger sweep',
      });
    }
  },
}));
