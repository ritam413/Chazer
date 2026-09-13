# 13 — Technology Stack & Justification

> **Chazer** · Full Stack Technology Decisions

---

## 1. Full Stack Matrix

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | Next.js | 14+ (App Router) | Dashboard SPA with SSR |
| **CSS/Styling** | Tailwind CSS | 3.4+ | Utility-first styling; custom design tokens |
| **Client State** | Zustand | 4.x | Lightweight global state + optimistic updates |
| **Agent Runtime** | Strands Agents SDK | 0.1.x (pip) | Python agent with tool-calling loop |
| **LLM** | Grok (xAI) — preferred | grok-beta / grok-2 | Classification + email drafting |
| **LLM Fallback** | Google Gemini 1.5 Flash | API v1 | Alternative if Grok unavailable |
| **LLM Provider Adapter** | LiteLLM (via Strands) | — | Strands-compatible Gemini access |
| **Backend Compute** | Supabase Edge Functions | Deno 1.x | REST API endpoints + sweep orchestration |
| **Scheduler** | Supabase pg_cron | Built-in | Daily agent sweep trigger |
| **Database** | Supabase Postgres | 15 | All persistent data |
| **Email** | Resend | API v1 | Transactional email delivery |
| **Storage** | Supabase Storage | — | Seed CSV file |
| **Frontend Testing** | Vitest + React Testing Library | 1.6+ | Fast unit and state tests via JSDOM |
| **Agent Testing & Validation** | Pytest + Pydantic | 8.x / 2.5+ | Contract testing, schema validation & tool verification |
| **Development Workflow** | Strict TDD (`/tdd`) | — | Red → Green → Refactor before marking tasks complete |
| **Hosting (Frontend)** | Vercel | — | Next.js deployment, global CDN |
| **Language (Agent)** | Python | 3.11+ | Strands SDK is Python-native |
| **Language (Backend)** | TypeScript | 5.x | Edge Functions, dashboard |
| **Package Manager** | npm | — | Frontend |
| **Python Env** | pip + venv | — | Agent |
| **License** | Apache-2.0 | — | Open source for hackathon |

---

## 2. Trade-Off Analysis

### Next.js vs. Vite + React

| Criterion | Next.js | Vite + React |
|-----------|---------|-------------|
| SSR/SSG | ✅ Built-in | ❌ Needs additional setup |
| Deployment to Vercel | ✅ 1-click, zero config | ⚠ Works but more config |
| App Router (file-based) | ✅ Simple 3-page structure | N/A |
| Build time | ✅ Incremental | ✅ Faster cold start |
| **Decision** | ✅ **Next.js** | — |

**Rationale:** Vercel + Next.js is the fastest path from code to live URL. The 3-page structure maps trivially to the App Router. The 3-day deadline makes zero-config deployment more valuable than marginal build speed.

---

### Tailwind CSS vs. CSS Modules / Vanilla CSS

| Criterion | Tailwind | CSS Modules |
|-----------|---------|-------------|
| Development speed | ✅ Fastest (utility classes inline) | ⚠ File-switching overhead |
| Design system tokens | ✅ `tailwind.config.js` central config | ❌ Custom implementation needed |
| Responsive design | ✅ `md:`, `lg:` prefixes | ⚠ Manual media queries |
| Bundle size | ✅ PurgeCSS in production | ✅ Small |
| **Decision** | ✅ **Tailwind** | — |

**Rationale:** For a 3-day build, Tailwind's iteration speed outweighs any maintenance overhead. The design system tokens in `tailwind.config.js` provide the same benefits as CSS custom properties with less boilerplate.

---

### Supabase (Postgres) vs. DynamoDB

| Criterion | Supabase Postgres | DynamoDB |
|-----------|-----------------|---------|
| Free tier | ✅ 500MB, no credit card | ⚠ 25GB free but requires AWS account/credits |
| Query flexibility | ✅ Full SQL, JOINs, views | ❌ Key-value; complex queries awkward |
| Days-overdue computation | ✅ `EXTRACT(DAY FROM NOW() - due_date)` | ❌ Must compute in application layer |
| Tier view | ✅ Single SQL view | ❌ Application-side logic for every read |
| Edge Functions access | ✅ Native Supabase client | ❌ AWS SDK (heavy, Deno incompatible) |
| pg_cron | ✅ Built-in | ❌ Need EventBridge (AWS cost) |
| **Decision** | ✅ **Supabase Postgres** | — |

**Rationale:** Postgres is the right data model for this domain. Invoice aging arithmetic, tier computation, and JOIN queries across invoices + clients + contact_history are SQL-native operations. DynamoDB would require application-layer logic for everything that Postgres handles in a view. Additionally, the user has no AWS credits.

---

### Supabase Edge Functions vs. AWS Lambda

| Criterion | Supabase Edge Functions | AWS Lambda |
|-----------|------------------------|-----------|
| Cost | ✅ 500k invocations/month free | ⚠ 1M free but requires account/credits |
| Cold start | ~50-200ms (Deno) | ~100-500ms (Python) |
| pg_cron integration | ✅ Built-in, same platform | ❌ Needs EventBridge (separate service) |
| Deployment | ✅ `supabase functions deploy` | ⚠ SAM/CDK setup |
| Deno runtime | ✅ TypeScript native | ❌ Lambda uses Node/Python runtimes |
| **Decision** | ✅ **Supabase Edge Functions** | — |

