# Chazer — Features Implemented

**Last updated:** 2026-09-12  
**Project status:** Documentation Complete · Build Not Started

---

## Feature: AppShell, Responsive Sidebar & TopBar Component System (FRONT-01)

**Status:** Implemented  
**What it does:** Core application layout framework, responsive navigation system, live sweep status indicator, manual sweep trigger, and Zustand state integration for the Chazer owner dashboard.

**Important details:**
- **Sidebar (`dashboard/components/Sidebar.tsx`)**:
  - Chazer brand logo with gradient icon and subtitle (`Autonomous Collections`).
  - 3 primary routes: Dashboard (`/dashboard`), Decisions (`/decisions`), Audit Log (`/audit`).
  - Active route highlighting with purple glow styling (`bg-chazer-purple/20 text-white font-semibold`).
  - Reactive decision count badge reading pending decisions from Zustand store.
  - Collapsible support for tablet/desktop viewport width toggling.
  - Mobile bottom navigation tab bar at `< 768px` (`data-testid="mobile-bottom-bar"`).
  - Owner profile badge (`Demo Owner · demo_owner`).
- **TopBar (`dashboard/components/TopBar.tsx`)**:
  - `SweepStatusIndicator`: Formatted relative time indicator ("Last sweep: 3 min ago") with pulsing green alive status beacon and spinning loader during active sweep runs.
  - `TriggerSweepButton`: "Run Sweep" action button with disabled state and loading spinner animation during active sweeps.
  - Mobile navigation drawer toggle button.
- **AppShell (`dashboard/components/AppShell.tsx`)**:
  - Responsive container combining Sidebar, sticky TopBar, and fluid `<main>` viewport with transition padding and smooth entry animation.
- **Client State Store (`dashboard/lib/store.ts`)**:
  - Full Zustand store managing invoices, decisions, audit entries, summary stats, filter selections, sorting parameters, and sweep lifecycle operations.
- **Testing**: 9/9 unit and component tests passing under Vitest (`dashboard/tests/app-shell.test.tsx`).

**Relevant files:**
- `dashboard/components/AppShell.tsx`
- `dashboard/components/Sidebar.tsx`
- `dashboard/components/TopBar.tsx`
- `dashboard/lib/store.ts`
- `dashboard/tests/app-shell.test.tsx`
- `docs/07-components.md`, `docs/08-pages.md`, `docs/09-design-systems.md`

---

## Feature: Decision Queue Action Endpoints: Approve & Reject (BACK-04)

**Status:** Implemented  
**What it does:** Supabase Edge Functions implementing owner approval (`POST /decisions/:id/approve` / `decisions-approve`) and rejection (`POST /decisions/:id/reject` / `decisions-reject`) for pending AI-drafted collection emails.

**Important details:**
- **Approve Decision Endpoint (`decisions-approve`)**:
  - Validates decision presence, returning 404 `DECISION_NOT_FOUND` if absent.
  - Enforces conflict resolution guard, returning 409 `DECISION_ALREADY_RESOLVED` if decision is not pending.
  - Accepts optional `edited_subject` and `edited_body` payload; runs safety validation requiring `invoice_id` in custom edited email body (returning 422 `EMAIL_VALIDATION_FAILED` if missing).
  - Dispatches email via Resend API with `Idempotency-Key` header (`decision-${id}-approve`) or zero-credit sandbox simulation.
  - Updates `decision_queue.status = 'APPROVED'`, creates `contact_history` record, updates `invoices` contact timestamp, and records `OWNER_APPROVED` event in `audit_log`.
- **Reject Decision Endpoint (`decisions-reject`)**:
  - Validates decision presence (404) and state conflict (409).
  - Updates `decision_queue.status = 'REJECTED'` and attaches `reject_reason`.
  - Records `OWNER_REJECTED` event in `audit_log`.
