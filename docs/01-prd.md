# 01 — Product Requirements Document (PRD)
> **Chazer** · Autonomous Invoice-Chasing Agent · AWS "Agents for Humans" Hackathon

---

## 1. Problem Statement & Market Opportunity

### The Friction Loop

Every month, independent service providers send invoices and then enter a liminal zone of social dread. They know money is owed. They know they should follow up. But following up feels awkward — too persistent and you damage a relationship; too soft and you're the one subsidising the client's cash float.

The result is a predictable pattern:
1. Invoice sent.
2. Nothing happens for 14–30 days (the "polite waiting" period).
3. One awkward email sent, phrased more apologetically than it should be.
4. Another silence.
5. Either the client eventually pays, or the freelancer quietly writes it off.

### Why Existing Tools Fail

| Tool | What It Does | What It Misses |
|------|-------------|----------------|
| QuickBooks Reminders | Sends templated reminders on a fixed schedule | Same template every time, no tone escalation, no context awareness |
| FreshBooks Automated | Schedule-based email at N days | Can't detect dispute, can't distinguish "forgot" from "contesting" |
| Bonsai | Reminder emails | No LLM reasoning, no audit trail of agent actions |
| Harvest | Time tracking + invoicing | No collections logic at all |

**The gap:** None of these tools *reason* about an invoice. They don't ask "Is this client ignoring me or disputing the amount? Should I be firmer today than I was last week?" They don't decide on their own that this invoice has crossed into "needs a human" territory.

### Market Opportunity

- ~59 million freelancers in the US (Upwork, 2023)
- Average freelancer spends 20% of working hours on non-billable admin (invoicing, collections)
- Average DSO (Days Sales Outstanding) for freelancers: 47 days vs. 28 days for businesses with dedicated AR staff
- Late payments cost UK small businesses £684M/year in administrative overhead alone (BACS, 2022)

---

## 2. Target Personas & User Journeys

### Persona A: Maya — Solo UX Designer

**Background:** Maya runs a one-person UX consultancy. She invoices 5–8 clients per month, ranging from $1,500 to $12,000. She uses FreshBooks for invoices and has no bookkeeper.

**Pain Points:**
- Sends reminder emails manually, usually 3–4 weeks late because she forgot or felt awkward
- Uses the same "just following up on invoice #xyz" template regardless of context
- Has lost ~$8,000 in a single year to invoices she informally wrote off rather than chase

**Journey Before Chazer:**
```
Invoice sent → Day 15: Maya notices overdue → Day 20: she drafts a gentle email 
→ Day 35: client says "can we do net-60?" → Maya says yes (she shouldn't) 
→ Day 65: chases again → gets paid
```

**Journey With Chazer:**
```
Invoice sent → Day 2: Chazer sends Tier-1 friendly nudge (auto) 
→ Day 10: Chazer sends Tier-2 firmer reminder (auto, references prior email)
→ Day 23: client replies "can we do net-60?" → Chazer detects negotiation intent 
→ Maya's dashboard: "⚠ Decision needed: client requesting extension on #INV-042 ($4,800)"
→ Maya responds in 30 seconds: Deny / Approve 60-day extension
→ Agent drafts and sends response per Maya's decision
```

**Value Delivered:** Maya is in the loop only for the one decision that genuinely needed a human. Every routine nudge happened automatically, in the right tone, at the right time.

---

### Persona B: Ravi — Small Agency Owner (8 people)

**Background:** Ravi owns a web development agency with 8 contractors. They invoice 25–35 clients per month. His team does great technical work but nobody owns collections. Ravi checks in manually every few weeks.

**Pain Points:**
- No visibility into which invoices are overdue until cash flow problems appear
- Doesn't want to task team members with the socially awkward collections work
- Has had 3 client relationships soured by either too-aggressive or too-passive follow-up

**Journey Before Chazer:**
```
Month end: Ravi reviews aging report → identifies 8 overdue invoices 
→ manually writes 8 emails → wrong tone on 2 of them → one client complains
```

**Journey With Chazer:**
```
Every morning: Chazer's background sweep runs → classifies all 35 active invoices 
→ auto-sends 6 routine reminders → escalates 2 to Ravi's "Needs Decision" queue
→ Ravi spends 5 minutes reviewing the 2 escalated items → approves/rejects with one click
→ Agent sends responses
```

---

### Persona C: Diane — Independent IT Contractor (Recurring B2B Clients)

**Background:** Diane does IT infrastructure consulting for 6 recurring enterprise clients. Invoices are $15,000–$80,000. One wrong email to the wrong CFO could end the relationship.

**Pain Points:**
- Very high cost of getting tone wrong at this invoice size
- Clients have their own AP processes; disputes are complex
- She can't use the same escalation cadence as a $200 invoice

**Journey With Chazer:**
```
$55,000 invoice → Day 5: Chazer checks HIGH_VALUE_THRESHOLD config ($10,000) 
→ Invoice exceeds threshold → Tier-1 auto-send skipped 
→ Instead: "High-value invoice flagged for your review" → Diane approves custom email 
→ Day 22: no response → Chazer drafts Tier-3 final notice 
→ Held for Diane's approval → Diane edits tone manually → sends
```

---

## 3. Core Product Principles & System Invariants

These rules are **non-negotiable** and must be enforced at every layer:

