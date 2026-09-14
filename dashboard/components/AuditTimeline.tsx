// dashboard/components/AuditTimeline.tsx
// Monad Editorial Design System — Chronological Activity Stream

'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, History, RefreshCw } from 'lucide-react';
import { AuditTimelineProps, AuditEntry as AuditEntryType } from '../lib/types';
import AuditEntry from './AuditEntry';

export function AuditTimeline({ entries, isLoading }: AuditTimelineProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Filter by category
      if (activeFilter === 'SWEEPS') {
        if (!entry.action.startsWith('SWEEP_')) return false;
      } else if (activeFilter === 'EMAILS') {
        if (!entry.action.includes('EMAIL_SENT')) return false;
      } else if (activeFilter === 'ESCALATIONS') {
        if (!entry.action.includes('ESCALATED')) return false;
      } else if (activeFilter === 'APPROVALS') {
        if (!entry.action.startsWith('OWNER_')) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesAction = entry.action.toLowerCase().includes(term);
        const matchesInvoice = entry.invoice_id?.toLowerCase().includes(term);
        const matchesSweep = entry.sweep_id?.toLowerCase().includes(term);
        const matchesReason =
          typeof entry.metadata?.reason === 'string' &&
          entry.metadata.reason.toLowerCase().includes(term);
        const matchesSubject =
          typeof entry.metadata?.email_subject === 'string' &&
          entry.metadata.email_subject.toLowerCase().includes(term);
        return Boolean(
          matchesAction || matchesInvoice || matchesSweep || matchesReason || matchesSubject
        );
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, activeFilter, searchTerm]);

  const filterChips = [
    { key: 'ALL', label: 'All Telemetry' },
    { key: 'SWEEPS', label: 'Agent Sweeps' },
    { key: 'EMAILS', label: 'Dispatches' },
    { key: 'ESCALATIONS', label: 'Escalations' },
    { key: 'APPROVALS', label: 'Decisions' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-24 rounded-2xl bg-ash/20 dark:bg-dark-ash/30 border border-ash/40 dark:border-dark-ash/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setActiveFilter(chip.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-off-black text-white dark:bg-white dark:text-off-black font-semibold'
                    : 'bg-transparent text-graphite dark:text-dark-graphite hover:text-off-black dark:hover:text-dark-ink border border-ash/60 dark:border-dark-ash/60'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-smoke dark:text-dark-smoke" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search telemetry, invoices..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-full bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 text-xs font-mono text-off-black dark:text-dark-ink placeholder:text-smoke dark:placeholder:text-dark-smoke focus:outline-none focus:border-lake-blue dark:focus:border-dark-accent transition-colors"
          />
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEntries.length === 0 ? (
        <div className="rounded-[32px] bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-10 text-center space-y-3">
          <History className="w-8 h-8 mx-auto text-smoke dark:text-dark-smoke stroke-[1.5]" />
          <h3 className="font-serif font-normal text-lg text-off-black dark:text-dark-ink">
            No Telemetry Records Found
          </h3>
          <p className="font-mono text-xs text-graphite dark:text-dark-graphite max-w-sm mx-auto">
            {searchTerm || activeFilter !== 'ALL'
              ? 'No audit log entries match your current search or category filter.'
              : 'The autonomous agent ledger has not recorded any events yet.'}
          </p>
          {(searchTerm || activeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveFilter('ALL');
              }}
              className="mt-2 inline-flex items-center px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider bg-transparent border border-ash dark:border-dark-ash text-off-black dark:text-dark-ink hover:bg-ash/20 dark:hover:bg-dark-ash/20 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="pt-2">
          {filteredEntries.map((entry) => (
            <AuditEntry key={entry.log_id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditTimeline;
