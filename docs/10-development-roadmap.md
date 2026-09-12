# 10 — Development Roadmap

> **Chazer** · 3-Day Build Plan · Deadline: Sep 15, 2026

---

## Phase Overview

| Phase | Day | Focus | Deliverable |
|-------|-----|-------|-------------|
| 1 | Day 1 AM | Foundation & Schema | DB live, seed working |
| 2 | Day 1 PM | Agent Logic | Strands agent classifying & drafting locally |
| 3 | Day 2 | API Layer & Background Loop | Edge Functions + pg_cron sweep |
| 4 | Day 3 AM | Frontend Dashboard | Next.js dashboard functional |
| 5 | Day 3 PM | Polish & Deploy | Vercel + Supabase live, demo ready |

---

## Phase 1 — Foundation & Schema (Day 1, AM)

**Objective:** Get the database, seed pipeline, and project scaffolding live.

### Milestone Checklist

- [ ] **P1-01** Create Supabase project (free tier); note project URL and service role key
- [ ] **P1-02** Run schema migration SQL — create all 5 tables: `clients`, `invoices`, `contact_history`, `audit_log`, `decision_queue`
  - **AC:** `supabase db diff` shows no drift; all tables visible in Supabase dashboard
- [ ] **P1-03** Create `v_invoices_enriched` view with computed `days_overdue` and `tier`
  - **AC:** `SELECT * FROM v_invoices_enriched LIMIT 5` returns data with correct tier values
- [ ] **P1-04** Upload `invoices_seed.csv` to Supabase Storage bucket `seed-data`
  - **AC:** File visible in Storage dashboard
- [ ] **P1-05** Deploy `seed-data` Edge Function
  - **AC:** `POST /functions/v1/seed-data` with correct secret returns `{ seeded: 8 }`
- [ ] **P1-06** Verify seed: run `SELECT count(*) FROM invoices` → should return 8
- [ ] **P1-07** Initialize Next.js project (`npx create-next-app@latest ./`) with TypeScript + Tailwind
  - **AC:** `npm run dev` serves at localhost:3000 without errors
- [ ] **P1-08** Initialize Python agent directory (`agent/`) with `requirements.txt` and `__init__.py`
  - **AC:** `pip install -r requirements.txt` installs without error
- [ ] **P1-09** Configure `.env.local` and `.env` with all required secrets (see doc 11)

---

## Phase 2 — Agent Logic (Day 1, PM)

**Objective:** Strands agent running locally, classifying invoices and drafting emails.

### Milestone Checklist

- [ ] **P2-01** Implement `agent/tools/db_client.py` — Supabase Postgres reads via `supabase-py`
  - **AC:** `python -m agent.tools.db_client list_eligible` prints 8 invoice rows
- [ ] **P2-02** Implement `agent/tools/classify.py` — Strands tool that returns tier JSON
  - **AC:** Unit test: `classify_invoice(invoice_data)` returns `{ tier: "TIER_3", escalate: True }` for INV-005
- [ ] **P2-03** Implement `agent/tools/draft_email.py` — Strands tool calling Gemini via LiteLLM
  - **AC:** `draft_email(...)` returns JSON with `subject`, `body`, `word_count < 200`
- [ ] **P2-04** Implement `agent/tools/send_email.py` — Resend API call
  - **AC:** With `RESEND_SANDBOX=true`, returns mock `resend_message_id` without sending
- [ ] **P2-05** Implement `agent/tools/write_audit_log.py` — writes to Supabase `audit_log`
  - **AC:** After tool call, row visible in `audit_log` table
- [ ] **P2-06** Assemble `agent/chazer_agent.py` — Strands `Agent` with all 4 tools + system prompt
- [ ] **P2-07** Implement `agent/main.py` — CLI entry point, accepts `--invoice-ids` or processes all
  - **AC:** `python -m agent.main` runs full sweep against seeded DB; audit log has 8 entries
- [ ] **P2-08** Verify escalation invariants manually:
  - INV-005 ($55k): decision_queue created, NO email sent ✓
  - INV-006 ($1,400, 7d): email sent ✓
  - INV-003 ($890, 15d): email sent ✓

---

## Phase 3 — API Layer & Background Loop (Day 2)

**Objective:** Supabase Edge Functions running, pg_cron configured, agent sweep triggerable from API.

### Milestone Checklist

- [ ] **P3-01** Deploy `api-router` Edge Function — handles GET invoices, GET decisions, GET audit-log
  - **AC:** `curl /functions/v1/invoices` returns 8 invoices with computed fields
- [ ] **P3-02** Deploy `decisions-approve` Edge Function
  - **AC:** POST to approve updates decision status and calls Resend (sandbox)
- [ ] **P3-03** Deploy `decisions-reject` Edge Function
  - **AC:** POST to reject updates decision status; no email sent
