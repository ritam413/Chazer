# 15 — Security, Privacy & Safety Specification

> **Chazer** · Hackathon Demo — Security Controls for a Public Demo App

---

## 1. Authentication & Access Model

### Demo Authentication Decision

For the hackathon demo, **no authentication system is implemented.** All endpoints are scoped to a hardcoded `owner_id = "demo_owner"`.

**Rationale:** The project scope explicitly states "no auth system needed for the demo." Adding auth would consume 4–6 hours of a 3-day build. The demo URL is shared only with hackathon judges.

### What This Means in Practice

- All API endpoints implicitly filter to `owner_id = "demo_owner"`
- The Supabase anon key is exposed in the frontend environment — this is expected for Supabase's public client pattern
- Row-level security (RLS) is configured to restrict reads to `owner_id = "demo_owner"` even if the anon key is discovered

### Row Level Security (Supabase RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_queue ENABLE ROW LEVEL SECURITY;

-- Policy: allow read on demo_owner data only (anon role)
CREATE POLICY "demo_owner_read" ON invoices
  FOR SELECT USING (owner_id = 'demo_owner');

CREATE POLICY "demo_owner_read" ON audit_log
  FOR SELECT USING (owner_id = 'demo_owner');

CREATE POLICY "demo_owner_read" ON decision_queue
  FOR SELECT USING (owner_id = 'demo_owner');

-- Write operations use service role key (Edge Functions only)
-- Service role key is NOT exposed to the frontend
```

---

## 2. API Security Controls

### Internal Endpoint Guards

| Endpoint | Guard | Secret Source |
|----------|-------|--------------|
| `POST /seed-data` | `x-seed-secret` header | `SEED_SECRET` env var |
| `POST /agent-sweep` (cron) | `x-cron-secret` header | `CRON_SECRET` env var |
| All other endpoints | Supabase anon key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

```typescript
// Guard pattern in Edge Functions
function validateCronSecret(req: Request): boolean {
  const secret = req.headers.get("x-cron-secret");
  return secret === Deno.env.get("CRON_SECRET");
}

function validateSeedSecret(req: Request): boolean {
  const secret = req.headers.get("x-seed-secret");
  return secret === Deno.env.get("SEED_SECRET");
}
```

### CORS Configuration

```typescript
// Edge Function CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
    ? "https://chazer.vercel.app"   // restrict to known frontend
    : "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

---

## 3. Email Safety Guardrails

### Content Validation Pipeline

All LLM-generated email content passes through validation before sending:

```python
def validate_email_content(body: str, invoice_id: str, amount: float) -> ValidationResult:
    errors = []
    
    # 1. Required elements
    if invoice_id not in body:
        errors.append(f"Missing invoice ID: {invoice_id}")
    
    if not contains_dollar_amount(body, amount):
        errors.append(f"Missing amount: ${amount:,.2f}")
    
    # 2. Prohibited legal threats
    LEGAL_THREATS = [
        r'\blegal action\b', r'\battorney\b', r'\bsue you\b',
        r'\bcollections\b', r'\bdebt collector\b', r'\bcourtb'
    ]
    for pattern in LEGAL_THREATS:
        if re.search(pattern, body, re.IGNORECASE):
            errors.append(f"Prohibited content: matches pattern '{pattern}'")
    
    # 3. Length check
    word_count = len(body.split())
    if word_count > 200:
        errors.append(f"Email too long: {word_count} words (max 200)")
    
    if word_count < 30:
        errors.append(f"Email too short: {word_count} words (min 30)")
    
    return ValidationResult(valid=len(errors) == 0, errors=errors)
```

**Disposition on failure:** If validation fails, the email is NOT sent. An `audit_log` record is written with `status = "VALIDATION_FAILED"` and the validation errors in `metadata`. The invoice is escalated to the decision queue.

---

## 4. LLM Hallucination Guardrails

### Hallucination Risks in This Domain

| Risk | Scenario | Guard |
|------|----------|-------|
| Wrong invoice amount | LLM invents a different dollar figure | `contains_dollar_amount()` validation |
| Wrong client name | LLM confuses client context | Client name is injected via structured prompt, not free-text |
| False legal threats | LLM generates aggressive content | Regex blocklist check |
| Wrong invoice ID | LLM references wrong invoice | `invoice_id in body` check |
| Commitment extraction error | LLM misclassifies "I'll pay Friday" as DISPUTE | Confidence threshold: if < 0.85, escalate regardless |

