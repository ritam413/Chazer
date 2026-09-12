// dashboard/tests/audit-page.test.tsx
// Unit and integration tests for Audit Log page and timeline components

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditEntry } from '../components/AuditEntry';
import { AuditTimeline } from '../components/AuditTimeline';
import AuditPage from '../app/audit/page';
import { AuditEntry as AuditEntryType } from '../lib/types';
import * as apiModule from '../lib/api';

const mockAuditEntries: AuditEntryType[] = [
  {
    log_id: 'LOG-101',
    sweep_id: 'SWP-001',
    invoice_id: 'INV-005',
    action: 'HIGH_VALUE_ESCALATED',
    status: 'ESCALATED',
    metadata: {
      amount: 55000,
      threshold: 10000,
      reason: 'Amount exceeds $10,000 threshold. Auto-held for owner approval.',
    },
    timestamp: '2026-09-12T09:00:15Z',
  },
  {
    log_id: 'LOG-102',
    sweep_id: 'SWP-001',
    invoice_id: 'INV-006',
    action: 'TIER1_EMAIL_SENT',
    status: 'SUCCESS',
    metadata: {
      tier: 'TIER_1',
      resend_message_id: 're_123',
      email_subject: 'Friendly reminder: Invoice #INV-006 is due',
    },
    timestamp: '2026-09-12T09:00:12Z',
  },
  {
    log_id: 'LOG-103',
    sweep_id: 'SWP-001',
    invoice_id: null,
    action: 'SWEEP_COMPLETED',
    status: 'COMPLETED',
    metadata: {
      invoices_processed: 8,
      emails_sent: 2,
      escalated_count: 3,
      duration_ms: 1200,
    },
    timestamp: '2026-09-12T09:00:20Z',
  },
];

describe('AuditEntry Component', () => {
  it('renders action, status badge, and invoice reference', () => {
    render(<AuditEntry entry={mockAuditEntries[0]} />);
    expect(screen.getByText('HIGH VALUE ESCALATED')).toBeInTheDocument();
    expect(screen.getByText('ESCALATED')).toBeInTheDocument();
    expect(screen.getByText('INV-005')).toBeInTheDocument();
  });

  it('renders relative timestamp and absolute ISO date tooltip', () => {
    render(<AuditEntry entry={mockAuditEntries[0]} />);
    const timestampElem = screen.getByTestId('audit-timestamp');
    expect(timestampElem).toBeInTheDocument();
    expect(timestampElem).toHaveAttribute(
      'title',
      expect.stringContaining('2026-09-12T09:00:15.000Z')
    );
  });

  it('renders metadata reason and toggles telemetry JSON viewer', () => {
    render(<AuditEntry entry={mockAuditEntries[0]} />);
    expect(
      screen.getByText(/Amount exceeds \$10,000 threshold/i)
    ).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /View Telemetry Payload/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Hide Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/55000/)).toBeInTheDocument();
  });

  it('renders sweep completion telemetry summary statistics', () => {
    render(<AuditEntry entry={mockAuditEntries[2]} />);
    expect(screen.getByText('SWEEP COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1200ms')).toBeInTheDocument();
  });
});

describe('AuditTimeline Component', () => {
  it('renders all entries sorted newest-first by default', () => {
    const { container } = render(<AuditTimeline entries={mockAuditEntries} isLoading={false} />);
    const actionHeaders = container.querySelectorAll('.text-xs.font-mono.font-medium');
    expect(actionHeaders.length).toBe(3);
    // LOG-103 (09:00:20Z) should be first, followed by LOG-101 (09:00:15Z) then LOG-102 (09:00:12Z)
    expect(actionHeaders[0].textContent).toContain('SWEEP COMPLETED');
    expect(actionHeaders[1].textContent).toContain('HIGH VALUE ESCALATED');
    expect(actionHeaders[2].textContent).toContain('TIER1 EMAIL SENT');
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(<AuditTimeline entries={[]} isLoading={true} />);
    const skeletonDivs = container.querySelectorAll('.animate-pulse > div');
    expect(skeletonDivs.length).toBe(4);
  });

  it('filters entries when search term is entered', () => {
    render(<AuditTimeline entries={mockAuditEntries} isLoading={false} />);
    const searchInput = screen.getByPlaceholderText(/Search telemetry, invoices/i);
    fireEvent.change(searchInput, { target: { value: 'INV-006' } });

    expect(screen.queryByText('HIGH VALUE ESCALATED')).not.toBeInTheDocument();
    expect(screen.getByText('TIER1 EMAIL SENT')).toBeInTheDocument();
  });

  it('filters entries when category filter chip is clicked', () => {
    render(<AuditTimeline entries={mockAuditEntries} isLoading={false} />);
    const sweepsChip = screen.getByRole('button', { name: /Agent Sweeps/i });
    fireEvent.click(sweepsChip);

    expect(screen.queryByText('HIGH VALUE ESCALATED')).not.toBeInTheDocument();
    expect(screen.queryByText('TIER1 EMAIL SENT')).not.toBeInTheDocument();
    expect(screen.getByText('SWEEP COMPLETED')).toBeInTheDocument();
  });

  it('shows empty state when no matching records found', () => {
    render(<AuditTimeline entries={mockAuditEntries} isLoading={false} />);
    const searchInput = screen.getByPlaceholderText(/Search telemetry, invoices/i);
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_QUERY_123' } });

    expect(screen.getByText('No Telemetry Records Found')).toBeInTheDocument();
  });
});

describe('Audit Page Integration', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchAuditLogApi').mockResolvedValue({
      entries: mockAuditEntries,
      pagination: {
        total: 3,
        page: 1,
        limit: 20,
        has_more: false,
      },
    });
  });

  it('renders page header and metric summary cards', async () => {
    render(<AuditPage />);

    expect(
      screen.getByRole('heading', { name: /Autonomous Agent Journal/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('HIGH VALUE ESCALATED')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('Sweeps Run')).toBeInTheDocument();
  });
});
