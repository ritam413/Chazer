"""Unit and contract tests for draft_email Strands agent tool (AGENT-02).

Tests:
1. Tier 1 friendly email drafting & validation
2. Tier 2 firm reminder drafting (referencing prior contact)
3. Tier 3 final notice drafting
4. Accurate word count computation
5. Validation failures: word count > 200 words, missing invoice_id, missing amount, legal threats
6. Retry on invalid JSON response and eventual LLMParseError
7. LLMTimeoutError on timeout
8. Dual invocation (dict vs kwargs)
9. Pydantic EmailDraftSchema compliance
"""

import json
from unittest.mock import patch, MagicMock
import pytest
from pydantic import ValidationError

from agent.tests.schemas import EmailDraftSchema
from agent.tools.draft_email import (
    draft_email,
    validate_draft,
    LLMTimeoutError,
    LLMParseError,
    build_draft_prompt,
)


@pytest.fixture
def base_invoice():
    return {
        "invoice_id": "INV-042",
        "client_name": "Acme Corp",
        "client_email": "ap@acme.com",
        "owner_name": "Maya Chen",
        "owner_email": "maya@mayadesigns.co",
        "amount": 4800.00,
        "due_date": "2026-08-20",
        "tier": "TIER_1",
        "prior_contact_date": None,
        "services_description": "UX Design Sprint — August 2026",
    }


def make_mock_completion(content: str):
    """Helper to mock litellm / LLM response object."""
    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    mock_message.content = content
    mock_choice.message = mock_message
    mock_resp.choices = [mock_choice]
    return mock_resp


# =========================================================================
# 1. Tier-Specific Draft Generation & Validation
# =========================================================================

