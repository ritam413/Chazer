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
  SearchX,
  Radar,
  Zap,
} from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-base text-[#F0F0F5] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-chazer-purple selection:text-white">
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-chazer-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-tier3/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full flex flex-col items-center text-center relative z-10 space-y-8 animate-fade-in">
        {/* Radar & Status Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-surface-card border border-border-subtle shadow-glass text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tier3 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tier3"></span>
          </span>
          <span className="text-gray-400">CLASSIFICATION:</span>
          <span className="text-tier3 font-bold tracking-wider">UNCOLLECTIBLE_ROUTE</span>
          <span className="text-gray-600">·</span>
          <span className="text-chazer-purple-light font-medium">TIER_3_ESCALATED</span>
        </div>

        {/* 404 Headline & Value Prop */}
        <div className="space-y-3 max-w-xl">
          <div className="relative inline-block">
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600 select-none">
              404
            </h1>
            <div className="absolute -top-2 -right-4 px-2 py-0.5 rounded-md bg-tier3/20 border border-tier3/40 text-tier3 text-[11px] font-mono font-bold tracking-wide transform rotate-6">
              VOID
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Ledger Entry Missing
          </h2>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-lg mx-auto">
            The autonomous collection agent swept the entire receivable graph and could not locate
            this path. The invoice or route may have been closed, settled, or never issued.
          </p>
        </div>

        {/* Stylized Simulated Invoice Inspection Card */}
        <div className="w-full max-w-md glass-card p-5 sm:p-6 text-left border border-border-subtle shadow-glass font-mono relative overflow-hidden group">
          {/* Subtle top accent gradient */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-chazer-purple via-tier3 to-chazer-purple-light opacity-80" />

          <div className="flex items-center justify-between pb-3 border-b border-border-subtle text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-chazer-purple-light" />
              <span className="font-semibold text-gray-200">CHAZER AUDIT SNAPSHOT</span>
            </div>
            <span className="text-[11px] text-gray-500">ID: INV-404-NOT-FOUND</span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-border-subtle">
            <div>
              <span className="text-[11px] text-gray-500 block uppercase">Target Client</span>
              <span className="font-semibold text-gray-300">Unresolved Endpoint</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block uppercase">Aging Status</span>
              <span className="font-semibold text-tier3">∞ Days Overdue</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block uppercase">Recoverable Amount</span>
              <span className="font-semibold text-gray-300">$0.00 USD</span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block uppercase">Agent Action</span>
              <span className="font-semibold text-amber-400">Re-route Required</span>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-gray-400 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Radar className="w-3.5 h-3.5 text-chazer-purple-light animate-pulse" />
              <span>Diagnostic: HTTP 404 Route Not Registered</span>
            </span>
            <span className="text-gray-500">UTC: {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>

        {/* Action Buttons & Fast Recovery Navigation */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-chazer-purple hover:bg-chazer-purple-dark text-white text-sm font-semibold transition-all duration-200 shadow-purple-glow hover:scale-[1.02] active:scale-[0.98] border border-purple-400/30"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>

          <Link
            href="/decisions"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-surface-card hover:bg-surface-elevated text-gray-200 hover:text-white text-sm font-medium transition-all duration-200 border border-border-subtle hover:border-chazer-purple/40"
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-tier2" />
            Decision Queue
          </Link>
        </div>

        {/* Secondary Quick Links */}
        <div className="pt-2 flex items-center space-x-6 text-xs text-gray-400">
          <Link
            href="/audit"
            className="inline-flex items-center hover:text-chazer-purple-light transition-colors"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Inspect Audit Log
          </Link>
          <span className="text-gray-700">|</span>
          <Link
            href="/"
            className="inline-flex items-center hover:text-chazer-purple-light transition-colors"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            Home Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
