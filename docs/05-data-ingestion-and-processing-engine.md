# 05 — Data Ingestion & Processing Engine

> **Chazer** · CSV Seed Pipeline → Supabase Postgres

---

## 1. Ingestion Sources

For the hackathon demo, all data is seeded from a single structured CSV file. No live integrations are built (scope decision per context.md).

| Source | Format | Transport | Status |
|--------|--------|-----------|--------|
| Demo seed CSV | `.csv` | Supabase Storage → Edge Function | ✅ Implemented |
| QuickBooks Online | REST/Webhooks | OAuth2 webhook | ❌ Mocked (future) |
| Stripe Invoices API | REST | Stripe webhooks | ❌ Mocked (future) |
| Manual invoice entry | JSON via dashboard form | POST REST endpoint | ❌ Future |
| Client reply emails | IMAP / Webhook | Email parsing | ❌ Future (dispute_flag set manually for demo) |

---

## 2. Seed CSV Schema

### File Location
```
Supabase Storage → bucket: "seed-data" → file: "invoices_seed.csv"
```

### CSV Format

```csv
invoice_id,client_id,client_name,client_email,amount,currency,due_date,status,services_description
INV-001,CLI-001,Acme Corp,ap@acme.com,4800.00,USD,2026-08-15,OVERDUE,UX Design Sprint — August 2026
INV-002,CLI-002,Bluebell Studios,finance@bluebell.io,12500.00,USD,2026-08-01,OVERDUE,Brand Identity Package
INV-003,CLI-003,Cascade Tech,sarah.l@cascade.com,890.00,USD,2026-08-28,OVERDUE,Landing Page — Revision 2
INV-004,CLI-001,Acme Corp,ap@acme.com,3200.00,USD,2026-09-01,SENT,Monthly Retainer — September
INV-005,CLI-004,DeltaWave Media,billing@deltawave.com,55000.00,USD,2026-07-31,OVERDUE,IT Infrastructure Audit
INV-006,CLI-005,Ember Creative,jo@embercreative.co,1400.00,USD,2026-09-05,SENT,Social Media Package
INV-007,CLI-002,Bluebell Studios,finance@bluebell.io,7200.00,USD,2026-08-10,OVERDUE,Web App Development Phase 1
INV-008,CLI-006,Foxglove Labs,accounts@foxglove.io,2100.00,USD,2026-08-22,OVERDUE,API Integration Consulting
```

### Field Definitions

| Field | Type | Required | Validation Rule |
|-------|------|----------|----------------|
| `invoice_id` | string | ✅ | Unique, format: `INV-NNN` |
| `client_id` | string | ✅ | Format: `CLI-NNN` |
| `client_name` | string | ✅ | Non-empty, max 200 chars |
| `client_email` | string | ✅ | Valid email (RFC 5321) |
| `amount` | decimal | ✅ | > 0, max 999,999.99 |
| `currency` | string | ✅ | ISO 4217 code (demo: USD only) |
| `due_date` | date | ✅ | ISO 8601 (YYYY-MM-DD) |
| `status` | enum | ✅ | One of: `SENT`, `OVERDUE`, `PAID`, `DRAFT` |
| `services_description` | string | ✅ | Non-empty, max 500 chars |

---

## 3. Parser & Extractor Pipeline

### Edge Function: `seed-data.ts`

```typescript
// supabase/functions/seed-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.168.0/encoding/csv.ts";

serve(async (req: Request) => {
  // 1. Auth guard — require internal secret
  const secret = req.headers.get("x-seed-secret");
  if (secret !== Deno.env.get("SEED_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Download CSV from Supabase Storage
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("seed-data")
    .download("invoices_seed.csv");

  if (downloadError) throw downloadError;

  // 3. Parse CSV
  const csvText = await fileData.text();
  const rows = parse(csvText, { skipFirstRow: true, columns: EXPECTED_COLUMNS });

  // 4. Validate and transform rows
  const { valid, invalid } = validateAndTransform(rows);

  // 5. Upsert clients (idempotent)
  const clients = extractUniqueClients(valid);
  const { error: clientError } = await supabase
    .from("clients")
    .upsert(clients, { onConflict: "client_id" });

  if (clientError) throw clientError;

  // 6. Upsert invoices (idempotent)
  const invoices = valid.map(transformToInvoiceRecord);
  const { error: invoiceError } = await supabase
    .from("invoices")
    .upsert(invoices, { onConflict: "invoice_id" });

  if (invoiceError) throw invoiceError;

  return Response.json({
    seeded: valid.length,
    skipped: 0, // upsert handles existing records
    invalid: invalid.length,
    invalid_rows: invalid,
  });
});
```

