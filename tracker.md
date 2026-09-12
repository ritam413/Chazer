# tracker.md — Agent Handoff Log

---

## 2026-09-12 — AGENT-03: Implement send_email and write_audit_log Tools

### Objective
Implement the remaining two core Strands agent tools: `send_email` (Resend integration with sandbox mode and idempotency keys) and `write_audit_log` (synchronous immutable audit persistence in Supabase Postgres) along with their unit and contract tests (`agent/tools/send_email.py`, `agent/tools/write_audit_log.py`, `agent/tests/test_send_email.py`, `agent/tests/test_write_audit_log.py`) following strict `/tdd` Red-Green-Refactor protocol.

### Changes Made
- Created feature branch `feat/agent-03-tools`.
- Created `agent/tests/test_send_email.py` covering:
  - Zero-credit sandbox mode generating mock Resend IDs without live HTTP traffic
  - Live API dispatch including `Idempotency-Key` header injection
  - Resend API failure handling without crashing the agent
  - Keyword arguments and dictionary dual invocation
  - Pydantic `SendEmailOutputSchema` validation
- Created `agent/tests/test_write_audit_log.py` covering:
  - Synchronous record generation with unique UUID and ISO-8601 timestamps
  - Full support and verification for all standard domain actions and statuses
  - Supabase `audit_log` table insertion integration
  - Keyword arguments and dictionary dual invocation
  - Pydantic `AuditLogEntrySchema` validation
- Created `agent/tools/send_email.py` implementing:
  - `@tool` decorator from `strands` (with local fallback)
  - Resend dispatch via `resend` SDK or direct HTTP requests
  - Sandbox mode simulation
  - Idempotency key generation and propagation
- Created `agent/tools/write_audit_log.py` implementing:
  - `@tool` decorator from `strands` (with local fallback)
  - Domain action and status validation sets
  - Supabase client integration for `audit_log` table inserts
  - Resilient error trapping for offline or intermittent DB conditions
- Updated `agent/tests/schemas.py`, `docs/23-parallel-execution-plan.md`, `features_implemented.md`, and `tracker.md`.

### Files Changed
- `agent/tools/send_email.py` (NEW)
- `agent/tools/write_audit_log.py` (NEW)
- `agent/tests/test_send_email.py` (NEW)
- `agent/tests/test_write_audit_log.py` (NEW)
- `agent/tests/schemas.py` (MODIFIED)
- `docs/23-parallel-execution-plan.md` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Implementation Details
- `send_email` defaults to sandbox mode if `RESEND_API_KEY` is absent or `RESEND_SANDBOX=true`, ensuring zero-cost developer experience and test suite execution.
- `write_audit_log` produces immutable log entries synchronously before returning to satisfy invariant INV-03 (all agent actions logged before next step).

### Verification
- Pytest unit suite `pytest agent/tests/test_send_email.py agent/tests/test_write_audit_log.py`: 8/8 unit tests passed in 0.17s.
- Pytest full agent suite `pytest agent/tests/ -v`: 36/36 tests passed in 0.23s.
- Vitest frontend suite `npm test` in `dashboard/`: 6/6 tests passed in 2.20s.
- Red -> Green TDD verification completed.

### Current State
`AGENT-03` is 100% complete and verified on branch `feat/agent-03-tools`. All 3 individual Strands agent tools (`classify_invoice`, `draft_email`, `send_email`, `write_audit_log`) are now fully built and tested.

### Next Agent Instructions
The agent toolchain is ready for:
1. `AGENT-04`: Implement `agent/chazer_agent.py` and `agent/main.py` assembling all 4 tools into `ChazerCollectionAgent` and executing the full per-invoice background sweep loop.
2. Parallel backend streams (`BACK-01`, `BACK-02`) or frontend streams (`FRONT-01`, `FRONT-02`).

---

## 2026-09-12 — AGENT-02: Implement draft_email Strands Tool with LiteLLM & Tests

