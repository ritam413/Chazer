# 19 — Troubleshooting Playbook

> **Chazer** · Diagnose & Fix — Top Failure Modes

---

## 1. Agent Sweep Produces No Emails

**Symptom:** POST /sweep returns 202 but audit log shows only `SWEEP_STARTED` and `SWEEP_COMPLETE` with `sent_count: 0`.

**Root Causes & Fixes:**

| Cause | Diagnostic | Fix |
|-------|-----------|-----|
| All invoices in contact window | `SELECT invoice_id, last_contact_at, contact_count FROM invoices WHERE owner_id='demo_owner'` — check `last_contact_at` | `UPDATE invoices SET last_contact_at=NULL, contact_count=0 WHERE owner_id='demo_owner'` |
| All invoices `days_overdue = 0` | Due dates in seed CSV are in the future | Adjust `due_date` values in CSV to be in the past; re-seed |
| All invoices `status = 'PAID'` | `SELECT status, count(*) FROM invoices GROUP BY status` | Re-run seed script to reset status |
| Edge Function not calling Gemini | Check Edge Function logs in Supabase dashboard → Functions → Logs | Verify `GEMINI_API_KEY` secret is set |

---

## 2. LLM Call Fails / `LLM_FAILED` in Audit Log

**Symptom:** `audit_log` has `action='LLM_FAILED'` entries; metadata shows `"reason": "timeout"` or JSON parse error.

**Diagnostic:**
```bash
# Check Supabase Edge Function logs
supabase functions logs agent-sweep --tail 50
```

**Fix by error type:**

| Error | Fix |
|-------|-----|
| `"reason": "timeout"` | Gemini rate limit hit. Add `await sleep(1000)` between invoice calls in sweep. |
| `"reason": "invalid_json"` | LLM returned markdown-wrapped JSON. Add `response_format: {type: 'json_object'}` to model config. |
| `"reason": "api_key_invalid"` | Wrong GEMINI_API_KEY. Run `supabase secrets set GEMINI_API_KEY=<correct_key>` |
| `"reason": "quota_exceeded"` | 60 req/min free tier limit. Wait 60 seconds and retry. For demo (8 invoices), should never hit this. |

---

## 3. Emails Not Sending (SEND_FAILED)

**Symptom:** `audit_log` has `action='SEND_FAILED'`; metadata contains Resend error.

**Diagnostic:**
```bash
# Check Resend dashboard
# https://resend.com/emails → filter by date
```

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | Wrong RESEND_API_KEY. Re-set: `supabase secrets set RESEND_API_KEY=re_<correct>` |
| `422 Unprocessable Entity` | `from` email domain not verified in Resend. Use `onboarding@resend.dev` for sandbox testing. |
| `429 Too Many Requests` | 100/day limit hit. Enable sandbox mode: `RESEND_SANDBOX=true` |
| `domain not verified` | Add DNS records per Resend dashboard → Domains → Verify |

**Quick fix for demo:** Switch to sandbox mode
```bash
supabase secrets set RESEND_SANDBOX=true
```
In sandbox mode, Resend logs the email without delivering it. Audit log still records `resend_message_id`.

---

## 4. Decision Queue Empty After Sweep

**Symptom:** Sweep ran, emails sent, but `/decisions` returns empty array.

**Root Causes:**

| Cause | Diagnostic | Fix |
|-------|-----------|-----|
| All invoices are Tier 1 or 2 (expected) | Check `days_overdue` — all < 22 | Adjust due_dates in seed to create some 22+ day invoices |
| `decision_queue` not being inserted | Check Edge Function logs for `TIER3_DRAFT_CREATED` actions | Verify `createDecisionQueueItem()` function is called in sweep code |
| RLS blocking read | `SELECT * FROM decision_queue` in SQL editor — if empty but should have data | Check RLS policy for `decision_queue` SELECT |

---

## 5. Dashboard Shows No Data

**Symptom:** Dashboard loads but invoice table is empty; stats show 0.

**Diagnostic:**
```bash
# Test API directly
curl "https://<project>.supabase.co/functions/v1/invoices" \
  -H "Authorization: Bearer <anon-key>"
```

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Wrong anon key in frontend | Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars |
| `500 Internal Server Error` | Edge Function crashed | Check Supabase Functions → Logs |
| Empty `invoices: []` | DB not seeded | Run `POST /seed-data` with seed secret |
| CORS error in browser console | CORS not configured | Add `Access-Control-Allow-Origin: <vercel-url>` to Edge Function response headers |

