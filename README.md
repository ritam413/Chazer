# Chazer — Autonomous Accounts Receivable Agent

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Next.js: 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS: 3.4](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Built with Strands SDK](https://img.shields.io/badge/Agent_Runtime-Strands_SDK-purple.svg)](https://github.com/aws/strands)
[![Track: Professional Agents](https://img.shields.io/badge/AWS_Hackathon-Agents_for_Humans-orange.svg)](https://devpost.com)

> **Autonomous multi-tier invoice escalation and collection agent for freelancers, contractors, and agencies.**  
> Chazer eliminates the social discomfort and inconsistency of following up on overdue invoices with calm authority, calibrated tone progression, and unbreakable human-in-the-loop safeguards for high-value receivables.

---

## ⚡ Core Value Proposition

- **Autonomous Escalation Ladder**:
  - **Tier 1 (1–7 days overdue)**: Friendly nudge email automatically drafted via LiteLLM and dispatched via Resend.
  - **Tier 2 (8–21 days overdue)**: Firmer reminder referencing prior outreach dates automatically dispatched.
  - **Tier 3 (22+ days overdue / Disputed)**: High-urgency formal notice drafted and held in the **Decision Queue** for owner sign-off.
- **Human-in-the-Loop Safeguards**: Invoices over a configurable threshold (e.g. $10,000+) or flagged with client disputes are never auto-sent without explicit owner review.
- **72-Hour Contact Window Guard**: Prevents spamming clients within 72 hours of previous correspondence.
- **Dual-Runtime Polyglot Engine**: AWS Strands Python agent for CLI & batch execution; native TypeScript Supabase Edge Function for serverless cloud scheduling.
- **Complete Immutable Audit Trail**: Every background decision, classification, draft, and dispatch is synchronously logged.

---

## 🔄 4-Stage Autonomous Pipeline Architecture

Chazer executes an autonomous 4-stage collection sweep cycle:

```
┌───────────────────────────┐      ┌───────────────────────────┐
│ 1. Receivables Ingested   │ ───► │ 2. Tone & Risk Matrix     │
│ • Supabase Postgres Seed  │      │ • Rule + LiteLLM Classify │
│ • 8 Monitored Invoices    │      │ • 72h Guard & $10k+ Check │
└───────────────────────────┘      └───────────────────────────┘
              │                                  │
              ▼                                  ▼
┌───────────────────────────┐      ┌───────────────────────────┐
│ 4. Ledger & Audit Trail   │ ◄─── │ 3. Dual-Lane Dispatch     │
│ • Immutable Telemetry Log │      │ • Resend Auto-Send (T1/T2)│
│ • Instant Sync to UI      │      │ • Decision Queue (T3/High)│
└───────────────────────────┘      └───────────────────────────┘
```

### Stage Breakdown

1. **Stage 1: Receivables Ingested**
   - Ingests active invoices and client records from Supabase Postgres.
   - Calculates dynamic `days_overdue` and overdue balances ($96,990 across 8 demo invoices).
2. **Stage 2: Tone & Risk Matrix**
   - Classifies invoices into Tier 1 (Friendly), Tier 2 (Firm), or Tier 3 (Final Notice / Dispute).
   - Enforces 72-hour contact frequency window and flags high-value balances ($\ge \$10,000$).
3. **Stage 3: Dual-Lane Dispatch**
   - **Lane A (Auto-Send)**: Dispatches Tier 1 & Tier 2 reminders directly via Resend API with `Idempotency-Key` headers.
   - **Lane B (Human Review)**: Routes Tier 3, disputed, and high-value invoices to the owner Decision Queue for review/edit/approval.
4. **Stage 4: Ledger & Audit Trail**
   - Synchronously writes immutable audit log events (`SWEEP_STARTED`, `TIER1_EMAIL_SENT`, `HIGH_VALUE_ESCALATED`, `SWEEP_COMPLETED`).
   - Telemetry streams instantly to the Next.js Monad Editorial dashboard.

---

## 🏗 System Architecture & Polyglot Runtime Parity

Chazer implements a **Polyglot Architecture** providing 100% logic and invariant parity across two environments:

| Dimension | Python Strands Agent (`agent/`) | TypeScript Edge Function (`supabase/functions/`) |
| :--- | :--- | :--- |
| **Runtime Target** | Python 3.11+ / CLI / Local / Batch | Deno 1.x / Supabase Edge Functions |
| **Agent Framework** | AWS Strands Agents SDK (`@tool`) | Serverless Event Handler |
| **LLM Provider** | LiteLLM (`xai/grok-beta`, `gemini/gemini-1.5-flash`, `gpt-4o-mini`) | Direct HTTP REST (`Google Gemini` / `Grok` REST API) |
| **Email Gateway** | Resend API / Sandbox Mode (`Idempotency-Key`) | Resend API / Sandbox Mode (`Idempotency-Key`) |
| **Database Sync** | `supabase-py` Client / Direct SQL | Supabase JS Client (`@supabase/supabase-js`) |
| **Invocation** | CLI (`python -m agent.main`), Subprocess, Cron | `pg_cron` (`0 9 * * *`), HTTP POST (`/agent-sweep`) |

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CHAZER ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────────┘

    [ pg_cron Scheduler ] (Daily at 09:00 UTC)
             │
             ▼
    [ Supabase Edge Functions ] ◄──────────────► [ Supabase Postgres ]
      • agent-sweep                              • invoices & clients
      • api-router                               • contact_history
      • decisions-approve / reject               • audit_log & decision_queue
      • seed-data                                • sweep_runs
             │
             ├──► [ Multi-Model LLM: Grok / Gemini / OpenAI ] (via LiteLLM provider)
             │      • Invariant-validated drafting (≤200 words, invoice ID required)
             │
             └──► [ Resend API ] ──► Client Email (Tier 1 & 2)
                    │
                    └─ (Tier 3 / High Value Held) ─► [ Decision Queue ]
                                                            │
                                                            ▼
                                               [ Next.js Owner Dashboard ]
                                               (Approve / Edit / Reject)
```

---

## 📁 Repository Structure

```
Chazer/
├── README.md                           # Project overview and quickstart
├── LICENSE                             # Apache-2.0 open source license
├── context.md                          # Persistent project context & architecture
├── features_implemented.md             # Functional implementation tracking
├── tracker.md                          # Agent handoff log
│
├── agent/                              # Strands Python agent runtime
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # Environment template
│   ├── chazer_agent.py                 # Core agent state machine
│   ├── main.py                         # CLI entry point
│   ├── tools/                          # Agent tool implementations
│   │   ├── classify.py                 # Tier classification & escalation logic
│   │   ├── draft_email.py              # LiteLLM email synthesis with safety guards
│   │   ├── send_email.py               # Resend API dispatch with idempotency
│   │   └── write_audit_log.py          # Synchronous Supabase audit logging
│   └── tests/                          # 42 unit & Pydantic contract tests
│
├── supabase/                           # Backend database & edge compute
│   ├── config.toml                     # Supabase CLI config
│   ├── .env.example                    # Environment template
│   ├── migrations/                     # SQL DDL & demo reset stored procedures
│   └── functions/                      # Deno Edge Functions
│       ├── _shared/types.ts            # Unified single source-of-truth types
│       ├── agent-sweep/                # Serverless autonomous sweep engine
│       ├── api-router/                 # REST API (/invoices, /decisions, /audit-log)
│       ├── decisions-approve/          # Owner approval & Resend dispatch endpoint
│       ├── decisions-reject/           # Owner rejection endpoint
│       └── seed-data/                  # CSV dataset ingestion endpoint
│
├── dashboard/                          # Next.js 14 frontend dashboard
│   ├── package.json                    # Node dependencies
│   ├── tailwind.config.js              # Theme & Monad Editorial design tokens
│   ├── app/                            # App router pages (/, /dashboard, /decisions, /audit)
│   ├── components/                     # React UI components
│   │   ├── PipelineVisualizer.tsx      # 4-Stage interactive pipeline visualizer
│   │   ├── StatsBar.tsx                # Overdue metrics & KPI trend cards
│   │   ├── InvoiceTable.tsx            # Receivables ledger with sorting & filtering
│   │   ├── DecisionCard.tsx            # Human review card with approval workflow
│   │   ├── EditDraftModal.tsx          # Safety-validated draft editor
│   │   └── AuditTimeline.tsx           # Immutable execution journal
│   └── lib/                            # API client & Zustand store
│
├── data/                               # Seed & demo datasets
│   └── invoices_seed.csv               # 8 canonical invoices with edge cases
│
└── docs/                               # 23-document technical specification suite
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.11+
- **Supabase CLI** or free [Supabase](https://supabase.com) project
- API keys for **Grok (xAI)** or **Google Gemini**, and **Resend** (all have generous free tiers)

### 2. Frontend Dashboard Setup
```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Agent CLI Execution (Python)
```bash
# Set up virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r agent/requirements.txt
cp agent/.env.example agent/.env

# Run full test suite
pytest agent/tests/ -v

# Run autonomous sweep in sandbox mode
python -m agent.main --sandbox
```

### 4. Running the Complete Verification Test Suite
```bash
# Frontend & Edge Function Vitest Suites (123+ tests):
cd dashboard && npm test

# TypeScript typecheck:
npx tsc --noEmit

# Python Agent Pytest Suite (42 tests):
pytest agent/tests/ -v
```

### 5. Resetting the Demo Environment
To reset all collections state (clearing contact history, decision queue, sweep runs, and resetting overdue flags) to initial pristine state:
```sql
-- In Supabase SQL Editor:
SELECT reset_demo();
```

---

## ⚙ Continuous Integration & Deployment (CI/CD)

Automated through GitHub Actions (`.github/workflows/deploy.yml`):
- **Continuous Integration**: Runs on all pushes and PRs to `main`:
  - Next.js linting, TypeScript compiler check (`tsc --noEmit`), and Vitest component suite.
  - Python agent tests (`pytest agent/tests/`) with Pydantic payload verification.
- **Continuous Deployment**: Triggers automatically on push to `main` upon passing tests:
  - Deploys Next.js dashboard to **Vercel**.
  - Deploys serverless backend functions to **Supabase**.

---

## 📜 Documentation Suite

- [01 - Product Requirements Document](./docs/01-prd.md)
- [02 - System Architecture](./docs/02-architecture.md)
- [03 - AI & Autonomous Agent Specification](./docs/03-agent-specification.md)
- [06 - API & State Design](./docs/06-api-and-state-design.md)
- [09 - Design System & UI/UX Tokens](./docs/09-design-systems.md)
- [11 - Deployment & Cloud Guide](./docs/11-deployment-cloud-guide.md)
- [12 - 3-Minute Demo Video Script](./docs/12-demo-script.md)
- [17 - Submission QA Checklist](./docs/17-submission-qa-checklist.md)
- [19 - Troubleshooting Playbook](./docs/19-troubleshooting-playbook.md)
- [23 - Parallel Execution Plan](./docs/23-parallel-execution-plan.md)

---

## ⚖ License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

