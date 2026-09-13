# 22 — Actionable Issues Backlog

> **Chazer** · 20 Granular Tickets · Ready for Execution with Strict TDD Protocol

---

## ⚡ Mandatory TDD & Testing Standard for All Tickets

> [!IMPORTANT]
> **Strict Completion Rule**: No ticket or feature in this backlog may be marked as **Completed** (`🟢 Completed`) until:
> 1. Public seam interfaces are pre-agreed and tested test-first (**Red** phase via `/tdd`).
> 2. Minimal implementation turns all tests **Green**.
> 3. **Python Agent tickets** (`AGENT-01` .. `AGENT-04`): Unit tests written with **Pytest** and validate input/output payloads with **Pydantic** models.
> 4. **Frontend & API tickets** (`FRONT-01` .. `FRONT-05`, `BACK-02` .. `BACK-04`): Tests written and executed using **Vitest** (`npm test` in `dashboard/`).
> 5. Full test runner passes cleanly with zero errors.

---

## [BACKEND] Issues

---

### BACK-01: Create initial Supabase database schema

**Priority:** P0 — Day 1 AM  
**Layer:** `[BACKEND]`  
**Estimate:** 1–2 hours

**Description:**  
Create the Supabase migration file that defines all 6 tables and the enriched view.

**Acceptance Criteria:**
- [ ] File: `supabase/migrations/001_initial_schema.sql` exists
- [ ] Tables: `clients`, `invoices`, `contact_history`, `audit_log`, `decision_queue`, `sweep_runs` all created with correct column types, constraints, and indices
- [ ] View: `v_invoices_enriched` created with `days_overdue` and `tier` computed columns
- [ ] RLS enabled on all tables with `demo_owner_read` SELECT policies
- [ ] pg_cron and pg_net extensions enabled
- [ ] `supabase db push` succeeds without errors
- [ ] Manual verification: `SELECT count(*) FROM invoices` returns 0 (not an error)

---

### BACK-02: Build seed-data Edge Function

**Priority:** P0 — Day 1 AM  
**Layer:** `[BACKEND]`  
**Estimate:** 2 hours

**Description:**  
Implement the `seed-data` Supabase Edge Function that downloads `invoices_seed.csv` from Supabase Storage, validates each row, and upserts into `clients` and `invoices` tables.

**Acceptance Criteria:**
- [ ] `POST /functions/v1/seed-data` with `x-seed-secret` returns `{ seeded: 8, invalid: 0 }`
- [ ] Without correct secret: returns 401
- [ ] Running twice: returns `{ seeded: 8, skipped: 0 }` (idempotent upsert)
- [ ] Invalid CSV row (bad email): logged in `invalid_rows` array, does not abort entire seed
- [ ] All 8 invoice rows visible in `SELECT * FROM invoices` after seeding

**Files to create:**
- `supabase/functions/seed-data/index.ts`

---

### BACK-03: Build api-router Edge Function

**Priority:** P0 — Day 2  
**Layer:** `[BACKEND]`  
**Estimate:** 3 hours

**Description:**  
Implement the REST API Edge Function serving the dashboard. Routes: `GET /invoices`, `GET /decisions`, `GET /audit-log`.

**Acceptance Criteria:**
- [ ] `GET /invoices` returns all invoices with `days_overdue`, `tier`, `is_high_value`, `client_name`, `client_email` fields
- [ ] `GET /invoices?status=OVERDUE` filters correctly
- [ ] `GET /decisions?status=PENDING_APPROVAL` returns only pending items
- [ ] `GET /audit-log?page=1&limit=50` returns paginated entries with `has_more` boolean
- [ ] All endpoints return 200 for valid requests, 500 with JSON error for exceptions
- [ ] CORS headers present on all responses

**Files to create:**
- `supabase/functions/api-router/index.ts`

---

### BACK-04: Implement decisions-approve and decisions-reject Edge Functions

**Priority:** P0 — Day 2  
**Layer:** `[BACKEND]`  
**Estimate:** 2 hours

**Description:**  
Implement the two action endpoints that the owner uses from the Decision Queue.