- **CORS & Resilience**: Full CORS headers on standard and `OPTIONS` preflight requests; mock fallback engine for offline or mock test execution.
- **Testing**: 12/12 unit and integration tests passing under Vitest (`dashboard/tests/decisions-actions.test.ts`).

**Relevant files:**
- `supabase/functions/decisions-approve/index.ts`
- `supabase/functions/decisions-reject/index.ts`
- `dashboard/tests/decisions-actions.test.ts`
- `docs/06-api-and-state-design.md`, `docs/22-actionable-issues-backlog.md`

---

## Feature: Vitest & Pydantic Test Framework with Strict TDD Protocol

**Status:** Implemented  
**What it does:** Standardized test infrastructure and execution framework enforcing Test-Driven Development (`/tdd`) across the entire repository.
- **Frontend / Fullstack**: Vitest + React Testing Library + JSDOM (`dashboard/vitest.config.ts`, `dashboard/vitest.setup.ts`, `npm test`)
- **Python Agent**: Pytest + Pydantic validation models (`agent/tests/schemas.py`, `pytest tests/ -v`)
- **Completion Invariant**: No ticket or feature can be marked `Completed` without red-green TDD verification.

**Relevant files:**
- `dashboard/vitest.config.ts`, `dashboard/vitest.setup.ts`, `dashboard/package.json`, `dashboard/tests/types.test.ts`
- `agent/tests/schemas.py`
- `docs/20-testing-strategy.md`, `docs/21-code-review-protocol.md`, `docs/22-actionable-issues-backlog.md`, `docs/23-parallel-execution-plan.md`

## Feature: REST API Router Edge Function (BACK-03)

**Status:** Implemented  
**What it does:** Supabase Edge Function serving REST API endpoints (`GET /invoices`, `GET /decisions`, `GET /audit-log`) for the Next.js owner dashboard with dynamic aging calculation, tier classification, high-value flagging, summary statistics aggregation, and query filtering/pagination.

**Important details:**
- **`GET /invoices`**:
  - Fetches and dynamically enriches invoices with `days_overdue`, `tier`, `is_high_value`, `client_name`, and `client_email`.
  - Computes global summary statistics (`total_overdue_amount`, `count_by_tier`, `pending_decisions`).
  - Supports query filters (`status`, `tier`) and multi-field sorting (`sort=days_overdue|amount|due_date|status`, `order=asc|desc`).
- **`GET /decisions`**:
  - Fetches pending escalation decisions with attached invoice context, escalation reason, AI draft subject/body, and LLM confidence score.
  - Supports status filtering (`status=PENDING_APPROVAL|APPROVED|REJECTED`).
- **`GET /audit-log`**:
  - Fetches paginated immutable action entries (`page`, `limit`, `has_more`, `total`).
  - Supports filtering by `invoice_id` and `action`.
- **CORS & Resilience**: Full CORS headers on all requests and `OPTIONS` preflight; automatic fallback to deterministic seed dataset when offline or running in mock test mode.
- **Testing**: 14/14 unit and integration tests passing under Vitest (`dashboard/tests/api-router.test.ts`).

**Relevant files:**
- `supabase/functions/api-router/index.ts`
- `dashboard/tests/api-router.test.ts`
- `docs/06-api-and-state-design.md`

---

## Feature: Seed Data Edge Function & CSV Ingestion Pipeline (BACK-02)

**Status:** Implemented  
**What it does:** Supabase Edge Function ingesting, validating, and upserting invoice seed datasets from Supabase Storage or request payloads into Postgres `clients` and `invoices` tables.

**Important details:**
- **Authentication Guard**: Mandatory `x-seed-secret` header check returning 401 Unauthorized if secret is invalid.
- **CSV Parser & Validator**:
  - RFC 5321 email format validation, `amount` bounds checking (`> 0` and `<= 999,999.99`), `invoice_id` format checking (`INV-NNN`), and status validation.
  - Isolates invalid CSV rows in `invalid_rows` array without failing or aborting the remaining valid batch.
