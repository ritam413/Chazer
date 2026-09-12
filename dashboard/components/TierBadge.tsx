'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EscalationTier, TierBadgeProps } from '../lib/types';

export function TierBadge({ tier, isHighValue, className = '' }: TierBadgeProps & { className?: string }) {
  const getTierConfig = (t: EscalationTier) => {
    switch (t) {
      case 'TIER_1':
        return {
          label: 'T1 · Nudge',
          badgeClass: 'bg-ash-light/60 border-ash text-graphite',
          dot: 'bg-emerald-500',
        };
      case 'TIER_2':
        return {
          label: 'T2 · Firm',
          badgeClass: 'bg-ash-light border-ash text-off-black font-medium',
          dot: 'bg-amber-500',
        };
      case 'TIER_3':
        return {
          label: 'T3 · Final',
          badgeClass: 'bg-coral/25 border-coral text-off-black font-medium',
          dot: 'bg-coral',
        };
      default:
        return {
          label: 'Unclassified',
          badgeClass: 'bg-ash-light/40 border-ash text-smoke',
          dot: 'bg-smoke',
        };
    }
  };

  const config = getTierConfig(tier);

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap font-mono ${className}`}>
      <span
        data-testid={`tier-badge-${tier.toLowerCase()}`}
        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-pill text-[11px] uppercase tracking-mono-tight border transition-all ${config.badgeClass}`}
        style={{ borderColor: 'var(--border-card)' }}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>

      {isHighValue && (
        <span
          data-testid="high-value-badge"
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold tracking-mono-wide uppercase transition-all shadow-sm"
          style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-page)' }}
          title="High Value Invoice (≥ $10,000 threshold)"
        >
          <AlertTriangle className="w-3 h-3 text-coral" />
          High Value
        </span>
      )}
    </div>
  );
}