**Acceptance Criteria:**
- [ ] `POST /decisions/:id/approve` sends email via Resend and returns `{ success: true, resend_message_id }`
- [ ] `POST /decisions/:id/approve` with edited content uses edited body/subject, validates invoice_id present
- [ ] `POST /decisions/:id/approve` on already-approved decision returns 409
- [ ] `POST /decisions/:id/reject` with reason updates status to REJECTED, returns 200
- [ ] Both endpoints write `audit_log` records (`OWNER_APPROVED` / `OWNER_REJECTED`)
- [ ] `decision_queue.status` updated correctly after each action

**Files to create:**
- `supabase/functions/decisions-approve/index.ts`
- `supabase/functions/decisions-reject/index.ts`

---

### BACK-05: Configure pg_cron daily sweep schedule

**Priority:** P0 — Day 2  
**Layer:** `[BACKEND]`  
**Estimate:** 30 minutes

**Description:**  
Configure the pg_cron job that fires the agent sweep daily.

**Acceptance Criteria:**
- [ ] `SELECT * FROM cron.job` shows `daily-chazer-sweep` entry with `0 9 * * *` schedule
- [ ] `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 1` shows a successful run (after waiting for next 09:00 UTC)
- [ ] HTTP POST to agent-sweep Edge Function URL succeeds from pg_cron context
- [ ] CRON_SECRET validated correctly by Edge Function (non-secret request returns 401)

**Files to modify:**
- `supabase/migrations/001_initial_schema.sql` — add `cron.schedule(...)` call at end

---

## [AGENT] Issues

---

### AGENT-01: Implement classify_invoice Strands tool

**Priority:** P0 — Day 1 PM  
**Layer:** `[AI/AGENT]`  
**Estimate:** 2 hours

**Description:**  
Implement the `@tool`-decorated `classify_invoice` function that takes invoice data and returns tier classification.

**Acceptance Criteria:**
- [ ] All 10 unit tests in `tests/test_classify.py` pass
- [ ] Returns valid JSON matching the output schema in doc 03
- [ ] `escalate` is always True when `tier == "TIER_3"`
- [ ] `auto_send_eligible` is always False when `escalate == True`
- [ ] `dispute_flag=True` always produces `tier="TIER_3"`, `escalate=True`
- [ ] High-value invoice always produces `escalate=True` regardless of tier

**Files to create:**
- `agent/tools/classify.py`
- `agent/tests/test_classify.py`

---

### AGENT-02: Implement draft_email Strands tool with Gemini

**Priority:** P0 — Day 1 PM  
**Layer:** `[AI/AGENT]`  
**Estimate:** 3 hours

**Description:**  
Implement the `@tool`-decorated `draft_email` function that calls Gemini 1.5 Flash via Strands LiteLLM provider and returns a validated email draft.

**Acceptance Criteria:**
- [ ] Returns `{ subject, body, word_count, validation_passed }` JSON
- [ ] `word_count` is always accurate (actual word count of `body`)
- [ ] `validation_passed = True` only when: invoice_id in body, amount in body, word_count ≤ 200, no legal threats
- [ ] Tier-1 body is warm/friendly in tone (manual review)
- [ ] Tier-2 body references prior contact (manual review)
- [ ] Tier-3 body is firm and professional (manual review)
- [ ] On Gemini timeout: raises `LLMTimeoutError` after 15 seconds
- [ ] On invalid JSON response: retries once, then raises `LLMParseError`

**Files to create:**
- `agent/tools/draft_email.py`
- `agent/tests/test_draft_email.py` (mock Gemini for unit tests)

---

### AGENT-03: Implement send_email and write_audit_log tools

**Priority:** P0 — Day 1 PM  
**Layer:** `[AI/AGENT]`  
**Estimate:** 1.5 hours

**Description:**  
Implement the remaining two Strands tools: Resend email send and Supabase audit log write.

