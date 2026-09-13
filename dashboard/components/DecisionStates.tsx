'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';

export function DecisionSkeleton() {
  return (
    <div data-testid="decision-skeleton" className="space-y-6 w-full font-mono">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="monad-card p-8 border animate-pulse space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
        >
          <div className="flex items-center justify-between">
            <div className="h-6 rounded w-48" style={{ backgroundColor: 'var(--chip-bg)' }} />
            <div className="h-6 rounded w-24" style={{ backgroundColor: 'var(--chip-bg)' }} />
          </div>
          <div className="h-16 rounded-2xl" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="h-32 rounded-2xl" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="flex justify-end gap-3 pt-2">
            <div className="h-9 rounded-btn w-24" style={{ backgroundColor: 'var(--chip-bg)' }} />
            <div className="h-9 rounded-btn w-32" style={{ backgroundColor: 'var(--chip-bg)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyDecisionsState() {
  return (
    <div
      data-testid="empty-decisions-state"
      className="monad-card p-16 flex flex-col items-center justify-center text-center space-y-4 my-8 font-mono"
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center border text-emerald-500" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)' }}>
        <CheckCircle className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-editorial" style={{ color: 'var(--text-main)' }}>No decisions needed</h3>
        <p className="text-xs max-w-md leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          Your autonomous agent is handling receivables smoothly. Invoices requiring human sign-off (e.g. high-value thresholds or disputed terms) will appear here.
        </p>
      </div>
    </div>
  );
}