### Objective
Implement the `@tool`-decorated `draft_email` Strands agent tool and comprehensive unit/contract test suite (`agent/tools/draft_email.py`, `agent/tests/test_draft_email.py`) supporting Grok (xAI) and Google Gemini 1.5 Flash via LiteLLM following strict `/tdd` Red-Green-Refactor protocol.

### Changes Made
- Created feature branch `feat/agent-02-draft-email`.
- Created `agent/tests/test_draft_email.py` covering:
  - Tier 1 friendly email drafting & tone instructions
  - Tier 2 firm reminder drafting (with prior contact date reference)
  - Tier 3 final notice drafting (clear urgency, zero legal threats)
  - Accurate calculation of word count (`len(body.split())`)
  - Post-generation validation failure scenarios: word count > 200, missing invoice ID, missing amount, prohibited legal threats / collections agency language
  - Automatic retry once on malformed JSON response
  - Raising `LLMParseError` on persistent JSON parsing failures
  - Raising `LLMTimeoutError` on request timeouts (15s default)
  - Dual invocation support (dictionary payload vs keyword arguments)
  - Full Pydantic `EmailDraftSchema` validation
- Created `agent/tools/draft_email.py` implementing:
  - `@tool` decorator from `strands` (with local fallback)
  - `build_draft_prompt()` with tier-specific tone and strict domain constraints
  - `validate_draft()` safety validator computed at tool level
  - `call_llm()` via `litellm.completion` with model selection (`xai/grok-beta` / `gemini/gemini-1.5-flash`)
  - `_extract_json_payload()` with code-fence stripping and bracket boundary extraction
  - Custom exceptions `LLMTimeoutError` and `LLMParseError`
- Updated `docs/23-parallel-execution-plan.md`, `features_implemented.md`, and `tracker.md`.

### Files Changed
- `agent/tools/draft_email.py` (NEW)
- `agent/tests/test_draft_email.py` (NEW)
- `docs/23-parallel-execution-plan.md` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Implementation Details
- `validate_draft` is independently computed by the Python tool, never relying blindly on LLM self-reporting.
- Prompt explicitly provides tone, schema, and forbidden terms constraints for the LLM.
- Model defaults to `LLM_MODEL_ID` or Grok/Gemini based on available API keys (`GROK_API_KEY`, `GEMINI_API_KEY`).
- 15s timeout is captured and translated into standard `LLMTimeoutError`.

### Verification
- Pytest unit suite `pytest agent/tests/test_draft_email.py`: 13/13 unit tests passed in 0.18s.
- Pytest full agent suite `pytest agent/tests/ -v`: 28/28 tests passed in 0.24s.
- Vitest frontend suite `npm test` in `dashboard/`: 6/6 tests passed in 2.49s.
- Red -> Green TDD verification completed.

### Current State
`AGENT-02` is 100% complete and verified on branch `feat/agent-02-draft-email`.

### Next Agent Instructions
The agent toolchain is ready for:
1. `AGENT-03`: Implement `agent/tools/send_email.py` (Resend integration) and `agent/tools/write_audit_log.py` (Supabase audit logging).
2. `AGENT-04`: Implement `agent/chazer_agent.py` and `agent/main.py` assembling the complete `ChazerCollectionAgent`.
3. Parallel backend or frontend streams (`BACK-01`, `BACK-02`, `FRONT-01`, `FRONT-02`).

---

## 2026-09-12 — AGENT-01: Implement classify_invoice Strands Tool

### Objective
Implement the deterministic rule-based `classify_invoice` Strands agent tool and comprehensive test suite (`agent/tools/classify.py`, `agent/tests/test_classify.py`) following strict `/tdd` Red-Green-Refactor protocol.

