'use client';

import React from 'react';
import { DollarSign, ShieldAlert, Send, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { StatsBarProps, StatCardProps } from '../lib/types';

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  accentColor = 'purple',
  isLoading = false,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        data-testid="stat-card-skeleton"
        className="monad-card p-6 flex flex-col justify-between h-36 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-3.5 rounded w-24" style={{ backgroundColor: 'var(--chip-bg)' }} />
          <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--chip-bg)' }} />
        </div>
        <div className="h-8 rounded w-32 my-1" style={{ backgroundColor: 'var(--chip-bg)' }} />
        <div className="h-3 rounded w-20" style={{ backgroundColor: 'var(--chip-bg)' }} />
      </div>
    );
  }

  const getAccentBorder = (accent: StatCardProps['accentColor']) => {
    switch (accent) {
      case 'red':
        return 'border-l-4 border-l-coral';
      case 'amber':
        return 'border-l-4 border-l-gold';
      case 'green':
        return 'border-l-4 border-l-mint';
      case 'purple':
      default:
        return 'border-l-4 border-l-lake-blue';
    }
  };

  return (
    <div
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`monad-card p-6 flex flex-col justify-between transition-all duration-200 ${getAccentBorder(accentColor)}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-mono-wide font-medium font-mono" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
        <div className="p-2 rounded-full border flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
          {accentColor === 'red' ? (
            <DollarSign className="w-4 h-4 text-coral" />
          ) : accentColor === 'amber' ? (
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          ) : accentColor === 'green' ? (
            <Send className="w-4 h-4 text-emerald-500" />
          ) : (
            <DollarSign className="w-4 h-4 text-lake-blue" />
          )}
        </div>
      </div>

      <div className="my-2">
        <div className="text-3xl sm:text-4xl font-editorial tracking-serif-tight" style={{ color: 'var(--text-main)' }}>
          {value}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono pt-1" style={{ color: 'var(--text-sub)' }}>
        {subtitle && <span>{subtitle}</span>}
        {trend && (
          <div className="flex items-center gap-1 font-medium">
            {trend === 'up' ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3.5 h-3.5 text-coral" />
            ) : (
              <Minus className="w-3.5 h-3.5 opacity-60" />
            )}
            {trendLabel && <span>{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsBar({
  totalOverdue,
  pendingDecisions,
  sentThisWeek = 4,
  isLoading = false,
}: StatsBarProps) {
  const formattedOverdue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(totalOverdue || 0);

  if (isLoading) {
    return (
      <div data-testid="stats-bar-skeleton" className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
        <StatCard title="Total Overdue" value="" isLoading={true} />
        <StatCard title="Pending Decisions" value="" isLoading={true} />
        <StatCard title="Sent This Week" value="" isLoading={true} />
      </div>
    );
  }

  return (
    <div data-testid="stats-bar" className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
      <StatCard
        title="Total Overdue"
        value={formattedOverdue}
        subtitle="Active aging receivables"
        accentColor="red"
      />
      <StatCard
        title="Pending Decisions"
        value={pendingDecisions}
        subtitle={pendingDecisions === 1 ? '1 item requires review' : `${pendingDecisions} items require review`}
        accentColor={pendingDecisions > 0 ? 'amber' : 'purple'}
      />
      <StatCard
        title="Sent This Week"
        value={sentThisWeek}
        subtitle="Autonomous tier notices"
        accentColor="green"
      />
    </div>
  );
}
