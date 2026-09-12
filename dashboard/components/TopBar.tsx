// dashboard/components/TopBar.tsx
// Top navigation and operational header bar in Monad Editorial Style

'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, Menu, Moon, Sun } from 'lucide-react';
import { useChazerStore } from '../lib/store';
import { SweepStatusIndicatorProps, TriggerSweepButtonProps } from '../lib/types';

export function SweepStatusIndicator({ lastSweepAt, isSweeping }: SweepStatusIndicatorProps) {
  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Not yet run';
    try {
      const date = new Date(isoString);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes === 1) return '1 min ago';
      if (diffMinutes < 60) return `${diffMinutes} min ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex items-center space-x-2 text-xs font-mono px-3.5 py-1.5 rounded-pill border transition-colors" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-sub)' }}>
      {isSweeping ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-lake-blue animate-spin" />
          <span className="text-lake-blue font-medium">Sweep running...</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>
            Last sweep: <strong className="font-medium" style={{ color: 'var(--text-main)' }}>{formatTimeAgo(lastSweepAt)}</strong>
          </span>
        </>
      )}
    </div>
  );
}

export function TriggerSweepButton({ onTrigger, isDisabled, isSweeping }: TriggerSweepButtonProps) {
  return (
    <button
      type="button"
      onClick={onTrigger}
      disabled={isDisabled || isSweeping}
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-btn text-xs uppercase tracking-mono-wide font-medium transition-all duration-200 shadow-sm active:scale-95 ${
        isSweeping || isDisabled
          ? 'opacity-60 cursor-not-allowed bg-ash text-graphite'
          : 'bg-lake-blue hover:opacity-90 text-white'
      }`}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
      <span>{isSweeping ? 'Sweeping...' : 'Run Sweep'}</span>
    </button>
  );
}

export function TopBar() {
  const { isSweeping, lastSweepAt, triggerSweep, toggleSidebar } = useChazerStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full backdrop-blur-md border-b flex items-center justify-between px-4 sm:px-6 transition-colors" style={{ backgroundColor: 'rgba(var(--bg-page), 0.85)', borderColor: 'var(--border-card)' }}>
      {/* Left side: Mobile menu toggle and breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="md:hidden p-2 rounded-lg hover:opacity-80 transition-colors"
          style={{ color: 'var(--text-sub)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-pill border text-xs font-mono font-medium" style={{ backgroundColor: 'var(--chip-bg)', borderColor: 'var(--border-card)', color: 'var(--text-main)' }}>
            <Sparkles className="w-3.5 h-3.5 text-lake-blue" />
            <span className="hidden sm:inline">Autonomous A/R Agent</span>
            <span className="sm:hidden">Agent</span>
          </div>
          <div className="hidden lg:flex items-center space-x-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <span>·</span>
            <span>Zero-Credit Sandbox Active</span>
          </div>
        </div>
      </div>

      {/* Right side: Theme switch, sweep status and action */}
      <div className="flex items-center space-x-3">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle Light/Dark Theme"
          className="p-2 rounded-full border transition-colors hover:opacity-80 flex items-center justify-center"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-main)' }}
        >
          {isDark ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4" />}
        </button>

        <SweepStatusIndicator lastSweepAt={lastSweepAt} isSweeping={isSweeping} />
        <TriggerSweepButton
          onTrigger={triggerSweep}
          isDisabled={false}
          isSweeping={isSweeping}
        />
      </div>
    </header>
  );
}
