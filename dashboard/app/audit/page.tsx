// dashboard/app/audit/page.tsx
// Monad Editorial Design System — Audit Log & Autonomous Execution Journal

'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { AuditTimeline } from '../../components/AuditTimeline';
import { fetchAuditLogApi } from '../../lib/api';
import { AuditEntry } from '../../lib/types';
import { RefreshCw, ShieldCheck, Activity, Send, AlertTriangle } from 'lucide-react';

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAuditLogs = async () => {
    try {
      const data = await fetchAuditLogApi({ limit: 50 });
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load audit telemetry:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAuditLogs();
  };

  // Telemetry stats
  const totalEvents = entries.length;
  const sweepEvents = entries.filter((e) => e.action.startsWith('SWEEP_')).length;
  const dispatchEvents = entries.filter((e) => e.action.includes('EMAIL_SENT')).length;
  const escalationEvents = entries.filter((e) => e.action.includes('ESCALATED')).length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-ash/40 dark:border-dark-ash/40">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 text-[11px] font-mono uppercase tracking-widest text-graphite dark:text-dark-graphite">
              <span>Section 03</span>
              <span>·</span>
              <span className="text-lake-blue dark:text-dark-accent">Immutable Ledger</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal text-off-black dark:text-dark-ink tracking-tight leading-[1.15]">
              Autonomous Agent Journal
            </h1>
            <p className="text-xs sm:text-sm font-mono text-graphite dark:text-dark-graphite max-w-2xl leading-relaxed">
              Every invoice evaluation, LLM tone calibration, high-value escalation, and human-in-the-loop authorization is permanently recorded in this execution stream.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 rounded-full border border-ash dark:border-dark-ash hover:bg-ash/20 dark:hover:bg-dark-ash/20 text-off-black dark:text-dark-ink text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Syncing...' : 'Sync Journal'}
            </button>
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-graphite dark:text-dark-graphite">
                Total Events
              </span>
              <Activity className="w-4 h-4 text-lake-blue dark:text-dark-accent" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-normal text-off-black dark:text-dark-ink">
              {isLoading ? '—' : totalEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-graphite dark:text-dark-graphite">
                Sweeps Run
              </span>
              <ShieldCheck className="w-4 h-4 text-mint-accent" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-normal text-off-black dark:text-dark-ink">
              {isLoading ? '—' : sweepEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-graphite dark:text-dark-graphite">
                Dispatches
              </span>
              <Send className="w-4 h-4 text-sky-accent" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-normal text-off-black dark:text-dark-ink">
              {isLoading ? '—' : dispatchEvents}
            </div>
          </div>

          <div className="rounded-2xl bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-graphite dark:text-dark-graphite">
                Escalations
              </span>
              <AlertTriangle className="w-4 h-4 text-coral-accent" />
            </div>
            <div className="text-2xl sm:text-3xl font-serif font-normal text-off-black dark:text-dark-ink">
              {isLoading ? '—' : escalationEvents}
            </div>
          </div>
        </div>

        {/* Vertical Journal Timeline */}
        <div className="rounded-[32px] bg-parchment-card/60 dark:bg-dark-card/60 border border-ash/60 dark:border-dark-ash/60 p-6 sm:p-8">
          <AuditTimeline entries={entries} isLoading={isLoading} />
        </div>
      </div>
    </AppShell>
  );
}
