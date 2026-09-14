"use client";

import React, { useEffect } from "react";
import { AppShell } from "../../components/AppShell";
import { StatsBar } from "../../components/StatsBar";
import { InvoiceTable } from "../../components/InvoiceTable";
import { useChazerStore } from "../../lib/store";
import { RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const { invoices, summary, isLoadingInvoices, fetchInvoices } =
    useChazerStore();

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalOverdue = summary?.total_overdue_amount ?? 87090;
  const pendingDecisions = summary?.pending_decisions ?? 3;
  const sentThisWeek = summary?.sent_this_week ?? 4;

  return (
    <AppShell>
      <div className="space-y-10 max-w-7xl mx-auto w-full font-mono">
        {/* Page Header (Editorial Composition) */}
        <div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b"
          style={{ borderColor: "var(--border-card)" }}
        >
          <div className="space-y-2 max-w-3xl">
            <div
              className="text-xs uppercase tracking-mono-wide font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Autonomous Cashflow Supervision · Live Ledger
            </div>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-editorial"
              style={{ color: "var(--text-main)" }}
            >
              Aging Receivables
            </h1>
            <p
              className="text-xs leading-relaxed max-w-2xl pt-1"
              style={{ color: "var(--text-sub)" }}
            >
              Real-time multi-tier invoice monitoring, autonomous escalations,
              and receivables ledger with safety gates.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchInvoices()}
              disabled={isLoadingInvoices}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-btn border text-xs uppercase tracking-mono-wide font-medium transition-all disabled:opacity-50 hover:opacity-80"
              style={{
                borderColor: "var(--border-card)",
                color: "var(--text-main)",
                backgroundColor: "var(--bg-card)",
              }}
              title="Refresh invoices"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingInvoices ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <StatsBar
          totalOverdue={totalOverdue}
          pendingDecisions={pendingDecisions}
          sentThisWeek={sentThisWeek}
          isLoading={isLoadingInvoices}
        />

        {/* Elevated Tone Ladder Banner (Periwinkle Mist Style) */}
        <div className="monad-card-elevated p-8 relative overflow-hidden space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-pill border text-xs uppercase tracking-mono-tight"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-main)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--btn-primary)" }}
                ></span>
                <span>Graduated Escalation Ladder Active</span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-editorial"
                style={{ color: "var(--text-main)" }}
              >
                Three-tier autonomous collection protocol.
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-sub)" }}
              >
                Tier 1 auto-sends warm nudges (1–7d). Tier 2 references prior
                correspondence (8–21d). Tier 3 final notices are held for
                explicit owner sign-off.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1.5 rounded-pill border text-xs uppercase tracking-mono-tight"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-sub)",
                }}
              >
                T1: Friendly (1-7d)
              </span>
              <span
                className="px-3 py-1.5 rounded-pill border text-xs uppercase tracking-mono-tight"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-sub)",
                }}
              >
                T2: Firm (8-21d)
              </span>
              <span
                className="px-3 py-1.5 rounded-pill bg-coral/30 border border-coral text-xs uppercase tracking-mono-tight font-medium"
                style={{ color: "var(--text-main)" }}
              >
                T3: Held (22+d)
              </span>
            </div>
          </div>
        </div>

        {/* Invoices Table Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl sm:text-2xl font-editorial flex items-center gap-3"
              style={{ color: "var(--text-main)" }}
            >
              <span>Monitored Invoices</span>
              <span
                className="text-xs font-mono font-normal px-3 py-0.5 rounded-pill border"
                style={{
                  backgroundColor: "var(--chip-bg)",
                  borderColor: "var(--border-card)",
                  color: "var(--text-muted)",
                }}
              >
                {invoices.length} {invoices.length === 1 ? "record" : "records"}
              </span>
            </h2>
          </div>

          <InvoiceTable
            invoices={invoices}
            isLoading={isLoadingInvoices}
            onRowClick={(id) => {
              // Row interaction
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