- **Canonical Normalization**:
  - Extracts and de-duplicates unique client records before upserting into `clients`.
  - Transforms rows to canonical `invoices` records with default state (`contact_count: 0`, `dispute_flag: false`, `last_contact_at: null`).
- **Idempotent DB Upsert**: Employs `upsert` on conflict keys (`client_id` and `invoice_id`).
- **Testing**: 14/14 unit and integration tests passing under Vitest (`dashboard/tests/seed-data.test.ts`).

**Relevant files:**
- `supabase/functions/seed-data/index.ts`
- `data/invoices_seed.csv`
- `dashboard/tests/seed-data.test.ts`
- `docs/05-data-ingestion-and-processing-engine.md`

---

## Feature: Email Dispatch & Immutable Audit Logging Tools (AGENT-03)

**Status:** Implemented  
**What it does:** Resend API integration with Idempotency-Key support and sandbox development mode, coupled with synchronous immutable audit event persistence in Supabase Postgres.

**Important details:**
- **Email Sending Tool (`send_email`)**:
  - Resend API dispatch supporting custom sender, recipients, plain-text body, and subject.
  - Zero-credit Sandbox Mode (`sandbox = True` / `RESEND_SANDBOX = true`) generating deterministic mock message IDs without live HTTP traffic.
  - Mandatory `Idempotency-Key` header injection preventing duplicate email dispatch during retries or network blips.
  - Structured return schema `{ success, resend_message_id, timestamp_utc, error }`.
- **Immutable Audit Logging Tool (`write_audit_log`)**:
  - Synchronously records all agent life-cycle actions (`INVOICE_CLASSIFIED`, `EMAIL_DRAFTED`, `TIER1_EMAIL_SENT`, `TIER2_EMAIL_SENT`, `TIER3_DRAFT_CREATED`, `TIER3_ESCALATED`, `HIGH_VALUE_ESCALATED`, `SEND_FAILED`, `LLM_FAILED`, `OWNER_APPROVED`, `OWNER_REJECTED`, etc.).
  - Persists records to Supabase `audit_log` table when configured.
  - Automatic fallback resilience preventing agent crash if database connection fluctuates.
  - Generates immutable UUID `log_id` and UTC ISO timestamp.
- **Testing**: 8/8 unit tests passing under Pytest with Pydantic `SendEmailOutputSchema` and `AuditLogEntrySchema` validation.

**Relevant files:**
- `agent/tools/send_email.py`
- `agent/tools/write_audit_log.py`
- `agent/tests/test_send_email.py`
- `agent/tests/test_write_audit_log.py`
- `agent/tests/schemas.py`
- `docs/03-agent-specification.md`, `docs/06-api-and-state-design.md`, `docs/22-actionable-issues-backlog.md`

---

## Feature: LLM-Driven Email Drafter Tool (AGENT-02)

**Status:** Implemented  
**What it does:** LLM-powered collection email generation tool for the Strands agent framework, supporting Grok (xAI) and Google Gemini 1.5 Flash via LiteLLM provider with strict post-generation safety validation, word count limits, and robust parse/retry logic.

**Important details:**
- **Tier 1 Tone**: Warm, polite nudge assuming the client simply misplaced or overlooked the invoice.
- **Tier 2 Tone**: Firmer follow-up explicitly referencing prior reminder dates and stating clear payment urgency.
- **Tier 3 Tone**: Formal, unambiguous final notice requesting immediate settlement while strictly banning unlawful threats.
- **Tool-Level Safety & Accuracy Validation**:
  - Requires presence of `invoice_id`, formatted dollar `amount`, and `due_date`.
  - Enforces hard word count ceiling: `word_count <= 200` (computed by tool, not LLM).
  - Safety filter rejecting aggressive legal threats / collections agency vocabulary (`sue`, `lawsuit`, `attorney`, `court`, `police`, `penalties`, etc.).
  - Returns `validation_passed: bool`.
