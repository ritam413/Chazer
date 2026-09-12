"""Unit tests for classify_invoice tool (AGENT-01).

Following strict /tdd protocol: tests verify deterministic tier classification,
dispute escalation, high-value invoice thresholds, contact count edge cases,
and system invariants.
"""

import pytest
from pydantic import ValidationError
from agent.tools.classify import classify_invoice
from agent.tests.schemas import InvoiceTestSchema, ClassificationResultSchema


class TestTierClassification:
    """Test suite covering all classification matrix conditions and edge cases."""

    def make_invoice(self, **kwargs) -> dict:
        """Helper to create and validate standard invoice test fixtures."""
        defaults = {
            "invoice_id": "INV-TEST",
            "client_name": "Acme Corp",
            "client_email": "billing@acme.com",
            "amount": 1000.00,
            "due_date": "2026-08-01",
            "days_overdue": 5,
            "contact_count": 0,
            "dispute_flag": False,
            "owner_high_value_threshold": 10000.0,
            "last_contact_summary": None,
            "client_reply_text": None,
        }
        defaults.update(kwargs)
        validated = InvoiceTestSchema(**defaults)
        return validated.model_dump()

    # 1. Tier 1 Tests (Days Overdue 1-7)
    def test_tier1_first_contact(self):
        """Tier 1: 5 days overdue, 0 contacts -> TIER_1, auto_send=True, escalate=False."""
        invoice = self.make_invoice(days_overdue=5, contact_count=0)
        result = classify_invoice(invoice)
        res = ClassificationResultSchema(**result)
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True
        assert res.escalate is False
        assert res.confidence >= 0.9

    def test_tier1_boundary_day_1(self):
        """Tier 1: exactly 1 day overdue -> TIER_1, auto_send=True."""
        invoice = self.make_invoice(days_overdue=1, contact_count=0)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    def test_tier1_boundary_day_7(self):
        """Tier 1: exactly 7 days overdue, 0 contacts -> TIER_1, auto_send=True."""
        invoice = self.make_invoice(days_overdue=7, contact_count=0)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    def test_tier1_already_contacted(self):
        """Tier 1: 4 days overdue, contact_count=1 -> TIER_1, auto_send=False (already contacted in tier 1)."""
        invoice = self.make_invoice(days_overdue=4, contact_count=1)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is False
        assert res.escalate is False

    # 2. Tier 2 Tests (Days Overdue 8-21)
    def test_tier2_with_prior_contact(self):
        """Tier 2: 15 days overdue, 1 prior contact -> TIER_2, auto_send=True, escalate=False."""
        invoice = self.make_invoice(days_overdue=15, contact_count=1)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_2"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    def test_tier2_boundary_day_8(self):
        """Tier 2: exactly 8 days overdue, 1 prior contact -> TIER_2, auto_send=True."""
        invoice = self.make_invoice(days_overdue=8, contact_count=1)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_2"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    def test_tier2_boundary_day_21(self):
        """Tier 2: exactly 21 days overdue, 2 prior contacts -> TIER_2, auto_send=True."""
        invoice = self.make_invoice(days_overdue=21, contact_count=2)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_2"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    def test_tier2_contact_count_mismatch_late_start(self):
        """Tier 2 edge case: 12 days overdue but contact_count=0 -> treated as TIER_1 first contact."""
        invoice = self.make_invoice(days_overdue=12, contact_count=0)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True
        assert res.escalate is False

    # 3. Tier 3 Tests (Days Overdue >= 22 or Disputed)
    def test_tier3_at_22_days(self):
        """Tier 3: 22 days overdue -> TIER_3, auto_send=False, escalate=True."""
        invoice = self.make_invoice(days_overdue=22, contact_count=2)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_3"
        assert res.auto_send_eligible is False
        assert res.escalate is True
        assert len(res.escalation_reason) > 0

    def test_tier3_far_overdue(self):
        """Tier 3: 45 days overdue -> TIER_3, auto_send=False, escalate=True."""
        invoice = self.make_invoice(days_overdue=45, contact_count=3)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_3"
        assert res.auto_send_eligible is False
        assert res.escalate is True

    # 4. Dispute & Override Rules
    def test_dispute_flag_always_tier3(self):
        """Dispute: invoice with dispute_flag=True always produces TIER_3 and escalate=True."""
        invoice = self.make_invoice(days_overdue=3, contact_count=0, dispute_flag=True)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.tier == "TIER_3"
        assert res.escalate is True
        assert res.auto_send_eligible is False
        assert "dispute" in res.escalation_reason.lower()

    def test_high_value_always_escalates(self):
        """High-Value: amount >= threshold always produces escalate=True and auto_send_eligible=False."""
        invoice = self.make_invoice(
            days_overdue=5,
            contact_count=0,
            amount=15000.00,
            owner_high_value_threshold=10000.00,
        )
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.escalate is True
        assert res.auto_send_eligible is False
        assert "high-value" in res.escalation_reason.lower() or "15,000" in res.escalation_reason or "threshold" in res.escalation_reason.lower()

    def test_not_overdue_days_zero(self):
        """Current invoice: days_overdue=0 -> auto_send=False, escalate=False."""
        invoice = self.make_invoice(days_overdue=0, contact_count=0)
        res = ClassificationResultSchema(**classify_invoice(invoice))
        assert res.auto_send_eligible is False
        assert res.escalate is False

    # 5. Calling Formats (Kwargs vs Dict) & Invariants
    def test_tool_accepts_kwargs(self):
        """Tool can be called with keyword arguments directly (Strands tool convention)."""
        result = classify_invoice(
            invoice_id="INV-KW",
            client_name="Beta LLC",
            amount=500.0,
            due_date="2026-08-10",
            days_overdue=6,
            contact_count=0,
            dispute_flag=False,
            owner_high_value_threshold=10000.0,
        )
        res = ClassificationResultSchema(**result)
        assert res.tier == "TIER_1"
        assert res.auto_send_eligible is True

    def test_invariant_auto_send_never_true_when_escalated(self):
        """System Invariant: auto_send_eligible must NEVER be True when escalate is True."""
        for days in [0, 5, 15, 25]:
            for contacts in [0, 1, 2]:
                for dispute in [True, False]:
                    for amount in [500.0, 50000.0]:
                        invoice = self.make_invoice(
                            days_overdue=days,
                            contact_count=contacts,
                            dispute_flag=dispute,
                            amount=amount,
                        )
                        res = ClassificationResultSchema(**classify_invoice(invoice))
                        if res.escalate:
                            assert res.auto_send_eligible is False, f"Violation for invoice {invoice}"
                        if res.tier == "TIER_3":
                            assert res.escalate is True, f"Tier 3 must escalate for invoice {invoice}"