### Changes Made
- Created `agent/tests/test_classify.py` covering:
  - Tier 1 first contact (`days_overdue` in [1, 7], `contact_count == 0` -> auto-send eligible, no escalation)
  - Tier 1 boundary cases (Day 1, Day 7) and contact suppression if already contacted
  - Tier 2 follow-ups (`days_overdue` in [8, 21], `contact_count >= 1`)
  - Tier 2 boundary cases (Day 8, Day 21)
  - Late-start edge case (`days_overdue` in [8, 21], `contact_count == 0` -> falls back gracefully to Tier 1 first contact)
  - Tier 3 final notice (`days_overdue >= 22` -> escalation required, auto-send disabled)
  - Dispute override (`dispute_flag == True` -> Tier 3 + mandatory escalation + auto-send disabled)
  - High-value threshold override (`amount >= owner_high_value_threshold` -> mandatory escalation)
  - Invariant property tests (`auto_send_eligible` is NEVER True when `escalate` is True; `tier == TIER_3` ALWAYS escalates)
- Created `agent/tools/classify.py` implementing `@tool` with support for both dictionary and keyword argument invocation.
- Updated `agent/tests/schemas.py` to use `str` for `client_email` to remove non-essential optional package dependencies.
- Updated `docs/23-parallel-execution-plan.md` and `features_implemented.md`.

### Files Changed
- `agent/tools/classify.py` (NEW)
- `agent/tests/test_classify.py` (NEW)
- `agent/tests/schemas.py` (MODIFIED)
- `docs/23-parallel-execution-plan.md` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Implementation Details
- Tool is decorated with `@tool` with a fallback mechanism if `strands` SDK is absent in a given environment.
- Follows exact specification in `docs/03-agent-specification.md`, `docs/04-rules.md`, and `docs/14-core-algorithms-and-theory.md`.
- Deterministic $O(1)$ algorithm: pure rule-based logic without unnecessary LLM latency for classification.
- Output dictionary adheres strictly to `ClassificationResultSchema` and `ClassifyInvoiceOutput`.

### Verification
- Pytest suite `agent/tests/test_classify.py`: 15/15 unit tests passed in 0.23s.
- Vitest suite `npm test` in `dashboard/`: 6/6 tests passed in 2.25s.
- Red -> Green TDD verification completed.

### Current State
`AGENT-01` is 100% complete and fully verified.

### Next Agent Instructions
The agent toolchain is ready for:
1. `AGENT-02`: Implement `agent/tools/draft_email.py` and `agent/tests/test_draft_email.py` (LLM-driven email drafter with Gemini/Grok via LiteLLM).
2. `AGENT-03`: Implement `agent/tools/send_email.py` (Resend integration) and `agent/tools/write_audit_log.py` (Supabase audit logging).
3. Backend or Frontend parallel streams (`BACK-01`, `BACK-02`, `FRONT-01`, `FRONT-02`).

---

## 2026-09-12 — Test Infrastructure: Vitest, Pydantic & Strict TDD Protocol

### Objective
Incorporate Vitest for frontend/TypeScript testing, Pydantic schemas for Python agent test validation, and enforce strict `/tdd` (Red → Green → Refactor) across all tickets. Mandate that tickets can only be marked as complete after their TDD suite has been executed, red-to-green verified, and passed.

### Changes Made
- Configured Vitest test runner in `dashboard/`:
  - `dashboard/vitest.config.ts` (with React plugin, jsdom environment, `@/` path alias)
  - `dashboard/vitest.setup.ts` (`@testing-library/jest-dom`)
  - Updated `dashboard/package.json` scripts (`"test": "vitest run"`, `"test:watch": "vitest"`) and devDependencies (`vitest`, `@testing-library/react`, `jsdom`).
  - Added initial test `dashboard/tests/types.test.ts`.