- **Fault-Tolerant Parsing & Timeout Handling**:
  - Automatically cleans markdown code fences (` ```json `).
  - Retries once on invalid JSON with explicit correction instructions, raising `LLMParseError` on persistent failure.
  - Enforces configurable timeout (default 15s) raising `LLMTimeoutError`.
- **Dual Invocation Support**: Callable via `@tool` with dictionary payload or keyword arguments.
- **Testing**: 13/13 unit and contract tests passing under Pytest with Pydantic `EmailDraftSchema` validation.

**Relevant files:**
- `agent/tools/draft_email.py`
- `agent/tests/test_draft_email.py`
- `agent/tests/schemas.py`
- `docs/03-agent-specification.md`, `docs/04-rules.md`, `docs/22-actionable-issues-backlog.md`

---

## Feature: Invoice Escalation Classifier Strands Tool (AGENT-01)

**Status:** Implemented  
**What it does:** Deterministic rule-based escalation classifier tool for the Strands AI collection agent runtime, implementing complete tier assignment matrix, high-value thresholds, dispute flag auto-freezes, and late-start edge cases.

**Important details:**
- **Tier 1 (1–7 days overdue)**: Friendly nudge (`auto_send_eligible = True`, `escalate = False` on first contact; `auto_send_eligible = False` if already contacted).
- **Tier 2 (8–21 days overdue)**: Firm reminder referencing prior contact (`auto_send_eligible = True`, `escalate = False` when `contact_count >= 1`).
- **Late Start Edge Case (8–21 days overdue, 0 contacts)**: Intelligently falls back to Tier 1 initial nudge to avoid incoherent "second reminder" messaging.
- **Tier 3 (22+ days overdue)**: Final notice drafted and held for owner approval (`auto_send_eligible = False`, `escalate = True`).
- **Dispute Override**: Any invoice with `dispute_flag = True` automatically assigns `TIER_3`, freezes auto-sends (`auto_send_eligible = False`), and routes to owner (`escalate = True`).
- **High-Value Override**: Invoices with `amount >= owner_high_value_threshold` (default $10,000) always require human approval (`escalate = True`, `auto_send_eligible = False`).
- **Dual Invocation Support**: Seamlessly callable as a `@tool` with keyword arguments by Strands Agent or with an unpacked dictionary/kwargs directly.
- **Testing**: 15/15 unit tests passing under Pytest with Pydantic payload validation.

**Relevant files:**
- `agent/tools/classify.py`
- `agent/tests/test_classify.py`
- `agent/tests/schemas.py`
- `docs/03-agent-specification.md`, `docs/04-rules.md`, `docs/14-core-algorithms-and-theory.md`

---

## Feature: TypeScript Domain Contracts & API Interfaces (FRONT-05 Phase A)

**Status:** Implemented  
**What it does:** Centralized TypeScript definitions for the entire application frontend, API contracts, entity schemas, enums, query parameters, state mutations, and UI models strictly aligned with `docs/06-api-and-state-design.md` and `docs/07-components.md`.

**Important details:**
- Domain Enums: `InvoiceStatus`, `EscalationTier`, `DecisionStatus`, `ContactHistoryStatus`, `SweepStatus`, `AuditAction`, `AuditStatus`
- Entities: `Client`, `Invoice`, `Summary`, `TierCounts`, `Decision`, `DecisionInvoiceContext`, `ContactHistory`, `AuditEntry`, `AuditMetadata`, `SweepRun`
- API Contracts: `InvoicesResponse`, `InvoicesQueryParams`, `DecisionsResponse`, `DecisionsQueryParams`, `EmailContent`, `ApproveDecisionRequest/Response`, `RejectDecisionRequest/Response`, `AuditLogQueryParams`, `AuditLogResponse`, `Pagination`, `SweepTriggerResponse`, `SeedDataResponse`, `ApiErrorResponse`
- UI & Filter types: `InvoiceSortField`, `SortOrder`, `InvoiceFilters`, `NavLinkItem`
- Component Prop Types: `AppShellProps`, `StatsBarProps`, `StatCardProps`, `InvoiceTableProps`, `InvoiceRowProps`, `TierBadgeProps`, `AgingBarProps`, `DecisionCardProps`, `EmailDraftPreviewProps`, `EditDraftModalProps`, `DecisionActionsProps`, `AuditTimelineProps`, `AuditEntryProps`, `SweepStatusIndicatorProps`, `TriggerSweepButtonProps`, `EmptyStateProps`

**Relevant files:**
- `dashboard/lib/types.ts`
- `dashboard/tests/types.test.ts`
- `docs/06-api-and-state-design.md`
- `docs/07-components.md`

---

## Feature: Repository Foundation & Scaffolding (DEVOPS-01)

**Status:** Implemented  
**What it does:** Complete repository workspace initialization, configuration, toolchain setup, and file structure supporting the Python Strands agent runtime, Supabase edge database/functions layer, and Next.js 14 frontend dashboard.

**Important details:**
- Git initialized with `main` branch
- Comprehensive `.gitignore` covering Python, Next.js, Vercel, Supabase, node_modules, and environment files
- Apache-2.0 `LICENSE`
- Master `README.md` with badging, architecture diagram, repo map, and quickstart run instructions
- `agent/` scaffolded with `requirements.txt` (Strands SDK, LiteLLM, Supabase, Resend, Pytest), `.env.example`, and package init files
- `supabase/` scaffolded with `config.toml`, `.env.example`, and migration/function folders
- `dashboard/` scaffolded with Next.js 14, Tailwind CSS (with full design tokens and glassmorphism utilities from `docs/09`), TypeScript config, and App Router structure
- `data/` seeded with standard `invoices_seed.csv` from `docs/05`

**Relevant files:**
- `.gitignore`, `LICENSE`, `README.md`
- `agent/requirements.txt`, `agent/.env.example`
- `supabase/config.toml`, `supabase/.env.example`
- `dashboard/package.json`, `dashboard/tailwind.config.js`, `dashboard/tsconfig.json`, `dashboard/app/globals.css`, `dashboard/app/layout.tsx`, `dashboard/app/page.tsx`
- `data/invoices_seed.csv`

---

## Feature: Comprehensive Project Documentation

**Status:** Implemented  
**What it does:** 22 production-grade markdown documents covering every aspect of the Chazer autonomous invoice-chasing agent — from PRD through architecture, agent spec, API design, UI components, design system, testing, deployment, and demo script.

**Important details:**
- Stack was revised from AWS-native to free-tier stack (Supabase + Gemini + Resend + Vercel) during planning due to no AWS credits available
- All documents are consistent with the revised stack (context.md updated to reflect)
- ADR-001 documented in context.md explaining all stack trade-offs

**Relevant files:**
- `docs/01-prd.md` through `docs/23-parallel-execution-plan.md`
- `context.md` (updated with revised stack)

---

## Feature: Autonomous Invoice Escalation Agent (Specified, Not Built)

**Status:** Planned / Specified  
**What it does (when built):** Background Strands Python agent that classifies overdue invoices into escalation tiers, auto-sends Tier-1/2 emails via Resend, and holds Tier-3 items for owner approval. Runs daily via pg_cron.

---

## Feature: Owner Dashboard (Specified, Not Built)

**Status:** Planned / Specified  
**What it does (when built):** Next.js dashboard with Aging Receivables view, Decision Queue with AI-drafted email approval, and Audit Log timeline showing all agent actions.

---

## Feature: Supabase Data Layer (Specified, Not Built)

**Status:** Planned / Specified  
**What it does (when built):** Postgres schema with 6 tables, enriched view for tier computation, RLS policies, pg_cron scheduler, seed pipeline from CSV.
