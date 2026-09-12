// dashboard/app/not-found.tsx
// 404 Not Found page for Chazer — Autonomous Accounts Receivable Agent
// Monad Editorial Design System (Warm Parchment / Deep Obsidian)

import React from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  LayoutDashboard,
  AlertTriangle,
  History,
  Home,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-parchment dark:bg-dark-canvas text-ink dark:text-dark-ink flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-lake-blue selection:text-white transition-colors duration-300">
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6">
        {/* Monad Subtle Status Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 text-xs font-mono text-graphite dark:text-dark-graphite">
          <span className="w-2 h-2 rounded-full bg-gold-accent"></span>
          <span className="text-off-black dark:text-dark-ink font-semibold">404</span>
          <span className="text-smoke dark:text-dark-smoke">·</span>
          <span>Ledger Entry Missing</span>
        </div>

        {/* Editorial Headline & Description */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight text-off-black dark:text-dark-ink leading-[1.15]">
            Page or Invoice Not Found
          </h1>
          <p className="text-sm font-mono text-graphite dark:text-dark-graphite max-w-md mx-auto leading-relaxed">
            The requested ledger route or invoice context could not be located in the active journal. It may have been settled, archived, or moved.
          </p>
        </div>

        {/* Monad Diagnostic Ledger Card */}
        <div className="w-full bg-parchment-card dark:bg-dark-card border border-ash/60 dark:border-dark-ash/60 rounded-[32px] p-6 sm:p-7 text-left transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-ash/40 dark:border-dark-ash/40">
            <div className="flex items-center space-x-2.5">
              <FileQuestion className="w-4 h-4 text-lake-blue" />
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-off-black dark:text-dark-ink">
                Route Diagnostic
              </span>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-ash/20 dark:bg-dark-ash/40 text-graphite dark:text-dark-graphite border border-ash/50 dark:border-dark-ash/60">
              INV-404-NOT-FOUND
            </span>
          </div>

          <div className="py-4 space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-graphite dark:text-dark-graphite">Resolution</span>
              <span className="font-medium text-off-black dark:text-dark-ink">Unresolved Endpoint</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-graphite dark:text-dark-graphite">Status</span>
              <span className="font-medium text-coral-accent">Not in Ledger</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-graphite dark:text-dark-graphite">Suggested Action</span>
              <span className="font-medium text-off-black dark:text-dark-ink">Redirect to active operations</span>
            </div>
          </div>

          <div className="pt-3.5 border-t border-ash/40 dark:border-dark-ash/40 flex items-center justify-between text-[11px] font-mono text-smoke dark:text-dark-smoke">
            <span>System: Chazer Journal Engine</span>
            <span>Ref: HTTP_404_NOT_FOUND</span>
          </div>
        </div>

        {/* Monad Pill Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full bg-lake-blue hover:bg-lake-blue-hover text-white text-xs font-mono uppercase tracking-wider transition-colors shadow-sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
            Return to Dashboard
            <span className="ml-1.5 opacity-70">▸</span>
          </Link>

          <Link
            href="/decisions"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-full bg-transparent hover:bg-ash/20 dark:hover:bg-dark-ash/20 text-off-black dark:text-dark-ink text-xs font-mono uppercase tracking-wider transition-colors border border-ash dark:border-dark-ash"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-2 text-coral-accent" />
            Decision Queue
          </Link>
        </div>

        {/* Secondary Journal Navigation */}
        <div className="flex items-center space-x-5 text-xs font-mono text-graphite dark:text-dark-graphite pt-2">
          <Link
            href="/audit"
            className="inline-flex items-center hover:text-off-black dark:hover:text-dark-ink transition-colors"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-smoke dark:text-dark-smoke" />
            Audit Log
          </Link>
          <span className="text-ash dark:text-dark-ash">·</span>
          <Link
            href="/"
            className="inline-flex items-center hover:text-off-black dark:hover:text-dark-ink transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1.5 text-smoke dark:text-dark-smoke" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
