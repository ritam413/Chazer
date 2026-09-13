// supabase/functions/seed-data/index.ts
// Supabase Edge Function: Ingests and validates seed CSV into clients and invoices tables.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import {
  SEED_CORS_HEADERS as CORS_HEADERS,
  type RawCSVRow,
  type SanitizedRow,
  type ValidationResult,
  type ClientRecord,
  type InvoiceRecord,
  type SeedResponse,
} from "../_shared/types";

export {
  CORS_HEADERS,
  type RawCSVRow,
  type SanitizedRow,
  type ValidationResult,
  type ClientRecord,
  type InvoiceRecord,
  type SeedResponse,
};

export const DEFAULT_SEED_CSV = `invoice_id,client_id,client_name,client_email,amount,currency,due_date,status,services_description
INV-001,CLI-001,Acme Corp,ap@acme.com,4800.00,USD,2026-08-15,OVERDUE,UX Design Sprint — August 2026
INV-002,CLI-002,Bluebell Studios,finance@bluebell.io,12500.00,USD,2026-08-01,OVERDUE,Brand Identity Package
INV-003,CLI-003,Cascade Tech,sarah.l@cascade.com,890.00,USD,2026-08-28,OVERDUE,Landing Page — Revision 2
INV-004,CLI-001,Acme Corp,ap@acme.com,3200.00,USD,2026-09-01,SENT,Monthly Retainer — September
INV-005,CLI-004,DeltaWave Media,billing@deltawave.com,55000.00,USD,2026-07-31,OVERDUE,IT Infrastructure Audit
INV-006,CLI-005,Ember Creative,jo@embercreative.co,1400.00,USD,2026-09-05,SENT,Social Media Package
INV-007,CLI-002,Bluebell Studios,finance@bluebell.io,7200.00,USD,2026-08-10,OVERDUE,Web App Development Phase 1
INV-008,CLI-006,Foxglove Labs,accounts@foxglove.io,2100.00,USD,2026-08-22,OVERDUE,API Integration Consulting`;

/**
 * Parse CSV text into array of object rows
 */
export function parseCSV(csvText: string): RawCSVRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  const rows: RawCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV tokenizer supporting optional quoted strings
    const values: string[] = [];
    let insideQuote = false;
    let currentVal = "";

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const c = line[charIdx];
      if (c === '"') {
        insideQuote = !insideQuote;
      } else if (c === "," && !insideQuote) {
        values.push(currentVal.trim());
        currentVal = "";
      } else {
        currentVal += c;
      }
    }
    values.push(currentVal.trim());

    const rowObj: any = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx] : "";
    });

    rows.push({
      invoice_id: rowObj.invoice_id || "",
      client_id: rowObj.client_id || "",
      client_name: rowObj.client_name || "",
      client_email: rowObj.client_email || "",
      amount: rowObj.amount || "",
      currency: rowObj.currency || "USD",
      due_date: rowObj.due_date || "",
      status: rowObj.status || "SENT",
      services_description: rowObj.services_description || "",
    });
  }

  return rows;
}

/**
 * Validates and sanitizes a single raw CSV row
 */
export function validateRow(row: RawCSVRow): ValidationResult {
  const errors: string[] = [];

  // 1. invoice_id validation
  const invoiceId = (row.invoice_id || "").trim();
  if (!/^INV-\d{3,}$/.test(invoiceId)) {
    errors.push(`invalid invoice_id format: ${row.invoice_id} (expected format INV-NNN)`);
  }

  // 2. client_id validation
  const clientId = (row.client_id || "").trim();
  if (!clientId || clientId.length === 0) {
    errors.push(`missing or invalid client_id: ${row.client_id}`);
  }

  // 3. client_name validation
  const clientName = (row.client_name || "").trim();
  if (!clientName || clientName.length > 200) {
    errors.push(`invalid client_name: max 200 chars required`);
  }

  // 4. client_email validation (RFC 5321 regex)
  const clientEmail = (row.client_email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clientEmail)) {
    errors.push(`invalid client_email: ${row.client_email}`);
  }

  // 5. amount validation
  const parsedAmount = parseFloat(row.amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999.99) {
    errors.push(`invalid amount: ${row.amount} (must be > 0 and <= 999999.99)`);
  }
  const roundedAmount = Math.round(parsedAmount * 100) / 100;

  // 6. currency validation
  const currency = (row.currency || "USD").trim().toUpperCase();

  // 7. due_date validation
  const dueDate = (row.due_date || "").trim();
  const parsedDate = new Date(dueDate);
  if (isNaN(parsedDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    errors.push(`invalid due_date format: ${row.due_date} (expected ISO YYYY-MM-DD)`);
  }

  // 8. status validation
  const VALID_STATUSES = [
    "DRAFT",
    "SENT",
    "OVERDUE",
    "PAID",
    "DISPUTED",
    "FINAL_NOTICE_SENT",
    "CLOSED",
  ];
  const status = (row.status || "").trim().toUpperCase();
  if (!VALID_STATUSES.includes(status)) {
    errors.push(`invalid status: ${row.status} (allowed: ${VALID_STATUSES.join(", ")})`);
  }

  // 9. services_description validation & truncation
  let servicesDesc = (row.services_description || "").trim();
  if (!servicesDesc) {
    errors.push(`missing services_description`);
  }
  if (servicesDesc.length > 500) {
    servicesDesc = servicesDesc.substring(0, 500);
  }

  const sanitizedRow: SanitizedRow = {
    invoice_id: invoiceId,
    client_id: clientId,
    client_name: clientName,
    client_email: clientEmail,
    amount: roundedAmount,
    currency: currency || "USD",
    due_date: dueDate,
    status: (VALID_STATUSES.includes(status) ? status : "SENT") as SanitizedRow["status"],
    services_description: servicesDesc,
  };

  return {
    valid: errors.length === 0,
    errors,
    sanitizedRow,
    rawRow: row,
  };
}

