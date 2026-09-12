"""Unit and contract tests for send_email Strands agent tool (AGENT-03).

Tests:
1. Sandbox mode mock email sending (returns mock ID without live request)
2. Live Resend API invocation with Idempotency-Key
3. Error handling on API failure
4. Dual invocation support (dict vs kwargs)
5. Pydantic SendEmailOutputSchema validation
"""

from unittest.mock import patch, MagicMock
import pytest
from pydantic import ValidationError

from agent.tests.schemas import SendEmailOutputSchema
from agent.tools.send_email import send_email


@pytest.fixture
def email_payload():
    return {
        "to": "ap@acme.com",
        "from_email": "reminders@chazer.dev",
        "subject": "Second Reminder: Invoice #INV-042 — $4,800.00 Overdue",
        "body_text": "Hi Sarah,\n\nI'm following up on my previous reminder regarding invoice #INV-042 for $4,800.00.",
        "invoice_id": "INV-042",
        "idempotency_key": "INV-042-TIER2-20260912",
    }


def test_send_email_sandbox_mode_returns_mock_id(email_payload):
    """When sandbox is True, returns simulated resend_message_id without calling API."""
    result = send_email(email_payload, sandbox=True)

    assert result["success"] is True
    assert result["resend_message_id"].startswith("mock_re_")
    assert "timestamp_utc" in result

    # Validate with Pydantic
    validated = SendEmailOutputSchema(**result)
    assert validated.success is True
    assert validated.resend_message_id is not None


def test_send_email_live_mode_calls_resend_api(email_payload):
    """When sandbox is False, calls Resend API with idempotency key and proper headers."""
    mock_resend_response = {"id": "re_live_123456789"}

    with patch("agent.tools.send_email.execute_resend_send", return_value=mock_resend_response) as mock_send:
        result = send_email(
            email_payload,
            sandbox=False,
            api_key="re_test_key",
        )

        assert result["success"] is True
        assert result["resend_message_id"] == "re_live_123456789"
        assert mock_send.called
        kwargs = mock_send.call_args[1]
        assert kwargs["idempotency_key"] == "INV-042-TIER2-20260912"
        assert kwargs["to"] == "ap@acme.com"

    validated = SendEmailOutputSchema(**result)
    assert validated.success is True


def test_send_email_handles_api_failure(email_payload):
    """API errors should be caught and returned as failure results without crashing the agent."""
    with patch("agent.tools.send_email.execute_resend_send", side_effect=RuntimeError("Resend API rate limit exceeded")):
        result = send_email(
            email_payload,
            sandbox=False,
            api_key="re_test_key",
        )

        assert result["success"] is False
        assert "rate limit exceeded" in result.get("error", "")
        assert result.get("resend_message_id") is None

    validated = SendEmailOutputSchema(**result)
    assert validated.success is False


def test_send_email_keyword_arguments_invocation():
    """Tool should accept unpacked keyword arguments."""
    result = send_email(
        to="billing@gamma.com",
        subject="Invoice Notice",
        body_text="Please find your invoice attached.",
        invoice_id="INV-999",
        idempotency_key="INV-999-TIER1",
        sandbox=True,
    )

    assert result["success"] is True
    assert result["resend_message_id"].startswith("mock_re_")
    validated = SendEmailOutputSchema(**result)
    assert validated.success is True
