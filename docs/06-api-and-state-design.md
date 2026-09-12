# 06 — API & State Architecture

> **Chazer** · Supabase Edge Functions REST API + Zustand Client State

---

## 1. API Overview

All API endpoints are Supabase Edge Functions served at:
```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

For the demo, all endpoints are scoped to `owner_id = "demo_owner"`. No authentication middleware is implemented.

---

## 2. REST Endpoints

### GET `/functions/v1/invoices`

Fetch all invoices for the demo owner with computed fields.

**Request:**
```http
GET /functions/v1/invoices?sort=days_overdue&order=desc
Authorization: Bearer <supabase-anon-key>
```

**Query Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | string | `days_overdue` | Sort field |
| `order` | string | `desc` | `asc` or `desc` |
| `status` | string | (all) | Filter by status |
| `tier` | string | (all) | Filter by tier: `TIER_1`, `TIER_2`, `TIER_3` |

**Response 200:**
```json
{
  "invoices": [
    {
      "invoice_id": "INV-005",
      "client_id": "CLI-004",
      "client_name": "DeltaWave Media",
      "client_email": "billing@deltawave.com",
      "amount": 55000.00,
      "currency": "USD",
      "due_date": "2026-07-31",
      "days_overdue": 43,
      "status": "OVERDUE",
      "tier": "TIER_3",
      "is_high_value": true,
      "contact_count": 1,
      "dispute_flag": false,
      "last_contact_at": "2026-08-15T09:04:22Z",
      "services_description": "IT Infrastructure Audit"
    }
  ],
  "summary": {
    "total_overdue_amount": 83890.00,
    "count_by_tier": {
      "TIER_1": 2,
      "TIER_2": 2,
      "TIER_3": 4
    },
    "pending_decisions": 3
  }
}
```

**Response 500:**
```json
{ "error": "Database query failed", "detail": "..." }
```

---

### GET `/functions/v1/decisions`

Fetch all pending decision queue items.

**Request:**
```http
GET /functions/v1/decisions?status=PENDING_APPROVAL
Authorization: Bearer <supabase-anon-key>
```

**Response 200:**
```json
{
  "decisions": [
    {
      "decision_id": "dec_a1b2c3",
      "invoice_id": "INV-005",
      "invoice": {
        "client_name": "DeltaWave Media",
        "amount": 55000.00,
        "days_overdue": 43,
        "is_high_value": true
      },
      "escalation_reason": "Invoice 43 days overdue. High-value invoice exceeds $10,000 threshold.",
      "draft_subject": "Final Notice: Invoice #INV-005 — $55,000.00 Overdue",
      "draft_body": "Dear Accounts Payable,\n\nThis is a formal final notice regarding invoice #INV-005...",
      "tier": "TIER_3",
      "llm_confidence": 0.96,
      "status": "PENDING_APPROVAL",
      "created_at": "2026-09-12T09:02:11Z"
    }
  ]
}
```

---

### POST `/functions/v1/decisions/:id/approve`

Approve a pending decision — sends the AI-drafted (or edited) email.

**Request:**
```http
POST /functions/v1/decisions/dec_a1b2c3/approve
Content-Type: application/json
Authorization: Bearer <supabase-anon-key>

{
  "edited_subject": "Final Notice: Invoice #INV-005 — $55,000.00 Overdue",
  "edited_body": "Dear Accounts Payable,\n\nThis is a formal final notice..."
}
```

**Note:** `edited_subject` and `edited_body` are optional. If omitted, the AI draft is used.

**Response 200:**
```json
{
  "success": true,
  "resend_message_id": "re_abc123def456",
  "sent_at": "2026-09-12T14:22:01Z",
  "decision_id": "dec_a1b2c3"
}
```

**Response 409 (Already Resolved):**
```json
{
  "error": "DECISION_ALREADY_RESOLVED",
  "current_status": "APPROVED"
}
```

**Response 422 (Validation Failed):**
```json
{
  "error": "EMAIL_VALIDATION_FAILED",
  "detail": "Edited email body does not contain invoice ID"
}
```

---

### POST `/functions/v1/decisions/:id/reject`

Reject a decision — no email sent.

**Request:**
```http
POST /functions/v1/decisions/dec_a1b2c3/reject
Content-Type: application/json
Authorization: Bearer <supabase-anon-key>

