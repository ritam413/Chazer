// dashboard/components/AppShell.tsx
// Core application layout shell combining Sidebar, TopBar, and responsive viewport

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useChazerStore } from '../lib/store';
import { AppShellProps } from '../lib/types';

export function AppShell({ children }: AppShellProps) {
  const { isSidebarCollapsed, summary } = useChazerStore();
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const pendingDecisions = summary?.pending_decisions ?? 3;

  return (
    <div className="min-h-screen flex flex-col transition-colors selection:bg-periwinkle-mist selection:text-off-black" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
      
      {/* Monad Ink Announcement Bar */}
      {showAnnouncement && (
        <div className="w-full text-xs py-2 px-4 sm:px-8 flex items-center justify-between z-50 transition-colors" style={{ backgroundColor: 'var(--announcement-bg)', color: 'var(--announcement-text)' }}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4 font-mono">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 uppercase text-[10px] tracking-mono-wide px-2 py-0.5 rounded-full bg-white/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Autonomous Sweep Active
              </span>
              <span className="text-xs opacity-80 hidden sm:inline">Daily sweep completed · 12 invoices parsed · {pendingDecisions} held for authorization</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/decisions" className="px-3 py-0.5 rounded-pill text-[10px] font-medium uppercase tracking-mono-tight hover:opacity-90 transition-all flex items-center gap-1" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-main)' }}>
                <span>Authorize Queue ({pendingDecisions})</span>
                <span>▸</span>
              </Link>
              <button onClick={() => setShowAnnouncement(false)} className="opacity-60 hover:opacity-100 text-xs px-1">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Operational Header */}
        <TopBar />

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12 max-w-7xl w-full mx-auto animate-fade-in space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
