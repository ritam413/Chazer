"""Unit and integration tests for ChazerCollectionAgent and sweep loop (AGENT-04).

Tests per-invoice sweep execution, tier escalation, high-value decision queueing,
contact window guards, failure resilience (single failure does not crash sweep),
audit logging, and sweep_runs metadata creation.
"""

from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import MagicMock, patch
from typing import Any, Dict, List

from agent.chazer_agent import ChazerCollectionAgent, SweepSummary
from agent.tools.draft_email import LLMTimeoutError


@pytest.fixture
def mock_seeded_invoices() -> List[Dict[str, Any]]:
    """Returns standard 8-invoice seed dataset from docs/05."""
    return [
        {
            "invoice_id": "INV-001",
            "client_id": "CLI-001",
            "client_name": "Acme Corp",
            "client_email": "ap@acme.com",
            "amount": 4800.00,
            "currency": "USD",
            "due_date": "2026-08-15",
            "days_overdue": 28,
            "contact_count": 0,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "UX Design Sprint — August 2026",
        },
        {
            "invoice_id": "INV-002",
            "client_id": "CLI-002",
            "client_name": "Bluebell Studios",
            "client_email": "finance@bluebell.io",
            "amount": 12500.00,
            "currency": "USD",
            "due_date": "2026-08-01",
            "days_overdue": 42,
            "contact_count": 0,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "Brand Identity Package",
        },
        {
            "invoice_id": "INV-003",
            "client_id": "CLI-003",
            "client_name": "Cascade Tech",
            "client_email": "sarah.l@cascade.com",
            "amount": 890.00,
            "currency": "USD",
            "due_date": "2026-08-28",
            "days_overdue": 15,
            "contact_count": 1,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "Landing Page — Revision 2",
        },
        {
            "invoice_id": "INV-004",
            "client_id": "CLI-001",
            "client_name": "Acme Corp",
            "client_email": "ap@acme.com",
            "amount": 3200.00,
            "currency": "USD",
            "due_date": "2026-09-01",
            "days_overdue": 11,
            "contact_count": 0,
            "status": "SENT",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "Monthly Retainer — September",
        },
        {
            "invoice_id": "INV-005",
            "client_id": "CLI-004",
            "client_name": "DeltaWave Media",
            "client_email": "billing@deltawave.com",
            "amount": 55000.00,
            "currency": "USD",
            "due_date": "2026-07-31",
            "days_overdue": 43,
            "contact_count": 0,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "IT Infrastructure Audit",
        },
        {
            "invoice_id": "INV-006",
            "client_id": "CLI-005",
            "client_name": "Ember Creative",
            "client_email": "jo@embercreative.co",
            "amount": 1400.00,
            "currency": "USD",
            "due_date": "2026-09-05",
            "days_overdue": 7,
            "contact_count": 0,
            "status": "SENT",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "Social Media Package",
        },
        {
            "invoice_id": "INV-007",
            "client_id": "CLI-002",
            "client_name": "Bluebell Studios",
            "client_email": "finance@bluebell.io",
            "amount": 7200.00,
            "currency": "USD",
            "due_date": "2026-08-10",
            "days_overdue": 33,
            "contact_count": 0,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "Web App Development Phase 1",
        },
        {
            "invoice_id": "INV-008",
            "client_id": "CLI-006",
            "client_name": "Foxglove Labs",
            "client_email": "accounts@foxglove.io",
            "amount": 2100.00,
            "currency": "USD",
            "due_date": "2026-08-22",
            "days_overdue": 21,
            "contact_count": 1,
            "status": "OVERDUE",
            "dispute_flag": False,
            "last_contact_at": None,
            "services_description": "API Integration Consulting",
        },
    ]


