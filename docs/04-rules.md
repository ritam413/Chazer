# 04 — Domain Rules & Business Logic Invariants

> **Chazer** · Invoice Escalation Rules Engine

---

## 1. Escalation Tier Rules

### Rule: Tier Assignment

```
GIVEN an invoice I with fields:
  I.days_overdue   = CURRENT_DATE - I.due_date  (integer, minimum 0)
  I.contact_count  = COUNT of contact_history records for I
  I.dispute_flag   = boolean
  I.amount         = decimal (USD)
  O.threshold      = owner.high_value_threshold (decimal, default 10,000)

THEN:

IF I.dispute_flag = true:
  → Tier = TIER_3; escalate = true; STOP

IF I.amount >= O.threshold:
  → escalate = true regardless of tier; STOP (add to decision queue immediately)

IF I.days_overdue IN [1, 7] AND I.contact_count = 0:
  → Tier = TIER_1; auto_send = true

IF I.days_overdue IN [8, 21] AND I.contact_count >= 1:
  → Tier = TIER_2; auto_send = true

IF I.days_overdue >= 22:
  → Tier = TIER_3; auto_send = false; escalate = true

ELSE (days_overdue = 0 OR already at TIER_2 but contact_count = 0):
  → NO ACTION (log as SKIPPED with reason)
```

### Edge Case: Contact Count Mismatch

An invoice may be at `days_overdue = 12` but `contact_count = 0` (e.g., prior email failed). In this case:
- Rule: `days_overdue 8–21` qualifies for Tier 2 **only if** `contact_count >= 1`.
- If `contact_count = 0`, the invoice is treated as Tier 1 (first contact, late start).
- Reason: sending a Tier-2 "second reminder" email when there was no first reminder is incoherent and damages trust.

**Formula:**
```
effective_tier = if (days_overdue >= 8 AND contact_count = 0) → TIER_1
                 else → tier_from_days_overdue_rule()
```

---

## 2. Contact Window Guard

**Rule:** The agent must not contact the same invoice within `contact_window_hours` of the last contact.

```
contact_window_hours = 72  (configurable, default 72h)

ELIGIBLE = (
  invoice.last_contact_at IS NULL
  OR
  NOW() - invoice.last_contact_at > INTERVAL 'contact_window_hours hours'
)
```

**Purpose:** Prevents double-sends if the cron misfires twice in a day or if the manual trigger is pressed multiple times.

**Implementation:** This guard is applied in the Edge Function BEFORE the invoice is passed to the agent. Ineligible invoices are skipped and logged as `CONTACT_WINDOW_ACTIVE`.

---

## 3. Idempotency Rules

### Rule: Send Idempotency Key

Every Resend API call includes an `idempotency_key`:
```
idempotency_key = "{invoice_id}-{tier}-{YYYYMMDD}"
```

Example: `INV-042-TIER2-20260912`

If Resend receives the same idempotency key twice within 24 hours, it returns the original message ID without re-sending. This protects against duplicate sends during Edge Function retries.

### Rule: Sweep Idempotency

Running the sweep N times in one day produces the same result as running it once because:
1. `contact_window_hours` guard prevents re-processing eligible invoices.
2. The `idempotency_key` on Resend prevents duplicate sends even if the guard fails.
3. `audit_log` is append-only — duplicates are visible but harmless.

---

## 4. Dispute Classification Rules

### Reply Classification (LLM tool output)

When a client reply email is received (future integration; for demo, operator can manually set `dispute_flag`):

| Client Reply Pattern | Classification | Agent Response |
|---------------------|---------------|----------------|
| "I never received the invoice" | `DISPUTE` | Flag; escalate; draft reply with original invoice attached |
| "The amount is wrong" | `DISPUTE` | Flag; escalate; draft reply acknowledging discrepancy |
| "Can we do net-60?" | `NEGOTIATION` | Flag; escalate; draft reply with options |
| "Can we pay half now?" | `NEGOTIATION` | Flag; escalate; draft partial payment acknowledgement |
| "Payment is coming next week" | `COMMITMENT` | Log; no escalation; update `expected_payment_date` |
| "Already paid, see attached" | `PAYMENT_CLAIMED` | Flag; escalate immediately; mark invoice `PAYMENT_CLAIMED` |
| No reply | `SILENT` | Continue escalation ladder |

**Rule:** Once `dispute_flag = true`, NO automated sends are permitted on that invoice until the owner takes an explicit resolution action (`RESOLVE_DISPUTE`).

---

## 5. High-Value Threshold Rules