**Acceptance Criteria:**
- [ ] `send_email` returns `{ success, resend_message_id, timestamp_utc }`
- [ ] `send_email` with `RESEND_SANDBOX=true` returns mock ID without sending
- [ ] `send_email` includes idempotency_key in Resend request header
- [ ] `write_audit_log` creates row in `audit_log` table synchronously before returning
- [ ] `write_audit_log` accepts all valid `action` values from the enum (doc 18)

**Files to create:**
- `agent/tools/send_email.py`
- `agent/tools/write_audit_log.py`

---

### AGENT-04: Assemble ChazerCollectionAgent and sweep loop

**Priority:** P0 — Day 1 PM  
**Layer:** `[AI/AGENT]`  
**Estimate:** 2 hours

**Description:**  
Wire all tools into the Strands `Agent` class and implement the per-invoice sweep loop with error handling.

**Acceptance Criteria:**
- [ ] `python -m agent.main` runs full sweep against live DB
- [ ] Processes all 8 seeded invoices
- [ ] INV-005 ($55k): `decision_queue` record created, no email sent
- [ ] INV-006 ($1,400, 7d): email sent (Resend sandbox), `contact_history` record created
- [ ] Any single invoice failure (LLM/send) does not abort remaining invoices
- [ ] `sweep_runs` table has one completed record after run
- [ ] Audit log has 8+ entries after run

**Files to create:**
- `agent/chazer_agent.py`
- `agent/main.py`

---

### AGENT-05: Implement agent-sweep Edge Function (TypeScript)

**Priority:** P0 — Day 2  
**Layer:** `[AI/AGENT]`  
**Estimate:** 3 hours

**Description:**  
Implement the sweep logic natively in TypeScript as a Supabase Edge Function (since Python subprocesses in Deno are not practical). This calls Gemini directly via fetch, implements the same tier logic, and sends emails via Resend.

**Note:** The Python Strands agent is kept in repo for hackathon judging evidence. The TypeScript Edge Function is the production runtime.

**Acceptance Criteria:**
- [ ] `POST /functions/v1/sweep` returns 202 immediately
- [ ] Sweep processes all eligible invoices within 30 seconds
- [ ] Same classification logic as Python agent (verified by running both against same data and comparing audit logs)
- [ ] Idempotency: running twice produces 0 new sends
- [ ] `sweep_runs` record created with correct counts

**Files to create:**
- `supabase/functions/agent-sweep/index.ts`

---

## [FRONTEND] Issues

---

### FRONT-01: Implement AppShell with Sidebar and TopBar

**Priority:** P0 — Day 3 AM  
**Layer:** `[FRONTEND]`  
**Estimate:** 1.5 hours

**Description:**  
Build the root layout component with sidebar navigation and top bar.

**Acceptance Criteria:**
- [ ] Sidebar shows: Chazer logo, 3 nav links (Dashboard, Decisions with badge, Audit Log), sweep status
- [ ] Active route is highlighted with purple background
- [ ] Decisions badge shows count from Zustand store
- [ ] TopBar shows "Last sweep" timestamp and "Run Sweep" button
- [ ] Mobile: sidebar replaced by bottom tab bar at `< 768px`
- [ ] Sidebar collapsible on tablet (768–1279px)

**Files to create:**
- `dashboard/components/AppShell.tsx`
- `dashboard/components/Sidebar.tsx`
- `dashboard/components/TopBar.tsx`

---

### FRONT-02: Build Dashboard page with Invoice Table

**Priority:** P0 — Day 3 AM  
**Layer:** `[FRONTEND]`  
**Estimate:** 3 hours

**Description:**  
Build `/dashboard` with StatsBar and InvoiceTable.

**Acceptance Criteria:**
- [ ] StatsBar shows: Total Overdue (formatted as `$XX,XXX`), Pending Decisions count, Sent This Week count
- [ ] InvoiceTable shows all 8 invoices sorted by `days_overdue` DESC
- [ ] TierBadge correct colors: TIER_1 green, TIER_2 amber, TIER_3 red
- [ ] High-value badge visible on INV-005
- [ ] AgingBar animates on page load (0 → width)
- [ ] Table skeleton shown during data fetch
- [ ] Empty state shown if 0 invoices
- [ ] Filter dropdowns (Tier, Status) work client-side

