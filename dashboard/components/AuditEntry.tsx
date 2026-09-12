// dashboard/components/AuditEntry.tsx
// Monad Editorial Design System — Immutable Autonomous Journal Entry

'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Send,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  Database,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { AuditEntry as AuditEntryType, AuditEntryProps } from '../lib/types';

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffInSeconds) || diffInSeconds < 0) {
    return 'Just now';
  }
  if (diffInSeconds < 60) {
    return diffInSeconds <= 10 ? 'Just now' : `${diffInSeconds}s ago`;
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays}d ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AuditEntry({ entry }: AuditEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'HIGH_VALUE_ESCALATED':
      case 'TIER3_ESCALATED':
      case 'DISPUTE_ESCALATED':
        return <AlertTriangle className="w-4 h-4 text-coral-accent" />;
      case 'TIER1_EMAIL_SENT':
      case 'TIER2_EMAIL_SENT':
      case 'EMAIL_SENT':
        return <Send className="w-4 h-4 text-lake-blue" />;
      case 'OWNER_APPROVED':
        return <ShieldCheck className="w-4 h-4 text-mint-accent" />;
      case 'OWNER_REJECTED':
        return <AlertTriangle className="w-4 h-4 text-coral-accent" />;
      case 'SWEEP_STARTED':
        return <PlayCircle className="w-4 h-4 text-sky-accent" />;
      case 'SWEEP_COMPLETED':
      case 'SWEEP_COMPLETE':
        return <CheckCircle2 className="w-4 h-4 text-mint-accent" />;
      case 'SEED_DATA_INGESTED':
        return <Database className="w-4 h-4 text-gold-accent" />;
      case 'SEND_FAILED':
      case 'LLM_FAILED':
        return <AlertTriangle className="w-4 h-4 text-coral-accent" />;
      default:
        return <Clock className="w-4 h-4 text-graphite dark:text-dark-graphite" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'SENT':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-mint-accent/15 text-emerald-800 dark:text-mint-accent border border-mint-accent/30">
            {status}
          </span>
        );
      case 'ESCALATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-coral-accent/15 text-coral-accent border border-coral-accent/30">
            {status}
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-sky-accent/15 text-sky-800 dark:text-sky-accent border border-sky-accent/30">
            {status}
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-coral-accent/20 text-coral-accent border border-coral-accent/40 font-bold">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-ash/20 dark:bg-dark-ash/30 text-graphite dark:text-dark-graphite border border-ash/40 dark:border-dark-ash/40">
            {status}
          </span>
        );
    }
  };

  const formattedDate = new Date(entry.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div className="relative pl-7 sm:pl-8 pb-8 group last:pb-0">
      {/* Vertical Timeline Rule */}
      <div className="absolute left-[11px] sm:left-[13px] top-6 bottom-0 w-[1px] bg-ash/40 dark:bg-dark-ash/40 group-last:hidden" />

      {/* Node Dot */}
      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-parchment-card dark:bg-dark-card border border-ash dark:border-dark-ash flex items-center justify-center shadow-xs">
        {getActionIcon(entry.action)}
      </div>

      {/* Entry Card */}
      <div className="rounded-2xl bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 p-4 sm:p-5 hover:border-lake-blue/40 dark:hover:border-lake-blue/40 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-ash/30 dark:border-dark-ash/30">
          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
            <span className="text-xs font-mono font-medium tracking-wide text-off-black dark:text-dark-ink">
              {entry.action.replace(/_/g, ' ')}
            </span>
            {entry.invoice_id && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-periwinkle-mist/40 dark:bg-periwinkle-mist/15 text-lake-blue dark:text-dark-accent border border-periwinkle-mist/60 dark:border-periwinkle-mist/30">
                {entry.invoice_id}
              </span>
            )}
            {entry.sweep_id && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-ash/20 dark:bg-dark-ash/30 text-graphite dark:text-dark-graphite">
                {entry.sweep_id}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2.5">
            {getStatusBadge(entry.status)}
            <span
              title={`${new Date(entry.timestamp).toISOString()} (${formattedDate})`}
              data-testid="audit-timestamp"
              className="font-mono text-[11px] text-smoke dark:text-dark-smoke whitespace-nowrap cursor-help hover:text-off-black dark:hover:text-dark-ink transition-colors"
            >
              {formatRelativeTime(entry.timestamp)} · {formattedDate}
            </span>
          </div>
        </div>

        {/* Highlight Summary Details */}
        <div className="py-2.5 text-xs font-mono text-graphite dark:text-dark-graphite space-y-1.5">
          {typeof entry.metadata.reason === 'string' && (
            <p className="text-ink dark:text-dark-ink leading-relaxed">
              <span className="text-smoke dark:text-dark-smoke">Reason: </span>
              {entry.metadata.reason}
            </p>
          )}
          {typeof entry.metadata.email_subject === 'string' && (
            <p className="truncate text-ink dark:text-dark-ink">
              <span className="text-smoke dark:text-dark-smoke">Subject: </span>
              &ldquo;{entry.metadata.email_subject}&rdquo;
            </p>
          )}
          {entry.metadata.invoices_processed !== undefined && (
            <div className="flex items-center space-x-3 text-[11px] text-smoke dark:text-dark-smoke">
              <span>Processed: <strong className="text-off-black dark:text-dark-ink font-semibold">{entry.metadata.invoices_processed}</strong></span>
              <span>·</span>
              <span>Dispatched: <strong className="text-off-black dark:text-dark-ink font-semibold">{entry.metadata.emails_sent}</strong></span>
              <span>·</span>
              <span>Escalated: <strong className="text-coral-accent font-semibold">{entry.metadata.escalated_count}</strong></span>
              <span>·</span>
              <span>Duration: <strong className="text-off-black dark:text-dark-ink">{entry.metadata.duration_ms}ms</strong></span>
            </div>
          )}
        </div>

        {/* Expand Metadata Toggle */}
        <div className="pt-2 border-t border-ash/30 dark:border-dark-ash/30 flex items-center justify-between">
          <span className="font-mono text-[10px] text-smoke dark:text-dark-smoke uppercase tracking-wider">
            ID: {entry.log_id}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center text-[11px] font-mono text-lake-blue dark:text-dark-accent hover:underline cursor-pointer"
          >
            {isExpanded ? (
              <>
                Hide Telemetry <ChevronUp className="w-3 h-3 ml-1" />
              </>
            ) : (
              <>
                View Telemetry Payload <ChevronDown className="w-3 h-3 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Collapsible JSON Raw Metadata */}
        {isExpanded && (
          <div className="mt-3 p-3 rounded-xl bg-ash/10 dark:bg-dark-ash/20 border border-ash/40 dark:border-dark-ash/40 font-mono text-[11px] overflow-x-auto text-off-black dark:text-dark-ink leading-relaxed">
            <pre className="whitespace-pre-wrap">{JSON.stringify(entry.metadata, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditEntry;
