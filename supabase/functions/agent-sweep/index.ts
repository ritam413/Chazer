// supabase/functions/agent-sweep/index.ts
// Supabase Edge Function: POST /functions/v1/agent-sweep (or /sweep)
// Autonomous Collection Agent Sweep Engine (Native TypeScript Runtime)
// Ingests overdue invoices, classifies escalation tiers, dispatches Resend emails,
// and escalates high-value or Tier-3 receivables to the owner decision queue.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export type EscalationTier = "TIER_1" | "TIER_2" | "TIER_3" | "UNCLASSIFIED";

export interface InvoiceRecord {
  invoice_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  currency: string;
  due_date: string;
  days_overdue?: number;
  contact_count: number;
  status: string;
  dispute_flag: boolean;
  last_contact_at: string | null;
  services_description?: string;
}

export interface ClassificationResult {
  tier: EscalationTier;
  auto_send_eligible: boolean;
  escalate: boolean;
  escalation_reason: string;
  confidence: number;
}

export interface EmailDraft {
  subject: string;
  body: string;
  word_count: number;
  validation_passed: boolean;
  tier: EscalationTier;
}

export interface SweepRequestBody {
  owner_id?: string;
  high_value_threshold?: number;
  contact_window_hours?: number;
  sandbox?: boolean;
}

export interface SweepDetailItem {
  invoice_id: string;
  action: string;
  tier?: string;
  resend_id?: string;
  decision_id?: string;
  reason?: string;
  error?: string;
}

export interface SweepResponse {
  success: boolean;
  sweep_id: string;
  owner_id: string;
  status: "COMPLETED" | "FAILED" | "RUNNING";
  invoices_processed: number;
  emails_sent: number;
  escalated_count: number;
  skipped_count: number;
  failed_count: number;
  duration_ms: number;
  started_at: string;
  completed_at: string;
  details: SweepDetailItem[];
}

// Canonical 8-invoice seed dataset from data/invoices_seed.csv & docs/05
export const INITIAL_MOCK_INVOICES: InvoiceRecord[] = [
  {
    invoice_id: "INV-001",
    client_id: "CLI-001",
    client_name: "Acme Corp",
    client_email: "ap@acme.com",
    amount: 4800.0,
    currency: "USD",
    due_date: "2026-08-15",
    days_overdue: 28,
    contact_count: 0,
    status: "OVERDUE",
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
    contact_count: 0,
    status: "OVERDUE",
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
    contact_count: 1,
    status: "OVERDUE",
    dispute_flag: false,
    last_contact_at: null,
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
    contact_count: 0,
    status: "SENT",
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
    contact_count: 0,
    status: "OVERDUE",
    dispute_flag: false,
    last_contact_at: null,
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
    contact_count: 0,
    status: "SENT",
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
    contact_count: 0,
    status: "OVERDUE",
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
    contact_count: 1,
    status: "OVERDUE",
    dispute_flag: false,
    last_contact_at: null,
    services_description: "API Integration Consulting",
  },
];

// In-Memory Mock State for Offline & Isolated Unit Testing
let mockInvoices: InvoiceRecord[] = JSON.parse(JSON.stringify(INITIAL_MOCK_INVOICES));
let mockContactHistory: Array<{
  contact_id: string;
  invoice_id: string;
  tier: string;
  subject: string;
  body: string;
  sent_at: string;
  resend_message_id: string;
  status: string;
}> = [];
let mockDecisionQueue: Array<{
  decision_id: string;
  invoice_id: string;
  owner_id: string;
  tier: string;
  is_high_value: boolean;
  escalation_reason: string;
  draft_subject: string;
  draft_body: string;
  llm_confidence: number;
  status: string;
  created_at: string;
}> = [];
let mockAuditLog: Array<{
  log_id: string;
  sweep_id: string;
  invoice_id?: string;
  owner_id: string;
  action: string;
  status: string;
  metadata: any;
  created_at: string;
}> = [];
let mockSweepRuns: Array<{
  sweep_id: string;
  owner_id: string;
  status: string;
  invoices_processed: number;
  emails_sent: number;
  escalated_count: number;
  duration_ms: number;
  started_at: string;
  completed_at?: string;
}> = [];

