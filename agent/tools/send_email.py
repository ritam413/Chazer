"""Email Sending Tool via Resend API for Chazer Agent (AGENT-03).

Supports live Resend API dispatch with idempotency protection and sandbox mode
for zero-credit testing and development.
"""

from datetime import datetime, timezone
import os
from typing import Any, Dict, Optional
import uuid

try:
    from strands import tool  # type: ignore
except ImportError:
    try:
        from strands_agents import tool  # type: ignore
    except ImportError:
        def tool(fn):
            """Fallback decorator if strands SDK is not installed in local environment."""
            return fn


def execute_resend_send(
    *,
    to: str,
    from_email: str,
    subject: str,
    body_text: str,
    idempotency_key: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Sends email via Resend API using resend-python or requests with Idempotency-Key header."""
    resolved_api_key = api_key or os.environ.get("RESEND_API_KEY", "")
    if not resolved_api_key:
        raise ValueError("RESEND_API_KEY is required for live email dispatch.")

    try:
        import resend  # type: ignore
        resend.api_key = resolved_api_key
        params = {
            "from": from_email,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "text": body_text,
        }
        if idempotency_key:
            resend.api_key = resolved_api_key
            # resend-python allows custom headers or direct dispatch
            params["headers"] = {"Idempotency-Key": idempotency_key}

        response = resend.Emails.send(params)
        return response if isinstance(response, dict) else {"id": getattr(response, "id", str(response))}
    except ImportError:
        # Fallback to direct HTTP request via requests
        import requests
        headers = {
            "Authorization": f"Bearer {resolved_api_key}",
            "Content-Type": "application/json",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        payload = {
            "from": from_email,
            "to": [to] if isinstance(to, str) else to,
            "subject": subject,
            "text": body_text,
        }
        res = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=15)
        res.raise_for_status()
        return res.json()


@tool
def send_email(
    email_data: Optional[Dict[str, Any]] = None,
    *,
    to: str = "",
    from_email: Optional[str] = None,
    subject: str = "",
    body_text: str = "",
    invoice_id: str = "",
    idempotency_key: Optional[str] = None,
    sandbox: Optional[bool] = None,
    api_key: Optional[str] = None,
    **extra: Any,
) -> Dict[str, Any]:
    """Sends an email reminder to a client via Resend or returns simulated sandbox response.

    Args:
        email_data: Optional dictionary containing email parameters.
        to: Recipient email address.
        from_email: Sender email address (defaults to reminders@chazer.dev or RESEND_FROM_EMAIL).
        subject: Email subject line.
        body_text: Email body text.
        invoice_id: Unique invoice identifier.
        idempotency_key: Unique key preventing duplicate email dispatch.
        sandbox: If True, simulates send and returns mock message ID without live API request.
        api_key: Optional Resend API key.
        **extra: Additional parameters.

    Returns:
        Dict containing:
            success: bool
            resend_message_id: Optional[str]
            timestamp_utc: str (ISO-8601)
            error: Optional[str]
    """
    data: Dict[str, Any] = {}
    if isinstance(email_data, dict):
        data.update(email_data)

    target_to = str(data.get("to") or to or "")
    sender_from = str(
        data.get("from_email")
        or data.get("from")
        or from_email
        or os.environ.get("SENDER_EMAIL")
        or os.environ.get("RESEND_FROM_EMAIL")
        or "onboarding@resend.dev"
    )
    email_subject = str(data.get("subject") or subject or "")
    content_body = str(data.get("body_text") or data.get("body") or body_text or "")
    inv_id = str(data.get("invoice_id") or invoice_id or "")

    now_iso = datetime.now(timezone.utc).isoformat()
    now_tag = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    idemp_key = str(data.get("idempotency_key") or idempotency_key or f"{inv_id or 'INV'}-{now_tag}")

    resolved_api_key = api_key or os.environ.get("RESEND_API_KEY", "")

    # Determine sandbox mode
    is_sandbox = True
    if sandbox is not None:
        is_sandbox = sandbox
    elif "sandbox" in data:
        is_sandbox = bool(data["sandbox"])
    elif os.environ.get("RESEND_SANDBOX", "true").lower() in ("false", "0", "no") and resolved_api_key:
        is_sandbox = False

    if is_sandbox or not resolved_api_key:
        mock_id = f"mock_re_{uuid.uuid4().hex[:16]}"
        return {
            "success": True,
            "resend_message_id": mock_id,
            "timestamp_utc": now_iso,
        }

    try:
        response = execute_resend_send(
            to=target_to,
            from_email=sender_from,
            subject=email_subject,
            body_text=content_body,
            idempotency_key=idemp_key,
            api_key=resolved_api_key,
        )
        msg_id = response.get("id") if isinstance(response, dict) else str(response)
        return {
            "success": True,
            "resend_message_id": msg_id,
            "timestamp_utc": now_iso,
        }
    except Exception as exc:
        return {
            "success": False,
            "resend_message_id": None,
            "timestamp_utc": now_iso,
            "error": str(exc),
        }
