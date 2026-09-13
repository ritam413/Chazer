PROJECT CONTEXT INPUTS

Project Name: Chazer

Domain & Core Problem:
Freelancers, small agencies, and independent B2B service providers (consultants, contractors, small studios) lose real cash flow and hours every month chasing clients for overdue invoices. The core friction isn't tracking — most already know who owes them money — it's the social discomfort and inconsistency of following up: reminders get sent late, tone escalation is ad hoc (too soft too long, or too aggressive too soon), and genuinely disputed or high-value invoices get the same generic nudge as a client who simply forgot. Existing tools (QuickBooks, FreshBooks, Bonsai) send templated reminders on a fixed schedule but don't reason about context, don't escalate tone deliberately, and don't distinguish "needs a human decision" from "handle it automatically."

Target Audience / Personas:

Solo freelancer (designer/dev/consultant) — invoices 3-8 clients/month, no bookkeeper, avoids confrontation, currently either forgets to follow up or sends one awkward manual email weeks late.
Small agency owner (2-15 people) — invoices 10-40 clients/month across the team, delegates nothing around collections because it feels sensitive, wants visibility without doing the chasing personally.
Independent contractor/trades (already has recurring B2B clients) — fewer invoices but higher dollar amounts per invoice, more sensitive to getting the tone wrong with a long-term client relationship.

Key Features & Innovation:

Background agent ingests invoice data (mocked CSV seed via Supabase Storage for demo; real integration point would be QuickBooks/Stripe webhook) and classifies each invoice by days-overdue and prior contact count.
Autonomous escalation ladder: Tier 1 (1-7 days overdue) → friendly nudge, auto-sent. Tier 2 (8-21 days) → firmer reminder referencing prior email, auto-sent. Tier 3 (22+ days or client replied with a dispute/pushback) → final notice drafted but held for owner approval, not auto-sent.
Escalation triggers a human surface event on: (a) client disputes the invoice, (b) client goes silent through all 3 automated tiers, (c) invoice amount exceeds a configurable $ threshold, (d) sentiment/content of a client reply looks like a negotiation ask ("can we get a discount / extension").
Owner dashboard: aging receivables view, a running log of every autonomous action the agent took (for trust/audit), and a "needs your decision" queue — this is the single screen that has to nail the demo.
Deliberately not built: payment processing, multi-currency, real OAuth into accounting tools — mocked to keep scope inside 3 days.

Target Tech Stack (Updated for Zero-Credit Deployment):

Agent runtime: Strands Agents SDK (Python) — runs as a callable Python script/service. During demo, triggered by Supabase Edge Function via HTTP or run locally against live DB. Strands uses LiteLLM provider to call Gemini.
LLM: Grok (xAI API) — preferred option due to very generous free-tier limits (grok-beta / grok-2 models); no credit card required. Alternatively Google Gemini 1.5 Flash (free tier: 60 req/min). Both accessed via Strands SDK's LiteLLM provider — switching between them is a single env var change (`GROK_API_KEY` vs `GEMINI_API_KEY` and `model_id`).
Scheduling / Compute: Supabase Edge Functions (Deno/TypeScript) scheduled via pg_cron — replaces Lambda + EventBridge. The Edge Function HTTP-invokes the Strands agent script (or directly calls Gemini) for the daily sweep.
Deployment: Vercel free tier (Next.js dashboard), Supabase free tier (DB + Edge Functions). No AWS credits required.
Data: Supabase Postgres — invoices, contact_history, audit_log tables. Seed via CSV upload to Supabase Storage + a seed Edge Function.
Email: Resend (free tier: 100 emails/day, no credit card) — replaces Amazon SES.
API: Supabase Edge Functions act as REST endpoints for the dashboard. Supabase auto-generates PostgREST API on top of Postgres as well.
Frontend: Next.js + Tailwind, single dashboard app, no auth system needed for the demo (hardcode one demo "owner" account).
Testing & Verification: Strict TDD (`/tdd`) protocol — Vitest + React Testing Library + JSDOM for frontend state and components; Pytest + Pydantic validation schemas for Python agent tools, contracts, and LLM payloads. No feature/ticket is marked complete until its TDD suite passes.
Storage for demo assets: Supabase Storage (free tier: 1 GB).

Deployment / Environment Constraints:

3-day build window, solo/small team, $0 budget — all free tiers.
No real third-party OAuth integrations (QuickBooks/Stripe) — mock all external data with seeded Supabase Postgres records.
Must run as a genuine autonomous background loop, not a chat-triggered request/response. Achieved via pg_cron scheduling a Supabase Edge Function daily. The Edge Function orchestrates the Strands agent call.
Must produce: public repo (MIT or Apache license, visible in About), README, architecture diagram, ≤5-minute demo video; live demo link optional but scores higher.
Hackathon requires AWS Strands SDK usage — Strands Python script is included in repo and called via subprocess or HTTP from the Edge Function. For the demo, it runs live against the Supabase DB using the SUPABASE_URL + SUPABASE_ANON_KEY env vars.