| # | Invariant | Description |
|---|-----------|-------------|
| INV-01 | **Never send without permission at Tier 3** | A Tier-3 final notice must always be held in `PENDING_APPROVAL` state. No code path may auto-send a Tier-3 email. |
| INV-02 | **High-value invoices require human approval for Tier 1** | Any invoice exceeding `owner.high_value_threshold` must skip auto-send and surface to the decision queue, even for Tier 1. |
| INV-03 | **Every agent action is logged** | All sends, classifications, decisions, skips, and errors write an `audit_log` record before any external action is taken. If the DB write fails, the external action is aborted. |
| INV-04 | **One email per contact window** | The agent must not send more than one email per `contact_window_hours` (default: 72h) to the same invoice/client, regardless of re-trigger. |
| INV-05 | **Dispute detection freezes automation** | When a client reply is classified as `DISPUTE` or `NEGOTIATION`, no further auto-sends may occur on that invoice until the owner takes a decision action. |
| INV-06 | **Idempotent sweep** | Running the daily agent sweep multiple times in a single day must produce the same observable outcome as running it once. |
| INV-07 | **Data is read-only from demo seed** | The CSV seed operation is a one-time initialisation. The seed script must check for existing data and refuse to overwrite without an explicit `--force` flag. |

---

## 4. Functional Requirements Matrix

### P0 — Must have for demo (launch blocker)

| ID | Feature | Input | Processing Logic | Expected Output |
|----|---------|-------|-----------------|----------------|
| F-01 | Daily Agent Sweep | Cron trigger (pg_cron 09:00 UTC daily) | Fetch all invoices with `status IN ('SENT', 'OVERDUE')`, compute `days_overdue`, apply escalation tier logic | Tier 1/2 emails sent; Tier 3 + escalation items created in `decision_queue` |
| F-02 | Tier-1 Email Send | Invoice with `days_overdue 1–7`, `contact_count = 0`, `amount < threshold` | LLM generates friendly nudge email. Agent sends via Resend. | Email sent; `contact_history` record created; `audit_log` record written |
| F-03 | Tier-2 Email Send | Invoice with `days_overdue 8–21`, `contact_count >= 1` | LLM generates firmer email referencing prior contact date. Agent sends via Resend. | Email sent; audit log updated |
| F-04 | Tier-3 Draft + Hold | Invoice with `days_overdue >= 22` OR dispute/negotiation signal | LLM generates final notice draft. Status set to `PENDING_APPROVAL`. | Decision queue item created; NO email sent yet |
| F-05 | High-value threshold flag | Any invoice with `amount >= owner.high_value_threshold` | Skip auto-send; create `PENDING_APPROVAL` decision queue item regardless of tier | Decision queue item; audit log; no email |
| F-06 | Owner Dashboard — Aging View | GET /api/invoices | Fetch all invoices grouped by status/tier, sorted by `days_overdue` DESC | Rendered receivables table with tier badges, aging indicators |
| F-07 | Owner Dashboard — Decision Queue | GET /api/decisions | Fetch all `PENDING_APPROVAL` items with invoice context and AI-drafted content | Rendered decision card list with Approve/Reject/Edit actions |
| F-08 | Owner Decision — Approve | POST /api/decisions/:id/approve | Validate state is `PENDING_APPROVAL`; send email via Resend; log action | Email sent; decision record updated to `APPROVED`; audit log entry |
| F-09 | Owner Decision — Reject | POST /api/decisions/:id/reject | Update decision record to `REJECTED`; log reason | No email sent; audit log entry |
| F-10 | Audit Log View | GET /api/audit-log | Fetch paginated `audit_log` records for demo owner | Rendered timeline of all agent actions |
| F-11 | CSV Seed Script | CSV file in Supabase Storage | Parse CSV → upsert invoices and clients into Supabase Postgres | Postgres tables populated with demo data |

### P1 — Should have

| ID | Feature | Priority Rationale |
|----|---------|-------------------|
| F-12 | Dispute/negotiation reply detection | Judges scoring on AI reasoning quality — LLM classifying a client reply as DISPUTE/NEGOTIATION is the core intelligence |
| F-13 | Edit AI-drafted email before sending | Judges care about "human in the loop" story |
| F-14 | Dashboard stats panel (total overdue $, # invoices by tier) | Visual wow factor for demo |
| F-15 | Manual trigger sweep button | Allows demo to show sweep without waiting for cron |

### P2 — Nice to have

| ID | Feature |
|----|---------|
| F-16 | Dark/light mode toggle |
| F-17 | Export audit log as CSV |
| F-18 | Configurable threshold in dashboard UI |

---

## 5. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Dashboard page load (LCP) | < 2.5s on 4G connection |
| **Performance** | API response time (invoice list) | < 500ms p95 |
| **Performance** | Agent sweep duration (50 invoices) | < 30 seconds total |
| **Availability** | Dashboard uptime (demo window) | 99%+ (Vercel's SLA) |
| **Email delivery** | Resend delivery latency | < 5 seconds from API call |
| **Idempotency** | Agent sweep re-run safety | Zero duplicate emails on re-trigger |
| **Responsive Design** | Mobile breakpoint | Dashboard readable on 375px width (iPhone SE) |
| **Responsive Design** | Tablet breakpoint | Full table visible at 768px |
| **Accessibility** | WCAG AA colour contrast | ≥ 4.5:1 ratio on all text |
| **Security** | API endpoints | No auth for demo; all endpoints scoped to hardcoded `demo_owner_id` |
| **LLM Safety** | Email content guardrail | LLM output validated: must contain invoice number, must not contain illegal threats or profanity |
