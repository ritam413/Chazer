// supabase/functions/decisions-reject/index.ts
// Supabase Edge Function: POST /decisions/:id/reject
// Rejects a decision — no email sent, records reason and audit log

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import {
  CORS_HEADERS,
  type RejectDecisionBody,
  type RejectDecisionResponse,
  type DecisionRecord,
} from "../_shared/types";

export {
  CORS_HEADERS,
  type RejectDecisionBody,
  type RejectDecisionResponse,
  type DecisionRecord,
};

export const INITIAL_MOCK_DECISIONS: Record<string, {
  decision_id: string;
  invoice_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  days_overdue: number;
  is_high_value: boolean;
  escalation_reason: string;
  draft_subject: string;
  draft_body: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3";
  llm_confidence: number;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  created_at: string;
}> = {
  "dec_a1b2c3": {
    decision_id: "dec_a1b2c3",
    invoice_id: "INV-005",
    client_name: "DeltaWave Media",
    client_email: "billing@deltawave.com",
    amount: 55000.0,
    days_overdue: 43,
    is_high_value: true,
    escalation_reason: "Invoice 43 days overdue. High-value invoice exceeds $10,000 threshold.",
    draft_subject: "Final Notice: Invoice #INV-005 — $55,000.00 Overdue",
    draft_body: "Dear Accounts Payable,\n\nThis is a formal final notice regarding invoice #INV-005 ($55,000.00) which is now 43 days overdue. Please arrange settlement immediately.\n\nBest regards,\nAccounts Receivable",
    tier: "TIER_3",
    llm_confidence: 0.96,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:02:11Z",
  },
  "dec_b2c3d4": {
    decision_id: "dec_b2c3d4",
    invoice_id: "INV-002",
    client_name: "Bluebell Studios",
    client_email: "finance@bluebell.io",
    amount: 12500.0,
    days_overdue: 42,
    is_high_value: true,
    escalation_reason: "Invoice 42 days overdue. High-value invoice exceeds $10,000 threshold.",
    draft_subject: "Final Notice: Invoice #INV-002 — $12,500.00 Overdue",
    draft_body: "Dear Accounts Payable,\n\nThis is a formal final notice regarding invoice #INV-002 for $12,500.00, which is currently 42 days overdue. Please remit payment promptly.\n\nSincerely,\nChazer Team",
    tier: "TIER_3",
    llm_confidence: 0.94,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:02:15Z",
  },
  "dec_c3d4e5": {
    decision_id: "dec_c3d4e5",
    invoice_id: "INV-007",
    client_name: "Bluebell Studios",
    client_email: "finance@bluebell.io",
    amount: 7200.0,
    days_overdue: 33,
    is_high_value: false,
    escalation_reason: "Invoice 33 days overdue. Approaching final escalation.",
    draft_subject: "Final Reminder: Invoice #INV-007 — $7,200.00",
    draft_body: "Dear Accounts Team,\n\nInvoice #INV-007 for $7,200.00 is 33 days overdue. Please process payment today.\n\nThank you,\nFinance",
    tier: "TIER_3",
    llm_confidence: 0.91,
    status: "PENDING_APPROVAL",
    created_at: "2026-09-12T09:02:20Z",
  },
  "dec_already_approved": {
    decision_id: "dec_already_approved",
    invoice_id: "INV-001",
    client_name: "Acme Corp",
    client_email: "ap@acme.com",
    amount: 4800.0,
    days_overdue: 28,
    is_high_value: false,
    escalation_reason: "Tier 3 final notice approved previously.",
    draft_subject: "Final Notice: Invoice #INV-001",
    draft_body: "Invoice #INV-001 notice.",
    tier: "TIER_3",
    llm_confidence: 0.95,
    status: "APPROVED",
    created_at: "2026-09-10T09:00:00Z",
  },
};

export const MOCK_DECISIONS: Record<string, any> = JSON.parse(JSON.stringify(INITIAL_MOCK_DECISIONS));

export function resetMockDecisions() {
  for (const k of Object.keys(MOCK_DECISIONS)) {
    delete MOCK_DECISIONS[k];
  }
  Object.assign(MOCK_DECISIONS, JSON.parse(JSON.stringify(INITIAL_MOCK_DECISIONS)));
}