---

## 4. Validation Rules (Parser Layer)

### Row-Level Validation

```typescript
function validateRow(row: RawCSVRow): ValidationResult {
  const errors: string[] = [];

  // invoice_id
  if (!row.invoice_id.match(/^INV-\d{3,}$/)) {
    errors.push(`invalid invoice_id format: ${row.invoice_id}`);
  }

  // amount
  const amount = parseFloat(row.amount);
  if (isNaN(amount) || amount <= 0 || amount > 999_999.99) {
    errors.push(`invalid amount: ${row.amount}`);
  }

  // due_date
  const due = new Date(row.due_date);
  if (isNaN(due.getTime())) {
    errors.push(`invalid due_date: ${row.due_date}`);
  }

  // email
  if (!row.client_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.push(`invalid email: ${row.client_email}`);
  }

  // status
  const VALID_STATUSES = ["SENT", "OVERDUE", "PAID", "DRAFT"];
  if (!VALID_STATUSES.includes(row.status)) {
    errors.push(`invalid status: ${row.status}`);
  }

  return { valid: errors.length === 0, errors, row };
}
```

### Sanitization

- Strip leading/trailing whitespace from all string fields
- Truncate `services_description` to 500 chars if longer (log warning)
- Normalize email to lowercase
- Parse `amount` with `parseFloat`; round to 2 decimal places

---

## 5. Data Normalization

### CSV Row → Canonical DB Records

**`clients` record:**
```typescript
{
  client_id: row.client_id,            // "CLI-001"
  name: row.client_name.trim(),         // "Acme Corp"
  email: row.client_email.toLowerCase(), // "ap@acme.com"
  created_at: new Date().toISOString(),
  owner_id: "demo_owner"
}
```

**`invoices` record:**
```typescript
{
  invoice_id: row.invoice_id,           // "INV-001"
  client_id: row.client_id,            // "CLI-001"
  owner_id: "demo_owner",
  amount: parseFloat(row.amount),       // 4800.00
  currency: row.currency || "USD",
  due_date: row.due_date,              // "2026-08-15"
  status: row.status,                  // "OVERDUE"
  services_description: row.services_description.trim(),
  contact_count: 0,                    // Start at 0 — agent will manage
  dispute_flag: false,
  last_contact_at: null,
  created_at: new Date().toISOString()
}
```

---

## 6. Seed Data Design for Demo

The seed CSV is intentionally designed to showcase all escalation paths in a single demo:

| Invoice | Amount | Days Overdue | Expected Agent Behavior |
|---------|--------|-------------|------------------------|
| INV-001 | $4,800 | 28 days | Tier 3 → Decision Queue |
| INV-002 | $12,500 | 42 days | Tier 3 → Decision Queue |
| INV-003 | $890 | 15 days | Tier 2 → Auto-send (after seeding 1 contact_history) |
| INV-004 | $3,200 | 11 days | Tier 1 → Auto-send (just sent, contact_count=0) |
| INV-005 | $55,000 | 43 days | HIGH VALUE → Decision Queue (overrides tier) |
| INV-006 | $1,400 | 7 days | Tier 1 → Auto-send |
| INV-007 | $7,200 | 33 days | Tier 3 → Decision Queue |
| INV-008 | $2,100 | 21 days | Tier 2 → Auto-send |

**Note:** For INV-003 to demonstrate Tier-2, the seed script also inserts one `contact_history` record for that invoice (simulating a prior Tier-1 send).

---

## 7. Confidence Scoring (LLM Classification)

The agent returns a `confidence` score (0.0–1.0) on each classification. This is:
- Displayed in the audit log metadata
- Used to sort the decision queue (lower confidence items shown first for owner review)
- **Not** used to override the tier rules — tier is deterministic based on business rules. Confidence reflects LLM's certainty about dispute/negotiation signals in any attached client reply text.

```
confidence thresholds:
  >= 0.85 → High confidence; proceed automatically
  0.60-0.84 → Medium confidence; proceed but log warning
  < 0.60 → Low confidence; treat as DISPUTE; escalate
```