- [ ] **P3-04** Deploy `agent-sweep` Edge Function that HTTP-invokes the Python agent
  - **Strategy:** For demo, agent-sweep calls a deployed Python function OR runs the agent directly in Deno via a subprocess call to a bundled Python runtime. Simpler alternative: implement the sweep logic natively in TypeScript within the Edge Function, calling Gemini directly (no Python subprocess). **Decision: implement sweep in TypeScript for Supabase Edge Function; keep Python Strands agent for local demo and README documentation.**
  - **AC:** `POST /functions/v1/sweep` triggers classification + sends emails; audit_log updated
- [ ] **P3-05** Configure pg_cron job for daily sweep:
  ```sql
  SELECT cron.schedule(
    'daily-chazer-sweep',
    '0 9 * * *',  -- 09:00 UTC daily
    $$
    SELECT net.http_post(
      url := 'https://<project>.supabase.co/functions/v1/agent-sweep',
      headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
    );
    $$
  );
  ```
  - **AC:** `SELECT * FROM cron.job` shows the scheduled job
- [ ] **P3-06** Implement idempotency guards in sweep (contact_window_hours, FOR UPDATE SKIP LOCKED)
  - **AC:** Running sweep twice in a row produces 0 additional sends
- [ ] **P3-07** Implement `POST /functions/v1/sweep` manual trigger endpoint
  - **AC:** Returns 202 immediately; sweep completes in background; audit log updated within 30s
- [ ] **P3-08** End-to-end test: wipe `contact_history` and `audit_log`; run sweep; verify 4 emails sent, 4 escalated

---

## Phase 4 — Frontend Dashboard (Day 3, AM)

**Objective:** Next.js dashboard fully functional against live Supabase API.

### Milestone Checklist

- [ ] **P4-01** Implement Tailwind design system tokens (colors, typography, shadows) per doc 09
- [ ] **P4-02** Build `<AppShell>` with sidebar + topbar + page slot
  - **AC:** Sidebar renders on all 3 pages; active route highlighted
- [ ] **P4-03** Build `/dashboard` page with `<StatsBar>` + `<InvoiceTable>`
  - **AC:** Shows 8 invoices sorted by days_overdue; tier badges correct colors; aging bars animated
- [ ] **P4-04** Build `/decisions` page with `<DecisionCard>` list
  - **AC:** 4 decision cards visible; Approve button calls API and removes card optimistically
- [ ] **P4-05** Build `<EditDraftModal>` with subject/body editing + word count
  - **AC:** Saving edited draft sends PUT to update decision; validation blocks empty subject
- [ ] **P4-06** Build `/audit` page with `<AuditTimeline>` 
  - **AC:** Timeline shows all audit entries; icons correct per action type
- [ ] **P4-07** Build `<TriggerSweepButton>` + `<SweepStatusIndicator>` in TopBar
  - **AC:** Clicking button triggers sweep; indicator shows "Sweeping..." with spinner; auto-refreshes at 5s
- [ ] **P4-08** Implement Zustand store with `fetchInvoices`, `fetchDecisions`, `approveDecision`, `rejectDecision`, `triggerSweep`
- [ ] **P4-09** Add loading skeletons to all 3 pages
- [ ] **P4-10** Add empty states to all 3 pages

---

## Phase 5 — Polish & Deploy (Day 3, PM)

**Objective:** Live, shareable URL. Demo video recorded. Submission ready.

### Milestone Checklist

- [ ] **P5-01** Deploy Next.js to Vercel (`npx vercel --prod`)
  - **AC:** Dashboard loads at `https://chazer.vercel.app` (or custom domain)
- [ ] **P5-02** Set all environment variables in Vercel dashboard
  - **AC:** `chazer.vercel.app/dashboard` renders live data from Supabase
- [ ] **P5-03** Configure Resend production mode (domain verification for `chazer.dev`)
  - **AC:** Test email arrives in inbox from `reminders@chazer.dev`
- [ ] **P5-04** Run full E2E demo flow: seed → sweep → decision queue → approve → audit log
  - **AC:** All 4 steps complete without error; audit log shows complete trace
- [ ] **P5-05** Run QA checklist (doc 17) — all critical items pass
- [ ] **P5-06** Write `README.md` with: setup instructions, architecture diagram embed, demo video link, MIT license
- [ ] **P5-07** Record ≤5-minute demo video following script (doc 16)
  - **AC:** Video shows full autonomous loop: cron fires → agent classifies → emails sent → decision queue → owner approves
- [ ] **P5-08** Create architecture diagram (can use draw.io or embed mermaid from doc 02)
- [ ] **P5-09** Make GitHub repo public; add Apache-2.0 license in `About` section
- [ ] **P5-10** Submit via hackathon portal before Sep 15, 2026 23:59 AoE

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Gemini API rate limit (60 req/min) | Medium | Medium | Batch invoke agent with 3s sleep between invoices; demo has only 8 invoices |
| Supabase Edge Function cold start (>1s) | Low | Low | Acceptable for demo; not user-blocking |
| Resend domain verification takes time | Medium | High | Use sandbox mode for demo; real send not required for judging |
| Python subprocess from Deno fails | High | High | **Mitigation:** Implement sweep logic in TypeScript directly; Python agent kept for local demo + judging evidence |
| Vercel build fails (TypeScript errors) | Low | Medium | Run `tsc --noEmit` locally before deploy |
