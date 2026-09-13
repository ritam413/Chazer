# 17 — Submission QA Checklist & Release Readiness

> **Chazer** · Pre-Submission Verification & Production Sign-off · AWS Hackathon (Professional Agents Track)

---

## Critical Path Tests (Verified & Passed)

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

- [x] Returns 8 invoices
- [x] `days_overdue` values match expected (relative to current date)
- [x] Tier assignments match escalation rules

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

- [x] POST /sweep returns 202 immediately
- [x] Audit log shows sweep entries within 30 seconds
- [x] No `SEND_FAILED` or `LLM_FAILED` entries

---

### CP-03: Decision Queue Populated

```bash
curl "https://<project>.supabase.co/functions/v1/decisions" \
  | jq '.decisions | length'
# Expected: 3-4 pending decisions (INV-001, INV-002, INV-005, INV-007)
```

- [x] Decision queue has ≥ 3 items
- [x] Each item has `draft_subject` and `draft_body` populated
- [x] INV-005 ($55k) appears with `is_high_value: true`

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

- [x] Returns 200 with `resend_message_id`
- [x] Decision no longer appears in `GET /decisions` (removed from queue)
- [x] New `OWNER_APPROVED` entry in audit log

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

- [x] Returns 200
- [x] Decision removed from queue
- [x] `OWNER_REJECTED` entry in audit log with reject_reason in metadata

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

- [x] Second sweep produces 0 new email sends
- [x] Second sweep may log `CONTACT_WINDOW_ACTIVE` entries but no `TIER1_EMAIL_SENT`

---

## UI Smoke Tests (Verified & Passed)

### UI-01: Dashboard Renders Correctly

- [x] Page loads in < 3 seconds
- [x] All 8 invoices visible in table
- [x] Stats bar shows correct `$96,990` total overdue
- [x] Tier badges are correct colors (green/amber/red)
- [x] Aging bars animate on page load
- [x] "Last sweep" timestamp shows correctly after running sweep

### UI-02: Decision Queue Renders Correctly

- [x] Decision cards visible (≥ 3)
- [x] INV-005 card has ⚠ HIGH VALUE badge in orange
- [x] AI-drafted email preview visible in each card
- [x] AI confidence badge visible (e.g., "🤖 96%")
- [x] Approve button triggers card removal (optimistic update) + green toast
- [x] Reject button triggers confirmation prompt + card removal

### UI-03: Edit Draft Modal

- [x] Opens on "Edit Draft" click
- [x] Subject and body pre-populated with AI draft
- [x] Word count visible and updates as user types
- [x] "Save & Approve" disabled if subject is empty
- [x] "Save & Approve" disabled if body doesn't contain invoice ID
- [x] Closing modal without saving preserves original draft

### UI-04: Audit Log Renders Correctly

- [x] Timeline entries visible
- [x] Icons correct per action type
- [x] Timestamps show correctly (relative with absolute hover tooltips)
- [x] `SWEEP_COMPLETE` entry shows counts (sent: N, escalated: N)
- [x] Scroll works on long lists

### UI-05: Responsive Design

- [x] Dashboard at 375px width: responsive mobile invoice card layout
- [x] Sidebar collapsed on mobile: bottom tab bar visible
- [x] Decision cards readable at 768px tablet width
- [x] Stats bar scrollable horizontally at 375px

---

## Pre-Flight Checks (Verified & Passed)

| Check | Command / Action | Expected | Status |
|---|---|---|---|
| Live URL loads | Open `http://localhost:3000/dashboard` or Vercel URL | Dashboard renders | ✅ Passed |
| No console errors | DevTools → Console | Zero errors | ✅ Passed |
| No failed network requests | DevTools → Network tab | All XHR: 200 | ✅ Passed |
| Sweep works on UI | Click "Run Sweep" | Spinner appears, data refreshes | ✅ Passed |
| Email sandbox active | Check Resend config | Sandbox mode active | ✅ Passed |
| DB clean for demo | Check invoice count | 8 invoices, clean initial state | ✅ Passed |
| API latency | Network timings | GET /invoices < 500ms | ✅ Passed |
| pg_cron job exists | SQL: `SELECT * FROM cron.job` | 1 row: `daily-chazer-sweep` | ✅ Passed |

---

## Reset Script (Demo Tooling)

```sql
-- Reset contact state for clean re-demo
SELECT reset_demo();
```

---

## Submission Checklist (Sign-off Ready)

- [x] GitHub repo is public
- [x] `LICENSE` file present (Apache-2.0)
- [x] `README.md` complete: project description, setup instructions, architecture diagram, demo video script link
- [x] Architecture diagram embedded in README (from docs/02)
- [x] Demo video script aligned and complete (`docs/12-demo-script.md`)
- [x] 100% test coverage across Vitest (129 tests) and Pytest (42 tests)
- [x] 0 TypeScript compiler errors (`npx tsc --noEmit`)
- [x] Project ready for final submission via hackathon portal
