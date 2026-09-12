// dashboard/app/not-found.tsx
// 404 Not Found page for Chazer — Autonomous Accounts Receivable Agent

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
    <div className="min-h-screen bg-surface-base text-[#F0F0F5] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-chazer-purple selection:text-white">
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6">
        {/* Subtle Status Pill */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-card border border-border-subtle text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span className="font-mono text-gray-300">404</span>
          <span className="text-gray-600">·</span>
          <span>Ledger Entry Missing</span>
        </div>

        {/* Headline & Description */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Page or Invoice Not Found
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            The requested route or invoice context could not be located in the active ledger. It may
            have been archived, settled, or moved.
          </p>
        </div>

        {/* Refined Ledger Diagnostic Card */}
        <div className="w-full bg-surface-card/80 border border-border-subtle rounded-xl p-5 text-left shadow-card">
          <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle">
            <div className="flex items-center space-x-2.5">
              <FileQuestion className="w-4 h-4 text-chazer-purple-light" />
              <span className="text-xs font-semibold text-gray-200">Route Diagnostic</span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-gray-400 border border-border-subtle">
              INV-404-NOT-FOUND
            </span>
          </div>

          <div className="py-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Resolution</span>
              <span className="font-medium text-gray-200">Unresolved Endpoint</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status</span>
              <span className="font-medium text-amber-400">Not in Ledger</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Suggested Action</span>
              <span className="font-medium text-gray-200">Redirect to active operations</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-gray-400">
            <span>System: Chazer Recovery Engine</span>
            <span>Ref: HTTP_404_NOT_FOUND</span>
          </div>
        </div>

        {/* Recovery Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-chazer-purple hover:bg-chazer-purple-dark text-white text-xs font-semibold tracking-wide transition-colors shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>

          <Link
            href="/decisions"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-surface-elevated hover:bg-surface-card text-gray-300 hover:text-white text-xs font-medium transition-colors border border-border-subtle"
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-400" />
            Decision Queue
          </Link>
        </div>

        {/* Secondary Navigation */}
        <div className="flex items-center space-x-5 text-xs text-gray-400 pt-1">
          <Link
            href="/audit"
            className="inline-flex items-center hover:text-gray-200 transition-colors"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Audit Log
          </Link>
          <span className="text-gray-700">·</span>
          <Link
            href="/"
            className="inline-flex items-center hover:text-gray-200 transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
