// dashboard/components/TopBar.tsx
// Top navigation and operational header bar

'use client';

import React from 'react';
import { Play, RefreshCw, Sparkles, Menu, ShieldCheck } from 'lucide-react';
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
    <div className="flex items-center space-x-2 text-xs text-gray-400 bg-surface-elevated/70 px-3 py-1.5 rounded-full border border-border-subtle/80 backdrop-blur-sm">
      {isSweeping ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-chazer-purple-light animate-spin" />
          <span className="text-chazer-purple-light font-medium">Sweep running...</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tier1 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tier1"></span>
          </span>
          <span>
            Last sweep: <strong className="text-gray-200 font-medium">{formatTimeAgo(lastSweepAt)}</strong>
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
      className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm ${
        isSweeping || isDisabled
          ? 'bg-chazer-purple/40 text-gray-300 cursor-not-allowed border border-chazer-purple/30'
          : 'bg-chazer-purple hover:bg-chazer-purple-dark text-white hover:shadow-purple-glow active:scale-95 border border-purple-400/30'
      }`}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isSweeping ? 'animate-spin' : ''}`} />
      <span>{isSweeping ? 'Sweeping...' : 'Run Sweep'}</span>
    </button>
  );
}

export function TopBar() {
  const { isSweeping, lastSweepAt, triggerSweep, toggleSidebar } = useChazerStore();

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-surface-base/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-4 sm:px-6">
      {/* Left side: Mobile menu toggle and breadcrumb */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/40 text-chazer-purple-light text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Autonomous A/R Agent</span>
            <span className="sm:hidden">Agent</span>
          </div>
          <div className="hidden lg:flex items-center space-x-1 text-xs text-gray-500">
            <span>·</span>
            <span>Zero-Credit Resend Sandbox Mode Active</span>
          </div>
        </div>
      </div>

      {/* Right side: Sweep status and action */}
      <div className="flex items-center space-x-3">
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
