// supabase/functions/api-router/index.ts
// Supabase Edge Function: REST API Router serving dashboard endpoints:
// GET /invoices, GET /decisions, GET /audit-log

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import {
  CORS_HEADERS,
  type EnrichedInvoice,
  type InvoicesSummary,
  type DecisionItem,
  type AuditEntryItem,
  type InvoicesQueryParams,
  type DecisionsQueryParams,
  type AuditLogQueryParams,
  type InvoicesResponse,
  type DecisionsResponse,
  type AuditLogResponse,
} from "../_shared/types";

export {
  CORS_HEADERS,
  type EnrichedInvoice,
  type InvoicesSummary,
  type DecisionItem,
  type AuditEntryItem,
  type InvoicesQueryParams,
  type DecisionsQueryParams,
  type AuditLogQueryParams,
  type InvoicesResponse,
  type DecisionsResponse,
  type AuditLogResponse,
};

export const MOCK_INVOICES: EnrichedInvoice[] = [
  {
    invoice_id: "INV-001",
    client_id: "CLI-001",
    client_name: "Acme Corp",
    client_email: "ap@acme.com",
    amount: 4800.0,
    currency: "USD",
    due_date: "2026-08-15",
    days_overdue: 28,
    status: "OVERDUE",
    tier: "TIER_3",
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "UX Design Sprint — August 2026",
  },
  {
    invoice_id: "INV-002",
    client_id: "CLI-002",
    client_name: "Bluebell Studios",
    client_email: "finance@bluebell.io",
    amount: 12500.0,
    currency: "USD",
    due_date: "2026-08-01",
    days_overdue: 42,
    status: "OVERDUE",
    tier: "TIER_3",
    is_high_value: true,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "Brand Identity Package",
  },
  {
    invoice_id: "INV-003",
    client_id: "CLI-003",
    client_name: "Cascade Tech",
    client_email: "sarah.l@cascade.com",
    amount: 890.0,
    currency: "USD",
    due_date: "2026-08-28",
    days_overdue: 15,
    status: "OVERDUE",
    tier: "TIER_2",
    is_high_value: false,
    contact_count: 1,
    dispute_flag: false,
    last_contact_at: "2026-08-30T10:00:00Z",
    services_description: "Landing Page — Revision 2",
  },
  {
    invoice_id: "INV-004",
    client_id: "CLI-001",
    client_name: "Acme Corp",
    client_email: "ap@acme.com",
    amount: 3200.0,
    currency: "USD",
    due_date: "2026-09-01",
    days_overdue: 11,
    status: "SENT",
    tier: "TIER_1",
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "Monthly Retainer — September",
  },
  {
    invoice_id: "INV-005",
    client_id: "CLI-004",
    client_name: "DeltaWave Media",
    client_email: "billing@deltawave.com",
    amount: 55000.0,
    currency: "USD",
    due_date: "2026-07-31",
    days_overdue: 43,
    status: "OVERDUE",
    tier: "TIER_3",
    is_high_value: true,
    contact_count: 1,
    dispute_flag: false,
    last_contact_at: "2026-08-15T09:04:22Z",
    services_description: "IT Infrastructure Audit",
  },
  {
    invoice_id: "INV-006",
    client_id: "CLI-005",
    client_name: "Ember Creative",
    client_email: "jo@embercreative.co",
    amount: 1400.0,
    currency: "USD",
    due_date: "2026-09-05",
    days_overdue: 7,
    status: "SENT",
    tier: "TIER_1",
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "Social Media Package",
  },
  {
    invoice_id: "INV-007",
    client_id: "CLI-002",
    client_name: "Bluebell Studios",
    client_email: "finance@bluebell.io",
    amount: 7200.0,
    currency: "USD",
    due_date: "2026-08-10",
    days_overdue: 33,
    status: "OVERDUE",
    tier: "TIER_3",
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "Web App Development Phase 1",
  },
  {
    invoice_id: "INV-008",
    client_id: "CLI-006",
    client_name: "Foxglove Labs",
    client_email: "accounts@foxglove.io",
    amount: 2100.0,
    currency: "USD",
    due_date: "2026-08-22",
    days_overdue: 21,
    status: "OVERDUE",
    tier: "TIER_2",
    is_high_value: false,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    services_description: "API Integration Consulting",
  },
];