---

## 6. Vercel Build Fails

**Symptom:** `vercel --prod` fails with TypeScript or build errors.

```bash
# Local pre-check
cd dashboard/
npx tsc --noEmit
npm run build
```

| Error | Fix |
|-------|-----|
| `Type 'X' is not assignable to type 'Y'` | Fix TypeScript type mismatch in the file mentioned |
| `Cannot find module 'zustand'` | Run `npm install` |
| `Module not found: 'react'` | Check `package.json` — React should be in dependencies |
| `NEXT_PUBLIC_... is undefined` | Add missing env var to Vercel dashboard → Settings → Environment Variables |

---

## 7. pg_cron Not Triggering

**Symptom:** No sweep in audit log for today's scheduled time.

**Diagnostic:**
```sql
-- Check cron job exists
SELECT * FROM cron.job;

-- Check recent run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Look for errors
SELECT * FROM cron.job_run_details WHERE status = 'failed' ORDER BY start_time DESC;
```

**Fixes:**

| Cause | Fix |
|-------|-----|
| Job not scheduled | Re-run the `SELECT cron.schedule(...)` SQL from doc 11 |
| HTTP POST failed (wrong URL) | Verify the Edge Function URL in the cron SQL matches actual project URL |
| CRON_SECRET mismatch | Re-run `ALTER DATABASE postgres SET "app.cron_secret"` with correct value |
| pg_net extension not enabled | `CREATE EXTENSION IF NOT EXISTS pg_net;` |

---

## 8. Contact Count Not Incrementing

**Symptom:** Same invoice gets Tier-1 email twice (contact_count stays at 0).

**Root Cause:** `contact_count` is stored as a column but not being updated after send.

**Fix:**
```sql
-- Verify the update is happening
SELECT invoice_id, contact_count, last_contact_at FROM invoices WHERE invoice_id = 'INV-006';

-- If stuck at 0, manually trigger increment (then fix code)
UPDATE invoices SET contact_count = contact_count + 1, last_contact_at = NOW()
WHERE invoice_id = 'INV-006';
```

**Code fix location:** In the Edge Function `agent-sweep.ts`, after `sendEmail()` succeeds, ensure:
```typescript
await supabase.from('invoices').update({
  contact_count: invoice.contact_count + 1,
  last_contact_at: new Date().toISOString()
}).eq('invoice_id', invoice.invoice_id);
```

---

## 9. Python Agent Fails Locally

**Symptom:** `python -m agent.main` throws an error.

```bash
# Check Python version
python --version  # Must be >= 3.11

# Check dependencies
pip list | grep strands
pip list | grep litellm

# Reinstall
pip install -r agent/requirements.txt --force-reinstall
```

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: strands` | `pip install strands-agents` |
| `GEMINI_API_KEY not set` | Create `agent/.env` with `GEMINI_API_KEY=...` |
| `supabase.exceptions.APIError: 401` | Check `SUPABASE_SERVICE_ROLE_KEY` in `agent/.env` |
| `litellm.exceptions.AuthenticationError` | Verify `GEMINI_API_KEY` is valid and quota not exhausted |

---

## 10. Demo Reset Fails (Contacts Not Clearing)

**Symptom:** After running reset SQL, sweep still sends 0 emails (contact window still active).

**Fix:**
```sql
-- Verify reset applied
SELECT invoice_id, last_contact_at, contact_count 
FROM invoices 
WHERE owner_id = 'demo_owner';
-- All last_contact_at should be NULL

-- If not, check if RLS is blocking the UPDATE
-- Run as service role (via Supabase SQL editor, which uses service role)
```

**One-liner reset command (run from terminal):**
```bash
curl -X POST "https://<project>.supabase.co/rest/v1/rpc/reset_demo" \
  -H "apikey: <service-role-key>" \
  -H "Authorization: Bearer <service-role-key>"
```

Create this stored procedure for convenience:
```sql
CREATE OR REPLACE FUNCTION reset_demo()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE invoices SET last_contact_at = NULL, contact_count = 0 WHERE owner_id = 'demo_owner';
  DELETE FROM contact_history WHERE owner_id = 'demo_owner';
  DELETE FROM audit_log WHERE owner_id = 'demo_owner';
  DELETE FROM decision_queue WHERE owner_id = 'demo_owner';
  DELETE FROM sweep_runs WHERE owner_id = 'demo_owner';
$$;
```