class MockSupabaseClient:
    """In-memory mock for Supabase client supporting table operations."""

    def __init__(self, initial_invoices: List[Dict[str, Any]] = None):
        self.invoices = list(initial_invoices or [])
        self.contact_history: List[Dict[str, Any]] = []
        self.decision_queue: List[Dict[str, Any]] = []
        self.audit_log: List[Dict[str, Any]] = []
        self.sweep_runs: List[Dict[str, Any]] = []

    def table(self, table_name: str):
        mock_table = MagicMock()

        if table_name == "invoices":
            # select().execute()
            mock_select = MagicMock()
            mock_select.execute.return_value = MagicMock(data=self.invoices)
            mock_table.select.return_value = mock_select

            # update().eq().execute()
            def handle_update(update_payload):
                mock_eq = MagicMock()
                def handle_eq(col, val):
                    for inv in self.invoices:
                        if inv.get(col) == val:
                            inv.update(update_payload)
                    mock_exec = MagicMock()
                    mock_exec.execute.return_value = MagicMock(data=[inv])
                    return mock_exec
                mock_eq.eq.side_effect = handle_eq
                return mock_eq
            mock_table.update.side_effect = handle_update

        elif table_name == "contact_history":
            def handle_insert(record):
                self.contact_history.append(record)
                m = MagicMock()
                m.execute.return_value = MagicMock(data=[record])
                return m
            mock_table.insert.side_effect = handle_insert

        elif table_name == "decision_queue":
            def handle_insert(record):
                self.decision_queue.append(record)
                m = MagicMock()
                m.execute.return_value = MagicMock(data=[record])
                return m
            mock_table.insert.side_effect = handle_insert

        elif table_name == "audit_log":
            def handle_insert(record):
                self.audit_log.append(record)
                m = MagicMock()
                m.execute.return_value = MagicMock(data=[record])
                return m
            mock_table.insert.side_effect = handle_insert

        elif table_name == "sweep_runs":
            def handle_insert(record):
                self.sweep_runs.append(record)
                m = MagicMock()
                m.execute.return_value = MagicMock(data=[record])
                return m
            mock_table.insert.side_effect = handle_insert

            def handle_update(update_payload):
                mock_eq = MagicMock()
                def handle_eq(col, val):
                    for sr in self.sweep_runs:
                        if sr.get(col) == val:
                            sr.update(update_payload)
                    mock_exec = MagicMock()
                    mock_exec.execute.return_value = MagicMock(data=[sr])
                    return mock_exec
                mock_eq.eq.side_effect = handle_eq
                return mock_eq
            mock_table.update.side_effect = handle_update

        return mock_table


def test_agent_initialization():
    """Verifies that ChazerCollectionAgent initializes with default thresholds."""
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        high_value_threshold=10000.0,
        contact_window_hours=72,
        sandbox=True,
    )
    assert agent.owner_id == "demo_owner"
    assert agent.high_value_threshold == 10000.0
    assert agent.contact_window_hours == 72
    assert agent.sandbox is True


def test_full_sweep_processes_seeded_invoices(mock_seeded_invoices):
    """Verifies that a full sweep runs against seeded invoices with correct tier actions."""
    mock_db = MockSupabaseClient(mock_seeded_invoices)
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        high_value_threshold=10000.0,
        contact_window_hours=72,
        sandbox=True,
        supabase_client=mock_db,
    )

    summary: SweepSummary = agent.run_sweep()

    # Total 8 invoices
    assert summary.invoices_processed == 8
    assert summary.status == "COMPLETED"

    # High value items ($55k INV-005, $12.5k INV-002) + Tier 3 items (INV-001, INV-007) escalate to decision queue
    # INV-003 ($890, 15d, 1 contact -> Tier 2 auto-send)
    # INV-004 ($3200, 11d, 0 contact -> Tier 1 late-start auto-send)
    # INV-006 ($1400, 7d, 0 contact -> Tier 1 auto-send)
    # INV-008 ($2100, 21d, 1 contact -> Tier 2 auto-send)
    assert summary.emails_sent == 4
    assert summary.escalated_count == 4
    assert summary.skipped_count == 0

    # Verify INV-005 ($55,000) was escalated and created a decision_queue record without email send
    inv5_decisions = [d for d in mock_db.decision_queue if d["invoice_id"] == "INV-005"]
    assert len(inv5_decisions) == 1
    assert inv5_decisions[0]["status"] == "PENDING_APPROVAL"
    assert "High-Value" in inv5_decisions[0]["escalation_reason"] or "$55,000" in inv5_decisions[0]["escalation_reason"]

    # Verify INV-006 was auto-sent and contact_history created
    inv6_contacts = [c for c in mock_db.contact_history if c["invoice_id"] == "INV-006"]
    assert len(inv6_contacts) == 1
    assert inv6_contacts[0]["tier"] == "TIER_1"

    # Verify sweep_runs record created
    assert len(mock_db.sweep_runs) == 1
    assert mock_db.sweep_runs[0]["status"] == "COMPLETED"
    assert mock_db.sweep_runs[0]["invoices_processed"] == 8
    assert mock_db.sweep_runs[0]["emails_sent"] == 4
    assert mock_db.sweep_runs[0]["escalated_count"] == 4

    # Verify audit_log has entries for start, sweep actions, and complete
    assert len(mock_db.audit_log) >= 10
    actions = [a["action"] for a in mock_db.audit_log]
    assert "SWEEP_STARTED" in actions
    assert "SWEEP_COMPLETED" in actions
    assert "TIER1_EMAIL_SENT" in actions
    assert "TIER2_EMAIL_SENT" in actions
    assert "HIGH_VALUE_ESCALATED" in actions