- Created Pydantic test models in `agent/tests/schemas.py` (`InvoiceTestSchema`, `ClassificationResultSchema`, `EmailDraftSchema`).
- Updated all documentation files:
  - `docs/20-testing-strategy.md` — Rewritten for Vitest, Pytest + Pydantic, and explicit TDD protocol at public seams.
  - `docs/13-tech-stack.md` — Added Vitest and Pytest + Pydantic to tech stack table.
  - `docs/21-code-review-protocol.md` — Added mandatory TDD verification check to PR checklist and self-review.
  - `docs/22-actionable-issues-backlog.md` — Added global TDD and testing standard requirement.
  - `docs/23-parallel-execution-plan.md` — Updated status criteria and mandatory TDD completion policy.
  - `docs/03-agent-specification.md` — Added Pydantic contract schemas.
  - `context.md` & `features_implemented.md` — Documented TDD framework and completion invariant.

### Files Changed
- `dashboard/package.json` (MODIFIED)
- `dashboard/vitest.config.ts` (NEW)
- `dashboard/vitest.setup.ts` (NEW)
- `dashboard/tests/types.test.ts` (NEW)
- `agent/tests/schemas.py` (NEW)
- `docs/20-testing-strategy.md` (MODIFIED)
- `docs/13-tech-stack.md` (MODIFIED)
- `docs/21-code-review-protocol.md` (MODIFIED)
- `docs/22-actionable-issues-backlog.md` (MODIFIED)
- `docs/23-parallel-execution-plan.md` (MODIFIED)
- `docs/03-agent-specification.md` (MODIFIED)
- `context.md` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Verification
- `npm test` inside `dashboard/` ran Vitest suite against `types.test.ts` — passed.
- Pydantic models in `agent/tests/schemas.py` verified with type checker.

### Current State
Vitest + Pydantic testing infrastructure is active. All subsequent tickets will strictly follow the `/tdd` workflow (Red -> Green -> Refactor) and can only be marked as complete after test execution verification.

### Next Agent Instructions
When implementing any ticket:
1. Agree on public seam interface.
2. Write tests first (**Red**): using Vitest for TS/Frontend or Pytest + Pydantic for Python agent.
3. Implement minimal code to pass (**Green**).
4. Run test runner and verify passing before transitioning ticket to `🟢 Completed`.

---

## 2026-09-12 — FRONT-05 (Phase A): TypeScript Domain Contracts & API Interfaces (Agent C)

### Objective
Execute Agent C task: create complete, strictly typed domain contracts, API interfaces, schema enums, UI state types, and component prop interfaces in `dashboard/lib/types.ts` derived from `docs/06-api-and-state-design.md` and `docs/07-components.md`.

### Changes Made
- Created `dashboard/lib/types.ts` containing all types:
  - Domain enums: `InvoiceStatus`, `EscalationTier`, `DecisionStatus`, `ContactHistoryStatus`, `SweepStatus`, `AuditAction`, `AuditStatus`
  - Entity types: `Client`, `Invoice`, `Summary`, `TierCounts`, `Decision`, `DecisionInvoiceContext`, `ContactHistory`, `AuditEntry`, `AuditMetadata`, `SweepRun`
  - API schemas: `InvoicesResponse`, `InvoicesQueryParams`, `DecisionsResponse`, `DecisionsQueryParams`, `EmailContent`, `ApproveDecisionRequest/Response`, `RejectDecisionRequest/Response`, `AuditLogQueryParams`, `AuditLogResponse`, `Pagination`, `SweepTriggerResponse`, `SeedDataResponse`, `ApiErrorResponse`
  - UI state and filter types: `InvoiceSortField`, `SortOrder`, `InvoiceFilters`, `NavLinkItem`
  - Component prop types: `AppShellProps`, `StatsBarProps`, `StatCardProps`, `InvoiceTableProps`, `InvoiceRowProps`, `TierBadgeProps`, `AgingBarProps`, `DecisionCardProps`, `EmailDraftPreviewProps`, `EditDraftModalProps`, `DecisionActionsProps`, `AuditTimelineProps`, `AuditEntryProps`, `SweepStatusIndicatorProps`, `TriggerSweepButtonProps`, `EmptyStateProps`
