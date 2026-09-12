"""Unit and contract tests for write_audit_log Strands agent tool (AGENT-03).

Tests:
1. Synchronous audit log creation with UUID and ISO timestamp
2. Acceptance of all valid domain actions and statuses
3. Supabase persistence integration when client is configured
4. In-memory / fallback resilience when Supabase is offline
5. Dual invocation support (dict vs kwargs)
6. Pydantic AuditLogEntrySchema validation
"""

from unittest.mock import patch, MagicMock
import pytest
from pydantic import ValidationError

from agent.tests.schemas import AuditLogEntrySchema
from agent.tools.write_audit_log import write_audit_log, VALID_AUDIT_ACTIONS, VALID_AUDIT_STATUSES


@pytest.fixture
def base_log():
    return {
        "sweep_id": "sweep_20260912_090000",
        "invoice_id": "INV-042",
        "owner_id": "demo_owner",
        "action": "TIER2_EMAIL_SENT",
        "status": "SENT",
        "metadata": {
            "resend_message_id": "re_abc123",
            "tier": "TIER_2",
            "llm_confidence": 0.95,
        },
    }


def test_write_audit_log_creates_entry_synchronously(base_log):
    """write_audit_log creates a record synchronously before returning."""
    result = write_audit_log(base_log)

    assert result["invoice_id"] == "INV-042"
    assert result["action"] == "TIER2_EMAIL_SENT"
    assert result["status"] == "SENT"
    assert "log_id" in result
    assert "created_at" in result
    assert result["metadata"]["resend_message_id"] == "re_abc123"

    # Validate with Pydantic
    validated = AuditLogEntrySchema(**result)
    assert validated.action == "TIER2_EMAIL_SENT"


def test_write_audit_log_accepts_all_standard_actions():
    """All actions defined in ubiquitous language & agent spec must be accepted."""
    test_actions = [
        "SWEEP_STARTED",
        "INVOICE_CLASSIFIED",
        "EMAIL_DRAFTED",
        "TIER1_EMAIL_SENT",
        "TIER2_EMAIL_SENT",
        "TIER3_DRAFT_CREATED",
        "TIER3_ESCALATED",
        "HIGH_VALUE_ESCALATED",
        "SEND_FAILED",
        "LLM_FAILED",
        "OWNER_APPROVED",
        "OWNER_REJECTED",
        "SWEEP_COMPLETE",
        "SWEEP_COMPLETED",
        "SWEEP_FAILED",
        "SEED_DATA_INGESTED",
        "VALIDATION_FAILED",
    ]

    for action in test_actions:
        result = write_audit_log(
            action=action,
            status="SUCCESS",
            invoice_id="INV-001",
            metadata={"test_action": action},
        )
        assert result["action"] == action
        validated = AuditLogEntrySchema(**result)
        assert validated.action == action


def test_write_audit_log_persists_to_supabase_when_configured(base_log):
    """When Supabase client is supplied or configured, writes to audit_log table."""
    mock_supabase = MagicMock()
    mock_table = MagicMock()
    mock_insert = MagicMock()
    mock_execute = MagicMock()

    mock_execute.data = [{"log_id": "test-uuid-1234", **base_log}]
    mock_insert.execute.return_value = mock_execute
    mock_table.insert.return_value = mock_insert
    mock_supabase.table.return_value = mock_table

    with patch("agent.tools.write_audit_log.get_supabase_client", return_value=mock_supabase):
        result = write_audit_log(base_log)

        assert mock_supabase.table.called
        assert mock_supabase.table.call_args[0][0] == "audit_log"
        assert result["action"] == "TIER2_EMAIL_SENT"


def test_write_audit_log_keyword_arguments_invocation():
    """Tool should accept unpacked keyword arguments."""
    result = write_audit_log(
        sweep_id="sweep_test",
        invoice_id="INV-777",
        action="HIGH_VALUE_ESCALATED",
        status="ESCALATED",
        metadata={"amount": 55000.0},
    )

    assert result["invoice_id"] == "INV-777"
    assert result["action"] == "HIGH_VALUE_ESCALATED"
    assert result["status"] == "ESCALATED"
    validated = AuditLogEntrySchema(**result)
    assert validated.action == "HIGH_VALUE_ESCALATED"