def test_contact_window_guard_skips_recent_contact(mock_seeded_invoices):
    """Verifies that an invoice contacted within 72h is skipped."""
    now_iso = datetime.now(timezone.utc).isoformat()
    mock_seeded_invoices[5]["last_contact_at"] = now_iso  # INV-006 contacted just now

    mock_db = MockSupabaseClient(mock_seeded_invoices)
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        contact_window_hours=72,
        sandbox=True,
        supabase_client=mock_db,
    )

    summary = agent.run_sweep()
    assert summary.invoices_processed == 8
    assert summary.skipped_count == 1  # INV-006 skipped
    assert summary.emails_sent == 3    # only INV-003, INV-004, INV-008 sent


def test_idempotent_sweep_consecutive_runs(mock_seeded_invoices):
    """Running the sweep twice consecutively produces 0 new sends on the second run."""
    mock_db = MockSupabaseClient(mock_seeded_invoices)
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        sandbox=True,
        supabase_client=mock_db,
    )

    first_run = agent.run_sweep()
    assert first_run.emails_sent == 4

    # Second run immediately
    second_run = agent.run_sweep()
    assert second_run.emails_sent == 0
    # All previously auto-sent invoices are now in the contact window
    assert second_run.skipped_count >= 4


def test_single_invoice_failure_does_not_abort_sweep(mock_seeded_invoices):
    """A failure in LLM drafting or email sending on one invoice does not abort the rest."""
    mock_db = MockSupabaseClient(mock_seeded_invoices)
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        sandbox=True,
        supabase_client=mock_db,
    )

    # Patch draft_email to raise for INV-006 only
    original_draft = agent._draft_email_safe

    def flaky_draft(invoice_data, tier):
        if invoice_data.get("invoice_id") == "INV-006":
            raise LLMTimeoutError("Simulated LLM Timeout on INV-006")
        return original_draft(invoice_data, tier)

    agent._draft_email_safe = flaky_draft

    summary = agent.run_sweep()

    # 8 invoices evaluated, INV-006 failed, remaining 7 processed
    assert summary.invoices_processed == 8
    assert summary.emails_sent == 3  # INV-003, INV-004, INV-008
    assert summary.escalated_count == 4  # INV-001, INV-002, INV-005, INV-007
    assert summary.failed_count == 1  # INV-006

    # Verify LLM_FAILED audit entry logged for INV-006
    llm_failed_logs = [l for l in mock_db.audit_log if l.get("action") == "LLM_FAILED"]
    assert len(llm_failed_logs) == 1
    assert llm_failed_logs[0]["invoice_id"] == "INV-006"


def test_dispute_flag_triggers_tier3_escalation():
    """An invoice with dispute_flag=True is escalated to decision queue as dispute."""
    invoices = [
        {
            "invoice_id": "INV-999",
            "client_id": "CLI-999",
            "client_name": "Disputed Client",
            "client_email": "dispute@client.com",
            "amount": 500.00,
            "currency": "USD",
            "due_date": "2026-09-01",
            "days_overdue": 3,
            "contact_count": 0,
            "status": "DISPUTED",
            "dispute_flag": True,
            "last_contact_at": None,
            "services_description": "Small consultation",
        }
    ]
    mock_db = MockSupabaseClient(invoices)
    agent = ChazerCollectionAgent(
        owner_id="demo_owner",
        sandbox=True,
        supabase_client=mock_db,
    )

    summary = agent.run_sweep()
    assert summary.invoices_processed == 1
    assert summary.emails_sent == 0
    assert summary.escalated_count == 1

    assert len(mock_db.decision_queue) == 1
    assert mock_db.decision_queue[0]["invoice_id"] == "INV-999"
    assert "dispute" in mock_db.decision_queue[0]["escalation_reason"].lower()
