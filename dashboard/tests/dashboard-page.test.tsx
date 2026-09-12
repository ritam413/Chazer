import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TierBadge } from '../components/TierBadge';
import { AgingBar } from '../components/AgingBar';
import { StatCard, StatsBar } from '../components/StatsBar';
import { InvoiceTable } from '../components/InvoiceTable';
import DashboardPage from '../app/dashboard/page';
import { useChazerStore } from '../lib/store';
import { FALLBACK_INVOICES, FALLBACK_SUMMARY } from '../lib/api';

describe('FRONT-02: Dashboard Components & Page', () => {
  beforeEach(() => {
    useChazerStore.setState({
      invoices: FALLBACK_INVOICES,
      summary: FALLBACK_SUMMARY,
      isLoadingInvoices: false,
      activeFilter: {},
      sortField: 'days_overdue',
      sortOrder: 'desc',
    });
  });

  describe('TierBadge Component', () => {
    it('renders correct labels and classes for TIER_1, TIER_2, and TIER_3', () => {
      const { rerender } = render(<TierBadge tier="TIER_1" />);
      expect(screen.getByText('T1 · Nudge')).toBeInTheDocument();

      rerender(<TierBadge tier="TIER_2" />);
      expect(screen.getByText('T2 · Firm')).toBeInTheDocument();

      rerender(<TierBadge tier="TIER_3" />);
      expect(screen.getByText('T3 · Final')).toBeInTheDocument();
    });

    it('renders High Value badge when isHighValue is true', () => {
      render(<TierBadge tier="TIER_3" isHighValue={true} />);
      expect(screen.getByTestId('high-value-badge')).toBeInTheDocument();
      expect(screen.getByText('High Value')).toBeInTheDocument();
    });
  });

  describe('AgingBar Component', () => {
    it('renders formatted days overdue and progress fill', () => {
      render(<AgingBar daysOverdue={43} maxDays={60} />);
      expect(screen.getByText(/43 days/i)).toBeInTheDocument();
      expect(screen.getByText('/60d')).toBeInTheDocument();
      expect(screen.getByTestId('aging-bar-fill')).toBeInTheDocument();
    });

    it('handles singular 1 day', () => {
      render(<AgingBar daysOverdue={1} />);
      expect(screen.getByText(/1 day/i)).toBeInTheDocument();
    });
  });

  describe('StatsBar Component', () => {
    it('renders formatted total overdue currency and count metrics', () => {
      render(
        <StatsBar
          totalOverdue={87090}
          pendingDecisions={3}
          sentThisWeek={4}
          isLoading={false}
        />
      );

      expect(screen.getByText('$87,090')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Total Overdue')).toBeInTheDocument();
      expect(screen.getByText('Pending Decisions')).toBeInTheDocument();
    });

    it('renders skeleton cards when loading', () => {
      render(
        <StatsBar
          totalOverdue={0}
          pendingDecisions={0}
          sentThisWeek={0}
          isLoading={true}
        />
      );
      expect(screen.getByTestId('stats-bar-skeleton')).toBeInTheDocument();
    });
  });

  describe('InvoiceTable Component', () => {
    it('renders seed invoices by default in descending order of days overdue', () => {
      render(<InvoiceTable invoices={FALLBACK_INVOICES} isLoading={false} />);

      expect(screen.getByTestId('invoice-row-INV-005')).toBeInTheDocument();
      expect(screen.getAllByText('INV-005').length).toBeGreaterThan(0);
      expect(screen.getAllByText('DeltaWave Media').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bluebell Studios').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$55,000.00').length).toBeGreaterThan(0);
    });

    it('filters invoices client-side by search query', () => {
      render(<InvoiceTable invoices={FALLBACK_INVOICES} isLoading={false} />);

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'DeltaWave' } });

      expect(screen.getByTestId('invoice-row-INV-005')).toBeInTheDocument();
      expect(screen.queryByTestId('invoice-row-INV-008')).not.toBeInTheDocument();
    });

    it('filters invoices client-side by Tier dropdown', () => {
      render(<InvoiceTable invoices={FALLBACK_INVOICES} isLoading={false} />);

      const tierSelect = screen.getByTestId('tier-filter-select');
      fireEvent.change(tierSelect, { target: { value: 'TIER_1' } });

      expect(screen.getByTestId('invoice-row-INV-006')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-row-INV-004')).toBeInTheDocument();
      expect(screen.queryByTestId('invoice-row-INV-005')).not.toBeInTheDocument();
    });

    it('filters invoices client-side by Status dropdown', () => {
      render(<InvoiceTable invoices={FALLBACK_INVOICES} isLoading={false} />);

      const statusSelect = screen.getByTestId('status-filter-select');
      fireEvent.change(statusSelect, { target: { value: 'DISPUTED' } });

      expect(screen.getByTestId('invoice-row-INV-007')).toBeInTheDocument();
      expect(screen.queryByTestId('invoice-row-INV-005')).not.toBeInTheDocument();
    });

    it('shows empty state when no invoices match filters', () => {
      render(<InvoiceTable invoices={FALLBACK_INVOICES} isLoading={false} />);

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'NonexistentClientXYZ' } });

      expect(screen.getByTestId('invoice-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No invoices found')).toBeInTheDocument();
    });

    it('shows table skeleton when isLoading is true', () => {
      render(<InvoiceTable invoices={[]} isLoading={true} />);
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });
  });

  describe('DashboardPage Integration', () => {
    it('renders full dashboard page with shell, stats, and invoice list', async () => {
      render(<DashboardPage />);

      expect(screen.getByText('Aging Receivables')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('stats-bar')).toBeInTheDocument();
        expect(screen.getByTestId('invoice-table-container')).toBeInTheDocument();
        expect(screen.getByTestId('invoice-row-INV-005')).toBeInTheDocument();
      });
    });
  });
});
