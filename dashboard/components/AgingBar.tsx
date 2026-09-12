'use client';

import React, { useEffect, useState } from 'react';
import { AgingBarProps } from '../lib/types';

export function AgingBar({ daysOverdue, maxDays = 60 }: AgingBarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const percentage = Math.min(100, Math.max(0, (daysOverdue / maxDays) * 100));

  const getBarColor = (days: number) => {
    if (days <= 7) return 'bg-emerald-500';
    if (days <= 21) return 'bg-amber-500';
    return 'bg-coral';
  };

  const getLabelColor = (days: number) => {
    if (days <= 7) return 'text-emerald-600 dark:text-emerald-400';
    if (days <= 21) return 'text-amber-600 dark:text-amber-400';
    return 'text-coral';
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-[140px] font-mono" data-testid="aging-bar">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className={`font-semibold ${getLabelColor(daysOverdue)}`}>
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
        </span>
        <span className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>
          /{maxDays}d
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full overflow-hidden border" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)' }}>
        <div
          data-testid="aging-bar-fill"
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(daysOverdue)}`}
          style={{ width: mounted ? `${percentage}%` : '0%' }}
        />
      </div>
    </div>
  );
}
