# Chazer — Features Implemented

**Last updated:** 2026-09-12  
**Project status:** Documentation Complete · Build Not Started

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
