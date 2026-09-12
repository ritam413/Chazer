"""Immutable Audit Logging Tool for Chazer Agent (AGENT-03).

Writes structured, immutable audit log events to the Supabase audit_log table
synchronously, recording all automated agent actions, classifications,
draft creations, dispatches, escalations, and failures.
"""

from datetime import datetime, timezone
import os
from typing import Any, Dict, Optional, Set
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


VALID_AUDIT_ACTIONS: Set[str] = {
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
}

VALID_AUDIT_STATUSES: Set[str] = {
    "SENT",
    "ESCALATED",
    "FAILED",
    "PENDING",
    "SUCCESS",
    "RUNNING",
    "COMPLETED",
    "VALIDATION_FAILED",
}


def get_supabase_client() -> Optional[Any]:
    """Instantiates Supabase client if environment variables are configured."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        return None

    try:
        from supabase import create_client  # type: ignore
        return create_client(supabase_url, supabase_key)
    except Exception:
        return None


@tool
def write_audit_log(
    log_data: Optional[Dict[str, Any]] = None,
    *,
    sweep_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    owner_id: str = "demo_owner",
    action: str = "",
    status: str = "SUCCESS",
    metadata: Optional[Dict[str, Any]] = None,
    supabase_client: Optional[Any] = None,
    **extra: Any,
) -> Dict[str, Any]:
    """Writes an immutable record to the audit_log table.

    Args:
        log_data: Optional dictionary containing audit record fields.
        sweep_id: Associated sweep run ID (e.g. 'sweep_20260912_090000').
        invoice_id: Associated invoice ID (e.g. 'INV-042').
        owner_id: Workspace owner ID (defaults to 'demo_owner').
        action: Audit action name (e.g. 'TIER1_EMAIL_SENT').
        status: Status code (e.g. 'SENT', 'ESCALATED', 'FAILED').
        metadata: Arbitrary JSON payload with execution details.
        supabase_client: Optional Supabase client override.
        **extra: Additional attributes.

    Returns:
        Dict representing the persisted audit log entry.
    """
    data: Dict[str, Any] = {}
    if isinstance(log_data, dict):
        data.update(log_data)

    s_id = data.get("sweep_id") or sweep_id
    inv_id = data.get("invoice_id") or invoice_id
    o_id = str(data.get("owner_id") or owner_id or "demo_owner")
    act = str(data.get("action") or action or "UNKNOWN_ACTION")
    st = str(data.get("status") or status or "SUCCESS")
    meta = data.get("metadata") if "metadata" in data else metadata
    if meta is None:
        meta = {}

    log_entry: Dict[str, Any] = {
        "log_id": str(uuid.uuid4()),
        "sweep_id": s_id,
        "invoice_id": inv_id,
        "owner_id": o_id,
        "action": act,
        "status": st,
        "metadata": meta,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Attempt Supabase persistence if client is available
    client = supabase_client or get_supabase_client()
    if client is not None:
        try:
            client.table("audit_log").insert(log_entry).execute()
        except Exception as exc:
            # Fallback for resilience — do not crash caller if DB network blips
            log_entry["metadata"]["_db_sync_error"] = str(exc)

    return log_entry
