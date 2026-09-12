# 20 — Testing Strategy & TDD Protocol

> **Chazer** · Vitest + Pytest + Pydantic + Strict TDD Protocol

---

## 1. Core Testing Philosophy & TDD Mandate

All development on Chazer follows strict **Test-Driven Development (TDD)**:
1. **Define Agreed Seams**: Identify public interfaces and input/output contracts before writing implementation.
2. **Red Phase**: Write failing unit/contract tests at the seam first.
3. **Green Phase**: Write minimal implementation code to turn tests green.
4. **Refactor Phase**: Clean up and optimize while preserving passing test suite.
5. **Mandatory Completion Gate**: **A feature or ticket is ONLY marked as complete after `/tdd` tests are implemented, verified in the test runner, and passing.**

---

## 2. Test Pyramid & Technology Matrix

```
          ┌─────────────────────────────┐
          │     E2E Tests (2-3)         │  Playwright: full demo flow
          │     Slow, high confidence   │
          ├─────────────────────────────┤
          │  Integration Tests (8-12)   │  Vitest + Supabase Edge Functions
          │  Medium speed               │
          ├─────────────────────────────┤
          │   Unit / Contract Tests     │  Vitest (Frontend/State) +
          │   Fast, isolated            │  Pytest & Pydantic (Agent/Tools)
          └─────────────────────────────┘
```

| Layer | Framework | Purpose | Runner Command |
|---|---|---|---|
| **Python Agent & Tools** | `pytest` + `pydantic` | Data validation, classification logic, LLM contract enforcement, tool verification | `pytest tests/ -v` |
| **Frontend UI & State** | `vitest` + `@testing-library/react` + `jsdom` | React components, Zustand store, optimistic updates, utils | `npm test` (inside `dashboard/`) |
| **Edge Functions / API** | `vitest` (TypeScript) | API routing, response contracts, parameter validation | `npx vitest run` |
| **End-to-End** | `playwright` | Full user journey (sweep → queue → approve → audit) | `npx playwright test` |

---

## 3. Python Agent Tests with Pydantic & Pytest

### Pydantic Test Schemas (`agent/tests/schemas.py`)

```python
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal

class InvoiceTestSchema(BaseModel):
    invoice_id: str
    client_name: str
    client_email: EmailStr
    amount: float = Field(gt=0)
    due_date: str
    days_overdue: int = Field(ge=0)
    contact_count: int = Field(ge=0)
    dispute_flag: bool = False
    owner_high_value_threshold: float = 10000.0

class ClassificationResultSchema(BaseModel):
    tier: Literal["TIER_1", "TIER_2", "TIER_3", "UNCLASSIFIED"]
    auto_send_eligible: bool
    escalate: bool
    reason: str

class EmailDraftSchema(BaseModel):
    subject: str = Field(min_length=5)
    body: str = Field(min_length=20)
    tier: Literal["TIER_1", "TIER_2", "TIER_3"]
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
```

### Classification Unit Tests (`agent/tests/test_classify.py`)

```python
import pytest
from agent.tools.classify import classify_invoice
from agent.tests.schemas import InvoiceTestSchema, ClassificationResultSchema

class TestTierClassification:
    
    def make_invoice(self, **kwargs) -> dict:
        defaults = {
            "invoice_id": "INV-TEST",
            "client_name": "Test Corp",
            "client_email": "test@example.com",
            "amount": 1000.00,
            "due_date": "2026-08-01",
            "days_overdue": 5,
            "contact_count": 0,
            "dispute_flag": False,
            "owner_high_value_threshold": 10000.0
        }
        defaults.update(kwargs)
        # Validate test input schema with Pydantic
        validated = InvoiceTestSchema(**defaults)
        return validated.model_dump()
    
    def test_tier1_first_contact(self):
        invoice = self.make_invoice(days_overdue=5, contact_count=0)
        result = classify_invoice(invoice)
        # Validate output schema with Pydantic
        res_model = ClassificationResultSchema(**result)
        assert res_model.tier == "TIER_1"
        assert res_model.auto_send_eligible is True
        assert res_model.escalate is False
    
    def test_tier1_boundary_day_7(self):
        invoice = self.make_invoice(days_overdue=7, contact_count=0)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True
    
    def test_tier2_with_prior_contact(self):
        invoice = self.make_invoice(days_overdue=15, contact_count=1)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_2"
        assert res.auto_send_eligible is True
    
    def test_tier2_boundary_day_21(self):
        invoice = self.make_invoice(days_overdue=21, contact_count=1)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_2"
    
    def test_tier3_at_22_days(self):
        invoice = self.make_invoice(days_overdue=22, contact_count=2)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_3"
        assert res.auto_send_eligible is False
        assert res.escalate is True
    
    def test_dispute_flag_always_tier3(self):
        invoice = self.make_invoice(days_overdue=3, contact_count=0, dispute_flag=True)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_3"
        assert res.escalate is True
        assert res.auto_send_eligible is False
    
    def test_high_value_always_escalates(self):
        invoice = self.make_invoice(days_overdue=5, contact_count=0, amount=15000, owner_high_value_threshold=10000)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.escalate is True
        assert res.auto_send_eligible is False
```

---

## 4. Frontend & State Tests with Vitest

### Zustand Store Unit Test (`dashboard/tests/store.test.ts`)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChazerStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiClient: {
    getInvoices: vi.fn(),
    getDecisions: vi.fn(),
    approveDecision: vi.fn(),
    rejectDecision: vi.fn(),
    triggerSweep: vi.fn(),
  },
}));

describe('Zustand useChazerStore', () => {
  beforeEach(() => {
    useChazerStore.setState({
      invoices: [],
      decisions: [],
      auditEntries: [],
      summary: null,
      isLoadingInvoices: false,
      isLoadingDecisions: false,
      pendingDecisionIds: new Set(),
    });
    vi.clearAllMocks();
  });

  it('optimistically removes decision on approval and triggers audit refresh', async () => {
    const mockDecision = {
      decision_id: 'dec_123',
      invoice_id: 'INV-001',
      escalation_reason: 'High value',
      draft_subject: 'Subject',
      draft_body: 'Body',
      tier: 'TIER_3' as const,
      llm_confidence: 0.95,
      status: 'PENDING_APPROVAL' as const,
      created_at: '2026-09-12T00:00:00Z',
    };

    useChazerStore.setState({ decisions: [mockDecision] });
    vi.mocked(apiClient.approveDecision).mockResolvedValueOnce({
      success: true,
      decision_id: 'dec_123',
      sent_at: '2026-09-12T00:00:00Z',
    });

    await useChazerStore.getState().approveDecision('dec_123');

    expect(useChazerStore.getState().decisions.find(d => d.decision_id === 'dec_123')).toBeUndefined();
    expect(apiClient.approveDecision).toHaveBeenCalledWith('dec_123', undefined);
  });
});
```

---

## 5. Running the Full Test Suite

```bash
# 1. Run Python Unit & Contract Tests (TDD)
cd agent
python -m pytest tests/ -v

# 2. Run Frontend & API Unit Tests (Vitest)
cd dashboard
npm test

# 3. TypeScript Type Safety Check
npm run build
```

---

## 6. Strict TDD Checklist for Each Ticket

Before marking any backlog ticket as `🟢 Completed`:
- [ ] Pre-agreed public seam identified and documented
- [ ] Test written first (Red state verified)
- [ ] Implementation code written to pass tests (Green state verified)
- [ ] Pydantic validation applied on Python tool inputs/outputs
- [ ] Vitest test passing for all TypeScript/Frontend logic
- [ ] No regression in existing test suite
