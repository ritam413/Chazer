# 03 — AI & Autonomous Agent Specification

> **Chazer** · Strands Agents SDK (Python) + Google Gemini 1.5 Flash via LiteLLM

---

## 1. Agent Identity & Autonomy Level

| Property | Value |
|----------|-------|
| **Agent Name** | `ChazerCollectionAgent` |
| **Runtime** | Strands Agents SDK (`strands` pip package) |
| **LLM Backend** | Google Gemini 1.5 Flash via `strands.models.LiteLLM` provider |
| **Model ID** | `gemini/gemini-1.5-flash` |
| **Autonomy Level** | Level 3 — Fully autonomous for Tier 1/2; Human-in-the-loop mandatory for Tier 3 and high-value invoices |
| **Trigger** | Unattended background: pg_cron → Supabase Edge Function → Python agent process |
| **Human Surface** | Decision Queue in dashboard; agent never blocks waiting for human response |

---

## 2. Agent State Machine

```
                    ┌───────────────────┐
         pg_cron    │   SWEEP_STARTING  │
         trigger ──►│                   │
                    └────────┬──────────┘
                             │ fetch eligible invoices
                             ▼
                    ┌───────────────────┐
                    │  CLASSIFYING      │◄── per invoice loop
                    │  (per invoice)    │
                    └────────┬──────────┘
                             │
               ┌─────────────┼────────────────┐
               ▼             ▼                 ▼
        ┌──────────┐  ┌──────────────┐  ┌──────────────────┐
        │ TIER_1   │  │  TIER_2      │  │  TIER_3 /        │
        │ or       │  │              │  │  ESCALATE        │
        │ TIER_2   │  │              │  │                  │
        └────┬─────┘  └──────┬───────┘  └────────┬─────────┘
             │               │                    │
             ▼               ▼                    ▼
     ┌──────────────┐ ┌──────────────┐   ┌──────────────────┐
     │ DRAFTING     │ │ DRAFTING     │   │  DRAFTING        │
     │ (LLM call)   │ │ (LLM call)   │   │  (LLM call)      │
     └──────┬───────┘ └──────┬───────┘   └────────┬─────────┘
            │                │                     │
            ▼                ▼                     ▼
     ┌──────────────┐ ┌──────────────┐   ┌──────────────────┐
     │ SENDING      │ │ SENDING      │   │  PENDING_HUMAN   │
     │ (Resend API) │ │ (Resend API) │   │  APPROVAL        │
     └──────┬───────┘ └──────┬───────┘   └────────┬─────────┘
            │                │                     │
            ▼                ▼               owner action
     ┌──────────────┐ ┌──────────────┐     ┌──────┴───────┐
     │  SENT ✓      │ │  SENT ✓      │     │  APPROVED    │
     └──────────────┘ └──────────────┘     │  → SENDING   │
                                           ├──────────────┤
                                           │  REJECTED    │
                                           │  → CLOSED    │
                                           └──────────────┘

Error states (any state can transition):
  DRAFTING → LLM_TIMEOUT  → retry once, then log FAILED
  SENDING  → SEND_FAILED  → log FAILED (no retry; human can re-trigger)
```

### State Transition Table

| From State | Event | To State | Side Effect |
|-----------|-------|----------|-------------|
| `SWEEP_STARTING` | Invoices fetched (N > 0) | `CLASSIFYING` | Write `sweep_runs` record |
| `SWEEP_STARTING` | No eligible invoices | `SWEEP_COMPLETE` | Write `sweep_runs` (0 processed) |
| `CLASSIFYING` | Tier computed | `DRAFTING` | None |
| `DRAFTING` | LLM returns valid draft | `SENDING` or `PENDING_HUMAN` | Validate output |
| `DRAFTING` | LLM timeout (>15s) | Retry once → `DRAFTING`; else `FAILED` | Log warning |
| `DRAFTING` | LLM invalid output | `FAILED` | Log error with raw LLM response |
| `SENDING` | Resend 200 OK | `SENT` | Write `contact_history`, update `invoices.last_contact_at` |
| `SENDING` | Resend error | `SEND_FAILED` | Write audit_log with error; no retry |
| `PENDING_HUMAN` | — | Stays until owner action | Decision queue item created |
| `PENDING_HUMAN` + owner approve | Owner POST /approve | `SENDING` | Trigger send flow |
| `PENDING_HUMAN` + owner reject | Owner POST /reject | `CLOSED` | Close decision; log reason |

---

## 3. Agent Memory Architecture

### Short-Term Working Context (within a single sweep run)

The Strands agent maintains an in-memory context for the duration of one sweep call:

```python
# Strands agent conversation memory (scoped to one sweep invocation)
sweep_context = {
    "sweep_id": "sweep_20260912_090000",
    "owner_id": "demo_owner",
    "high_value_threshold": 10000,
    "invoices_to_process": [...],   # fetched at sweep start
    "processed_results": [],         # appended per invoice
    "llm_call_count": 0,
    "contact_window_hours": 72
}
```

