"""Deterministic Rule-Based Escalation Classifier Tool for Chazer Agent.

Implements the Tier assignment logic, high-value threshold escalation,
dispute freeze invariants, and late-start edge case handling per docs/03, docs/04, and docs/14.
"""

from typing import Any, Dict, Optional

try:
    from strands import tool  # type: ignore
except ImportError:
    try:
        from strands_agents import tool  # type: ignore
    except ImportError:
        def tool(fn):
            """Fallback decorator if strands SDK is not installed in local environment."""
            return fn


@tool
def classify_invoice(
    invoice_data: Optional[Dict[str, Any]] = None,
    *,
    invoice_id: str = "",
    client_name: str = "",
    amount: float = 0.0,
    due_date: str = "",
    days_overdue: int = 0,
    contact_count: int = 0,
    dispute_flag: bool = False,
    owner_high_value_threshold: float = 10000.0,
    last_contact_summary: Optional[str] = None,
    client_reply_text: Optional[str] = None,
    client_email: Optional[str] = None,
    **extra: Any,
) -> Dict[str, Any]:
    """Classifies an overdue invoice and determines its escalation tier and action.

    Args:
        invoice_data: Optional dictionary containing invoice attributes.
        invoice_id: Unique identifier for the invoice (e.g. "INV-001").
        client_name: Name of the billing client.
        amount: Outstanding balance in USD.
        due_date: Original due date (YYYY-MM-DD).
        days_overdue: Integer number of days overdue (>= 0).
        contact_count: Number of prior reminders sent for this invoice.
        dispute_flag: True if client replied with a dispute or negotiation ask.
        owner_high_value_threshold: Dollar amount above which owner approval is mandatory (default 10,000.0).
        last_contact_summary: Summary of previous contact if applicable.
        client_reply_text: Optional text of recent client reply.
        client_email: Client email address.
        **extra: Any additional attributes passed to the tool.

    Returns:
        Dict containing:
            tier: Literal["TIER_1", "TIER_2", "TIER_3", "UNCLASSIFIED"]
            auto_send_eligible: bool (True only if automated email can be sent immediately)
            escalate: bool (True if owner decision queue action is required)
            escalation_reason: str (Human-readable rationale)
            confidence: float (1.0 for deterministic rules)
    """
    # Merge dictionary argument if supplied
    data: Dict[str, Any] = {}
    if isinstance(invoice_data, dict):
        data.update(invoice_data)

    # Keyword arguments take precedence or fill defaults
    inv_id = str(data.get("invoice_id") or invoice_id or "")
    amt = float(data.get("amount") if data.get("amount") is not None else amount)
    d_overdue = int(data.get("days_overdue") if data.get("days_overdue") is not None else days_overdue)
    c_count = int(data.get("contact_count") if data.get("contact_count") is not None else contact_count)
    is_dispute = bool(data.get("dispute_flag") if "dispute_flag" in data else dispute_flag)
    threshold = float(
        data.get("owner_high_value_threshold")
        if data.get("owner_high_value_threshold") is not None
        else owner_high_value_threshold
    )

    d_overdue = max(0, d_overdue)
    c_count = max(0, c_count)

    # 1. Rule: Dispute Flag overrides all other rules -> Tier 3 & freeze auto-send
    if is_dispute:
        return {
            "tier": "TIER_3",
            "auto_send_eligible": False,
            "escalate": True,
            "escalation_reason": "Invoice has an active dispute or negotiation flag. Automation frozen pending owner review.",
            "confidence": 1.0,
        }

    # 2. Determine base tier and properties from days_overdue and contact_count
    if d_overdue >= 22:
        base_tier = "TIER_3"
        base_escalate = True
        base_auto_send = False
        base_reason = f"Invoice {inv_id} is {d_overdue} days overdue with {c_count} prior contact(s) (Tier 3 final notice threshold reached)."
    elif 8 <= d_overdue <= 21:
        if c_count >= 1:
            base_tier = "TIER_2"
            base_escalate = False
            base_auto_send = True
            base_reason = f"Invoice {inv_id} is {d_overdue} days overdue with {c_count} prior contact(s) (Tier 2 firm reminder)."
        else:
            # Edge Case: Late start with 0 contacts -> Treat as Tier 1 first contact
            base_tier = "TIER_1"
            base_escalate = False
            base_auto_send = True
            base_reason = f"Invoice {inv_id} is {d_overdue} days overdue with 0 prior contacts (late start; treated as Tier 1 initial nudge)."
    elif 1 <= d_overdue <= 7:
        if c_count == 0:
            base_tier = "TIER_1"
            base_escalate = False
            base_auto_send = True
            base_reason = f"Invoice {inv_id} is {d_overdue} days overdue with 0 prior contacts (Tier 1 friendly nudge)."
        else:
            base_tier = "TIER_1"
            base_escalate = False
            base_auto_send = False
            base_reason = f"Invoice {inv_id} is {d_overdue} days overdue and was already contacted {c_count} time(s) during Tier 1."
    else:  # d_overdue == 0
        base_tier = "UNCLASSIFIED"
        base_escalate = False
        base_auto_send = False
        base_reason = f"Invoice {inv_id} is current (0 days overdue); no collection action required."

    # 3. Rule: High-Value Threshold override -> Always requires owner approval
    if amt >= threshold:
        assigned_tier = base_tier if base_tier != "UNCLASSIFIED" else "TIER_1"
        return {
            "tier": assigned_tier,
            "auto_send_eligible": False,
            "escalate": True,
            "escalation_reason": f"High-Value Invoice (${amt:,.2f} >= threshold ${threshold:,.2f}): requires owner review before contact.",
            "confidence": 1.0,
        }

    # 4. Standard Tier result
    return {
        "tier": base_tier,
        "auto_send_eligible": base_auto_send,
        "escalate": base_escalate,
        "escalation_reason": base_reason,
        "confidence": 1.0 if base_tier != "UNCLASSIFIED" else 0.5,
    }
