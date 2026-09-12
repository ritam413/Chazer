# 17 — Submission QA Checklist & Release Readiness

> **Chazer** · Pre-Submission Verification — Run on Day 3 PM before recording demo

---

## Critical Path Tests (Must Pass — Demo Blockers)

### CP-01: Database Seeded Correctly

```bash
# Verify 8 invoices in DB
curl -s "https://<project>.supabase.co/functions/v1/invoices" \
  -H "Authorization: Bearer <anon-key>" | jq '.invoices | length'
# Expected: 8

# Verify tier computation
curl -s "https://<project>.supabase.co/functions/v1/invoices" \
  | jq '[.invoices[] | {invoice_id, tier, days_overdue}]'
# Expected: INV-005 → TIER_3, INV-006 → TIER_1, etc.
```

- [ ] Returns 8 invoices
- [ ] `days_overdue` values match expected (relative to current date)
- [ ] Tier assignments match escalation rules

---

### CP-02: Manual Sweep Runs Successfully

```bash
curl -X POST "https://<project>.supabase.co/functions/v1/sweep" \
  -H "Authorization: Bearer <anon-key>"
# Expected: 202 { "sweep_id": "...", "status": "STARTED" }

# Wait 30 seconds, then check audit log
curl "https://<project>.supabase.co/functions/v1/audit-log" \
  | jq '.entries[0:5]'
# Expected: SWEEP_COMPLETE entry + 4-8 action entries
```

- [ ] POST /sweep returns 202 immediately
- [ ] Audit log shows sweep entries within 30 seconds
- [ ] No `SEND_FAILED` or `LLM_FAILED` entries

---

### CP-03: Decision Queue Populated

```bash
curl "https://<project>.supabase.co/functions/v1/decisions" \
  | jq '.decisions | length'
# Expected: 3-4 pending decisions (INV-001, INV-002, INV-005, INV-007)
```

- [ ] Decision queue has ≥ 3 items
- [ ] Each item has `draft_subject` and `draft_body` populated
- [ ] INV-005 ($55k) appears with `is_high_value: true`

---

### CP-04: Approve Decision Works

```bash
# Get first decision ID
DECISION_ID=$(curl "https://<project>.supabase.co/functions/v1/decisions" \
  | jq -r '.decisions[0].decision_id')

# Approve it
curl -X POST "https://<project>.supabase.co/functions/v1/decisions/${DECISION_ID}/approve" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 200 { "success": true, "resend_message_id": "..." }
```

- [ ] Returns 200 with `resend_message_id`
- [ ] Decision no longer appears in `GET /decisions` (removed from queue)
- [ ] New `OWNER_APPROVED` entry in audit log

---

### CP-05: Reject Decision Works

```bash
DECISION_ID=$(curl "https://<project>.supabase.co/functions/v1/decisions" \
  | jq -r '.decisions[0].decision_id')

curl -X POST "https://<project>.supabase.co/functions/v1/decisions/${DECISION_ID}/reject" \
  -H "Content-Type: application/json" \
  -d '{"reject_reason": "Resolved verbally"}'
# Expected: 200 { "success": true }
```

- [ ] Returns 200
- [ ] Decision removed from queue
- [ ] `OWNER_REJECTED` entry in audit log with reject_reason in metadata

---

### CP-06: Idempotency Guard (Run Sweep Twice)

```bash
# Run sweep twice in a row
curl -X POST "https://<project>.supabase.co/functions/v1/sweep"
sleep 5
curl -X POST "https://<project>.supabase.co/functions/v1/sweep"
sleep 30

# Count TIER1_EMAIL_SENT entries in audit log
curl "https://<project>.supabase.co/functions/v1/audit-log" \
  | jq '[.entries[] | select(.action == "TIER1_EMAIL_SENT")] | length'
# Expected: Same count as after first sweep (no new sends)
```

- [ ] Second sweep produces 0 new email sends
- [ ] Second sweep may log `CONTACT_WINDOW_ACTIVE` entries but no `TIER1_EMAIL_SENT`

---

## UI Smoke Tests

### UI-01: Dashboard Renders Correctly

- [ ] Page loads in < 3 seconds
- [ ] All 8 invoices visible in table
- [ ] Stats bar shows correct `$83,890` total (or actual value based on seeded data)
- [ ] Tier badges are correct colors (green/amber/red)
- [ ] Aging bars animate on page load
- [ ] "Last sweep" timestamp shows correctly after running sweep