The Strands SDK maintains its own conversation history (list of messages) per `Agent()` instance call. For the batch sweep, each invoice is processed as an independent agent call to avoid context bleed between invoices:

```python
for invoice in invoices:
    agent = Agent(
        model=litellm_model,
        tools=[classify_invoice, draft_email, send_email, write_audit_log],
        system_prompt=SYSTEM_PROMPT
    )
    result = agent(f"Process invoice {invoice['invoice_id']}")
```

### Persistent Long-Term Storage (Supabase Postgres)

| Table | What It Stores | TTL |
|-------|---------------|-----|
| `contact_history` | Every email sent, timestamp, tier, subject | Permanent |
| `audit_log` | Every agent action (classify, draft, send, escalate, fail) | Permanent |
| `decision_queue` | Pending human decisions with AI draft | Until owner resolves |
| `sweep_runs` | Sweep metadata (duration, counts) | Permanent |
| `invoices.last_contact_at` | Last time agent acted on this invoice | Updated per send |
| `invoices.contact_count` | Total contacts made by agent | Incremented per send |
| `invoices.dispute_flag` | Set by reply-classification tool | Cleared on resolution |

---

## 4. Prompt Engineering

### System Prompt

```
You are Chazer, an autonomous invoice collection agent for a small business owner.
Your job is to help collect overdue payments from clients in a professional, 
relationship-preserving manner.

RULES:
1. You always classify first, then draft, then act. Never skip classification.
2. Tier-1 emails are warm and friendly — assume the client simply forgot.
3. Tier-2 emails are firmer — acknowledge the prior reminder, state urgency clearly.
4. Tier-3 emails are final notices — professional, unambiguous, no threats.
5. If there is ANY ambiguity about client intent (dispute, negotiation, confusion), 
   set escalate=true and draft the response for human review.
6. Never mention legal action, collections agencies, or penalties unless explicitly 
   instructed by the owner.
7. Always include the invoice number, amount, and due date in the email.
8. Emails must be under 200 words.
9. Return ONLY valid JSON matching the output schema. No markdown, no explanation.
```

### Tool Contracts

#### Tool 1: `classify_invoice`

**Description:** Classifies an invoice and determines escalation tier.

**Input Schema:**
```json
{
  "invoice_id": "INV-042",
  "client_name": "Acme Corp",
  "amount": 4800.00,
  "due_date": "2026-08-20",
  "days_overdue": 23,
  "contact_count": 2,
  "last_contact_summary": "Sent Tier-2 reminder on 2026-09-01. No reply.",
  "client_reply_text": null,
  "owner_high_value_threshold": 10000
}
```

**Output Schema:**
```json
{
  "tier": "TIER_3",
  "escalate": true,
  "escalation_reason": "Invoice is 23 days overdue with 2 prior contacts and no response",
  "confidence": 0.94,
  "auto_send_eligible": false
}
```

**Pydantic Contract Schema:**
```python
from pydantic import BaseModel, Field
from typing import Literal

class ClassifyInvoiceInput(BaseModel):
    invoice_id: str
    client_name: str
    amount: float = Field(gt=0)
    due_date: str
    days_overdue: int = Field(ge=0)
    contact_count: int = Field(ge=0)
    last_contact_summary: str | None = None
    client_reply_text: str | None = None
    owner_high_value_threshold: float = 10000.0

class ClassifyInvoiceOutput(BaseModel):
    tier: Literal["TIER_1", "TIER_2", "TIER_3", "UNCLASSIFIED"]
    escalate: bool
    escalation_reason: str
    confidence: float = Field(ge=0.0, le=1.0)
    auto_send_eligible: bool
```

**Validation Rules:**
- `tier` ∈ `["TIER_1", "TIER_2", "TIER_3"]`
- `confidence` ∈ `[0.0, 1.0]`
- `auto_send_eligible` must be `false` when `tier = "TIER_3"` or `escalate = true`

---

#### Tool 2: `draft_email`

**Description:** Generates a professional email for the classified tier.

**Input Schema:**
```json
{
  "invoice_id": "INV-042",
  "client_name": "Acme Corp",
  "client_email": "ap@acme.com",
  "owner_name": "Maya Chen",
  "owner_email": "maya@mayadesigns.co",
  "amount": 4800.00,
  "due_date": "2026-08-20",
  "tier": "TIER_2",
  "prior_contact_date": "2026-09-01",
  "services_description": "UX Design Sprint — August 2026"
}
```