export function resetMockSweepState() {
  mockInvoices = JSON.parse(JSON.stringify(INITIAL_MOCK_INVOICES));
  mockContactHistory = [];
  mockDecisionQueue = [];
  mockAuditLog = [];
  mockSweepRuns = [];
}

export function getMockSweepState() {
  return {
    invoices: mockInvoices,
    contactHistory: mockContactHistory,
    decisionQueue: mockDecisionQueue,
    auditLog: mockAuditLog,
    sweepRuns: mockSweepRuns,
  };
}

// Prohibited aggressive threat patterns
const PROHIBITED_TERMS = /\b(sue|lawsuit|attorney|lawyer|court|legal action|collection agency|police|penalties|damages|litigation)\b/i;

export function computeDaysOverdue(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  try {
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = now.getTime() - due.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

export function isContactWindowActive(lastContactAtStr: string | null | undefined, windowHours = 72): boolean {
  if (!lastContactAtStr) return false;
  try {
    const last = new Date(lastContactAtStr).getTime();
    const now = Date.now();
    const elapsedHours = (now - last) / (1000 * 60 * 60);
    return elapsedHours < windowHours;
  } catch {
    return false;
  }
}

export function classifyInvoiceTs(data: {
  invoice_id: string;
  amount: number;
  days_overdue: number;
  contact_count: number;
  dispute_flag?: boolean;
  owner_high_value_threshold?: number;
}): ClassificationResult {
  const invId = data.invoice_id || "";
  const amount = data.amount || 0;
  const daysOverdue = Math.max(0, data.days_overdue || 0);
  const contactCount = Math.max(0, data.contact_count || 0);
  const isDispute = Boolean(data.dispute_flag);
  const threshold = data.owner_high_value_threshold ?? 10000;

  // 1. Dispute Override -> TIER_3 freeze
  if (isDispute) {
    return {
      tier: "TIER_3",
      auto_send_eligible: false,
      escalate: true,
      escalation_reason: "Invoice has an active dispute or negotiation flag. Automation frozen pending owner review.",
      confidence: 1.0,
    };
  }

  // 2. Base Tier determination
  let baseTier: EscalationTier = "UNCLASSIFIED";
  let baseEscalate = false;
  let baseAutoSend = false;
  let baseReason = "";

  if (daysOverdue >= 22) {
    baseTier = "TIER_3";
    baseEscalate = true;
    baseAutoSend = false;
    baseReason = `Invoice ${invId} is ${daysOverdue} days overdue with ${contactCount} prior contact(s) (Tier 3 final notice threshold reached).`;
  } else if (daysOverdue >= 8 && daysOverdue <= 21) {
    if (contactCount >= 1) {
      baseTier = "TIER_2";
      baseEscalate = false;
      baseAutoSend = true;
      baseReason = `Invoice ${invId} is ${daysOverdue} days overdue with ${contactCount} prior contact(s) (Tier 2 firm reminder).`;
    } else {
      // Late start edge case
      baseTier = "TIER_1";
      baseEscalate = false;
      baseAutoSend = true;
      baseReason = `Invoice ${invId} is ${daysOverdue} days overdue with 0 prior contacts (late start; treated as Tier 1 initial nudge).`;
    }
  } else if (daysOverdue >= 1 && daysOverdue <= 7) {
    if (contactCount === 0) {
      baseTier = "TIER_1";
      baseEscalate = false;
      baseAutoSend = true;
      baseReason = `Invoice ${invId} is ${daysOverdue} days overdue with 0 prior contacts (Tier 1 friendly nudge).`;
    } else {
      baseTier = "TIER_1";
      baseEscalate = false;
      baseAutoSend = false;
      baseReason = `Invoice ${invId} is ${daysOverdue} days overdue and was already contacted ${contactCount} time(s) during Tier 1.`;
    }
  } else {
    baseTier = "UNCLASSIFIED";
    baseEscalate = false;
    baseAutoSend = false;
    baseReason = `Invoice ${invId} is current (0 days overdue); no collection action required.`;
  }

  // 3. High-Value Threshold override
  if (amount >= threshold) {
    return {
      tier: baseTier !== "UNCLASSIFIED" ? baseTier : "TIER_1",
      auto_send_eligible: false,
      escalate: true,
      escalation_reason: `High-Value Invoice ($${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} >= threshold $${threshold.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}): requires owner review before contact.`,
      confidence: 1.0,
    };
  }

  return {
    tier: baseTier,
    auto_send_eligible: baseAutoSend,
    escalate: baseEscalate,
    escalation_reason: baseReason,
    confidence: baseTier !== "UNCLASSIFIED" ? 1.0 : 0.5,
  };
}

export function validateDraftTs(body: string, invoiceId: string, amount: number, dueDate: string): boolean {
  if (!body || !body.trim()) return false;

  const words = body.split(/\s+/).filter(Boolean);
  if (words.length > 200) return false;

  if (invoiceId && !body.toLowerCase().includes(invoiceId.toLowerCase())) {
    return false;
  }

  const amtFormatted = amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amtShort = `$${amount.toLocaleString("en-US")}`;
  const amtPlain = String(amount);
  const hasAmt = body.includes(amtFormatted) || body.includes(amtShort) || body.includes(amtPlain) || body.includes(`$${amount.toFixed(2)}`);
  if (!hasAmt) return false;

  if (dueDate && !body.includes(dueDate)) {
    return false;
  }

  if (PROHIBITED_TERMS.test(body)) {
    return false;
  }

  return true;
}

export async function generateEmailDraftTs(
  invoice: InvoiceRecord,
  tier: EscalationTier,
  envKey?: string
): Promise<EmailDraft> {
  const invId = invoice.invoice_id;
  const clientName = invoice.client_name || "Client";
  const amount = invoice.amount || 0;
  const dueDate = invoice.due_date || "2026-08-01";
  const amtFormatted = `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // If live Gemini or Grok key is available in Deno environment, attempt LLM call
  const apiKey = envKey || (typeof Deno !== "undefined" ? Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GROK_API_KEY") : undefined);
  const isRealKey = apiKey && !apiKey.toLowerCase().includes("your-") && !apiKey.toLowerCase().includes("placeholder");

  if (isRealKey) {
    try {
      const prompt = `Draft a professional payment reminder email for invoice ${invId}, amount ${amtFormatted}, due ${dueDate}, tier ${tier}. Client name is ${clientName}. Keep under 200 words. Must contain ${invId}, ${amtFormatted}, ${dueDate}. Return ONLY a JSON object with 'subject' and 'body'.`;
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
          if (parsed.subject && parsed.body) {
            const isValid = validateDraftTs(parsed.body, invId, amount, dueDate);
            return {
              subject: parsed.subject,
              body: parsed.body,
              word_count: parsed.body.split(/\s+/).length,
              validation_passed: isValid,
              tier,
            };
          }
        }
      }
    } catch {
      // Fall through to deterministic template
    }
  }

  // Deterministic fallback template (guaranteed valid)
  let subject = "";
  let body = "";

  if (tier === "TIER_1") {
    subject = `Friendly Reminder: Invoice #${invId} Due`;
    body = `Hi ${clientName},\n\nJust a friendly reminder regarding invoice #${invId} for ${amtFormatted}, which was due on ${dueDate}.\n\nPlease let us know if you have any questions or need another copy.\n\nBest regards,\nAccounts Team`;
  } else if (tier === "TIER_2") {
    subject = `Second Reminder: Invoice #${invId} — ${amtFormatted} Overdue`;
    body = `Hi ${clientName},\n\nWe are following up on our previous notice regarding invoice #${invId} for ${amtFormatted}, due on ${dueDate}.\n\nWe would appreciate your prompt settlement at your earliest convenience.\n\nSincerely,\nAccounts Team`;
  } else {
    subject = `Final Notice: Invoice #${invId} — Urgent Settlement Required`;
    body = `Dear Accounts Payable,\n\nThis is a formal final notice regarding overdue invoice #${invId} for ${amtFormatted}, originally due on ${dueDate}.\n\nPlease arrange payment immediately to bring your account up to date.\n\nSincerely,\nFinance Department`;
  }

  return {
    subject,
    body,
    word_count: body.split(/\s+/).length,
    validation_passed: validateDraftTs(body, invId, amount, dueDate),
    tier,
  };
}

export async function sendEmailTs(params: {
  to: string;
  subject: string;
  body: string;
  invoice_id: string;
  idempotency_key: string;
  sandbox?: boolean;
}): Promise<{ success: boolean; resend_message_id?: string; error?: string }> {
  const apiKey = typeof Deno !== "undefined" ? Deno.env.get("RESEND_API_KEY") : undefined;
  const isSandbox = params.sandbox ?? (!apiKey || apiKey.includes("your-"));

  if (isSandbox) {
    const mockId = `mock_re_${Math.random().toString(36).substring(2, 18)}`;
    return { success: true, resend_message_id: mockId };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotency_key,
      },
      body: JSON.stringify({
        from: (typeof Deno !== "undefined" ? Deno.env.get("RESEND_FROM_EMAIL") : null) || "reminders@chazer.dev",
        to: [params.to],
        subject: params.subject,
        text: params.body,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ message: res.statusText }));
      return { success: false, error: errJson.message || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, resend_message_id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function handleAgentSweep(req: Request): Promise<Response> {
  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  // 2. Health check / status info
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        service: "chazer-agent-sweep",
        version: "1.0.0",
        status: "ready",
        runtime: "Deno Edge Function (Native TypeScript)",
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // 3. POST execution
  let bodyPayload: SweepRequestBody = {};
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      bodyPayload = await req.json();
    }
  } catch {
    bodyPayload = {};
  }

  const ownerId = bodyPayload.owner_id || "demo_owner";
  const highValueThreshold = bodyPayload.high_value_threshold ?? 10000;
  const windowHours = bodyPayload.contact_window_hours ?? 72;
  const isSandbox = bodyPayload.sandbox ?? true;

  const sweepId = `sweep_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}_${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();
  const startIso = new Date().toISOString();

  // Supabase client instance if configured
  const supabaseUrl = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : undefined;
  const supabaseKey = typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") : undefined;
  const supabase = supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project") ? createClient(supabaseUrl, supabaseKey) : null;

  // Record SWEEP_STARTED
  const startAudit = {
    log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
    sweep_id: sweepId,
    owner_id: ownerId,
    action: "SWEEP_STARTED",
    status: "RUNNING",
    metadata: { source: "edge_function", sandbox: isSandbox },
    created_at: startIso,
  };
  mockAuditLog.push(startAudit);
  if (supabase) {
    try {
      await supabase.from("audit_log").insert(startAudit);
      await supabase.from("sweep_runs").insert({
        sweep_id: sweepId,
        owner_id: ownerId,
        status: "RUNNING",
        invoices_processed: 0,
        emails_sent: 0,
        escalated_count: 0,
        started_at: startIso,
      });
    } catch {
      // Ignore network / schema errors during offline development
    }
  }

  // Fetch Invoices
  let invoiceList: InvoiceRecord[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from("invoices").select("*");
      if (!error && data && data.length > 0) {
        invoiceList = data;
      }
    } catch {
      // Fall through to mock dataset
    }
  }
  if (invoiceList.length === 0) {
    invoiceList = mockInvoices;
  }

  const details: SweepDetailItem[] = [];
  let emailsSent = 0;
  let escalatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const inv of invoiceList) {
    const invId = inv.invoice_id;
    const daysOverdue = inv.days_overdue ?? computeDaysOverdue(inv.due_date);
    inv.days_overdue = daysOverdue;

    // Contact Window Guard
    if (isContactWindowActive(inv.last_contact_at, windowHours)) {
      skippedCount++;
      details.push({
        invoice_id: invId,
        action: "SKIPPED",
        reason: `Contact window active (${windowHours}h guard)`,
      });
      continue;
    }

    try {
      // Classify
      const classification = classifyInvoiceTs({
        invoice_id: invId,
        amount: inv.amount,
        days_overdue: daysOverdue,
        contact_count: inv.contact_count,
        dispute_flag: inv.dispute_flag,
        owner_high_value_threshold: highValueThreshold,
      });

      const tier = classification.tier;

      // Draft Email
      const draft = await generateEmailDraftTs(inv, tier);
      if (!draft.validation_passed) {
        throw new Error(`Email validation failed for ${invId}`);
      }

      if (classification.auto_send_eligible) {
        // Send email
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const idempKey = `${invId}-${tier}-${todayStr}`;
        const sendResult = await sendEmailTs({
          to: inv.client_email,
          subject: draft.subject,
          body: draft.body,
          invoice_id: invId,
          idempotency_key: idempKey,
          sandbox: isSandbox,
        });

        if (!sendResult.success) {
          failedCount++;
          const failAudit = {
            log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
            sweep_id: sweepId,
            invoice_id: invId,
            owner_id: ownerId,
            action: "SEND_FAILED",
            status: "FAILED",
            metadata: { error: sendResult.error },
            created_at: new Date().toISOString(),
          };
          mockAuditLog.push(failAudit);
          if (supabase) {
            try {
              await supabase.from("audit_log").insert(failAudit);
            } catch {}
          }
          details.push({ invoice_id: invId, action: "SEND_FAILED", error: sendResult.error });
          continue;
        }

        // Update state
        const nowIso = new Date().toISOString();
        inv.last_contact_at = nowIso;
        inv.contact_count = (inv.contact_count || 0) + 1;

        const contactRecord = {
          contact_id: `cnt_${Math.random().toString(36).substring(2, 14)}`,
          invoice_id: invId,
          tier,
          subject: draft.subject,
          body: draft.body,
          sent_at: nowIso,
          resend_message_id: sendResult.resend_message_id || "mock_re_id",
          status: isSandbox ? "SIMULATED" : "DELIVERED",
        };
        mockContactHistory.push(contactRecord);
        if (supabase) {
          try {
            await supabase.from("invoices").update({ last_contact_at: nowIso, contact_count: inv.contact_count }).eq("invoice_id", invId);
            await supabase.from("contact_history").insert(contactRecord);
          } catch {}
        }

        const auditAction = tier === "TIER_1" ? "TIER1_EMAIL_SENT" : (tier === "TIER_2" ? "TIER2_EMAIL_SENT" : "EMAIL_SENT");
        const sendAudit = {
          log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
          sweep_id: sweepId,
          invoice_id: invId,
          owner_id: ownerId,
          action: auditAction,
          status: "SENT",
          metadata: { tier, subject: draft.subject, resend_message_id: sendResult.resend_message_id },
          created_at: nowIso,
        };
        mockAuditLog.push(sendAudit);
        if (supabase) {
          try {
            await supabase.from("audit_log").insert(sendAudit);
          } catch {}
        }

        emailsSent++;
        details.push({
          invoice_id: invId,
          action: auditAction,
          tier,
          resend_id: sendResult.resend_message_id,
        });

      } else if (classification.escalate) {
        // Escalate to Decision Queue
        const decisionId = `dec_${Math.random().toString(36).substring(2, 14)}`;
        const isHighVal = inv.amount >= highValueThreshold;
        const isDispute = Boolean(inv.dispute_flag);
        const nowIso = new Date().toISOString();

        const decisionRecord = {
          decision_id: decisionId,
          invoice_id: invId,
          owner_id: ownerId,
          tier,
          is_high_value: isHighVal,
          escalation_reason: classification.escalation_reason,
          draft_subject: draft.subject,
          draft_body: draft.body,
          llm_confidence: classification.confidence,
          status: "PENDING_APPROVAL",
          created_at: nowIso,
        };
        mockDecisionQueue.push(decisionRecord);
        if (supabase) {
          try {
            await supabase.from("decision_queue").insert(decisionRecord);
          } catch {}
        }

        let auditAction = "TIER3_ESCALATED";
        if (isDispute) auditAction = "DISPUTE_ESCALATED";
        else if (isHighVal) auditAction = "HIGH_VALUE_ESCALATED";

        const escAudit = {
          log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
          sweep_id: sweepId,
          invoice_id: invId,
          owner_id: ownerId,
          action: auditAction,
          status: "ESCALATED",
          metadata: { tier, decision_id: decisionId, reason: classification.escalation_reason, is_high_value: isHighVal },
          created_at: nowIso,
        };
        mockAuditLog.push(escAudit);
        if (supabase) {
          try {
            await supabase.from("audit_log").insert(escAudit);
          } catch {}
        }

        escalatedCount++;
        details.push({
          invoice_id: invId,
          action: auditAction,
          decision_id: decisionId,
          tier,
        });

      } else {
        skippedCount++;
        details.push({
          invoice_id: invId,
          action: "SKIPPED",
          reason: classification.escalation_reason,
        });
      }

    } catch (err: any) {
      failedCount++;
      const errorAudit = {
        log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
        sweep_id: sweepId,
        invoice_id: invId,
        owner_id: ownerId,
        action: "LLM_FAILED",
        status: "FAILED",
        metadata: { error: err.message || String(err) },
        created_at: new Date().toISOString(),
      };
      mockAuditLog.push(errorAudit);
      if (supabase) {
        try {
          await supabase.from("audit_log").insert(errorAudit);
        } catch {}
      }
      details.push({ invoice_id: invId, action: "ERROR", error: err.message || String(err) });
    }
  }

  const durationMs = Date.now() - startTime;
  const completedIso = new Date().toISOString();

  // Complete sweep
  const sweepRunRecord = {
    sweep_id: sweepId,
    owner_id: ownerId,
    status: "COMPLETED",
    invoices_processed: invoiceList.length,
    emails_sent: emailsSent,
    escalated_count: escalatedCount,
    duration_ms: durationMs,
    started_at: startIso,
    completed_at: completedIso,
  };
  mockSweepRuns.push(sweepRunRecord);

  const completeAudit = {
    log_id: `log_${Math.random().toString(36).substring(2, 14)}`,
    sweep_id: sweepId,
    owner_id: ownerId,
    action: "SWEEP_COMPLETED",
    status: "SUCCESS",
    metadata: {
      invoices_processed: invoiceList.length,
      emails_sent: emailsSent,
      escalated_count: escalatedCount,
      skipped_count: skippedCount,
      failed_count: failedCount,
      duration_ms: durationMs,
    },
    created_at: completedIso,
  };
  mockAuditLog.push(completeAudit);

  if (supabase) {
    try {
      await supabase.from("audit_log").insert(completeAudit);
      await supabase.from("sweep_runs").update({
        status: "COMPLETED",
        invoices_processed: invoiceList.length,
        emails_sent: emailsSent,
        escalated_count: escalatedCount,
        duration_ms: durationMs,
        completed_at: completedIso,
      }).eq("sweep_id", sweepId);
    } catch {}
  }

  const responsePayload: SweepResponse = {
    success: true,
    sweep_id: sweepId,
    owner_id: ownerId,
    status: "COMPLETED",
    invoices_processed: invoiceList.length,
    emails_sent: emailsSent,
    escalated_count: escalatedCount,
    skipped_count: skippedCount,
    failed_count: failedCount,
    duration_ms: durationMs,
    started_at: startIso,
    completed_at: completedIso,
    details,
  };

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

// Deno.serve entrypoint for Edge deployment
if (typeof Deno !== "undefined" && "serve" in Deno) {
  (Deno as any).serve((req: Request) => handleAgentSweep(req));
}
