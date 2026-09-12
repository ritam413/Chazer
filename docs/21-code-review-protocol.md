# 21 — Code Review Protocol & Engineering Standards

> **Chazer** · PR Review Process & Coding Standards

---

## 1. PR Requirements

Every pull request must satisfy:

- [ ] **One concern per PR** — a PR either adds a feature, fixes a bug, or refactors. Not all three.
- [ ] **Descriptive title** — format: `[LAYER] Short description` where `LAYER` ∈ `FRONTEND`, `BACKEND`, `AGENT`, `INFRA`
  - ✅ `[AGENT] Add dispute detection to classify tool`
  - ❌ `fixes and stuff`
- [ ] **Description includes:** What changed, why, and seam test verification results
- [ ] **TDD Protocol Verified (`/tdd`)** — Tests written red-first, passing green, validating with Pydantic (Python) or Vitest (TypeScript)
- [ ] **All CI checks and test suites pass** (`pytest tests/ -v` and `npm test` in `dashboard/`)
- [ ] **No `.env` or `.env.local` files committed**
- [ ] **No `console.log` left in production paths** (Edge Functions, Next.js server components)

---

## 2. Naming Conventions

### Python (Agent)

| Element | Convention | Example |
|---------|-----------|---------|
| Module | `snake_case` | `draft_email.py` |
| Function | `snake_case` | `classify_invoice()` |
| Class | `PascalCase` | `InvoiceClassification` |
| Constant | `SCREAMING_SNAKE_CASE` | `CONTACT_WINDOW_HOURS = 72` |
| Strands tool | `snake_case` decorated with `@tool` | `@tool def classify_invoice(...)` |
| Type hints | Always required | `def foo(invoice_id: str) -> dict:` |

### TypeScript (Edge Functions + Frontend)

| Element | Convention | Example |
|---------|-----------|---------|
| File | `camelCase.ts` or `kebab-case.ts` | `apiClient.ts`, `agent-sweep.ts` |
| Function | `camelCase` | `fetchInvoices()` |
| React component | `PascalCase` | `DecisionCard.tsx` |
| Type/Interface | `PascalCase` | `Invoice`, `DecisionQueueItem` |
| Constant | `SCREAMING_SNAKE_CASE` | `CONTACT_WINDOW_HOURS` |
| Zustand action | `camelCase verb` | `approveDecision()`, `fetchInvoices()` |
| API endpoint path | `kebab-case` | `/api/decisions-approve` |
| Database column | `snake_case` | `last_contact_at` |

### SQL

| Element | Convention |
|---------|-----------|
| Tables | `snake_case` plural | `invoices`, `audit_log` |
| Columns | `snake_case` | `created_at`, `invoice_id` |
| Indices | `idx_<table>_<column(s)>` | `idx_invoices_status` |
| Policies | `<table>_<action>_<role>` | `invoices_select_owner` |
| Functions | `snake_case` verb | `reset_demo()` |

---

## 3. Component Size Limits

| Layer | Limit | Rationale |
|-------|-------|---------|
| React component file | ≤ 200 lines | Extract sub-components when exceeded |
| Python agent tool | ≤ 80 lines | Single responsibility; deep module |
| Supabase Edge Function | ≤ 150 lines | Split into route handlers if exceeded |
| SQL migration file | ≤ 100 statements | One migration per schema concept |
| Zustand store | ≤ 100 lines | Split slices if exceeded |

---

## 4. Error Handling Standards

### Python Agent

```python
# ALWAYS:
# 1. Catch specific exceptions, not bare except
# 2. Log the error with context before re-raising or continuing
# 3. Never abort the sweep on a single invoice failure

try:
    result = classify_invoice(invoice)
except LLMTimeoutError as e:
    logger.error(f"LLM timeout for {invoice['invoice_id']}: {e}")
    write_audit_log(action="LLM_FAILED", status="FAILED", 
                    metadata={"reason": "timeout", "error": str(e)})
    continue  # Process next invoice

# NEVER:
except Exception:
    pass  # Silent failures destroy trust
```