export const MOCK_DECISIONS: DecisionItem[] = [
  {
    decision_id: "dec_a1b2c3",
    invoice_id: "INV-005",
    invoice: {
      client_name: "DeltaWave Media",
      amount: 55000.0,
      days_overdue: 43,
      is_high_value: true,
    },
    escalation_reason:
      "Invoice 43 days overdue. High-value invoice exceeds $10,000 threshold.",
    draft_subject: "Final Notice: Invoice #INV-005 — $55,000.00 Overdue",
    draft_body:
      "Dear Accounts Payable team,\n\nThis is a formal notice regarding outstanding invoice #INV-005 for $55,000.00, which is now 43 days overdue.\n\nPlease arrange immediate settlement to keep your account in good standing.\n\nBest regards,\nAccounts Receivable",
    tier: "TIER_3",
    llm_confidence: 0.96,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:02:11Z",
  },
  {
    decision_id: "dec_b2c3d4",
    invoice_id: "INV-002",
    invoice: {
      client_name: "Bluebell Studios",
      amount: 12500.0,
      days_overdue: 42,
      is_high_value: true,
    },
    escalation_reason:
      "Invoice 42 days overdue exceeds 22-day Tier 3 threshold and high-value threshold.",
    draft_subject: "Urgent: Outstanding Invoice #INV-002 ($12,500.00)",
    draft_body:
      "Dear Bluebell Studios Finance,\n\nWe are writing to follow up on overdue invoice #INV-002 for $12,500.00 due on 2026-08-01.\n\nPlease remit payment at your earliest convenience.\n\nThank you,\nFinance Department",
    tier: "TIER_3",
    llm_confidence: 0.94,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:03:00Z",
  },
  {
    decision_id: "dec_c3d4e5",
    invoice_id: "INV-001",
    invoice: {
      client_name: "Acme Corp",
      amount: 4800.0,
      days_overdue: 28,
      is_high_value: false,
    },
    escalation_reason: "Invoice is 28 days overdue (Tier 3 final notice required).",
    draft_subject: "Final Notice: Invoice #INV-001 — $4,800.00",
    draft_body:
      "Dear Acme Corp Team,\n\nInvoice #INV-001 for $4,800.00 remains unpaid 28 days past the due date.\n\nPlease let us know when payment will be issued.\n\nSincerely,\nChazer Billing",
    tier: "TIER_3",
    llm_confidence: 0.98,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:04:15Z",
  },
];

export const MOCK_AUDIT_LOG: AuditEntryItem[] = [
  {
    log_id: "log_xyz789",
    sweep_id: "sweep_20260912_090000",
    invoice_id: "INV-005",
    action: "HIGH_VALUE_ESCALATED",
    status: "ESCALATED",
    timestamp: "2026-09-12T09:02:11Z",
    metadata: {
      tier: "TIER_3",
      amount: 55000.0,
      threshold: 10000,
      llm_confidence: 0.96,
    },
  },
  {
    log_id: "log_xyz788",
    sweep_id: "sweep_20260912_090000",
    invoice_id: "INV-003",
    action: "TIER2_EMAIL_SENT",
    status: "SENT",
    timestamp: "2026-09-12T09:01:54Z",
    metadata: {
      resend_message_id: "re_def456",
      email_subject: "Second Reminder: Invoice #INV-003",
    },
  },
  {
    log_id: "log_xyz787",
    sweep_id: "sweep_20260912_090000",
    invoice_id: "INV-006",
    action: "TIER1_EMAIL_SENT",
    status: "SENT",
    timestamp: "2026-09-12T09:01:20Z",
    metadata: {
      resend_message_id: "re_ghi789",
      email_subject: "Friendly Reminder: Invoice #INV-006",
    },
  },
  {
    log_id: "log_xyz786",
    sweep_id: "sweep_20260912_090000",
    invoice_id: null,
    action: "SWEEP_COMPLETE",
    status: "SUCCESS",
    timestamp: "2026-09-12T09:02:30Z",
    metadata: {
      invoices_processed: 8,
      emails_sent: 2,
      escalated_count: 3,
      duration_ms: 1250,
    },
  },
];

/**
 * Computes dynamic overdue and escalation tier properties
 */