**Files to create:**
- `dashboard/app/dashboard/page.tsx`
- `dashboard/components/StatsBar.tsx`
- `dashboard/components/InvoiceTable.tsx`
- `dashboard/components/TierBadge.tsx`
- `dashboard/components/AgingBar.tsx`

---

### FRONT-03: Build Decision Queue page with Approve/Reject

**Priority:** P0 — Day 3 AM  
**Layer:** `[FRONTEND]`  
**Estimate:** 3 hours

**Description:**  
Build `/decisions` with decision cards, email preview, and action buttons.

**Acceptance Criteria:**
- [ ] All pending decisions rendered as cards
- [ ] Each card shows: invoice context, escalation reason, email preview with AI confidence badge
- [ ] "Approve & Send" removes card optimistically (before API confirms) with success toast
- [ ] "Reject" shows brief reason prompt then removes card
- [ ] "Edit Draft" opens modal with editable subject/body
- [ ] Empty state shown when 0 pending decisions
- [ ] Decision count in Sidebar badge updates after approval/rejection

**Files to create:**
- `dashboard/app/decisions/page.tsx`
- `dashboard/components/DecisionCard.tsx`
- `dashboard/components/EmailDraftPreview.tsx`
- `dashboard/components/EditDraftModal.tsx`

---

### FRONT-04: Build Audit Log page

**Priority:** P0 — Day 3 AM  
**Layer:** `[FRONTEND]`  
**Estimate:** 1.5 hours

**Description:**  
Build `/audit` with timeline of agent actions.

**Acceptance Criteria:**
- [ ] Timeline shows all audit entries newest-first
- [ ] Each entry has correct icon per action type
- [ ] Timestamps shown as relative ("3 minutes ago") and absolute on hover
- [ ] SWEEP_COMPLETE entry shows summary counts
- [ ] Skeleton shown during load
- [ ] Empty state shown if no entries

**Files to create:**
- `dashboard/app/audit/page.tsx`
- `dashboard/components/AuditTimeline.tsx`
- `dashboard/components/AuditEntry.tsx`

---

### FRONT-05: Implement Zustand store with all actions

**Priority:** P0 — Day 3 AM  
**Layer:** `[FRONTEND]`  
**Estimate:** 1.5 hours

**Description:**  
Implement the Zustand store that all pages share.

**Acceptance Criteria:**
- [ ] `fetchInvoices()` populates `invoices` and `summary`
- [ ] `fetchDecisions()` populates `decisions`
- [ ] `approveDecision(id)` removes item optimistically; refetches on error (rollback)
- [ ] `rejectDecision(id, reason)` removes item optimistically
- [ ] `triggerSweep()` sets `isSweeping=true`; refreshes all data after 5s delay
- [ ] `isLoadingInvoices`, `isLoadingDecisions`, `isLoadingAudit` booleans used by skeleton components

**Files to create:**
- `dashboard/lib/store.ts`
- `dashboard/lib/api.ts`
- `dashboard/lib/types.ts`

---

## [DEVOPS] Issues

---

### DEVOPS-01: Set up repository structure and tooling

**Priority:** P0 — Day 1 AM  
**Layer:** `[DEVOPS]`  
**Estimate:** 1 hour

**Description:**  
Initialize repo with correct directory structure, `.gitignore`, `README.md` stub, and `LICENSE`.

**Acceptance Criteria:**
- [ ] Directory structure matches doc 11 repository map
- [ ] `.gitignore` excludes: `.env`, `.env.local`, `__pycache__`, `node_modules`, `.vercel`, `venv`
- [ ] `LICENSE` file contains Apache-2.0 text
- [ ] `README.md` has: project name, one-line description, badges (MIT, Python, Next.js)
- [ ] GitHub repo created and set to Public
- [ ] Initial commit pushed to `main`

---

### DEVOPS-02: Configure GitHub Actions CI/CD pipeline

**Priority:** P1 — Day 3 PM  
**Layer:** `[DEVOPS]`  
**Estimate:** 1 hour

