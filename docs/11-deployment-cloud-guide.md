# 11 — Deployment & DevOps Guide

> **Chazer** · Zero-Cost Serverless Deployment on Vercel + Supabase

---

## 1. Architecture Summary

| Service | Provider | Tier | Cost |
|---------|----------|------|------|
| Frontend | Vercel | Hobby (free) | $0 |
| Database | Supabase | Free | $0 |
| Edge Functions | Supabase | Free (500k invocations/mo) | $0 |
| Email | Resend | Free (100 emails/day) | $0 |
| LLM (primary) | Grok xAI API | Free tier (generous limits) | $0 |
| LLM (fallback) | Google Gemini API | Free (60 req/min) | $0 |
| Agent Code | GitHub + local dev | — | $0 |

---

## 2. Prerequisites

- Node.js >= 18
- Python >= 3.11
- Supabase CLI: `npm install -g supabase`
- Vercel CLI: `npm install -g vercel`
- Git

---

## 3. Environment Variables

### Frontend (`dashboard/.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xyzabc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Internal API base (same as Supabase URL for Edge Functions)
NEXT_PUBLIC_API_BASE_URL=https://xyzabc123.supabase.co/functions/v1
```

### Supabase Edge Functions (set via Supabase Dashboard → Settings → Edge Functions → Secrets)

```env
# LLM — Primary: Grok (xAI)
GROK_API_KEY=xai-...
# LLM — Fallback: Google Gemini (uncomment to swap)
# GEMINI_API_KEY=AIzaSy...

# Resend Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=reminders@chazer.dev

# Internal security
CRON_SECRET=ch-cron-secret-abc123
SEED_SECRET=ch-seed-secret-xyz789

# Supabase (auto-injected in Edge Functions; listed for local dev)
SUPABASE_URL=https://xyzabc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
```

### Python Agent (`.env` in `agent/` directory)

```env
# LLM — Primary: Grok (xAI)
GROK_API_KEY=xai-...
# LLM — Fallback: Google Gemini
# GEMINI_API_KEY=AIzaSy...

# Resend Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=reminders@chazer.dev

# Internal security
CRON_SECRET=ch-cron-secret-abc123
SEED_SECRET=ch-seed-secret-xyz789

# Supabase
SUPABASE_URL=https://xyzabc123.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_SANDBOX=true
HIGH_VALUE_THRESHOLD=10000
CONTACT_WINDOW_HOURS=72
OWNER_ID=demo_owner
```

> ⚠️ **Never commit `.env` or `.env.local` to Git.** Both are in `.gitignore`.

---

## 4. Supabase Setup

### Step 1: Create Project

1. Go to [supabase.com](https://supabase.com) → "New Project"
2. Project name: `chazer`; Database password: strong random string; Region: `us-east-1`
3. Note: **Project URL** and **anon key** (Settings → API)

### Step 2: Run Database Migrations

```bash
# From project root
supabase login
supabase link --project-ref <your-project-ref>
supabase db push    # applies all SQL in supabase/migrations/
```

**Migration file: `supabase/migrations/001_initial_schema.sql`:**

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Create tables (see full schema in doc 06)
CREATE TABLE clients ( ... );
CREATE TABLE invoices ( ... );
CREATE TABLE contact_history ( ... );
CREATE TABLE audit_log ( ... );
CREATE TABLE decision_queue ( ... );
CREATE TABLE sweep_runs ( ... );

-- Create enriched view
CREATE VIEW v_invoices_enriched AS ...;

-- Schedule daily sweep
SELECT cron.schedule(
  'daily-chazer-sweep',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/agent-sweep',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret'))
  );
  $$
);
```

### Step 3: Set App Config (for pg_cron to access secrets)

```sql
ALTER DATABASE postgres SET "app.supabase_url" = 'https://xyzabc123.supabase.co';
ALTER DATABASE postgres SET "app.cron_secret" = 'ch-cron-secret-abc123';
```

### Step 4: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy api-router
supabase functions deploy agent-sweep
supabase functions deploy seed-data
supabase functions deploy decisions-approve
supabase functions deploy decisions-reject

# Set secrets (replaces manual Dashboard entry)
supabase secrets set GEMINI_API_KEY=AIzaSy...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set CRON_SECRET=ch-cron-secret-abc123
supabase secrets set SEED_SECRET=ch-seed-secret-xyz789
supabase secrets set RESEND_FROM_EMAIL=reminders@chazer.dev
```

### Step 5: Seed Database

```bash
# Upload seed CSV to Supabase Storage
supabase storage cp ./data/invoices_seed.csv ss://seed-data/invoices_seed.csv

# Trigger seed endpoint
curl -X POST https://xyzabc123.supabase.co/functions/v1/seed-data \
  -H "x-seed-secret: ch-seed-secret-xyz789"

# Expected response:
# { "seeded": 8, "skipped": 0, "invalid": 0 }
```

---

## 5. Vercel Deployment (Frontend)

### Step 1: Link and Deploy

```bash
cd dashboard/
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_API_BASE_URL production
vercel --prod
```

### Step 2: Verify

```bash
# Check production URL
vercel ls

# Open live app
vercel open
```

**Expected:** Dashboard loads at `https://chazer-<hash>.vercel.app/dashboard`

---

## 6. Local Development Setup

### Frontend

```bash
cd dashboard/
npm install
cp .env.example .env.local
# Fill in values from Supabase dashboard
npm run dev
# → http://localhost:3000
```

### Python Agent (local test run)

```bash
cd agent/
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in values
python -m main  # runs sweep against live Supabase DB
```

### Supabase Edge Functions (local dev)

```bash
supabase start      # starts local Supabase stack
supabase functions serve --env-file .env.functions.local
# Functions available at http://localhost:54321/functions/v1/
```

---

## 7. CI/CD Pipeline (GitHub Actions)

### `.github/workflows/deploy.yml`

```yaml
name: Deploy Chazer

on:
  push:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd dashboard && npm ci
      - run: cd dashboard && npm run lint
      - run: cd dashboard && npx tsc --noEmit

  test-agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: cd agent && pip install -r requirements.txt
      - run: cd agent && python -m pytest tests/ -v

  deploy-frontend:
    needs: [lint-and-type-check]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g vercel
      - run: cd dashboard && vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-edge-functions:
    needs: [lint-and-type-check]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 8. Repository Structure

```
chazer/
├── README.md
├── LICENSE                         (Apache-2.0)
├── .gitignore
│
├── agent/                          (Strands Python agent)
│   ├── requirements.txt
│   ├── main.py
│   ├── chazer_agent.py
│   ├── tools/
│   │   ├── classify.py
│   │   ├── draft_email.py
│   │   ├── send_email.py
│   │   ├── db_client.py
│   │   └── write_audit_log.py
│   └── tests/
│       ├── test_classify.py
│       └── test_draft_email.py
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── api-router/index.ts
│       ├── agent-sweep/index.ts
│       ├── seed-data/index.ts
│       ├── decisions-approve/index.ts
│       └── decisions-reject/index.ts
│
├── dashboard/                      (Next.js frontend)
│   ├── package.json
│   ├── tailwind.config.js
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── decisions/page.tsx
│   │   └── audit/page.tsx
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── InvoiceTable.tsx
│   │   ├── DecisionCard.tsx
│   │   ├── AuditTimeline.tsx
│   │   └── ...
│   └── lib/
│       ├── api.ts
│       ├── store.ts
│       └── types.ts
│
├── data/
│   └── invoices_seed.csv
│
└── docs/                           (this directory — 22 doc files)
```