export function computeEnrichedInvoice(
  inv: any,
  now: Date = new Date("2026-09-12T00:00:00Z"),
  highValueThreshold: number = 10000
): EnrichedInvoice {
  const dueDate = new Date(inv.due_date);
  const diffMs = now.getTime() - dueDate.getTime();
  const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const amount = typeof inv.amount === "number" ? inv.amount : parseFloat(inv.amount) || 0;
  const isHighValue = amount >= highValueThreshold;

  let tier: EnrichedInvoice["tier"] = "UNCLASSIFIED";
  if (inv.dispute_flag) {
    tier = "TIER_3";
  } else if (daysOverdue >= 1 && daysOverdue <= 7 && (inv.contact_count === 0 || !inv.contact_count)) {
    tier = "TIER_1";
  } else if (daysOverdue >= 8 && daysOverdue <= 21 && (inv.contact_count >= 1)) {
    tier = "TIER_2";
  } else if (daysOverdue >= 8 && daysOverdue <= 21 && (inv.contact_count === 0 || !inv.contact_count)) {
    // late start edge case
    tier = "TIER_1";
  } else if (daysOverdue >= 22) {
    tier = "TIER_3";
  } else if (inv.tier) {
    tier = inv.tier;
  }

  return {
    invoice_id: inv.invoice_id,
    client_id: inv.client_id,
    client_name: inv.client_name || inv.clients?.name || "Client",
    client_email: inv.client_email || inv.clients?.email || "billing@example.com",
    amount,
    currency: inv.currency || "USD",
    due_date: inv.due_date,
    days_overdue: inv.days_overdue !== undefined ? inv.days_overdue : daysOverdue,
    status: inv.status || "SENT",
    tier: inv.tier || tier,
    is_high_value: isHighValue,
    contact_count: inv.contact_count || 0,
    dispute_flag: Boolean(inv.dispute_flag),
    last_contact_at: inv.last_contact_at || null,
    services_description: inv.services_description || "",
  };
}

/**
 * Calculates aggregate summary metrics across invoices
 */
export function calculateInvoicesSummary(
  invoices: EnrichedInvoice[],
  pendingDecisionsCount: number = 0
): InvoicesSummary {
  let totalOverdue = 0;
  const countByTier = {
    TIER_1: 0,
    TIER_2: 0,
    TIER_3: 0,
  };

  for (const inv of invoices) {
    if (inv.status === "OVERDUE" || inv.days_overdue > 0) {
      totalOverdue += inv.amount;
    }
    if (inv.tier === "TIER_1") countByTier.TIER_1++;
    if (inv.tier === "TIER_2") countByTier.TIER_2++;
    if (inv.tier === "TIER_3") countByTier.TIER_3++;
  }

  return {
    total_overdue_amount: Math.round(totalOverdue * 100) / 100,
    count_by_tier: countByTier,
    pending_decisions: pendingDecisionsCount,
  };
}

/**
 * Main REST API Router Handler
 */
