"""Pydantic validation models for Chazer agent tools and test suites."""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class InvoiceTestSchema(BaseModel):
    """Validation schema for invoice inputs under test."""
    invoice_id: str
    client_name: str
    client_email: str = "client@example.com"
    amount: float = Field(gt=0)
    due_date: str
    days_overdue: int = Field(ge=0)
    contact_count: int = Field(ge=0)
    dispute_flag: bool = False
    owner_high_value_threshold: float = 10000.0
    last_contact_summary: Optional[str] = None
    client_reply_text: Optional[str] = None


class ClassificationResultSchema(BaseModel):
    """Validation schema for classification outputs."""
    tier: Literal["TIER_1", "TIER_2", "TIER_3", "UNCLASSIFIED"]
    auto_send_eligible: bool
    escalate: bool
    escalation_reason: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class EmailDraftSchema(BaseModel):
    """Validation schema for drafted emails."""
    subject: str = Field(min_length=5)
    body: str = Field(min_length=20)
    word_count: int = Field(le=200)
    validation_passed: bool = True
    tier: Optional[Literal["TIER_1", "TIER_2", "TIER_3"]] = None


class SendEmailOutputSchema(BaseModel):
    """Validation schema for send_email tool output."""
    success: bool
    resend_message_id: Optional[str] = None
    timestamp_utc: str
    error: Optional[str] = None


class AuditLogEntrySchema(BaseModel):
    """Validation schema for write_audit_log tool output."""
    log_id: str
    sweep_id: Optional[str] = None
    invoice_id: Optional[str] = None
    owner_id: str = "demo_owner"
    action: str
    status: str
    metadata: dict = Field(default_factory=dict)
    created_at: str