### TypeScript Edge Functions

```typescript
// ALWAYS:
// 1. Return proper HTTP status codes
// 2. Return JSON error bodies with an "error" field
// 3. Log errors with structuredClone / JSON.stringify (no PII)

try {
  const invoice = await fetchInvoice(invoiceId);
  return Response.json(invoice);
} catch (error) {
  console.error(JSON.stringify({ 
    action: "FETCH_INVOICE_FAILED", 
    invoice_id: invoiceId,
    message: error instanceof Error ? error.message : "unknown"
  }));
  return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
```

### Frontend React

```typescript
// ALWAYS:
// 1. Handle loading, error, and empty states in every data-fetching component
// 2. Show toast on error; never silently swallow API failures
// 3. Use optimistic updates with rollback

const approveDecision = async (id: string) => {
  // Optimistic remove
  set(state => ({ decisions: state.decisions.filter(d => d.decision_id !== id) }));
  try {
    await api.approveDecision(id);
    toast.success("Email sent!");
  } catch (err) {
    // Rollback
    await fetchDecisions();
    toast.error("Failed to approve. Please try again.");
  }
};
```

---

## 5. Domain Rule Enforcement

**Rule:** Business logic invariants (escalation tiers, contact window, high-value threshold) must live in exactly one place — the Python agent's `classify.py` tool and the Supabase `v_invoices_enriched` view. They must NOT be duplicated in the frontend or in multiple Edge Functions.

**Corollary:** The frontend reads tier from the API response; it never computes tier itself.

**Review check:** If a PR introduces `days_overdue >= 22` or `contact_count` comparisons in the frontend or Edge Function, it should be rejected and refactored to use the canonical source.

---

## 6. Database Change Rules

- [ ] All schema changes must be in a new numbered migration file: `supabase/migrations/00N_description.sql`
- [ ] No `DROP TABLE` or `DROP COLUMN` in migrations for demo scope
- [ ] New columns must have NOT NULL with a DEFAULT value, or be explicitly nullable
- [ ] Every new table must have RLS enabled and at least one SELECT policy
- [ ] Index every foreign key column and every column used in WHERE clauses in sweep queries

---

## 7. Security Review Checklist (Every PR)

- [ ] No secrets hardcoded in source code
- [ ] No `console.log(email)` or other PII logging
- [ ] New API endpoints validate the required secret header (if internal) or anon key
- [ ] New Edge Functions have proper CORS headers
- [ ] LLM prompt inputs are from trusted DB fields, not user-controlled strings

---

## 8. PR Review Labels

| Label | Meaning |
|-------|---------|
| `ready-for-review` | Author done; needs reviewer |
| `needs-changes` | Reviewer requested changes |
| `approved` | At least 1 approval (solo project: self-review checklist) |
| `do-not-merge` | Blocked (failing tests, merge conflict, pending discussion) |

---

## 9. Self-Review Checklist (Solo Developer)

Before merging any PR to `main`:

**Functionality:**
- [ ] I tested this manually against the live Supabase instance
- [ ] The change doesn't break any of the 6 critical path tests (doc 17)

**Code Quality:**
- [ ] No `TODO`s left in changed files
- [ ] No `console.log` in production paths
- [ ] Type errors cleared (`npx tsc --noEmit`)
- [ ] Python agent tests with Pydantic validation pass (`pytest tests/ -v`)
- [ ] Frontend & API tests with Vitest pass (`npm test` in `dashboard/`)
- [ ] Strictly verified via `/tdd` Red → Green loop before marking completed

**Security:**
- [ ] No secrets in diff
- [ ] No PII in logs

**Docs:**
- [ ] If a domain rule changed: update doc 04 (rules)
- [ ] If API changed: update doc 06 (API spec)
- [ ] If a new component was added: update doc 07 (components)