**Output Schema:**
```json
{
  "subject": "Second Reminder: Invoice #INV-042 — $4,800.00 Overdue",
  "body": "Hi Sarah,\n\nI'm following up on my reminder from September 1st regarding invoice #INV-042 for $4,800.00, which was due on August 20th.\n\nThis invoice covers the UX Design Sprint completed in August 2026. I'd appreciate payment at your earliest convenience.\n\nIf there's any issue or question about this invoice, please reply and I'll address it right away.\n\nThank you,\nMaya",
  "word_count": 72,
  "validation_passed": true
}
```

**Validation Rules:**
- `body` must contain: `invoice_id`, `amount` as dollar string, `due_date`
- `word_count` ≤ 200
- `body` must not match profanity regex
- `validation_passed` computed by agent tool, not LLM

---

#### Tool 3: `write_audit_log`

**Description:** Writes an immutable record to the audit_log table.

**Input Schema:**
```json
{
  "sweep_id": "sweep_20260912_090000",
  "invoice_id": "INV-042",
  "action": "TIER2_EMAIL_SENT",
  "status": "SENT",
  "metadata": {
    "resend_message_id": "re_abc123",
    "email_subject": "Second Reminder: Invoice #INV-042",
    "tier": "TIER_2",
    "llm_confidence": 0.91
  }
}
```

**Valid `action` values:**
`SWEEP_STARTED`, `INVOICE_CLASSIFIED`, `EMAIL_DRAFTED`, `TIER1_EMAIL_SENT`, `TIER2_EMAIL_SENT`, `TIER3_DRAFT_CREATED`, `HIGH_VALUE_ESCALATED`, `SEND_FAILED`, `LLM_FAILED`, `OWNER_APPROVED`, `OWNER_REJECTED`, `SWEEP_COMPLETE`

---

#### Tool 4: `send_email`

**Description:** Sends an email via Resend API.

**Input Schema:**
```json
{
  "to": "ap@acme.com",
  "from": "reminders@chazer.dev",
  "subject": "Second Reminder: Invoice #INV-042 — $4,800.00 Overdue",
  "body_text": "Hi Sarah, ...",
  "invoice_id": "INV-042",
  "idempotency_key": "INV-042-TIER2-20260912"
}
```

**Output Schema:**
```json
{
  "success": true,
  "resend_message_id": "re_abc123def456",
  "timestamp_utc": "2026-09-12T09:02:34Z"
}
```

---

## 5. LLM Configuration

```python
from strands.models import LiteLLM

# Primary: Grok (xAI) — generous free tier, no hard daily cap
model = LiteLLM(
    model_id="xai/grok-beta",          # or "xai/grok-2" for the newer model
    params={
        "temperature": 0.3,            # Low variance — consistent professional tone
        "max_tokens": 512,             # Enough for email draft + JSON wrapper
        "response_format": {"type": "json_object"},  # Force JSON output
        "timeout": 15,                 # Fail fast; retry once
    },
    api_key_env_var="GROK_API_KEY"     # set in .env / Supabase secrets
)

# Fallback: Google Gemini 1.5 Flash — 60 req/min free tier
# model = LiteLLM(
#     model_id="gemini/gemini-1.5-flash",
#     params={"temperature": 0.3, "max_tokens": 512, "timeout": 15},
#     api_key_env_var="GEMINI_API_KEY"
# )
```

**Why Grok as primary?** Grok's free tier has significantly more generous rate limits than Gemini's 60 req/min cap, giving more headroom during repeated demo runs and local testing. Both models produce professional-quality email prose. The LiteLLM adapter means the entire swap is a single env var + `model_id` change — no other code changes.

---

## 6. Error Recovery & Backoff

```python
MAX_LLM_RETRIES = 1       # Retry once on timeout or malformed JSON
RETRY_DELAY_SECONDS = 2   # Wait before retry
MAX_SEND_RETRIES = 0      # No retry on send failure (avoid duplicate emails)

# Per-invoice error handling
try:
    classification = classify_invoice(invoice_data)
    draft = draft_email({**invoice_data, **classification})
    validate_draft(draft)  # raises ValueError on failure
    
    if classification["auto_send_eligible"]:
        send_result = send_email(draft)
        write_audit_log(action="TIER1_EMAIL_SENT", status="SENT", ...)
    else:
        create_decision_queue_item(draft, classification)
        write_audit_log(action="TIER3_DRAFT_CREATED", status="ESCALATED", ...)

except LLMTimeoutError:
    write_audit_log(action="LLM_FAILED", status="FAILED", metadata={"reason": "timeout"})
    continue  # Process next invoice

except ValidationError as e:
    write_audit_log(action="LLM_FAILED", status="FAILED", metadata={"reason": str(e)})
    continue

except SendError as e:
    write_audit_log(action="SEND_FAILED", status="FAILED", metadata={"error": str(e)})
    continue  # Never crash the sweep on a single send failure
```

**Invariant:** A single invoice failure must never abort the full sweep. The `continue` pattern ensures all remaining invoices are processed.
