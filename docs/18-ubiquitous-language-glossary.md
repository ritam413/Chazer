# 18 — Ubiquitous Language Glossary

> **Chazer** · Domain Glossary — Single Source of Truth for Engineering, Design, and Product

---

All team members, code, UI labels, documentation, and API responses must use these terms consistently. When a term is used differently in two places, the glossary wins.

---

## Core Domain Terms

### Invoice
A request for payment sent by the owner to a client for services already delivered. In Chazer, an invoice is the central domain object. Invoices are never created by the system — they are seeded or (in production) imported from accounting tools.

- **Not:** "bill", "payment request", "charge"
- **Code symbol:** `Invoice`, `invoice_id`

---

### Client
The entity (company or individual) that owes money on an invoice. A client may have multiple invoices. In Chazer, client data is stored for email targeting; no client-facing portal exists.

- **Not:** "customer", "payer", "debtor"
- **Code symbol:** `Client`, `client_id`

---

### Owner
The single user who runs the Chazer dashboard. For the demo, the owner is the hardcoded `demo_owner`. In production, the owner would be a freelancer or agency principal.

- **Not:** "user", "admin", "account holder"
- **Code symbol:** `owner_id = "demo_owner"`

---

### Days Overdue
The number of calendar days elapsed since an invoice's `due_date`. Computed as `MAX(0, CURRENT_DATE - due_date)`. Always non-negative.

- **Not:** "days late", "age", "overdue days"
- **Formula:** `MAX(0, CURRENT_DATE - due_date)`

---

### Escalation Tier (Tier 1 / Tier 2 / Tier 3)
The classification assigned to an overdue invoice that determines what action the agent takes.

| Tier | Days Overdue | Contact Count | Action |
|------|-------------|--------------|--------|
| Tier 1 | 1–7 | 0 | Friendly nudge — auto-sent |
| Tier 2 | 8–21 | ≥ 1 | Firm reminder — auto-sent |
| Tier 3 | ≥ 22 | any | Final notice draft — held for human |

- **Not:** "level", "stage", "phase", "severity"
- **Code values:** `"TIER_1"`, `"TIER_2"`, `"TIER_3"`

---

### Auto-Send
An email that the agent sends without requiring owner approval. Applies to Tier-1 and Tier-2 emails on invoices that are not high-value and have no dispute flag.

- **Not:** "automatic send", "bot send", "unsupervised send"
- **Invariant:** Auto-send is never permitted for Tier 3 or high-value invoices.

---

### High-Value Invoice
An invoice whose `amount` meets or exceeds `owner.high_value_threshold` (default: $10,000). High-value invoices always escalate to the decision queue regardless of tier.

- **Not:** "large invoice", "major invoice", "VIP invoice"
- **Code:** `is_high_value = invoice.amount >= owner.high_value_threshold`

---

### Escalation
The act of routing an invoice to the **Decision Queue** instead of auto-sending. Triggered by: Tier 3 classification, high-value threshold, dispute flag, or low LLM confidence.

- **Not:** "flagging", "routing", "human handoff"
- **Code:** `escalate = true` in classification output

---

### Decision Queue
The list of items that require the owner's explicit approval before any email is sent. Each item contains the invoice context, escalation reason, and an AI-drafted email.

- **Not:** "approval queue", "pending items", "inbox"
- **UI label:** "Needs Your Decision"
- **Code table:** `decision_queue`

---

### Draft
The AI-generated email content (subject + body) created by the agent for Tier-3 and escalated invoices. The owner may approve the draft as-is or edit it before sending.

- **Not:** "template", "suggestion", "proposal"
- **Fields:** `draft_subject`, `draft_body`

---

### Dispute
A signal that the client contests the invoice — the amount, the scope of work, or the delivery. Dispute detection sets `dispute_flag = true` and permanently prevents auto-sends until the owner resolves it.

- **Not:** "complaint", "rejection", "issue"
- **Code:** `dispute_flag` (boolean on `invoices` table)

---

### Negotiation Intent
A sub-category of client reply where the client is not disputing the invoice's validity but is requesting a different payment arrangement (extension, partial payment, discount). Detected by LLM reply analysis. Treated the same as a Dispute for routing purposes — escalated.