**Description:**  
Create the GitHub Actions workflow file for lint, type check, and deploy.

**Acceptance Criteria:**
- [x] `.github/workflows/deploy.yml` created
- [x] On push to `main`: TypeScript type check passes, Python tests pass
- [x] On push to `main`: Vercel frontend deploys automatically
- [x] On push to `main`: Supabase Edge Functions deploy automatically
- [x] Required GitHub secrets documented in `README.md` → Setup section

---

### DEVOPS-05: Create demo reset stored procedure

**Priority:** P1 — Day 3 PM  
**Layer:** `[DEVOPS]`  
**Estimate:** 30 minutes

**Description:**  
Create the `reset_demo()` stored procedure and document the reset flow.

**Acceptance Criteria:**
- [x] `SELECT reset_demo()` from Supabase SQL editor resets all agent state (contact history, audit log, decision queue, sweep runs)
- [x] After reset, all invoices have `last_contact_at = NULL` and `contact_count = 0`
- [x] After reset, running sweep produces full set of actions (as if first run)
- [x] Reset procedure documented in doc 17 and README troubleshooting section

**Files modified:**
- `supabase/migrations/002_demo_utilities.sql`

---

### FRONT-06: Build 4-Stage Horizontal Pipeline Visualizer Component

**Priority:** P0 — Wave 3  
**Layer:** `[FRONTEND]`  
**Estimate:** 1.5 hours

**Description:**  
Implement the standalone 4-card horizontal connected pipeline visualizer component (`dashboard/components/PipelineVisualizer.tsx`) displaying real-time receivables ingestion, tone & risk matrix assessment, dual-lane dispatch split, and cryptographic audit settlement with interactive step-through and animated simulation.

**Acceptance Criteria:**
- [x] Renders 4 horizontal connected cards with top dashed line (`border-t-2 border-dashed border-monad-ash`):
  1. `1. Receivables Ingested` (Badge: `8 Invoices · DB Seed`, Metric: `$96,990.00 · 8 Receivables`)
  2. `2. Tone & Risk Matrix` (Badge: `Rule + LLM Guard`, Metric: `4 Auto · 4 Escalated · 72h & $10k+`)
  3. `3. Dual-Lane Dispatch` (Badge: `Resend + Queue`, Metric: `4 Sent ➔ 4 Review · Zero-Loss Guard`)
  4. `4. Ledger & Audit Trail` (Badge: `Immutable Telemetry`, Metric: `8 Cryptographic Logs · Instant Sync`)
- [x] Active stage card highlighted with Mint/Teal pastel wash (`bg-emerald-500/15` / `#9fe3c0`), elevated shadow, dark hairline border, and footer (`Active Stage` · `Step X/4`).
- [x] Interactive controls: manual card clicking, "Simulate Sweep" auto-play button, and reset.
- [x] Vitest unit suite `dashboard/tests/pipeline-visualizer.test.tsx` passes with 100% coverage (at least 6 tests).

**Files to create:**
- `dashboard/components/PipelineVisualizer.tsx`
- `dashboard/tests/pipeline-visualizer.test.tsx`

---

### FRONT-07: Surface Integration of Pipeline Visualizer

**Priority:** P0 — Wave 3  
**Layer:** `[FRONTEND]`  
**Estimate:** 45 minutes

**Description:**  
Embed and wire the `PipelineVisualizer` component into the primary receivables dashboard (`dashboard/app/dashboard/page.tsx`) as a prominent header banner above `StatsBar` and on the root landing page (`dashboard/app/page.tsx`).

**Acceptance Criteria:**
- [x] `PipelineVisualizer` mounts prominently above `StatsBar` on `/dashboard`.
- [x] Visualizer renders seamlessly on `/` within the capabilities section.
- [x] Responsive layout: stacks cleanly on mobile (<768px) and displays full connected 4-card row on desktop.
- [x] Zero visual or layout regressions across other components.
- [x] Page test suites (`dashboard-page.test.tsx`) pass cleanly with 100% green tests.