- Configured and executed Vitest unit tests in `dashboard/tests/types.test.ts`.
- Verified type check with `npx tsc --noEmit` (clean compilation, 0 errors).
- Updated `features_implemented.md` and `tracker.md`.

### Files Changed
- `dashboard/lib/types.ts` (NEW/MODIFIED)
- `dashboard/tests/types.test.ts` (MODIFIED)
- `dashboard/vitest.config.ts` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Verification
- `npm test` inside `dashboard/` — 6/6 Vitest tests passing.
- `npx tsc --noEmit` executed in `dashboard/` — passed with 0 type errors.
- Verified all fields match Postgres schema, REST endpoint contracts, and UI component specifications in `docs/06-api-and-state-design.md` and `docs/07-components.md`.

### Current State
Foundational contracts established. Frontend UI components (`FRONT-01` through `FRONT-04`) and API store (`FRONT-05 Phase B`) can now be built against unified type definitions with full TypeScript autocompletion and type safety.

### Next Agent Instructions
1. **Frontend stream**: Build `FRONT-01` (`dashboard/components/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`) and `FRONT-02` (`dashboard/app/dashboard/page.tsx`, `InvoiceTable.tsx`).
2. **Backend stream**: Build `BACK-01` (`supabase/migrations/001_initial_schema.sql`).
3. **Agent stream**: Build `AGENT-01` (`agent/tools/classify.py`).

---

## 2026-09-12 — DEVOPS-01: Repository Scaffolding, Tooling & Directory Tree

### Objective
Execute Ticket DEVOPS-01 (Wave 0): initialize repository, establish full multi-tier directory structure for Python agent, Supabase backend, Next.js frontend, configure all tooling, dependencies, licenses, `.gitignore`, and seed assets.

