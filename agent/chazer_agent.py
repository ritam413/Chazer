"""Chazer Autonomous Invoice Collection Agent (AGENT-04).

Wires the Strands agent toolchain (classify_invoice, draft_email, send_email, write_audit_log)
into an autonomous background sweep engine that ingests overdue receivables, evaluates
escalation ladders, dispatches Tier-1/2 reminders via Resend, and queues high-value or Tier-3
disputes for human owner authorization.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
import os
import time
from typing import Any, Dict, List, Optional
import uuid

from agent.tools.classify import classify_invoice
from agent.tools.draft_email import draft_email, validate_draft, LLMTimeoutError, LLMParseError
from agent.tools.send_email import send_email
from agent.tools.write_audit_log import write_audit_log, get_supabase_client

# Default Fallback Seed Dataset (from data/invoices_seed.csv & docs/05)
DEFAULT_SEEDED_INVOICES: List[Dict[str, Any]] = [
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


@dataclass
class SweepSummary:
    """Telemetry and execution metrics from an autonomous collection sweep."""

    sweep_id: str
    owner_id: str
    status: str
    invoices_processed: int = 0
    emails_sent: int = 0
    escalated_count: int = 0
    skipped_count: int = 0
    failed_count: int = 0
    duration_ms: int = 0
    started_at: str = ""
    completed_at: str = ""
    details: List[Dict[str, Any]] = field(default_factory=list)


class ChazerCollectionAgent:
    """Autonomous collection agent orchestrating the invoice sweep loop."""

    def __init__(
        self,
        owner_id: str = "demo_owner",
        high_value_threshold: float = 10000.0,
        contact_window_hours: int = 72,
        sandbox: bool = True,
        model_id: Optional[str] = None,
        supabase_client: Optional[Any] = None,
    ):
        self.owner_id = owner_id
        self.high_value_threshold = high_value_threshold
        self.contact_window_hours = contact_window_hours
        self.sandbox = sandbox
        self.model_id = model_id or os.environ.get("LLM_MODEL_ID")
        self.supabase = supabase_client or get_supabase_client()

    def _compute_days_overdue(self, due_date_str: str) -> int:
        """Calculates integer days overdue clamped to >= 0."""
        if not due_date_str:
            return 0
        try:
            due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
            today = datetime.now(timezone.utc).date()
            delta = (today - due_date).days
            return max(0, delta)
        except Exception:
            return 0

    def _is_contact_window_active(self, last_contact_at_str: Optional[str]) -> bool:
        """Returns True if the invoice was contacted within contact_window_hours."""
        if not last_contact_at_str:
            return False
        try:
            # Parse ISO timestamp
            clean_str = last_contact_at_str.replace("Z", "+00:00")
            last_contact = datetime.fromisoformat(clean_str)
            if last_contact.tzinfo is None:
                last_contact = last_contact.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            elapsed_hours = (now - last_contact).total_seconds() / 3600.0
            return elapsed_hours < self.contact_window_hours
        except Exception:
            return False

    def _fetch_invoices(self) -> List[Dict[str, Any]]:
        """Fetches active invoices from Supabase or fallback dataset."""
        if self.supabase is not None:
            try:
                res = self.supabase.table("invoices").select("*").execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception:
                pass
        # Return deep copy of default seeded invoices
        return [dict(inv) for inv in DEFAULT_SEEDED_INVOICES]

    def _has_llm_credentials(self) -> bool:
        """Returns True if a real (non-placeholder) LLM API key is configured."""
        for env_var in ("GROK_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "XAI_API_KEY"):
            val = os.environ.get(env_var, "").strip()
            if val and not any(dummy in val.lower() for dummy in ("your-", "your_", "placeholder", "fake", "example")):
                return True
        return False

    def _draft_email_safe(self, invoice_data: Dict[str, Any], tier: str) -> Dict[str, Any]:
        """Safely generates an email draft, using LLM inference when keys exist with template fallback."""
        if self._has_llm_credentials():
            try:
                return draft_email(
                    invoice_data={**invoice_data, "tier": tier},
                    model_id=self.model_id,
                )
            except Exception as exc:
                # If in live production mode, re-raise to record failure; if in sandbox/offline, fallback to template
                if not self.sandbox:
                    raise exc

        # Fallback deterministic template matching strict validation rules for zero-cost / offline testing
        inv_id = invoice_data.get("invoice_id", "INV-000")
        client_name = invoice_data.get("client_name", "Client")
        amount = float(invoice_data.get("amount", 0.0))
        due_date = invoice_data.get("due_date", "2026-08-01")

        if tier == "TIER_1":
            subject = f"Friendly Reminder: Invoice #{inv_id} Due"
            body = (
                f"Hi {client_name},\n\n"
                f"Just a friendly reminder regarding invoice #{inv_id} for ${amount:,.2f}, which was due on {due_date}.\n\n"
                "Please let us know if you have any questions or need another copy.\n\n"
                "Best regards,\nAccounts Team"
            )
        elif tier == "TIER_2":
            subject = f"Second Reminder: Invoice #{inv_id} — ${amount:,.2f} Overdue"
            body = (
                f"Hi {client_name},\n\n"
                f"We are following up on our previous notice regarding invoice #{inv_id} for ${amount:,.2f}, due on {due_date}.\n\n"
                "We would appreciate your prompt settlement at your earliest convenience.\n\n"
                "Sincerely,\nAccounts Team"
            )
        else:  # TIER_3
            subject = f"Final Notice: Invoice #{inv_id} — Urgent Settlement Required"
            body = (
                f"Dear Accounts Payable,\n\n"
                f"This is a formal final notice regarding overdue invoice #{inv_id} for ${amount:,.2f}, originally due on {due_date}.\n\n"
                "Please arrange payment immediately to bring your account up to date.\n\n"
                "Sincerely,\nFinance Department"
            )

        return {
            "subject": subject,
            "body": body,
            "word_count": len(body.split()),
            "validation_passed": validate_draft(body, inv_id, amount, due_date),
            "tier": tier,
        }

    def run_sweep(self) -> SweepSummary:
        """Executes the full per-invoice autonomous sweep cycle."""
        sweep_id = f"sweep_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        start_time = time.time()
        start_iso = datetime.now(timezone.utc).isoformat()

        # 1. Record SWEEP_STARTED in audit log & sweep_runs
        write_audit_log(
            sweep_id=sweep_id,
            owner_id=self.owner_id,
            action="SWEEP_STARTED",
            status="RUNNING",
            metadata={"source": "agent_cli", "sandbox": self.sandbox},
            supabase_client=self.supabase,
        )

        if self.supabase is not None:
            try:
                self.supabase.table("sweep_runs").insert({
                    "sweep_id": sweep_id,
                    "owner_id": self.owner_id,
                    "status": "RUNNING",
                    "invoices_processed": 0,
                    "emails_sent": 0,
                    "escalated_count": 0,
                    "started_at": start_iso,
                }).execute()
            except Exception:
                pass

        invoices = self._fetch_invoices()
        summary = SweepSummary(
            sweep_id=sweep_id,
            owner_id=self.owner_id,
            status="RUNNING",
            started_at=start_iso,
        )

        for invoice in invoices:
            inv_id = invoice.get("invoice_id", "UNKNOWN")
            summary.invoices_processed += 1

            # Compute actual days overdue if not supplied or update with current clock
            if "days_overdue" not in invoice or invoice.get("days_overdue") is None:
                invoice["days_overdue"] = self._compute_days_overdue(invoice.get("due_date", ""))

            # Contact Window Guard check
            if self._is_contact_window_active(invoice.get("last_contact_at")):
                summary.skipped_count += 1
                summary.details.append({
                    "invoice_id": inv_id,
                    "action": "SKIPPED",
                    "reason": f"Contact window active ({self.contact_window_hours}h guard)",
                })
                continue

            try:
                # 2. Classify Invoice (Deterministic Rules Engine)
                classification = classify_invoice(
                    invoice_data=invoice,
                    owner_high_value_threshold=self.high_value_threshold,
                )
                tier = classification["tier"]
                auto_send = classification["auto_send_eligible"]
                escalate = classification["escalate"]
                reason = classification["escalation_reason"]

                # 3. Draft Email
                draft = self._draft_email_safe(invoice, tier)

                if not draft.get("validation_passed", False):
                    raise ValueError(f"Draft validation failed for invoice {inv_id}")

                # 4. Action Branch: Auto-Send vs Decision Queue Escalation
                if auto_send:
                    # Dispath email via Resend
                    now_str = datetime.now(timezone.utc).strftime("%Y%m%d")
                    idemp_key = f"{inv_id}-{tier}-{now_str}"
                    send_res = send_email(
                        to=invoice.get("client_email", ""),
                        subject=draft["subject"],
                        body_text=draft["body"],
                        invoice_id=inv_id,
                        idempotency_key=idemp_key,
                        sandbox=self.sandbox,
                    )

                    if not send_res.get("success", False):
                        summary.failed_count += 1
                        write_audit_log(
                            sweep_id=sweep_id,
                            invoice_id=inv_id,
                            owner_id=self.owner_id,
                            action="SEND_FAILED",
                            status="FAILED",
                            metadata={"error": send_res.get("error", "Send failure")},
                            supabase_client=self.supabase,
                        )
                        summary.details.append({
                            "invoice_id": inv_id,
                            "action": "SEND_FAILED",
                            "error": send_res.get("error"),
                        })
                        continue

                    # Update Database State
                    now_iso = datetime.now(timezone.utc).isoformat()
                    invoice["last_contact_at"] = now_iso
                    invoice["contact_count"] = int(invoice.get("contact_count", 0)) + 1

                    if self.supabase is not None:
                        try:
                            # Update invoice
                            self.supabase.table("invoices").update({
                                "last_contact_at": now_iso,
                                "contact_count": invoice["contact_count"],
                            }).eq("invoice_id", inv_id).execute()

                            # Record contact_history
                            self.supabase.table("contact_history").insert({
                                "contact_id": f"cnt_{uuid.uuid4().hex[:12]}",
                                "invoice_id": inv_id,
                                "tier": tier,
                                "subject": draft["subject"],
                                "body": draft["body"],
                                "sent_at": now_iso,
                                "resend_message_id": send_res.get("resend_message_id"),
                                "status": "DELIVERED" if not self.sandbox else "SIMULATED",
                            }).execute()
                        except Exception:
                            pass

                    # Record Audit Log
                    if tier == "TIER_1":
                        audit_action = "TIER1_EMAIL_SENT"
                    elif tier == "TIER_2":
                        audit_action = "TIER2_EMAIL_SENT"
                    else:
                        audit_action = "EMAIL_SENT"
                    write_audit_log(
                        sweep_id=sweep_id,
                        invoice_id=inv_id,
                        owner_id=self.owner_id,
                        action=audit_action,
                        status="SENT",
                        metadata={
                            "tier": tier,
                            "subject": draft["subject"],
                            "resend_message_id": send_res.get("resend_message_id"),
                        },
                        supabase_client=self.supabase,
                    )

                    summary.emails_sent += 1
                    summary.details.append({
                        "invoice_id": inv_id,
                        "action": audit_action,
                        "tier": tier,
                        "resend_id": send_res.get("resend_message_id"),
                    })

                elif escalate:
                    # Create Decision Queue item for Owner Approval
                    decision_id = f"dec_{uuid.uuid4().hex[:12]}"
                    is_high_val = invoice.get("amount", 0.0) >= self.high_value_threshold
                    is_dispute = bool(invoice.get("dispute_flag", False))

                    if self.supabase is not None:
                        try:
                            self.supabase.table("decision_queue").insert({
                                "decision_id": decision_id,
                                "invoice_id": inv_id,
                                "owner_id": self.owner_id,
                                "tier": tier,
                                "is_high_value": is_high_val,
                                "escalation_reason": reason,
                                "draft_subject": draft["subject"],
                                "draft_body": draft["body"],
                                "llm_confidence": classification.get("confidence", 0.95),
                                "status": "PENDING_APPROVAL",
                                "created_at": datetime.now(timezone.utc).isoformat(),
                            }).execute()
                        except Exception:
                            pass

                    # Select specific audit action
                    if is_dispute:
                        audit_action = "DISPUTE_ESCALATED"
                    elif is_high_val:
                        audit_action = "HIGH_VALUE_ESCALATED"
                    else:
                        audit_action = "TIER3_ESCALATED"

                    write_audit_log(
                        sweep_id=sweep_id,
                        invoice_id=inv_id,
                        owner_id=self.owner_id,
                        action=audit_action,
                        status="ESCALATED",
                        metadata={
                            "tier": tier,
                            "decision_id": decision_id,
                            "reason": reason,
                            "is_high_value": is_high_val,
                        },
                        supabase_client=self.supabase,
                    )

                    summary.escalated_count += 1
                    summary.details.append({
                        "invoice_id": inv_id,
                        "action": audit_action,
                        "decision_id": decision_id,
                        "tier": tier,
                    })

                else:
                    # Unclassified or skipped
                    summary.skipped_count += 1
                    summary.details.append({
                        "invoice_id": inv_id,
                        "action": "SKIPPED",
                        "reason": reason,
                    })

            except LLMTimeoutError as exc:
                summary.failed_count += 1
                write_audit_log(
                    sweep_id=sweep_id,
                    invoice_id=inv_id,
                    owner_id=self.owner_id,
                    action="LLM_FAILED",
                    status="FAILED",
                    metadata={"reason": "timeout", "error": str(exc)},
                    supabase_client=self.supabase,
                )
                summary.details.append({
                    "invoice_id": inv_id,
                    "action": "LLM_FAILED",
                    "error": str(exc),
                })
                continue

            except Exception as exc:
                summary.failed_count += 1
                write_audit_log(
                    sweep_id=sweep_id,
                    invoice_id=inv_id,
                    owner_id=self.owner_id,
                    action="LLM_FAILED",
                    status="FAILED",
                    metadata={"reason": "exception", "error": str(exc)},
                    supabase_client=self.supabase,
                )
                summary.details.append({
                    "invoice_id": inv_id,
                    "action": "ERROR",
                    "error": str(exc),
                })
                continue

        # 5. Complete Sweep
        end_time = time.time()
        end_iso = datetime.now(timezone.utc).isoformat()
        duration_ms = int((end_time - start_time) * 1000)

        summary.status = "COMPLETED"
        summary.completed_at = end_iso
        summary.duration_ms = duration_ms

        write_audit_log(
            sweep_id=sweep_id,
            owner_id=self.owner_id,
            action="SWEEP_COMPLETED",
            status="SUCCESS",
            metadata={
                "invoices_processed": summary.invoices_processed,
                "emails_sent": summary.emails_sent,
                "escalated_count": summary.escalated_count,
                "skipped_count": summary.skipped_count,
                "failed_count": summary.failed_count,
                "duration_ms": duration_ms,
            },
            supabase_client=self.supabase,
        )

        if self.supabase is not None:
            try:
                self.supabase.table("sweep_runs").update({
                    "status": "COMPLETED",
                    "invoices_processed": summary.invoices_processed,
                    "emails_sent": summary.emails_sent,
                    "escalated_count": summary.escalated_count,
                    "duration_ms": duration_ms,
                    "completed_at": end_iso,
                }).eq("sweep_id", sweep_id).execute()
            except Exception:
                pass

        return summary