Special Context / Hackathon Track:
AWS "Agents for Humans" Hackathon — Professional Agents track. Judged on: Technological Implementation (genuine Strands usage), Design (coherent product), Potential Impact (credible real-world case), Creativity & Originality, Presentation (demo must show the autonomous loop end-to-end). Deadline: Sep 15, 2026.

Stack Decision Rationale (ADR-001):
- DynamoDB replaced by Supabase Postgres: user has no AWS credits; Supabase free tier (500 MB, unlimited API calls, 2 projects) covers the demo scope entirely. Postgres gives richer querying (JOINs, date arithmetic for aging) than DynamoDB's key-value model.
- Amazon SES replaced by Resend: 100 free emails/day, no credit card, simple HTTP API.
- Lambda + EventBridge replaced by Supabase Edge Functions + pg_cron: same serverless, zero-cost, zero-infrastructure model. pg_cron is built into Supabase's Postgres instance.
- Bedrock Claude replaced by Grok (xAI) as primary LLM: very generous free tier, no credit card. Google Gemini 1.5 Flash (60 req/min free) is the fallback. Both accessed via Strands LiteLLM provider — `model_id="xai/grok-beta"` or `model_id="gemini/gemini-1.5-flash"` — so Strands SDK is still the agent runtime (preserving hackathon judging criterion). Switching LLMs requires only a different API key and model_id env var.
- AgentCore deployment: not feasible without AWS credits; dropped from scope.

Polyglot Autonomous Architecture (ARCH-01):
- Dual-Runtime Implementation:
  1. Python Strands Agent Runtime (`agent/chazer_agent.py`, `agent/main.py`): AWS Strands SDK with LiteLLM provider for local CLI execution, batch processing, and hackathon judging verification.
  2. TypeScript Deno Edge Function Runtime (`supabase/functions/agent-sweep/index.ts`): Serverless cloud scheduler triggered by `pg_cron` daily at 09:00 UTC and manual dashboard triggers.
- Runtime Parity Invariants:
  - Identical tier classification logic (`classify_invoice` in Python == `classifyInvoiceTs` in TypeScript).
  - Identical 72-hour contact frequency window guard preventing duplicate outreach.
  - Identical $10,000+ high-value escalation threshold and dispute freeze safeguards.
  - Identical atomic database updates (`invoices`, `contact_history`, `decision_queue`, `audit_log`, `sweep_runs`).
  - Identical idempotency guarantees with deterministic Resend message keys.

| Dimension | Python Strands Agent (`agent/`) | TypeScript Edge Function (`supabase/functions/`) |
| :--- | :--- | :--- |
| **Runtime Target** | Python 3.11+ / CLI / Local / Batch | Deno 1.x / Supabase Edge Functions |
| **Agent Framework** | AWS Strands Agents SDK (`@tool`) | Serverless Event Handler |
| **LLM Provider** | LiteLLM (`xai/grok-beta`, `gemini/gemini-1.5-flash`, `gpt-4o-mini`) | Direct HTTP REST (`Google Gemini` / `Grok` REST API) |
| **Email Gateway** | Resend API / Sandbox Mode (`Idempotency-Key`) | Resend API / Sandbox Mode (`Idempotency-Key`) |
| **Database Sync** | `supabase-py` Client / Direct SQL | Supabase JS Client (`@supabase/supabase-js`) |
| **Invocation** | CLI (`python -m agent.main`), Subprocess, Cron | `pg_cron` (`0 9 * * *`), HTTP POST (`/agent-sweep`) |

Dispute Reconciliation Domain Invariant:
- Any invoice with `dispute_flag = True` or incoming client dispute feedback immediately halts automated outreach (`auto_send_eligible = False`), escalates to `TIER_3`, creates a `decision_queue` human review item with escalation reason `CLIENT_DISPUTE_RAISED`, and logs an immutable `DISPUTE_ESCALATED` audit event.

ADR-002: Multi-Model LLM Provider Routing:
- Primary Provider: Grok (xAI) via LiteLLM (`xai/grok-beta` / `xai/grok-2`) for natural, nuanced, professional collection tone without aggressive legal jargon.
- Secondary / Free Fallback: Google Gemini 1.5 Flash (`gemini/gemini-1.5-flash`) with 60 req/min free tier.
- Commercial Alternative: OpenAI (`openai/gpt-4o-mini`) supported out of the box via LiteLLM model routing.
- Zero-Cost Offline Fallback: Deterministic invariant-compliant template engine generating validated drafts when running offline or in simulated test suites without network connectivity.