def test_draft_tier_1_warm_tone_and_content(base_invoice):
    """Tier 1 draft should be warm and polite, containing all required fields."""
    mock_content = json.dumps({
        "subject": "Friendly Reminder: Invoice #INV-042 — $4,800.00",
        "body": "Hi Acme Corp team,\n\nI hope you're having a great week! Just sending a quick, friendly reminder regarding invoice #INV-042 for $4,800.00, which was due on 2026-08-20 for UX Design Sprint — August 2026.\n\nPlease let me know if you need any additional details.\n\nBest regards,\nMaya Chen",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    assert result["subject"] == "Friendly Reminder: Invoice #INV-042 — $4,800.00"
    assert "INV-042" in result["body"]
    assert "4,800.00" in result["body"] or "4800" in result["body"]
    assert "2026-08-20" in result["body"]
    assert result["word_count"] == len(result["body"].split())
    assert result["word_count"] <= 200
    assert result["validation_passed"] is True

    # Pydantic schema validation
    validated = EmailDraftSchema(**result)
    assert validated.validation_passed is True


def test_draft_tier_2_firm_references_prior_contact(base_invoice):
    """Tier 2 draft should reference prior contact date and be firmer."""
    tier2_invoice = {
        **base_invoice,
        "tier": "TIER_2",
        "prior_contact_date": "2026-09-01",
    }
    mock_content = json.dumps({
        "subject": "Second Reminder: Invoice #INV-042 — $4,800.00 Overdue",
        "body": "Hi Acme Corp team,\n\nI am following up on my previous reminder sent on 2026-09-01 regarding overdue invoice #INV-042 for $4,800.00 (due 2026-08-20). Please provide an update on when payment can be expected.\n\nThank you,\nMaya Chen",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(tier2_invoice)

    assert "INV-042" in result["body"]
    assert "2026-09-01" in result["body"]
    assert result["validation_passed"] is True
    validated = EmailDraftSchema(**result)
    assert validated.validation_passed is True


def test_draft_tier_3_final_notice(base_invoice):
    """Tier 3 draft should be a formal, professional final notice without unlawful threats."""
    tier3_invoice = {
        **base_invoice,
        "tier": "TIER_3",
        "prior_contact_date": "2026-09-05",
    }
    mock_content = json.dumps({
        "subject": "Final Notice: Overdue Invoice #INV-042 ($4,800.00)",
        "body": "Dear Acme Corp,\n\nThis is a final notice regarding outstanding invoice #INV-042 for $4,800.00, which was due on 2026-08-20. Despite multiple reminders, this balance remains unpaid. Please arrange settlement immediately.\n\nSincerely,\nMaya Chen",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(tier3_invoice)

    assert "INV-042" in result["body"]
    assert result["validation_passed"] is True
    assert result["word_count"] <= 200
    validated = EmailDraftSchema(**result)
    assert validated.validation_passed is True


# =========================================================================
# 2. Word Count and Validation Rule Tests
# =========================================================================

def test_word_count_calculation_accuracy(base_invoice):
    """Word count must strictly reflect the actual split token count of the body."""
    body_text = "One two three four five six seven eight nine ten."
    mock_content = json.dumps({
        "subject": "Invoice #INV-042 Notice",
        "body": f"Invoice #INV-042 for $4,800.00 due on 2026-08-20. {body_text}",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    expected_words = len(result["body"].split())
    assert result["word_count"] == expected_words


def test_validation_fails_if_word_count_exceeds_200(base_invoice):
    """Validation must fail if body exceeds 200 words."""
    long_body = "word " * 205 + "INV-042 $4,800.00 2026-08-20"
    mock_content = json.dumps({
        "subject": "Overdue Notice",
        "body": long_body,
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    assert result["word_count"] > 200
    assert result["validation_passed"] is False


def test_validation_fails_if_invoice_id_missing(base_invoice):
    """Validation must fail if invoice_id is not in the body."""
    mock_content = json.dumps({
        "subject": "Invoice Reminder",
        "body": "Hello, please pay $4,800.00 due on 2026-08-20 at your earliest convenience.",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    assert result["validation_passed"] is False


def test_validation_fails_if_amount_missing(base_invoice):
    """Validation must fail if the dollar amount is not in the body."""
    mock_content = json.dumps({
        "subject": "Invoice #INV-042 Reminder",
        "body": "Hello, please pay invoice #INV-042 which was due on 2026-08-20.",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    assert result["validation_passed"] is False


def test_validation_fails_if_legal_threats_present(base_invoice):
    """Validation must fail if prohibited legal threats / collections agency language is present."""
    threat_body = (
        "This is regarding invoice #INV-042 for $4,800.00 due on 2026-08-20. "
        "If you do not pay immediately, we will take legal action and hire a collection agency to sue you in court."
    )
    mock_content = json.dumps({
        "subject": "Final Demand: Invoice #INV-042",
        "body": threat_body,
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(base_invoice)

    assert result["validation_passed"] is False


# =========================================================================
# 3. LLM Retry, Parse Error, and Timeout Error Handling
# =========================================================================

def test_retry_on_invalid_json_then_success(base_invoice):
    """Should retry once if the first LLM output is malformed JSON, succeeding if the 2nd is valid."""
    invalid_raw = "Here is the drafted email: { invalid json"
    valid_raw = json.dumps({
        "subject": "Invoice #INV-042 — $4,800.00",
        "body": "Hi Acme Corp, reminder for invoice #INV-042 for $4,800.00 due on 2026-08-20.",
    })

    call_count = 0

    def mock_llm_call(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return invalid_raw
        return valid_raw

    with patch("agent.tools.draft_email.call_llm", side_effect=mock_llm_call):
        result = draft_email(base_invoice)

    assert call_count == 2
    assert result["subject"] == "Invoice #INV-042 — $4,800.00"
    assert result["validation_passed"] is True


def test_raises_llm_parse_error_after_retry_fails(base_invoice):
    """Should raise LLMParseError if LLM fails to output valid JSON after retry."""
    invalid_raw = "Not JSON at all"

    with patch("agent.tools.draft_email.call_llm", return_value=invalid_raw):
        with pytest.raises(LLMParseError) as exc_info:
            draft_email(base_invoice)

    assert "Failed to parse LLM response into JSON" in str(exc_info.value)


def test_raises_llm_timeout_error(base_invoice):
    """Should raise LLMTimeoutError if the LLM call times out or throws TimeoutError."""
    with patch("agent.tools.draft_email.call_llm", side_effect=TimeoutError("Request timed out after 15s")):
        with pytest.raises(LLMTimeoutError) as exc_info:
            draft_email(base_invoice, timeout=15.0)

    assert "LLM request timed out" in str(exc_info.value)


# =========================================================================
# 4. Dual Invocation & Fallback / Prompt Building Tests
# =========================================================================

def test_keyword_arguments_invocation():
    """Tool should work directly with kwargs instead of a single dictionary."""
    mock_content = json.dumps({
        "subject": "Invoice #INV-100 — $2,500.00",
        "body": "Reminder for invoice #INV-100 for $2,500.00 due on 2026-09-01.",
    })

    with patch("agent.tools.draft_email.call_llm", return_value=mock_content):
        result = draft_email(
            invoice_id="INV-100",
            client_name="Beta LLC",
            client_email="billing@beta.io",
            owner_name="Maya Chen",
            owner_email="maya@mayadesigns.co",
            amount=2500.0,
            due_date="2026-09-01",
            tier="TIER_1",
        )

    assert result["subject"] == "Invoice #INV-100 — $2,500.00"
    assert "INV-100" in result["body"]
    assert result["validation_passed"] is True


def test_build_draft_prompt_contains_rules():
    """Prompt builder should embed all domain constraints and context."""
    prompt = build_draft_prompt({
        "invoice_id": "INV-777",
        "client_name": "Gamma Inc",
        "amount": 9500.0,
        "due_date": "2026-07-15",
        "tier": "TIER_2",
        "prior_contact_date": "2026-08-01",
    })

    assert "INV-777" in prompt
    assert "9,500.00" in prompt or "9500" in prompt
    assert "TIER_2" in prompt
    assert "2026-08-01" in prompt
    assert "200 words" in prompt
    assert "JSON" in prompt