{
  "reject_reason": "Client called — dispute resolved verbally. Invoice will be adjusted."
}
```

**Response 200:**
```json
{
  "success": true,
  "decision_id": "dec_a1b2c3",
  "rejected_at": "2026-09-12T14:30:00Z"
}
```

---

### GET `/functions/v1/audit-log`

Fetch paginated agent action history.

**Request:**
```http
GET /functions/v1/audit-log?page=1&limit=50&invoice_id=INV-005
Authorization: Bearer <supabase-anon-key>
```

**Response 200:**
```json
{
  "entries": [
    {
      "log_id": "log_xyz789",
      "invoice_id": "INV-005",
      "action": "HIGH_VALUE_ESCALATED",
      "status": "ESCALATED",
      "timestamp": "2026-09-12T09:02:11Z",
      "metadata": {
        "tier": "TIER_3",
        "amount": 55000.00,
        "threshold": 10000,
        "llm_confidence": 0.96
      }
    },
    {
      "log_id": "log_xyz788",
      "invoice_id": "INV-003",
      "action": "TIER2_EMAIL_SENT",
      "status": "SENT",
      "timestamp": "2026-09-12T09:01:54Z",
      "metadata": {
        "resend_message_id": "re_def456",
        "email_subject": "Second Reminder: Invoice #INV-003"
      }
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 50,
    "has_more": false
  }
}
```

---

### POST `/functions/v1/sweep` (Manual Trigger)

Manually trigger an agent sweep (for demo purposes).

**Request:**
```http
POST /functions/v1/sweep
Authorization: Bearer <supabase-anon-key>
```

**Response 202:**
```json
{
  "sweep_id": "sweep_20260912_142200",
  "status": "STARTED",
  "message": "Sweep started. Check audit log for progress."
}
```

---

### POST `/functions/v1/seed-data`

Trigger one-time CSV seed from Supabase Storage.

**Request:**
```http
POST /functions/v1/seed-data
x-seed-secret: <SEED_SECRET>
```

**Response 200:**
```json
{
  "seeded": 8,
  "skipped": 0,
  "invalid": 0,
  "invalid_rows": []
}
```

---

## 3. Client State Store (Zustand)

```typescript
// lib/store.ts

import { create } from "zustand";
import { Invoice, Decision, AuditEntry, Summary } from "./types";

interface ChazerStore {
  // Data
  invoices: Invoice[];
  decisions: Decision[];
  auditEntries: AuditEntry[];
  summary: Summary | null;

  // Loading states
  isLoadingInvoices: boolean;
  isLoadingDecisions: boolean;
  isLoadingAudit: boolean;
  isSweeping: boolean;

  // Optimistic updates
  pendingDecisionIds: Set<string>; // IDs being approved/rejected

  // Actions
  fetchInvoices: () => Promise<void>;
  fetchDecisions: () => Promise<void>;
  fetchAuditLog: () => Promise<void>;
  approveDecision: (id: string, editedContent?: EmailContent) => Promise<void>;
  rejectDecision: (id: string, reason: string) => Promise<void>;
  triggerSweep: () => Promise<void>;
}

export const useChazerStore = create<ChazerStore>((set, get) => ({
  invoices: [],
  decisions: [],
  auditEntries: [],
  summary: null,
  isLoadingInvoices: false,
  isLoadingDecisions: false,
  isLoadingAudit: false,
  isSweeping: false,
  pendingDecisionIds: new Set(),

  fetchInvoices: async () => {
    set({ isLoadingInvoices: true });
    const data = await apiClient.getInvoices();
    set({ invoices: data.invoices, summary: data.summary, isLoadingInvoices: false });
  },

  approveDecision: async (id, editedContent) => {
    // Optimistic update: remove from decisions list immediately
    set(state => ({
      decisions: state.decisions.filter(d => d.decision_id !== id),
      pendingDecisionIds: new Set([...state.pendingDecisionIds, id])
    }));
    try {
      await apiClient.approveDecision(id, editedContent);
      // Refresh audit log to show new APPROVED entry
      await get().fetchAuditLog();
    } catch (err) {
      // Rollback: refetch decisions to restore the rejected item
      await get().fetchDecisions();
      throw err;
    } finally {
      set(state => {
        const next = new Set(state.pendingDecisionIds);
        next.delete(id);
        return { pendingDecisionIds: next };
      });
    }
  },

  triggerSweep: async () => {
    set({ isSweeping: true });
    try {
      await apiClient.triggerSweep();
      // Poll for sweep completion via audit log
      setTimeout(async () => {
        await Promise.all([
          get().fetchInvoices(),
          get().fetchDecisions(),
          get().fetchAuditLog(),
        ]);
        set({ isSweeping: false });
      }, 5000);
    } catch (err) {
      set({ isSweeping: false });
      throw err;
    }
  }
}));
```

---

## 4. Database Schema

### Table: `clients`

```sql
CREATE TABLE clients (
  client_id       TEXT PRIMARY KEY,           -- "CLI-001"
  owner_id        TEXT NOT NULL DEFAULT 'demo_owner',
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

CREATE INDEX idx_clients_owner ON clients(owner_id);
```

**Sample record:**
```json
{
  "client_id": "CLI-001",
  "owner_id": "demo_owner",
  "name": "Acme Corp",
  "email": "ap@acme.com",
  "created_at": "2026-09-12T08:00:00Z"
}
```

---

### Table: `invoices`

```sql
CREATE TABLE invoices (
  invoice_id           TEXT PRIMARY KEY,       -- "INV-001"
  client_id            TEXT NOT NULL REFERENCES clients(client_id),
  owner_id             TEXT NOT NULL DEFAULT 'demo_owner',
  amount               DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  due_date             DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'SENT'
                       CHECK (status IN ('DRAFT','SENT','OVERDUE','PAID',
                                         'DISPUTED','FINAL_NOTICE_SENT','CLOSED')),
  services_description TEXT NOT NULL,
  contact_count        INT NOT NULL DEFAULT 0,
  dispute_flag         BOOLEAN NOT NULL DEFAULT FALSE,
  last_contact_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_owner ON invoices(owner_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_last_contact ON invoices(last_contact_at);
```

**Computed column (view):**
```sql
CREATE VIEW v_invoices_enriched AS
SELECT
  i.*,
  c.name AS client_name,
  c.email AS client_email,
  GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) AS days_overdue,
  CASE
    WHEN i.dispute_flag THEN 'TIER_3'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) BETWEEN 1 AND 7
         AND i.contact_count = 0 THEN 'TIER_1'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) BETWEEN 8 AND 21
         AND i.contact_count >= 1 THEN 'TIER_2'
    WHEN GREATEST(0, EXTRACT(DAY FROM NOW() - i.due_date::timestamp)::INT) >= 22 THEN 'TIER_3'
    ELSE 'UNCLASSIFIED'
  END AS tier
FROM invoices i
JOIN clients c ON c.client_id = i.client_id;
```

---

### Table: `contact_history`

```sql
CREATE TABLE contact_history (
  contact_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      TEXT NOT NULL REFERENCES invoices(invoice_id),
  owner_id        TEXT NOT NULL DEFAULT 'demo_owner',
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier            TEXT NOT NULL CHECK (tier IN ('TIER_1','TIER_2','TIER_3')),
  email_subject   TEXT NOT NULL,
  email_body      TEXT NOT NULL,
  resend_msg_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED'))
);

CREATE INDEX idx_contact_invoice ON contact_history(invoice_id);
CREATE INDEX idx_contact_sent_at ON contact_history(sent_at DESC);
```

---

### Table: `audit_log`

```sql
CREATE TABLE audit_log (
  log_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sweep_id     TEXT,
  invoice_id   TEXT REFERENCES invoices(invoice_id),
  owner_id     TEXT NOT NULL DEFAULT 'demo_owner',
  action       TEXT NOT NULL,
  status       TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable: no UPDATE allowed (enforced via RLS in production)
CREATE INDEX idx_audit_invoice ON audit_log(invoice_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action);
```

---

### Table: `decision_queue`

```sql
CREATE TABLE decision_queue (
  decision_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       TEXT NOT NULL REFERENCES invoices(invoice_id),
  owner_id         TEXT NOT NULL DEFAULT 'demo_owner',
  escalation_reason TEXT NOT NULL,
  draft_subject    TEXT NOT NULL,
  draft_body       TEXT NOT NULL,
  tier             TEXT NOT NULL,
  llm_confidence   DECIMAL(4,3),
  status           TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
                   CHECK (status IN ('PENDING_APPROVAL','APPROVED','REJECTED')),
  resolved_at      TIMESTAMPTZ,
  reject_reason    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dq_status ON decision_queue(status);
CREATE INDEX idx_dq_invoice ON decision_queue(invoice_id);
```

---

### Table: `sweep_runs`

```sql
CREATE TABLE sweep_runs (
  sweep_id           TEXT PRIMARY KEY,  -- "sweep_20260912_090000"
  owner_id           TEXT NOT NULL DEFAULT 'demo_owner',
  started_at         TIMESTAMPTZ NOT NULL,
  completed_at       TIMESTAMPTZ,
  invoices_processed INT DEFAULT 0,
  emails_sent        INT DEFAULT 0,
  escalated_count    INT DEFAULT 0,
  failed_count       INT DEFAULT 0,
  duration_ms        INT,
  status             TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','COMPLETE','FAILED'))
);
```
