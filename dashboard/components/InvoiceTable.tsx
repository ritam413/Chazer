'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
  AlertCircle,
  Clock,
  Mail,
} from 'lucide-react';
import { Invoice, InvoiceSortField, SortOrder, InvoiceTableProps } from '../lib/types';
import { TierBadge } from './TierBadge';
import { AgingBar } from './AgingBar';

export function TableSkeleton() {
  return (
    <div data-testid="table-skeleton" className="space-y-4 w-full">
      <div className="h-12 rounded-card animate-pulse" style={{ backgroundColor: 'var(--chip-bg)' }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 rounded-card border animate-pulse flex items-center justify-between px-6"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="h-4 rounded w-20" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="h-4 rounded w-32" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="h-4 rounded w-24" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="h-4 rounded w-28" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="h-4 rounded w-20" style={{ backgroundColor: 'var(--chip-bg)' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = 'No invoices found',
  description = 'No invoices match your current search or filter criteria.',
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div
      data-testid="invoice-empty-state"
      className="monad-card p-12 flex flex-col items-center justify-center text-center space-y-4 my-6"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
        <Inbox className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h3 className="text-2xl font-editorial" style={{ color: 'var(--text-main)' }}>{title}</h3>
        <p className="text-xs max-w-sm font-mono leading-relaxed" style={{ color: 'var(--text-sub)' }}>{description}</p>
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-2 px-6 py-2.5 rounded-btn text-xs uppercase tracking-mono-wide font-medium transition-all"
          style={{ backgroundColor: 'var(--btn-secondary)', color: 'var(--btn-secondary-text)' }}
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}

export function InvoiceTable({ invoices, isLoading, onRowClick }: InvoiceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<InvoiceSortField>('days_overdue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoice_id.toLowerCase().includes(q) ||
          inv.client_name.toLowerCase().includes(q) ||
          inv.client_email.toLowerCase().includes(q) ||
          (inv.services_description && inv.services_description.toLowerCase().includes(q))
      );
    }

    // Tier filter
    if (tierFilter !== 'ALL') {
      result = result.filter((inv) => inv.tier === tierFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any = a[sortField] ?? '';
      let bVal: any = b[sortField] ?? '';

      if (sortField === 'client_name') {
        aVal = a.client_name.toLowerCase();
        bVal = b.client_name.toLowerCase();
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [invoices, searchTerm, tierFilter, statusFilter, sortField, sortOrder]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string, disputeFlag: boolean) => {
    if (disputeFlag || status === 'DISPUTED') {
      return (
        <span
          data-testid="status-disputed"
          className="inline-flex items-center gap-1 px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium bg-coral/30 border border-coral text-off-black"
        >
          <AlertCircle className="w-3 h-3 text-coral" />
          DISPUTED
        </span>
      );
    }

    switch (status) {
      case 'OVERDUE':
        return (
          <span
            data-testid="status-overdue"
            className="inline-flex items-center gap-1 px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium border"
            style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}
          >
            <Clock className="w-3 h-3 text-amber-500" />
            OVERDUE
          </span>
        );
      case 'PAID':
        return (
          <span
            data-testid="status-paid"
            className="inline-flex items-center px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium bg-mint/40 border border-ash text-off-black"
          >
            PAID
          </span>
        );
      case 'FINAL_NOTICE_SENT':
        return (
          <span
            data-testid="status-final-notice"
            className="inline-flex items-center px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium bg-coral/20 border border-coral text-off-black"
          >
            FINAL SENT
          </span>
        );
      case 'SENT':
        return (
          <span
            data-testid="status-sent"
            className="inline-flex items-center px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium border"
            style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--btn-primary)' }}
          >
            SENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-pill text-[10px] uppercase tracking-mono-tight font-medium border" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
            {status}
          </span>
        );
    }
  };

  const getSortIcon = (field: InvoiceSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-lake-blue" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-lake-blue" />
    );
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6 w-full font-mono" data-testid="invoice-table-container">
      {/* Controls Bar in Monad Pill Design */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            data-testid="invoice-search-input"
            placeholder="Search by client, invoice ID, services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-pill border text-xs focus:outline-none transition-all"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill border text-xs" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)' }}>
            <Filter className="w-3.5 h-3.5 opacity-60" />
            <span className="text-xs opacity-70 font-medium" style={{ color: 'var(--text-sub)' }}>Tier:</span>
            <select
              data-testid="tier-filter-select"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              <option value="ALL">All Tiers</option>
              <option value="TIER_1">Tier 1 (Nudge)</option>
              <option value="TIER_2">Tier 2 (Firm)</option>
              <option value="TIER_3">Tier 3 (Final)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill border text-xs" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)' }}>
            <span className="text-xs opacity-70 font-medium" style={{ color: 'var(--text-sub)' }}>Status:</span>
            <select
              data-testid="status-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OVERDUE">Overdue</option>
              <option value="DISPUTED">Disputed</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List / Table */}
      {filteredAndSortedInvoices.length === 0 ? (
        <EmptyState
          onReset={() => {
            setSearchTerm('');
            setTierFilter('ALL');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <>
          {/* Desktop Table View (≥ 768px) with Hairline Borders */}
          <div className="hidden md:block overflow-hidden border rounded-card" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--bg-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" data-testid="invoices-table">
                <thead>
                  <tr className="border-b uppercase tracking-mono-wide text-[11px] font-medium" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--chip-bg)', color: 'var(--text-muted)' }}>
                    <th className="py-4 px-6">Invoice ID</th>
                    <th
                      className="py-4 px-6 cursor-pointer hover:opacity-100 transition-opacity group"
                      onClick={() => handleSort('client_name')}
                    >
                      <div className="flex items-center gap-1.5">
                        Client
                        {getSortIcon('client_name')}
                      </div>
                    </th>
                    <th
                      className="py-4 px-6 cursor-pointer hover:opacity-100 transition-opacity group"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-1.5">
                        Amount
                        {getSortIcon('amount')}
                      </div>
                    </th>
                    <th
                      className="py-4 px-6 cursor-pointer hover:opacity-100 transition-opacity group"
                      onClick={() => handleSort('due_date')}
                    >
                      <div className="flex items-center gap-1.5">
                        Due Date
                        {getSortIcon('due_date')}
                      </div>
                    </th>
                    <th
                      className="py-4 px-6 cursor-pointer hover:opacity-100 transition-opacity group"
                      onClick={() => handleSort('days_overdue')}
                    >
                      <div className="flex items-center gap-1.5">
                        Aging
                        {getSortIcon('days_overdue')}
                      </div>
                    </th>
                    <th className="py-4 px-6">Tier</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Last Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs divide-ash">
                  {filteredAndSortedInvoices.map((inv) => (
                    <tr
                      key={inv.invoice_id}
                      data-testid={`invoice-row-${inv.invoice_id}`}
                      onClick={() => onRowClick && onRowClick(inv.invoice_id)}
                      className="hover:opacity-90 transition-colors cursor-pointer group"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      {/* Invoice ID */}
                      <td className="py-4 px-6 font-mono font-medium" style={{ color: 'var(--text-main)' }}>
                        <span className="group-hover:underline">
                          {inv.invoice_id}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium" style={{ color: 'var(--text-main)' }}>{inv.client_name}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{inv.client_email}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 font-medium font-mono" style={{ color: 'var(--text-main)' }}>
                        {formatCurrency(inv.amount)}
                      </td>

                      {/* Due Date */}
                      <td className="py-4 px-6 text-xs" style={{ color: 'var(--text-sub)' }}>
                        {formatDate(inv.due_date)}
                      </td>

                      {/* Aging */}
                      <td className="py-4 px-6">
                        <AgingBar daysOverdue={inv.days_overdue} />
                      </td>

                      {/* Tier */}
                      <td className="py-4 px-6">
                        <TierBadge tier={inv.tier} isHighValue={inv.is_high_value || inv.amount >= 10000} />
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {getStatusBadge(inv.status, inv.dispute_flag)}
                      </td>

                      {/* Last Contact */}
                      <td className="py-4 px-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {inv.contact_count > 0 ? (
                          <div className="flex items-center gap-1.5" title={`Contact count: ${inv.contact_count}`}>
                            <Mail className="w-3.5 h-3.5 text-lake-blue" />
                            <span>
                              {inv.contact_count} {inv.contact_count === 1 ? 'touch' : 'touches'}
                            </span>
                          </div>
                        ) : (
                          <span className="opacity-50">No contacts</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden space-y-4" data-testid="invoices-mobile-list">
            {filteredAndSortedInvoices.map((inv) => (
              <div
                key={inv.invoice_id}
                data-testid={`invoice-card-${inv.invoice_id}`}
                onClick={() => onRowClick && onRowClick(inv.invoice_id)}
                className="monad-card p-5 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                      {inv.invoice_id}
                    </span>
                    <TierBadge tier={inv.tier} isHighValue={inv.is_high_value || inv.amount >= 10000} />
                  </div>
                  {getStatusBadge(inv.status, inv.dispute_flag)}
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <h4 className="font-editorial text-lg" style={{ color: 'var(--text-main)' }}>{inv.client_name}</h4>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{inv.services_description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                      {formatCurrency(inv.amount)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--border-card)', color: 'var(--text-muted)' }}>
                  <span>Due: {formatDate(inv.due_date)}</span>
                  <AgingBar daysOverdue={inv.days_overdue} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