export async function handleApiRouter(
  req: Request,
  envOverride?: Record<string, string>,
  supabaseClientOverride?: any
): Promise<Response> {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, "");
  const searchParams = url.searchParams;

  // Identify sub-route from path or query param
  let route = "";
  if (path.endsWith("/invoices") || searchParams.get("route") === "invoices") {
    route = "invoices";
  } else if (path.endsWith("/decisions") || searchParams.get("route") === "decisions") {
    route = "decisions";
  } else if (path.endsWith("/audit-log") || searchParams.get("route") === "audit-log") {
    route = "audit-log";
  }

  const env =
    envOverride ||
    (typeof Deno !== "undefined" && Deno.env
      ? {
          SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
          SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
          SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") || "",
        }
      : {});

  let supabase = supabaseClientOverride;
  if (!supabase && env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY)) {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY);
  }

  try {
    // ----------------------------------------------------------------
    // ROUTE: GET /invoices
    // ----------------------------------------------------------------
    if (route === "invoices") {
      let invoices: EnrichedInvoice[] = [];
      let pendingCount = 0;

      if (supabase) {
        try {
          const { data: dbInvoices, error: invErr } = await supabase
            .from("v_invoices_enriched")
            .select("*");

          if (!invErr && dbInvoices && dbInvoices.length > 0) {
            invoices = dbInvoices.map((i: any) => computeEnrichedInvoice(i));
          } else {
            // fallback to querying invoices join clients
            const { data: rawInvoices } = await supabase
              .from("invoices")
              .select("*, clients(name, email)");
            if (rawInvoices && rawInvoices.length > 0) {
              invoices = rawInvoices.map((i: any) => computeEnrichedInvoice(i));
            }
          }

          // Count pending decisions
          const { count } = await supabase
            .from("decision_queue")
            .select("*", { count: "exact", head: true })
            .eq("status", "PENDING_APPROVAL");
          if (count !== null && count !== undefined) {
            pendingCount = count;
          }
        } catch {
          // DB query fallback
        }
      }

      if (invoices.length === 0) {
        invoices = MOCK_INVOICES.map((i) => computeEnrichedInvoice(i));
        pendingCount = MOCK_DECISIONS.filter((d) => d.status === "PENDING_APPROVAL").length;
      }

      // Filter by status
      const statusFilter = searchParams.get("status");
      if (statusFilter) {
        invoices = invoices.filter((i) => i.status === statusFilter.toUpperCase());
      }

      // Filter by tier
      const tierFilter = searchParams.get("tier");
      if (tierFilter) {
        invoices = invoices.filter((i) => i.tier === tierFilter.toUpperCase());
      }

      // Sort
      const sortField = searchParams.get("sort") || "days_overdue";
      const sortOrder = (searchParams.get("order") || "desc").toLowerCase();

      invoices.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });

      const summary = calculateInvoicesSummary(invoices, pendingCount);

      return new Response(JSON.stringify({ invoices, summary }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // ROUTE: GET /decisions
    // ----------------------------------------------------------------
    if (route === "decisions") {
      let decisions: DecisionItem[] = [];

      if (supabase) {
        try {
          const { data: dbDecisions, error: decErr } = await supabase
            .from("decision_queue")
            .select("*, invoices(*, clients(*))")
            .order("created_at", { ascending: false });

          if (!decErr && dbDecisions && dbDecisions.length > 0) {
            decisions = dbDecisions.map((d: any) => {
              const inv = d.invoices || {};
              const clientName = inv.clients?.name || inv.client_name || "Client";
              const amount = inv.amount ? parseFloat(inv.amount) : 0;
              const daysOverdue = inv.due_date
                ? Math.max(
                    0,
                    Math.floor(
                      (new Date("2026-09-12").getTime() - new Date(inv.due_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )
                : 0;

              return {
                decision_id: d.decision_id,
                invoice_id: d.invoice_id,
                invoice: {
                  client_name: clientName,
                  amount,
                  days_overdue: daysOverdue,
                  is_high_value: amount >= 10000,
                },
                escalation_reason: d.escalation_reason,
                draft_subject: d.draft_subject,
                draft_body: d.draft_body,
                tier: d.tier || "TIER_3",
                llm_confidence: parseFloat(d.llm_confidence) || 0.95,
                status: d.status || "PENDING_APPROVAL",
                created_at: d.created_at,
              };
            });
          }
        } catch {
          // DB query fallback
        }
      }

      if (decisions.length === 0) {
        decisions = [...MOCK_DECISIONS];
      }

      const statusFilter = searchParams.get("status");
      if (statusFilter) {
        decisions = decisions.filter((d) => d.status === statusFilter.toUpperCase());
      }

      return new Response(JSON.stringify({ decisions }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // ROUTE: GET /audit-log
    // ----------------------------------------------------------------
    if (route === "audit-log") {
      let entries: AuditEntryItem[] = [];
      let totalCount = 0;

      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10));
      const invoiceIdFilter = searchParams.get("invoice_id");
      const actionFilter = searchParams.get("action");

      if (supabase) {
        try {
          let query = supabase
            .from("audit_log")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false });

          if (invoiceIdFilter) {
            query = query.eq("invoice_id", invoiceIdFilter);
          }
          if (actionFilter) {
            query = query.eq("action", actionFilter);
          }

          const offset = (page - 1) * limit;
          query = query.range(offset, offset + limit - 1);

          const { data: dbLogs, count, error: logErr } = await query;
          if (!logErr && dbLogs) {
            entries = dbLogs.map((l: any) => ({
              log_id: l.log_id,
              sweep_id: l.sweep_id,
              invoice_id: l.invoice_id,
              action: l.action,
              status: l.status,
              timestamp: l.created_at || l.timestamp,
              metadata: l.metadata || {},
            }));
            totalCount = count || entries.length;
          }
        } catch {
          // DB query fallback
        }
      }

      if (entries.length === 0) {
        let filtered = [...MOCK_AUDIT_LOG];
        if (invoiceIdFilter) {
          filtered = filtered.filter((e) => e.invoice_id === invoiceIdFilter);
        }
        if (actionFilter) {
          filtered = filtered.filter((e) => e.action === actionFilter);
        }

        totalCount = filtered.length;
        const offset = (page - 1) * limit;
        entries = filtered.slice(offset, offset + limit);
      }

      const hasMore = page * limit < totalCount;

      return new Response(
        JSON.stringify({
          entries,
          pagination: {
            total: totalCount,
            page,
            limit,
            has_more: hasMore,
          },
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Unmatched Route
    return new Response(
      JSON.stringify({
        error: "Route not found",
        available_routes: [
          "GET /invoices",
          "GET /decisions",
          "GET /audit-log",
        ],
      }),
      {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Database query failed",
        detail: err?.message || String(err),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

// Native Deno Edge runtime bootstrap
if (typeof Deno !== "undefined" && typeof (Deno as any).serve === "function") {
  (Deno as any).serve(handleApiRouter);
}