**Files to modify:**
- `dashboard/app/dashboard/page.tsx`
- `dashboard/app/page.tsx`
- `dashboard/tests/dashboard-page.test.tsx`

---

### ARCH-01: Formalize Polyglot Architecture & ADR-002

**Priority:** P0 — Wave 3  
**Layer:** `[ARCHITECTURE & DOCS]`  
**Estimate:** 45 minutes

**Description:**  
Formally document the Polyglot Autonomous Architecture (Python Strands Agent + TypeScript Edge Function parity), Dispute Reconciliation Invariant, and ADR-002 (Grok + OpenAI + Gemini Multi-Model LLM Routing via LiteLLM) in the persistent repository documentation.

**Acceptance Criteria:**
- [x] `context.md` updated with Polyglot Architecture table and ASCII architecture diagram.
- [x] `context.md` updated with ADR-002 (Grok + OpenAI + Gemini via LiteLLM) and Dispute Invariant.
- [x] `docs/02-architecture.md` and `docs/13-tech-stack.md` updated with multi-model routing table.

**Files to modify:**
- `context.md`
- `docs/02-architecture.md`
- `docs/13-tech-stack.md`

---

### FRONT-08: Dual-Mode Environment Indicator Badge in TopBar

**Priority:** P0 — Wave 3  
**Layer:** `[FRONTEND]`  
**Estimate:** 30 minutes

**Description:**  
Implement an interactive Dual-Mode Environment Indicator badge in `dashboard/components/TopBar.tsx` that visually distinguishes between `Demo Sandbox Mode` (local offline/mock data) and `Live Supabase Mode` (connected to active PostgreSQL backend) with tooltips and alive status beacon.

**Acceptance Criteria:**
- [x] `TopBar.tsx` renders `EnvironmentModeBadge` alongside the sweep trigger and theme switcher.
- [x] Displays `Demo Sandbox Mode` or `Live Supabase Mode` based on config.
- [x] Vitest test suite passes cleanly with 100% green tests.

**Files to modify:**
- `dashboard/components/TopBar.tsx`
- `dashboard/tests/app-shell.test.tsx`

---

### DEVOPS-03: Master README Alignment & 3-Minute Demo Video Storyline

**Priority:** P0 — Wave 4  
**Layer:** `[DEVOPS]`  
**Estimate:** 1 hour

**Description:**  
Align the public `README.md` and 3-minute video presentation storyline in `docs/12-demo-script.md` with the live 4-stage pipeline visualizer, dual-mode sandbox execution, and AWS hackathon judging criteria.

**Acceptance Criteria:**
- [x] `docs/12-demo-script.md` updated with exact voiceover script and screen transition cues.
- [x] `README.md` verified for judging badges, quickstart sandbox commands, and polyglot architecture parity table.

**Files to modify:**
- `docs/12-demo-script.md`
- `README.md`

---

### DEVOPS-04: Full Suite QA Verification & Submission Sign-off

**Priority:** P0 — Wave 4  
**Layer:** `[DEVOPS / QA]`  
**Estimate:** 45 minutes

**Description:**  
Execute end-to-end regression testing across all workstreams (Python agent, Supabase edge functions, Next.js frontend, and TypeScript compiler), audit all items in `docs/17-submission-qa-checklist.md`, and complete final release tracking.

**Public Seams & Verification Suite:**
```bash
npm test                      # 129+ Vitest tests passing across 12 suites
npx tsc --noEmit              # 0 TypeScript compilation errors
pytest agent/tests/ -v        # 42 Python Strands agent tests passing
python -m agent.main --sandbox # CLI sweep processes 8 invoices cleanly
```

**Acceptance Criteria:**
- [x] 100% test pass rate across Vitest and Pytest test runners.
- [x] `npx tsc --noEmit` returns 0 compilation errors.
- [x] `docs/17-submission-qa-checklist.md` fully verified.
- [x] `features_implemented.md` and `tracker.md` updated with 21/21 tickets completed.

**Files to modify:**
- `docs/17-submission-qa-checklist.md`
- `features_implemented.md`
- `tracker.md`
- `docs/23-parallel-execution-plan.md`