- **Not:** "discount request", "extension ask", "stalling"
- **LLM classification:** `"NEGOTIATION"` (distinct from `"DISPUTE"`)

---

### Contact
A single email sent by the agent to the client for a specific invoice. Tracked in `contact_history`. The `contact_count` on an invoice is the total number of contacts made by the agent.

- **Not:** "touch", "outreach", "follow-up"
- **Code table:** `contact_history`

---

### Contact Window
The minimum time that must elapse between two contacts on the same invoice. Default: 72 hours. Enforced by the sweep's eligibility filter.

- **Not:** "cooldown period", "rate limit", "frequency cap"
- **Config:** `CONTACT_WINDOW_HOURS = 72`

---

### Agent Sweep
A single execution of the autonomous background agent loop that processes all eligible overdue invoices. Triggered daily by pg_cron, or manually via the dashboard.

- **Not:** "run", "job", "batch", "scan"
- **Code:** `sweep_id`, `sweep_runs` table

---

### Audit Log
An immutable, append-only record of every action the agent takes. Enables trust and transparency. The owner can see exactly what the agent did and why.

- **Not:** "activity log", "history", "event log"
- **Invariant:** Entries are never updated or deleted.
- **Code table:** `audit_log`

---

### Resolution
An owner action that closes a decision queue item: either **Approve** (send the email) or **Reject** (close without sending). Once resolved, a decision queue item cannot be re-opened.

- **Not:** "completion", "closure", "action"
- **Code values:** `"APPROVED"`, `"REJECTED"`

---

### Seed Data
The mock invoice and client data loaded from `invoices_seed.csv` to simulate a real owner's receivables for the demo. Seed data is not real; no actual clients or payments are involved.

- **Not:** "test data", "sample data", "dummy data"
- **Invariant:** Seed script is idempotent (will not overwrite existing records without `--force`).

---

### Resend
The email delivery service used to send collection emails to clients. In sandbox mode (used during demo recording), emails are not actually delivered but Resend returns a valid `message_id`.

- **Not:** "mailer", "SMTP", "email provider"

---

### LLM Confidence
A score (0.0–1.0) returned by the Gemini model alongside a classification or email draft. Reflects the model's certainty about dispute/negotiation signals in client reply text. Does not affect the deterministic tier rules — only affects escalation routing when confidence is low (< 0.85).

- **Not:** "score", "accuracy", "probability"
- **Code:** `llm_confidence` (decimal column in `decision_queue`)

---

## Status Values

### Invoice Status

| Value | Meaning |
|-------|---------|
| `DRAFT` | Invoice created but not yet sent to client |
| `SENT` | Invoice sent; awaiting payment; within due date |
| `OVERDUE` | Invoice past due date; agent may act |
| `DISPUTED` | Client has disputed the invoice |
| `FINAL_NOTICE_SENT` | Tier-3 email was approved and sent |
| `PAID` | Invoice paid; excluded from all agent sweeps |
| `CLOSED` | Manually closed by owner (written off, dispute settled, etc.) |

### Decision Queue Status

| Value | Meaning |
|-------|---------|
| `PENDING_APPROVAL` | Awaiting owner action |
| `APPROVED` | Owner approved; email sent |
| `REJECTED` | Owner rejected; no email sent |

### Audit Log Action Values

| Value | Meaning |
|-------|---------|
| `SWEEP_STARTED` | Agent sweep began |
| `SWEEP_COMPLETE` | Agent sweep finished |
| `INVOICE_CLASSIFIED` | Invoice assigned a tier |
| `EMAIL_DRAFTED` | LLM generated email content |
| `TIER1_EMAIL_SENT` | Tier-1 email auto-sent |
| `TIER2_EMAIL_SENT` | Tier-2 email auto-sent |
| `TIER3_DRAFT_CREATED` | Tier-3 draft created; held for human |
| `HIGH_VALUE_ESCALATED` | Invoice escalated due to high-value threshold |
| `SEND_FAILED` | Email delivery failed |
| `LLM_FAILED` | LLM call failed or produced invalid output |
| `OWNER_APPROVED` | Owner approved and sent decision |
| `OWNER_REJECTED` | Owner rejected decision |
| `CONTACT_WINDOW_ACTIVE` | Invoice skipped — contact window not elapsed |
