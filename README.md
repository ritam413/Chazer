# Chazer — Autonomous Accounts Receivable Agent

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Next.js: 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS: 3.4](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Built with Strands SDK](https://img.shields.io/badge/Agent_Runtime-Strands_SDK-purple.svg)](https://github.com/aws/strands)

> **Autonomous multi-tier invoice escalation and collection agent for freelancers, contractors, and agencies.**  
> Chazer handles uncomfortable payment follow-ups with calm authority, graduated tone escalation, and human-in-the-loop safeguards for high-value accounts.

---

## ⚡ Core Value Proposition

- **Autonomous Escalation Ladder**:
  - **Tier 1 (1–7 days overdue)**: Friendly nudge email automatically drafted and dispatched.
  - **Tier 2 (8–21 days overdue)**: Firmer reminder referencing prior outreach automatically dispatched.
  - **Tier 3 (22+ days overdue / Dispute)**: High-urgency final notice drafted by AI and held in the **Decision Queue** for owner approval.
- **Human-in-the-Loop Safeguards**: Invoices over configurable threshold (e.g. $10,000) or flagged with client pushback are never auto-sent without explicit owner review.
- **Complete Audit Trail**: Every background decision, classification, draft, and dispatch is immutably logged.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CHAZER ARCHITECTURE                           │
└────────────────────────────────────────────────────────────────────────┘

    [ pg_cron Scheduler ]
             │ (Daily Sweep Trigger)
             ▼
    [ Supabase Edge Functions ] ◄──────────────► [ Supabase Postgres ]
             │                                   • invoices & clients
             │ (HTTP / Subprocess)               • contact_history
             ▼                                   • audit_log
    [ Strands Python Agent ]                     • decision_queue
             │
             ├──► [ LLM: Grok / Gemini 1.5 ] (via LiteLLM provider)
             │      • Classify invoice tier
             │      • Draft tone-escalated email
             │
             └──► [ Resend API ] ──► Client Email (Tier 1 & 2)
                    │
                    └─ (Tier 3 Held) ─► [ Decision Queue ]
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
├── .gitignore                          # Git ignore rules
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
│   └── tests/                          # Agent test suite
│
├── supabase/                           # Backend database & edge compute
│   ├── config.toml                     # Supabase CLI config
│   ├── .env.example                    # Environment template
│   ├── migrations/                     # SQL DDL migrations
│   └── functions/                      # Deno Edge Functions
│
├── dashboard/                          # Next.js 14 frontend dashboard
│   ├── package.json                    # Node dependencies
│   ├── tailwind.config.js              # Theme & design tokens
│   ├── app/                            # App router pages
│   ├── components/                     # React UI components
│   └── lib/                            # API client & Zustand stores
│
├── data/                               # Seed & demo datasets
│   └── invoices_seed.csv               # Standard demo seed data
│
└── docs/                               # Complete 23-document technical specification suite
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: 3.11+
- **Supabase CLI** (optional for local DB) or a free [Supabase](https://supabase.com) project
- API keys for **Grok (xAI)** or **Google Gemini**, and **Resend**

### 2. Frontend Dashboard Setup
```bash
cd dashboard
npm install
cp .env.example .env.local
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Agent Setup (Python)
```bash
cd agent
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
pytest tests/
```

### 4. Supabase Setup
```bash
# Using Supabase CLI:
supabase start
supabase db push
```

### 5. Resetting the Demo Environment
To reset all collections state (clearing contact history, decision queue, sweep runs, and resetting overdue flags) to initial pristine state:
```sql
-- In Supabase SQL Editor:
SELECT reset_demo();
```
Or via HTTP / PostgREST RPC:
```bash
curl -X POST "https://<project-ref>.supabase.co/rest/v1/rpc/reset_demo" \
  -H "apikey: <service-role-key>" \
  -H "Authorization: Bearer <service-role-key>"
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

### Required GitHub Secrets

| Secret Name | Description | Source |
|---|---|---|
| `VERCEL_TOKEN` | Vercel personal access token | [Vercel Account Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel Organization ID | `dashboard/.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel Project ID | `dashboard/.vercel/project.json` |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI management access token | [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | Supabase project reference ID | Supabase Project Settings |

---

## 📜 Documentation

Complete technical specifications are available in the [`docs/`](./docs) directory:
- [01 - Product Requirements Document](./docs/01-prd.md)
- [02 - System Architecture](./docs/02-architecture.md)
- [03 - AI & Autonomous Agent Specification](./docs/03-agent-specification.md)
- [06 - API & State Design](./docs/06-api-and-state-design.md)
- [09 - Design System & UI/UX Tokens](./docs/09-design-systems.md)
- [11 - Deployment & Cloud Guide](./docs/11-deployment-cloud-guide.md)
- [19 - Troubleshooting Playbook](./docs/19-troubleshooting-playbook.md)
- [23 - Parallel Execution Plan](./docs/23-parallel-execution-plan.md)

---

## ⚖ License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