### Changes Made
- Initialized local Git repository on `main` branch.
- Created root `.gitignore` filtering Node.js, Next.js, Python, Supabase, Vercel, and environment files (`.env`, `.env.local`).
- Created Apache-2.0 `LICENSE` file.
- Created root `README.md` with badging, architecture diagrams, repo tree, and quickstart documentation.
- Scaffolding in `agent/`: `requirements.txt` (Strands SDK, LiteLLM, Supabase, Resend, Pytest), `.env.example`, `__init__.py`, `tools/__init__.py`, `tests/__init__.py`.
- Scaffolding in `supabase/`: `config.toml`, `.env.example`, `migrations/`, `functions/`.
- Scaffolding in `dashboard/`: `package.json` (Next.js 14, React 18, Tailwind CSS, Zustand, Lucide icons), `tsconfig.json`, `tailwind.config.js` (with all tokens from `docs/09`), `postcss.config.js`, `next.config.mjs`, `.env.example`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/`, `lib/`.
- Seed dataset created at `data/invoices_seed.csv` based on `docs/05`.
- Updated `docs/23-parallel-execution-plan.md` and `features_implemented.md`.

### Files Changed
- `.gitignore` (NEW)
- `LICENSE` (NEW)
- `README.md` (NEW)
- `data/invoices_seed.csv` (NEW)
- `agent/requirements.txt` (NEW)
- `agent/.env.example` (NEW)
- `agent/__init__.py` (NEW)
- `agent/tools/__init__.py` (NEW)
- `agent/tests/__init__.py` (NEW)
- `supabase/config.toml` (NEW)
- `supabase/.env.example` (NEW)
- `supabase/migrations/.gitkeep` (NEW)
- `supabase/functions/.gitkeep` (NEW)
- `dashboard/package.json` (NEW)
- `dashboard/tsconfig.json` (NEW)
- `dashboard/tailwind.config.js` (NEW)
- `dashboard/postcss.config.js` (NEW)
- `dashboard/next.config.mjs` (NEW)
- `dashboard/.env.example` (NEW)
- `dashboard/app/globals.css` (NEW)
- `dashboard/app/layout.tsx` (NEW)
- `dashboard/app/page.tsx` (NEW)
- `dashboard/components/.gitkeep` (NEW)
- `dashboard/lib/.gitkeep` (NEW)
- `docs/23-parallel-execution-plan.md` (MODIFIED)
- `features_implemented.md` (MODIFIED)
- `tracker.md` (MODIFIED)

### Verification
- `git status` confirmed clean tracking of all repository components
- Directory structure matches `docs/11-deployment-cloud-guide.md` section 8
- Tailwind theme verified with exact tokens from `docs/09-design-systems.md`
- Seed data matches `docs/05-data-ingestion-and-processing-engine.md`

### Current State
Wave 0 Scaffolding (`DEVOPS-01`) is 100% complete. Repository is primed for parallel Wave 0 / Wave 1 tickets (`BACK-01`, `FRONT-05` types, `AGENT-01`, `AGENT-02`, `AGENT-03`, `FRONT-01`..`04`).

### Next Agent Instructions
Proceed to Wave 0 / Wave 1 parallel workstreams:
1. **Backend stream**: Execute `BACK-01` (`supabase/migrations/001_initial_schema.sql` with tables and views per `docs/06`).
2. **Frontend stream**: Execute `FRONT-05` (Phase A: `dashboard/lib/types.ts`) and `FRONT-01` (`dashboard/components/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`).
3. **Agent stream**: Execute `AGENT-01` (`agent/tools/classify.py` + tests) and `AGENT-02` (`agent/tools/draft_email.py` + tests).

---

## 2026-09-12 — LLM Updated: Grok (xAI) as Primary Model

### Objective
User identified Grok API as a better LLM option due to more generous free-tier rate limits vs. Gemini's 60 req/min cap.

### Changes Made
- `context.md` — Updated LLM line + ADR-001 rationale to list Grok as primary, Gemini as fallback
- `docs/03-agent-specification.md` — LLM config block updated to `model_id="xai/grok-beta"` with Gemini commented fallback
- `docs/11-deployment-cloud-guide.md` — Cost table and all env var blocks updated (`GROK_API_KEY` primary)
- `docs/13-tech-stack.md` — Comparison table updated; Grok wins vs. Gemini due to rate limits

### Key Decision
Both LLMs are accessed identically via `strands.models.LiteLLM`. Switching is purely `model_id` + API key — zero code changes required. This makes Gemini a viable fallback if Grok is unavailable on demo day.

### Next Agent: Get Grok API Key
1. Go to [console.x.ai](https://console.x.ai) → create account → generate API key
2. Add `GROK_API_KEY=xai-...` to `agent/.env` and Supabase Edge Function secrets
3. Use `model_id="xai/grok-beta"` in `agent/chazer_agent.py`

---

## 2026-09-12 — Full Documentation Suite Generated

### Objective
Generate all 22 production-grade technical documents for the Chazer autonomous invoice-chasing agent project. Revise architecture from AWS-native to free-tier (Supabase + Gemini + Resend + Vercel) due to user having no AWS credits.

### Changes Made
- Created `docs/` directory with all 22 documents
- Updated `context.md` with revised free-tier architecture and ADR-001
- Created `features_implemented.md` with project feature status

### Files Changed
| File | Status |
|------|--------|
| `docs/01-prd.md` | NEW — Product Requirements Document |
| `docs/02-architecture.md` | NEW — System Architecture with ASCII + Mermaid diagrams |
| `docs/03-agent-specification.md` | NEW — Strands agent state machine, tools, prompts |
| `docs/04-rules.md` | NEW — Domain business rules and invariants |
| `docs/05-data-ingestion-and-processing-engine.md` | NEW — CSV seed pipeline |
| `docs/06-api-and-state-design.md` | NEW — REST API endpoints + Postgres schema |
| `docs/07-components.md` | NEW — React component library spec |
| `docs/08-pages.md` | NEW — Next.js pages, wireframes, responsive layout |
| `docs/09-design-systems.md` | NEW — Design tokens, color palette, Tailwind config |
| `docs/10-development-roadmap.md` | NEW — 3-day build plan with 40+ milestones |
| `docs/11-deployment-cloud-guide.md` | NEW — Supabase + Vercel deployment guide |
| `docs/12-pitch-and-winning-strategy.md` | NEW — Competitive strategy and judging criteria alignment |
| `docs/13-tech-stack.md` | NEW — Technology choices with trade-off analysis |
| `docs/14-core-algorithms-and-theory.md` | NEW — Formal algorithm specs with complexity analysis |
| `docs/15-security-privacy-and-safety-spec.md` | NEW — Security controls, RLS, content validation |
| `docs/16-demo-script-pitch.md` | NEW — 5-minute demo script with presenter notes |
| `docs/17-submission-qa-checklist.md` | NEW — Pre-submission QA with curl commands |
| `docs/18-ubiquitous-language-glossary.md` | NEW — Domain terminology glossary |
| `docs/19-troubleshooting-playbook.md` | NEW — 10 failure scenarios with diagnostic + fixes |
| `docs/20-testing-strategy.md` | NEW — Unit, integration, E2E tests with code |
| `docs/21-code-review-protocol.md` | NEW — PR standards and engineering conventions |
| `docs/22-actionable-issues-backlog.md` | NEW — 20 granular tickets with acceptance criteria |
| `context.md` | MODIFIED — Revised stack to Supabase/Gemini/Vercel; added ADR-001 |
| `features_implemented.md` | NEW — Feature status tracking |

### Implementation Details

**Stack Decision (ADR-001):**
- DynamoDB → Supabase Postgres (free tier, full SQL, native pg_cron)
- AWS Lambda → Supabase Edge Functions (Deno, same platform as DB)
- AWS EventBridge → pg_cron (built into Supabase)
- Amazon Bedrock → Google Gemini 1.5 Flash (free 60 req/min, via Strands LiteLLM)
- AWS SES → Resend (100 emails/day free, 5-minute setup)
- AWS Amplify → Vercel (Next.js native, hobby tier free)

**Key Technical Insight (from doc 10, P3-04):**
Running Python as a subprocess from Deno Edge Functions is impractical. The sweep logic will be implemented twice:
1. In Python (Strands SDK) for the agent/ directory — satisfies hackathon judging requirement, runnable locally
2. In TypeScript (Supabase Edge Function) — the actual production runtime

**System Invariants (from doc 04):**
- INV-01: Tier-3 emails never auto-sent
- INV-02: High-value invoices always require approval
- INV-03: All agent actions logged before external action executed
- INV-04: One email per 72-hour contact window
- INV-05: Dispute flag freezes all automation
- INV-06: Sweep is idempotent

### Verification
- All 22 files created in `docs/` directory: verified via filesystem
- Each document was reviewed for internal consistency (schema references, tool names, API endpoints match across docs)
- No build or tests run yet (code not written yet)

### Current State
Documentation phase is 100% complete. **No code has been written yet.** The project is ready to enter Phase 1 of the roadmap (Day 1 AM — Foundation & Schema).

### Remaining Work
**Everything** — all actual code is to be built. Specifically:

**Day 1 AM (Foundation):**
- BACK-01: Create Supabase schema migration
- BACK-02: Build seed-data Edge Function
- DEVOPS-01: Set up repo structure
- Initialize Next.js and Python projects

**Day 1 PM (Agent):**
- AGENT-01: classify_invoice tool
- AGENT-02: draft_email tool (Gemini)
- AGENT-03: send_email + write_audit_log tools
- AGENT-04: Assemble ChazerCollectionAgent + sweep loop

**Day 2 (Backend):**
- BACK-03: api-router Edge Function
- BACK-04: decisions-approve + decisions-reject
- BACK-05: pg_cron schedule
- AGENT-05: agent-sweep Edge Function (TypeScript)

**Day 3 AM (Frontend):**
- FRONT-01: AppShell + Sidebar + TopBar
- FRONT-02: Dashboard page
- FRONT-03: Decision Queue page
- FRONT-04: Audit Log page
- FRONT-05: Zustand store

**Day 3 PM (Deploy & Ship):**
- DEVOPS-02: GitHub Actions CI/CD
- DEVOPS-03: README.md
- DEVOPS-04: Production smoke tests
- DEVOPS-05: Demo reset procedure

### Known Issues
- No known blockers. The Python-in-Deno subprocess issue is already mitigated in the plan (TypeScript sweep as production runtime).
- Resend domain verification (`chazer.dev`) takes 24-48 hours. Start this on Day 1 even if using sandbox mode for demo.
- pg_cron requires the `pg_net` extension to be enabled in Supabase. Verify this is available on the free tier before writing the migration.

### Next Agent Instructions

**Read first:**
1. `context.md` — understand the free-tier stack and why each choice was made
2. `docs/10-development-roadmap.md` — your day-by-day milestone checklist
3. `docs/22-actionable-issues-backlog.md` — pick the ticket to work on

**Start with:**
1. Create Supabase project at supabase.com
2. Note the project URL and service role key
3. Write `supabase/migrations/001_initial_schema.sql` (spec in `docs/06-api-and-state-design.md`)
4. Run `supabase db push`
5. Create `data/invoices_seed.csv` using the example rows in `docs/05-data-ingestion-and-processing-engine.md`

**Key file to reference when building each component:**
- DB schema: `docs/06-api-and-state-design.md`
- Agent tools: `docs/03-agent-specification.md`
- API endpoints: `docs/06-api-and-state-design.md`
- React components: `docs/07-components.md`
- Design tokens: `docs/09-design-systems.md`
- Domain rules: `docs/04-rules.md`
- Test examples: `docs/20-testing-strategy.md`

**Do not:**
- Rebuild or question the stack choices — they are finalized in context.md + ADR-001
- Use DynamoDB, AWS Lambda, or any AWS services (no credits)
- Add authentication — demo_owner is hardcoded
- Change the domain vocabulary — see `docs/18-ubiquitous-language-glossary.md`

---

## 2026-09-12 — Research: Parallel Execution & Ticket Concurrency Analysis

### Objective
Analyze all 20 actionable backlog tickets to determine which workstreams can be executed in parallel and construct a dependency graph for multi-agent / multi-developer concurrency.

### Changes Made
- Created and updated `docs/23-parallel-execution-plan.md` containing full dependency matrix, wave-based schedule, workstream breakdown, collision-free file maps, and explicit ticket status tracking (`Completed` / `Implementing` / `Not Implemented`).

### Files Changed
- `docs/23-parallel-execution-plan.md` — NEW

### Implementation Details
- Classified backlog into 4 distinct execution waves and 4 decoupled workstreams (Agent, Backend, Frontend, DevOps).
- Up to 9-11 tickets can be executed in parallel during Wave 1 because schemas and API contracts are strictly specified in `docs/03` and `docs/06`.
- Documented clear integration convergence points for Wave 2 and Wave 3.

### Verification
- Cross-referenced all ticket acceptance criteria, input/output contracts, and file targets against `docs/03-agent-specification.md`, `docs/06-api-and-state-design.md`, `docs/07-components.md`, `docs/08-pages.md`, and `docs/22-actionable-issues-backlog.md`.

### Current State
Research complete. Backlog tickets are mapped into parallel execution waves ready for implementation.

### Next Agent Instructions
1. Review `docs/23-parallel-execution-plan.md` to pick tickets for parallel execution.
2. Start with Wave 0 bootstrapping (`DEVOPS-01`, `BACK-01`, and `FRONT-05` types), then launch Wave 1 parallel streams.

