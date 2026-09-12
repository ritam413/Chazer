# 23 — Parallel Ticket Execution & Dependency Graph

> **Chazer** · Research Findings: Parallelizable Tracks, Workstreams, and Wave-Based Execution Plan

---

## 1. Executive Summary & Research Methodology

Based on an exhaustive dependency and interface analysis across the Chazer documentation suite—primarily [22-actionable-issues-backlog.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/22-actionable-issues-backlog.md), [06-api-and-state-design.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/06-api-and-state-design.md), [03-agent-specification.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/03-agent-specification.md), [07-components.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/07-components.md), [08-pages.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/08-pages.md), and [10-development-roadmap.md](file:///c:/CCodes_WebDevelopment/hckthon/Chazer/docs/10-development-roadmap.md)—the 20 backlog tickets can be decoupled into **4 autonomous parallel workstreams** across **4 execution waves**.

Because all API contracts, data schemas, and tool signatures are strictly specified upfront in `06-api-and-state-design.md` and `03-agent-specification.md`, **teams or concurrent AI subagents can execute up to 8–10 tickets simultaneously** without blocking or file collisions.

---

## 2. Dependency Matrix & Parallel Execution Waves

```mermaid
flowchart TD
    subgraph Wave 0 [Wave 0: Scaffolding & Foundational Contracts]
        DEVOPS01["DEVOPS-01: Repo Scaffold & Config"]
        BACK01["BACK-01: Supabase DB Schema & Views"]
        FRONT05_types["FRONT-05 (Types & Contracts)"]
    end

    subgraph Wave 1 [Wave 1: Parallel Core Construction (Max Parallelism: 9 Tasks)]
        direction TB
        subgraph Stream_Agent [Agent Workstream]
            AGENT01["AGENT-01: classify_invoice Tool"]
            AGENT02["AGENT-02: draft_email Tool (Gemini/Grok)"]
            AGENT03["AGENT-03: send_email & write_audit_log Tools"]
        end
        subgraph Stream_Backend [Backend Workstream]
            BACK02["BACK-02: seed-data Edge Function"]
            BACK03["BACK-03: api-router Edge Function"]
            BACK04["BACK-04: decisions-approve / reject"]
        end
        subgraph Stream_Frontend [Frontend Workstream]
            FRONT01["FRONT-01: AppShell, Sidebar, TopBar"]
            FRONT02["FRONT-02: Dashboard Page & Table"]
            FRONT03["FRONT-03: Decision Queue Page & Modals"]
            FRONT04["FRONT-04: Audit Log Page & Timeline"]
        end
        subgraph Stream_DevOps [DevOps Workstream]
            DEVOPS02["DEVOPS-02: GitHub Actions CI/CD"]
            DEVOPS05["DEVOPS-05: Demo Reset SQL Proc"]
        end
    end

    subgraph Wave 2 [Wave 2: Integration & Orchestration]
        AGENT04["AGENT-04: Python Strands Agent Sweep Loop"]
        AGENT05["AGENT-05: TypeScript Edge Function Sweep"]
        BACK05["BACK-05: pg_cron Sweep Schedule"]
        FRONT05_store["FRONT-05: Zustand Store & API Wireup"]
    end

    subgraph Wave 3 [Wave 3: End-to-End Verification & Documentation]
        DEVOPS03["DEVOPS-03: Public README & Architecture Docs"]
        DEVOPS04["DEVOPS-04: Production Deployment & Smoke Tests"]
    end

    DEVOPS01 --> Wave 1
    BACK01 --> Wave 1
    FRONT05_types --> Stream_Frontend

    Stream_Agent --> AGENT04
    Stream_Agent --> AGENT05
    Stream_Backend --> AGENT05
    BACK01 --> BACK05
    Stream_Frontend --> FRONT05_store
    BACK03 --> FRONT05_store
    BACK04 --> FRONT05_store

    Wave 2 --> Wave 3
```

---

## 3. Global Ticket Status Overview

| Status Category | Count | Status Badge | Description |
|---|:---:|:---:|---|
| **Completed** | 8 / 20 | `🟢 Completed` | Fully implemented, verified via `/tdd` Red-Green suite (Vitest / Pytest + Pydantic), and passing all tests |
| **Implementing** | 0 / 20 | `🟡 Implementing` | Currently actively being developed under `/tdd` red/green loop |
| **Not Implemented** | 12 / 20 | `🔴 Not Implemented` | Specified with full acceptance criteria, queued for TDD build |

> [!IMPORTANT]
> **Mandatory TDD Completion Policy**: Tickets can ONLY transition to `🟢 Completed` after their dedicated test suite (Vitest for TS/Frontend, Pytest + Pydantic for Python Agent) has been executed, red-to-green verified, and passed.

---

## 4. Detailed Workstream Breakdown & Concurrency Analysis

### Workstream A: AI / Agent Engine (Python & TypeScript)
*Primary Specs:* `docs/03-agent-specification.md`, `docs/14-core-algorithms-and-theory.md`

| Ticket | Status | Can Run In Parallel With | Prerequisite | Files Touched (Zero Collision) |
|---|:---:|---|---|---|
| **AGENT-01** (classify tool) | 🟢 Completed | AGENT-02, AGENT-03, BACK-02, BACK-03, BACK-04, FRONT-01..04, DEVOPS-02 | DEVOPS-01 | `agent/tools/classify.py`<br>`agent/tests/test_classify.py` |
| **AGENT-02** (draft_email tool) | 🟢 Completed | AGENT-01, AGENT-03, BACK-02, BACK-03, BACK-04, FRONT-01..04, DEVOPS-02 | DEVOPS-01 | `agent/tools/draft_email.py`<br>`agent/tests/test_draft_email.py` |
| **AGENT-03** (send_email & audit tool) | 🟢 Completed | AGENT-01, AGENT-02, BACK-02, BACK-03, BACK-04, FRONT-01..04, DEVOPS-02 | DEVOPS-01 | `agent/tools/send_email.py`<br>`agent/tools/write_audit_log.py` |
| **AGENT-04** (ChazerCollectionAgent loop) | 🔴 Not Implemented | AGENT-05, BACK-03, BACK-04, FRONT-01..04 | AGENT-01, 02, 03, BACK-01 | `agent/chazer_agent.py`<br>`agent/main.py` |
| **AGENT-05** (TypeScript Edge sweep) | 🔴 Not Implemented | AGENT-04, BACK-05, FRONT-01..05 | AGENT-01, 02, 03 logic specs, BACK-01 | `supabase/functions/agent-sweep/index.ts` |

**Parallelism Note:**
- `AGENT-01`, `AGENT-02`, and `AGENT-03` are 100% decoupled unit modules. They can be created and unit-tested in parallel via mocked inputs before `AGENT-04` integrates them.

---

### Workstream B: Supabase Database & Edge Functions (Backend)
*Primary Specs:* `docs/06-api-and-state-design.md`, `docs/05-data-ingestion-and-processing-engine.md`

| Ticket | Status | Can Run In Parallel With | Prerequisite | Files Touched (Zero Collision) |
|---|:---:|---|---|---|
| **BACK-01** (Database Schema & Views) | 🔴 Not Implemented | DEVOPS-01, FRONT-01, FRONT-05 (types) | None | `supabase/migrations/001_initial_schema.sql` |
| **BACK-02** (seed-data Function) | 🟢 Completed | BACK-03, BACK-04, AGENT-01..03, FRONT-01..04 | BACK-01 | `supabase/functions/seed-data/index.ts`<br>`data/invoices_seed.csv` |
| **BACK-03** (api-router Function) | 🟢 Completed | BACK-02, BACK-04, AGENT-01..03, FRONT-01..04 | BACK-01 | `supabase/functions/api-router/index.ts` |
| **BACK-04** (decisions approve/reject) | 🟢 Completed | BACK-02, BACK-03, AGENT-01..03, FRONT-01..04 | BACK-01 | `supabase/functions/decisions-approve/index.ts`<br>`supabase/functions/decisions-reject/index.ts` |
| **BACK-05** (pg_cron sweep schedule) | 🔴 Not Implemented | AGENT-04, AGENT-05, FRONT-01..05 | BACK-01, AGENT-05 URL | `supabase/migrations/001_initial_schema.sql` |

**Parallelism Note:**
- Once `BACK-01` establishes the database schema, all three Edge Function endpoints (`BACK-02`, `BACK-03`, `BACK-04`) reside in isolated directories under `supabase/functions/` and can be implemented in parallel.

---

### Workstream C: Next.js Frontend UI & State
*Primary Specs:* `docs/07-components.md`, `docs/08-pages.md`, `docs/09-design-systems.md`

| Ticket | Status | Can Run In Parallel With | Prerequisite | Files Touched (Zero Collision) |
|---|:---:|---|---|---|
| **FRONT-01** (AppShell, Sidebar, TopBar) | 🟢 Completed | FRONT-02, FRONT-03, FRONT-04, BACK-01..04, AGENT-01..03 | DEVOPS-01 | `dashboard/components/AppShell.tsx`<br>`dashboard/components/Sidebar.tsx`<br>`dashboard/components/TopBar.tsx` |
| **FRONT-02** (Dashboard page & table) | 🔴 Not Implemented | FRONT-01, FRONT-03, FRONT-04, BACK-01..04, AGENT-01..03 | FRONT-05 types | `dashboard/app/dashboard/page.tsx`<br>`dashboard/components/InvoiceTable.tsx`<br>`dashboard/components/StatsBar.tsx`<br>`dashboard/components/TierBadge.tsx`<br>`dashboard/components/AgingBar.tsx` |
| **FRONT-03** (Decision Queue & modals) | 🔴 Not Implemented | FRONT-01, FRONT-02, FRONT-04, BACK-01..04, AGENT-01..03 | FRONT-05 types | `dashboard/app/decisions/page.tsx`<br>`dashboard/components/DecisionCard.tsx`<br>`dashboard/components/EmailDraftPreview.tsx`<br>`dashboard/components/EditDraftModal.tsx` |
| **FRONT-04** (Audit Log page & timeline) | 🔴 Not Implemented | FRONT-01, FRONT-02, FRONT-03, BACK-01..04, AGENT-01..03 | FRONT-05 types | `dashboard/app/audit/page.tsx`<br>`dashboard/components/AuditTimeline.tsx`<br>`dashboard/components/AuditEntry.tsx` |
| **FRONT-05** (Zustand store & API hooks) | 🔴 Not Implemented | Phase A (types): Wave 0<br>Phase B (live API): Wave 2 | BACK-03, BACK-04 for live testing | `dashboard/lib/types.ts`<br>`dashboard/lib/store.ts`<br>`dashboard/lib/api.ts` |

**Parallelism Note:**
- The frontend pages (`FRONT-02`, `FRONT-03`, `FRONT-04`) and AppShell (`FRONT-01`) touch completely separate page files and component files. Because all TypeScript interfaces and JSON response mock structures are predefined in `docs/06-api-and-state-design.md`, frontend UI components can be developed in parallel using mock data before live API wiring.

---

### Workstream D: DevOps, Database Utilities & Documentation
*Primary Specs:* `docs/11-deployment-cloud-guide.md`, `docs/17-submission-qa-checklist.md`

| Ticket | Status | Can Run In Parallel With | Prerequisite | Files Touched (Zero Collision) |
|---|:---:|---|---|---|
| **DEVOPS-01** (Repo scaffolding) | 🟢 Completed | BACK-01 | None | `.gitignore`, `package.json`, `requirements.txt` |
| **DEVOPS-02** (GitHub Actions CI/CD) | 🔴 Not Implemented | Any Wave 1 ticket | DEVOPS-01 | `.github/workflows/deploy.yml` |
| **DEVOPS-05** (Demo reset stored proc) | 🔴 Not Implemented | Any Wave 1 ticket | BACK-01 | `supabase/migrations/002_demo_utilities.sql` |
| **DEVOPS-03** (README & Pitch material) | 🔴 Not Implemented | Any Wave 2 ticket | DEVOPS-01 | `README.md` |
| **DEVOPS-04** (Production smoke test) | 🔴 Not Implemented | None (Final step) | All previous tickets | Live endpoints |

---

## 5. Optimal Multi-Agent / Multi-Developer Execution Strategy

If executing with **concurrent AI subagents** or **multiple developers**, the ideal progression is:

### Phase 1: Bootstrapping (Wave 0)
- **Agent A**: Execute `DEVOPS-01` (scaffold repo, dependencies, directory tree)
- **Agent B**: Execute `BACK-01` (create SQL migration `001_initial_schema.sql` with tables and views)
- **Agent C**: Create `dashboard/lib/types.ts` from `docs/06-api-and-state-design.md`

### Phase 2: Maximum Parallelism (Wave 1 — 9 Concurrent Streams)
Once Wave 0 completes, launch 9 tasks simultaneously:
1. **Agent 1**: `AGENT-01` (`agent/tools/classify.py` + tests)
2. **Agent 2**: `AGENT-02` (`agent/tools/draft_email.py` + tests)
3. **Agent 3**: `AGENT-03` (`agent/tools/send_email.py` + `agent/tools/write_audit_log.py`)
4. **Agent 4**: `BACK-02` (`supabase/functions/seed-data/index.ts` + `data/invoices_seed.csv`)
5. **Agent 5**: `BACK-03` (`supabase/functions/api-router/index.ts`)
6. **Agent 6**: `BACK-04` (`supabase/functions/decisions-approve` & `decisions-reject`)
7. **Agent 7**: `FRONT-01` (`AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`)
8. **Agent 8**: `FRONT-02` (`dashboard/page.tsx` + `InvoiceTable.tsx` + `StatsBar.tsx`)
9. **Agent 9**: `FRONT-03` (`decisions/page.tsx` + `DecisionCard.tsx` + `EditDraftModal.tsx`)
10. **Agent 10**: `FRONT-04` (`audit/page.tsx` + `AuditTimeline.tsx`)
11. **Agent 11**: `DEVOPS-02` & `DEVOPS-05` (`deploy.yml` + `002_demo_utilities.sql`)

### Phase 3: Integration (Wave 2)
- **Agent 1**: `AGENT-04` (Assemble Python Strands agent `main.py` + run local CLI sweep against seeded DB)
- **Agent 2**: `AGENT-05` (Implement native TypeScript `agent-sweep` Edge Function)
- **Agent 3**: `FRONT-05` (Wire Zustand store to real Supabase Edge Function API endpoints)
- **Agent 4**: `BACK-05` (Configure `pg_cron` daily sweep schedule)

### Phase 4: Verification & Release (Wave 3)
- `DEVOPS-03` (Write `README.md` with architecture diagrams and demo links)
- `DEVOPS-04` (Run QA checklist from `docs/17-submission-qa-checklist.md` on production Vercel + Supabase deployment)