### UI-02: Decision Queue Renders Correctly

- [ ] Decision cards visible (≥ 3)
- [ ] INV-005 card has ⚠ HIGH VALUE badge in orange
- [ ] AI-drafted email preview visible in each card
- [ ] AI confidence badge visible (e.g., "🤖 96%")
- [ ] Approve button triggers card removal (optimistic update) + green toast
- [ ] Reject button triggers confirmation prompt + card removal

### UI-03: Edit Draft Modal

- [ ] Opens on "Edit Draft" click
- [ ] Subject and body pre-populated with AI draft
- [ ] Word count visible and updates as user types
- [ ] "Save & Approve" disabled if subject is empty
- [ ] "Save & Approve" disabled if body doesn't contain invoice ID
- [ ] Closing modal without saving preserves original draft

### UI-04: Audit Log Renders Correctly

- [ ] Timeline entries visible
- [ ] Icons correct per action type
- [ ] Timestamps show correctly
- [ ] `SWEEP_COMPLETE` entry shows counts (sent: N, escalated: N)
- [ ] Scroll works on long lists

### UI-05: Responsive Design

- [ ] Dashboard at 375px width: invoice cards layout (not broken table)
- [ ] Sidebar collapsed on mobile: bottom tab bar visible
- [ ] Decision cards readable at 768px tablet width
- [ ] Stats bar scrollable horizontally at 375px

---

## Pre-Flight Checks (Run 1 Hour Before Recording)

| Check | Command / Action | Expected |
|-------|-----------------|---------|
| Live URL loads | Open `https://chazer.vercel.app/dashboard` | Dashboard renders |
| No console errors | Chrome DevTools → Console | Zero errors |
| No failed network requests | DevTools → Network tab | All XHR: 200 |
| Sweep works on live URL | Click "Run Sweep" | Spinner appears, data refreshes |
| Email sandbox active | Check Resend dashboard | Sandbox mode ON |
| DB clean for demo | Check invoice count | 8 invoices, clean contact history |
| API latency | DevTools → Network timings | GET /invoices < 500ms |
| pg_cron job exists | Supabase SQL editor: `SELECT * FROM cron.job` | 1 row: `daily-chazer-sweep` |

---

## Known Demo Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Gemini API down | Pre-record a backup video; have a static screenshot backup |
| Supabase Edge Function cold start delay | Click "Run Sweep" before starting recording; let it warm up |
| Network latency during demo recording | Pre-populate DB with sweep results; demo approve/reject from existing decisions |
| Resend sandbox not showing delivery | Resend sandbox mode is fine — show `resend_message_id` in audit log as proof |
| Contact window blocks all sends in re-demo | Reset: `UPDATE invoices SET last_contact_at = NULL, contact_count = 0;` |

---

## Reset Script (between demo takes)

```sql
-- Reset contact state for clean re-demo
UPDATE invoices SET last_contact_at = NULL, contact_count = 0
WHERE owner_id = 'demo_owner';

DELETE FROM contact_history WHERE owner_id = 'demo_owner';
DELETE FROM audit_log WHERE owner_id = 'demo_owner';
DELETE FROM decision_queue WHERE owner_id = 'demo_owner';
DELETE FROM sweep_runs WHERE owner_id = 'demo_owner';

-- Restore all invoices to OVERDUE for demo readiness
UPDATE invoices SET status = 'OVERDUE' WHERE invoice_id IN ('INV-001','INV-002','INV-005','INV-007');
UPDATE invoices SET status = 'SENT' WHERE invoice_id IN ('INV-003','INV-004','INV-006','INV-008');
```

Run this between demo takes to get a clean state.

---

## Submission Checklist

- [ ] GitHub repo is public
- [ ] `LICENSE` file present (Apache-2.0)
- [ ] `README.md` complete: project description, setup instructions, architecture diagram, demo video link
- [ ] Architecture diagram embedded in README (from docs/02)
- [ ] Demo video ≤ 5 minutes, uploaded and linked
- [ ] Live demo URL in submission form (or noted as optional if not working)
- [ ] AWS Builder ID in submission
- [ ] Project submitted via hackathon portal before Sep 15, 2026 23:59 AoE