### Prompt Injection Prevention

The email draft prompt injects invoice data via structured JSON fields, not via user-controlled free text:

```python
# SAFE: structured injection
prompt = f"""
Generate a Tier-2 collection email for:
- Invoice: {invoice_id}       # sanitized server-side string
- Client: {client_name}       # from DB, not user input
- Amount: ${amount:.2f}       # numeric, formatted
- Due date: {due_date}        # ISO date string
"""

# NOT DONE: injecting raw client reply text without sanitization
# (for demo, client_reply_text is always None)
```

---

## 5. Data Privacy

### PII Fields in the System

| Field | Table | Classification | Handling |
|-------|-------|---------------|---------|
| `client_email` | `clients`, `contact_history` | PII | Stored; not logged in audit metadata |
| `client_name` | `clients` | PII | Stored; used in email drafts |
| `email_body` | `contact_history` | Contains PII | Stored in DB; not logged to Edge Function console |
| Invoice amount | `invoices` | Financial PII | Stored; appears in audit log |

### Logging Hygiene

```typescript
// NEVER log to console in Edge Functions:
console.log(`Sending email to ${clientEmail}`);  // ❌

// DO log structured metadata without PII:
console.log(JSON.stringify({
  action: "EMAIL_SENT",
  invoice_id: invoiceId,
  tier: tier,
  timestamp: new Date().toISOString()
  // no email address in log
}));  // ✅
```

### Data Retention (Demo)

- All demo data is ephemeral — the Supabase free tier project will be deleted after the hackathon
- No GDPR/CCPA obligations apply because the data is seeded mock data (not real client PII)

---

## 6. Secrets Management

### Secret Hierarchy

| Secret | Where Stored | Accessible To |
|--------|-------------|--------------|
| `GEMINI_API_KEY` | Supabase Edge Function secrets | Edge Functions + Python agent (local) |
| `RESEND_API_KEY` | Supabase Edge Function secrets | Edge Functions + Python agent (local) |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` (local); Supabase auto-injects in Edge Functions | Agent (local), Edge Functions |
| `CRON_SECRET` | Supabase Edge Function secrets; Supabase DB config | pg_cron, Edge Functions |
| `SEED_SECRET` | Supabase Edge Function secrets | Admin only (one-time use) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env vars | Frontend (public, by design) |

### What is NEVER committed to Git

```gitignore
# .gitignore
.env
.env.local
.env.*.local
agent/.env
*.pem
*.key
```

---

## 7. Audit Logging as a Security Control

The `audit_log` table serves a dual purpose: product transparency (for the owner) and security audit trail.

**Every external action (email send, decision approval) is logged BEFORE the action executes:**

```python
# Write-before-act pattern
await write_audit_log(action="TIER2_EMAIL_SENT", status="PENDING", invoice_id=invoice_id)
result = await send_email(to=email, subject=subject, body=body)
await update_audit_log(log_id=log_id, status="SENT", metadata={"resend_id": result.message_id})
```

**If the send fails, the audit log reflects `status = "FAILED"` — not silently dropped.**

### Audit Log Immutability

```sql
-- In production, enforce append-only via RLS:
CREATE POLICY "audit_log_no_update" ON audit_log
  FOR UPDATE USING (false);

CREATE POLICY "audit_log_no_delete" ON audit_log
  FOR DELETE USING (false);
```

---

## 8. Future Security Roadmap (Post-Demo)

When Chazer moves beyond the demo:

- [ ] Add Supabase Auth (magic link for small teams)
- [ ] RBAC: `owner` role (full access) vs. `viewer` role (read-only dashboard)
- [ ] Webhook signature verification for QuickBooks/Stripe integrations
- [ ] Rate limiting on approve/reject endpoints (prevent bulk spam)
- [ ] Email unsubscribe header compliance (`List-Unsubscribe` per RFC 8058)
- [ ] GDPR right-to-erasure: delete client_email from all tables on request