/**
 * Validates batch of rows and separates valid from invalid
 */
export function validateAndTransform(rows: RawCSVRow[]): {
  valid: SanitizedRow[];
  invalid: Array<{ row: RawCSVRow; errors: string[] }>;
} {
  const valid: SanitizedRow[] = [];
  const invalid: Array<{ row: RawCSVRow; errors: string[] }> = [];

  for (const row of rows) {
    const result = validateRow(row);
    if (result.valid) {
      valid.push(result.sanitizedRow);
    } else {
      invalid.push({ row: result.rawRow, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * Extracts unique client records from validated rows
 */
export function extractUniqueClients(
  rows: SanitizedRow[],
  ownerId = "demo_owner"
): ClientRecord[] {
  const clientsMap = new Map<string, ClientRecord>();
  const now = new Date().toISOString();

  for (const row of rows) {
    if (!clientsMap.has(row.client_id)) {
      clientsMap.set(row.client_id, {
        client_id: row.client_id,
        owner_id: ownerId,
        name: row.client_name,
        email: row.client_email,
        created_at: now,
      });
    }
  }

  return Array.from(clientsMap.values());
}

/**
 * Transforms validated row into canonical invoice DB record
 */
export function transformToInvoiceRecord(
  row: SanitizedRow,
  ownerId = "demo_owner"
): InvoiceRecord {
  const now = new Date().toISOString();
  return {
    invoice_id: row.invoice_id,
    client_id: row.client_id,
    owner_id: ownerId,
    amount: row.amount,
    currency: row.currency || "USD",
    due_date: row.due_date,
    status: row.status,
    services_description: row.services_description,
    contact_count: 0,
    dispute_flag: false,
    last_contact_at: null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Main request handler for seed-data Edge Function
 */
export async function handleSeedData(
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

  // 2. Auth Guard
  const env =
    envOverride ||
    (typeof Deno !== "undefined" && Deno.env
      ? {
          SEED_SECRET: Deno.env.get("SEED_SECRET") || "",
          SUPABASE_URL: Deno.env.get("SUPABASE_URL") || "",
          SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
        }
      : {});

  const expectedSecret = env.SEED_SECRET;
  const providedSecret = req.headers.get("x-seed-secret");

  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid or missing x-seed-secret" }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 3. Obtain CSV content
    let csvText = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      csvText = await req.text();
    } else if (contentType.includes("application/json")) {
      try {
        const body = await req.json();
        if (body && typeof body.csv === "string") {
          csvText = body.csv;
        }
      } catch {
        // ignore JSON parse error, proceed to fallback
      }
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    let supabase = supabaseClientOverride;
    if (!supabase && supabaseUrl && supabaseServiceKey) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // If no CSV provided in request body, attempt download from Supabase Storage
    if (!csvText && supabase && supabase.storage) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("seed-data")
          .download("invoices_seed.csv");

        if (!downloadError && fileData) {
          csvText = await fileData.text();
        }
      } catch {
        // storage download failed, fallback to default seed CSV
      }
    }

    if (!csvText) {
      csvText = DEFAULT_SEED_CSV;
    }

    // 4. Parse and validate CSV rows
    const rawRows = parseCSV(csvText);
    const { valid, invalid } = validateAndTransform(rawRows);

    // 5. Upsert to DB if Supabase client available
    if (supabase) {
      const clients = extractUniqueClients(valid);
      if (clients.length > 0) {
        const { error: clientErr } = await supabase
          .from("clients")
          .upsert(clients, { onConflict: "client_id" });
        if (clientErr) {
          console.warn("Client upsert warning:", clientErr);
        }
      }

      const invoiceRecords = valid.map((r) => transformToInvoiceRecord(r));
      if (invoiceRecords.length > 0) {
        const { error: invoiceErr } = await supabase
          .from("invoices")
          .upsert(invoiceRecords, { onConflict: "invoice_id" });
        if (invoiceErr) {
          console.warn("Invoice upsert warning:", invoiceErr);
        }
      }

      // Seed contact history simulation for INV-003 (Tier-2 demonstration) if needed
      try {
        await supabase.from("contact_history").upsert(
          [
            {
              invoice_id: "INV-003",
              owner_id: "demo_owner",
              sent_at: "2026-08-30T10:00:00Z",
              tier: "TIER_1",
              email_subject: "Friendly Reminder: Invoice #INV-003",
              email_body: "Hi Sarah, just a friendly reminder regarding invoice #INV-003.",
              resend_msg_id: "re_mock_seed_003",
              status: "SENT",
            },
          ],
          { onConflict: "invoice_id,sent_at" }
        );
      } catch {
        // non-blocking
      }
    }

    const responsePayload: SeedResponse = {
      seeded: valid.length,
      skipped: 0,
      invalid: invalid.length,
      invalid_rows: invalid,
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Seed operation failed",
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
  (Deno as any).serve(handleSeedData);
}