/**
 * Extract decision ID from URL or body
 */
export function extractDecisionId(req: Request, body?: RejectDecisionBody): string | null {
  if (body?.decision_id) return body.decision_id;

  const url = new URL(req.url);
  const paramId = url.searchParams.get("decision_id") || url.searchParams.get("id");
  if (paramId) return paramId;

  const segments = url.pathname.split("/").filter(Boolean);
  // Matches /functions/v1/decisions/:id/reject or /decisions/:id/reject
  const rejectIndex = segments.indexOf("reject");
  if (rejectIndex > 0) {
    return segments[rejectIndex - 1];
  }
  // Matches /functions/v1/decisions-reject/:id or /decisions-reject/:id
  const fnIndex = segments.findIndex((s) => s === "decisions-reject" || s === "decisions");
  if (fnIndex !== -1 && segments.length > fnIndex + 1) {
    return segments[fnIndex + 1];
  }

  // Last segment fallback
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    if (last !== "decisions-reject" && last !== "reject" && last !== "v1") {
      return last;
    }
  }

  return null;
}

export async function handleRejectDecision(
  req: Request,
  supabaseClientOverride?: any,
  envOverride?: Record<string, string>
): Promise<Response> {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED", detail: "Expected POST" }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    let body: RejectDecisionBody = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      // Body may be empty or invalid json
    }

    const decisionId = extractDecisionId(req, body);
    if (!decisionId) {
      return new Response(
        JSON.stringify({
          error: "MISSING_DECISION_ID",
          detail: "Decision ID must be provided in URL path or request body",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Resolve database client or use mock
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

    let decisionRecord: any = null;

    if (supabase) {
      try {
        const { data: decData, error: decErr } = await supabase
          .from("decision_queue")
          .select("*")
          .eq("decision_id", decisionId)
          .single();

        if (decErr || !decData) {
          decisionRecord = MOCK_DECISIONS[decisionId] || null;
        } else {
          decisionRecord = decData;
        }
      } catch {
        decisionRecord = MOCK_DECISIONS[decisionId] || null;
      }
    } else {
      decisionRecord = MOCK_DECISIONS[decisionId] || null;
    }

    if (!decisionRecord) {
      return new Response(
        JSON.stringify({
          error: "DECISION_NOT_FOUND",
          detail: `Decision ${decisionId} not found`,
        }),
        {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Conflict check: Already resolved
    if (decisionRecord.status === "APPROVED" || decisionRecord.status === "REJECTED") {
      return new Response(
        JSON.stringify({
          error: "DECISION_ALREADY_RESOLVED",
          current_status: decisionRecord.status,
        }),
        {
          status: 409,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const rejectedAt = new Date().toISOString();
    const rejectReason = body.reject_reason || "Owner rejected AI draft";

    // 4. Update DB & Insert Audit Log
    if (supabase) {
      try {
        // Update decision_queue
        await supabase
          .from("decision_queue")
          .update({
            status: "REJECTED",
            reject_reason: rejectReason,
            resolved_at: rejectedAt,
          })
          .eq("decision_id", decisionId);

        // Insert audit_log
        const logId = `log_${Math.random().toString(36).substring(2, 10)}`;
        await supabase.from("audit_log").insert({
          log_id: logId,
          invoice_id: decisionRecord.invoice_id,
          owner_id: "demo_owner",
          action: "OWNER_REJECTED",
          status: "ESCALATED",
          timestamp: rejectedAt,
          metadata: {
            decision_id: decisionId,
            reject_reason: rejectReason,
            invoice_id: decisionRecord.invoice_id,
          },
        });
      } catch (dbErr) {
        console.warn("Database update error during rejection:", dbErr);
      }
    }

    // Update in-memory mock if present
    if (MOCK_DECISIONS[decisionId]) {
      MOCK_DECISIONS[decisionId].status = "REJECTED";
    }

    const responsePayload: RejectDecisionResponse = {
      success: true,
      decision_id: decisionId,
      rejected_at: rejectedAt,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "INTERNAL_SERVER_ERROR",
        detail: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}

// Supabase Edge Functions / Deno HTTP entrypoint
if (typeof Deno !== "undefined" && "serve" in Deno) {
  (Deno as any).serve((req: Request) => handleRejectDecision(req));
}