```
DEFAULT high_value_threshold = $10,000

IF invoice.amount >= threshold:
  1. Skip Tier-1 auto-send (even if days_overdue = 3)
  2. Create decision_queue item immediately at Tier-1
  3. Label in dashboard: "⚠ HIGH VALUE — requires your approval"
  4. AI drafts a Tier-1 email for owner to review/edit before sending
```

**Rationale:** A relationship-damaging email on a $50,000 contract has 10x the consequence of the same mistake on a $500 invoice. The system errs toward caution.

---

## 6. Validation Invariants

### Invoice Creation / Seed Invariants

| Field | Rule | Error on Violation |
|-------|------|--------------------|
| `invoice_id` | Must be unique | `DUPLICATE_INVOICE_ID` |
| `due_date` | Must be a valid date, not in the future by > 365 days | `INVALID_DUE_DATE` |
| `amount` | Must be > 0 | `INVALID_AMOUNT` |
| `client_email` | Must match RFC 5321 email format | `INVALID_EMAIL` |
| `status` | Must be one of: `DRAFT`, `SENT`, `OVERDUE`, `PAID`, `DISPUTED`, `FINAL_NOTICE_SENT`, `CLOSED` | `INVALID_STATUS` |

### Email Draft Invariants

| Rule | Enforcement |
|------|-------------|
| Draft must contain the invoice ID | String match in validate_draft() |
| Draft must contain the amount as "$X,XXX.XX" | Regex match |
| Draft must not exceed 200 words | word_count check |
| Draft must not contain profanity | Regex blocklist |
| Draft must not contain legal threats | Regex: "legal action", "attorney", "sue", "court" |

---

## 7. Calculation Rules

### Days Overdue

```
days_overdue = MAX(0, CURRENT_DATE - due_date)

-- PostgreSQL:
days_overdue = GREATEST(0, EXTRACT(DAY FROM NOW() - due_date::timestamp))
```

**Note:** Use `GREATEST(0, ...)` to prevent negative values for invoices not yet due.

### Aging Bucket Assignment

| Bucket | Condition | Display Label |
|--------|-----------|---------------|
| `CURRENT` | `days_overdue = 0` | "Current" |
| `1_7` | `days_overdue BETWEEN 1 AND 7` | "1–7 days" |
| `8_21` | `days_overdue BETWEEN 8 AND 21` | "8–21 days" |
| `22_PLUS` | `days_overdue >= 22` | "22+ days (Final)" |

### Total Overdue Amount (Dashboard Stat)

```sql
SELECT SUM(amount) AS total_overdue
FROM invoices
WHERE status IN ('SENT', 'OVERDUE', 'FINAL_NOTICE_SENT')
  AND due_date < CURRENT_DATE;
```

### Pending Decision Count

```sql
SELECT COUNT(*) AS pending_decisions
FROM decision_queue
WHERE status = 'PENDING_APPROVAL';
```

---

## 8. Edge Cases & Failure Handling

| Scenario | Handling |
|----------|---------|
| Invoice due_date is today (days_overdue = 0) | Skip. Not yet overdue. Log as `SKIPPED: not_overdue`. |
| Invoice already `PAID` | Skip. Filter out `status = 'PAID'` at query level. |
| Invoice already `CLOSED` | Skip. Filter out at query level. |
| LLM returns non-JSON | Retry once. On second failure, log `LLM_FAILED` and skip invoice. |
| Resend API rate limit (100/day) | On 429 response: log `SEND_RATE_LIMITED`; stop sending for this sweep; continue classifying (decisions still created). |
| Supabase DB connection error at sweep start | Log to Edge Function console; return 503; pg_cron will retry next scheduled run. |
| `contact_count` counter drift (e.g., DB write succeeded but count not incremented) | `contact_count` is computed at query time from `COUNT(contact_history)` records, not stored as a mutable integer. Eliminates counter drift. |
| Same invoice in two concurrent sweeps | Supabase Postgres row-level lock: `SELECT ... FOR UPDATE SKIP LOCKED` on eligible invoices at sweep start. |

---

## 9. Status Transition Graph

```
DRAFT ──────────────────────────────► SENT
                                        │
                                        │ (days pass)
                                        ▼
                                     OVERDUE
                                     /      \
                             Tier 1/2       Tier 3 / High Value
                             auto-send      escalate
                                │                │
                                │                ▼
                                │          PENDING_APPROVAL
                                │           /           \
                                │     owner approve   owner reject
                                │         │               │
                                ▼         ▼               ▼
                          (stays      FINAL_NOTICE_   CLOSED
                           OVERDUE)   SENT            (written off)
                                        │
                                   client pays
                                        │
                                        ▼
                                      PAID
```