**Rationale:** All compute on the same platform as the database eliminates cross-service latency and authentication complexity. The user has no AWS credits; Supabase is entirely free at demo scale.

---

### Grok (xAI) vs. Google Gemini 1.5 Flash vs. Amazon Bedrock Claude vs. OpenAI GPT-4o-mini
 
 | Criterion | Grok (xAI) | Gemini 1.5 Flash | Bedrock Claude | GPT-4o-mini |
 |---|---|---|---|---|
 | Free tier | ✅ Very generous (high rate limits) | ✅ 60 req/min, no card | ❌ Pay-per-token, AWS account | ⚠ $5 trial credit |
 | Email quality | ✅ Excellent professional prose | ✅ Excellent | ✅ Excellent | ✅ Excellent |
 | JSON output | ✅ Supports `json_mode` | ✅ Native `response_format` | ✅ Via prompting | ✅ Native JSON mode |
 | Strands integration | ✅ Via LiteLLM (`xai/grok-beta`) | ✅ Via LiteLLM (`gemini/gemini-1.5-flash`) | ✅ Native Bedrock provider | ✅ Via LiteLLM (`openai/gpt-4o-mini`) |
 | Context window | 131k tokens | 1M tokens | 200k tokens | 128k tokens |
 | **Decision** | ✅ **Grok — preferred** | ✅ Gemini — fallback | — | ✅ OpenAI — supported |
 
 **Rationale (ADR-002):** Grok's free tier is notably permissive for repeated testing and demo runs. Multi-model routing is powered by Strands' LiteLLM provider in Python and REST fallback in TypeScript. Switching between Grok, Gemini, and OpenAI is a zero-code change via environment variables (`MODEL_ID`, `GROK_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`).
 
 ---
 
 ### Polyglot Architecture: Python Strands Agent vs. TypeScript Edge Function
 
 | Dimension | Python Strands Agent (`agent/`) | TypeScript Edge Function (`supabase/functions/`) |
 | :--- | :--- | :--- |
 | **Primary Purpose** | Hackathon judging verification, CLI runs, batch sweeps | Cloud production runtime scheduled via `pg_cron` |
 | **Framework** | AWS Strands Agents SDK (`@tool`) | Deno / Supabase Edge Functions |
 | **LLM Integration** | LiteLLM (`xai/grok-beta`, `gemini/gemini-1.5-flash`, `gpt-4o-mini`) | Direct HTTP REST with deterministic template fallback |
 | **Execution Speed** | Subprocess / CLI batch | Serverless edge execution (<200ms cold start) |
 | **Parity Status** | 100% logic parity (classification, 72h window, $10k+ threshold, dispute freeze) | 100% logic parity |
 
 **Rationale (ARCH-01):** Strands SDK satisfies the AWS Hackathon requirement for a genuine tool-calling autonomous agent loop in Python. Supabase Edge Functions provide an always-on, zero-cost cloud runtime on the same infrastructure as the Postgres database.
 
 ---
 
 ### Resend vs. Amazon SES vs. SendGrid
 
 | Criterion | Resend | Amazon SES | SendGrid |
 |---|---|---|---|
 | Free tier | ✅ 100 emails/day, no card | ⚠ 62k/month but requires AWS | ⚠ 100/day but requires verification |
 | API simplicity | ✅ Single HTTP POST | ⚠ SDK + DKIM setup | ⚠ Complex setup |
 | Setup time | ✅ < 5 minutes | ⚠ 30-60 minutes | ⚠ 20-30 minutes |
 | **Decision** | ✅ **Resend** | — | — |
 
 ---
 
 ### Zustand vs. Redux Toolkit vs. React Query
 
 | Criterion | Zustand | Redux Toolkit | React Query |
 |---|---|---|---|
 | Bundle size | ✅ 1.1kB | ⚠ 11kB | ⚠ 13kB |
 | Boilerplate | ✅ Minimal | ❌ High | ✅ Low |
 | Optimistic updates | ✅ Manual but simple | ✅ Built-in | ✅ Built-in |
 | Server state caching | ❌ Manual | ⚠ RTK Query | ✅ Core feature |
 | 3-day timeline fit | ✅ | ⚠ | ✅ |
 | **Decision** | ✅ **Zustand** | — | — |
 
 **Rationale:** Zustand's minimal API matches the 3-day scope. The dashboard has 3 data sources (invoices, decisions, audit) with simple fetch-and-display patterns that don't require React Query's advanced caching. Zustand's optimistic update pattern for approve/reject is 10 lines of code.
 
 ---
 
 ### Strands Agents SDK vs. LangGraph vs. CrewAI
 
 | Criterion | Strands | LangGraph | CrewAI |
 |---|---|---|---|
 | Hackathon criterion | ✅ Required | ❌ | ❌ |
 | Tool-calling | ✅ Native | ✅ | ✅ |
 | Python | ✅ | ✅ | ✅ |
 | Background agent pattern | ✅ | ✅ | ⚠ |
 | **Decision** | ✅ **Strands** (required) | — | — |
 
 **Rationale:** The hackathon explicitly requires Strands usage as a judging criterion. There is no alternative.

