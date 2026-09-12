"""LLM-Driven Email Drafter Tool for Chazer Agent (AGENT-02).

Generates professional, tier-appropriate email drafts for overdue invoices
using Grok / Gemini via LiteLLM with strict post-generation safety validation,
word count constraints, and robust JSON parsing/retry logic.
"""

import json
import os
import re
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


class LLMTimeoutError(Exception):
    """Raised when an LLM inference call times out."""
    pass


class LLMParseError(Exception):
    """Raised when the LLM output cannot be parsed into the expected JSON structure."""
    pass


# Prohibited aggressive or illegal threat vocabulary
PROHIBITED_TERMS_PATTERN = re.compile(
    r"\b(sue|lawsuit|attorney|lawyer|court|legal action|collection agency|police|penalties|damages|litigation)\b",
    re.IGNORECASE,
)


def validate_draft(
    body: str,
    invoice_id: str,
    amount: float,
    due_date: str,
) -> bool:
    """Validates the generated email body against safety and domain rules.

    Rules:
    1. Body must contain invoice_id
    2. Body must contain dollar amount (e.g., $4,800.00, 4800, etc.)
    3. Body must contain due_date
    4. Word count must be <= 200 words
    5. Must NOT contain prohibited legal threats or harassment vocabulary
    """
    if not body or not body.strip():
        return False

    # 1. Word count constraint
    words = body.split()
    if len(words) > 200:
        return False

    # 2. Invoice ID check
    if invoice_id and invoice_id.lower() not in body.lower():
        return False

    # 3. Amount check (check formatted string or float or integer representation)
    amt_str_formatted = f"{amount:,.2f}"
    amt_str_short = f"{amount:,.0f}" if amount.is_integer() else amt_str_formatted
    amt_str_plain = str(int(amount)) if amount.is_integer() else str(amount)

    has_amount = (
        amt_str_formatted in body
        or amt_str_short in body
        or amt_str_plain in body
        or f"${amount:.2f}" in body
    )
    if not has_amount:
        return False

    # 4. Due date check
    if due_date and due_date not in body:
        return False

    # 5. Prohibited terms / threats check
    if PROHIBITED_TERMS_PATTERN.search(body):
        return False

    return True


def build_draft_prompt(invoice_data: Dict[str, Any]) -> str:
    """Builds the prompt instructing the LLM to draft a tier-specific email."""
    inv_id = invoice_data.get("invoice_id", "")
    client_name = invoice_data.get("client_name", "Client")
    amount = float(invoice_data.get("amount", 0.0))
    due_date = invoice_data.get("due_date", "")
    tier = invoice_data.get("tier", "TIER_1")
    owner_name = invoice_data.get("owner_name", "Account Owner")
    prior_contact_date = invoice_data.get("prior_contact_date")
    services = invoice_data.get("services_description", "professional services")

    if tier == "TIER_3":
        tone_instructions = (
            "Tone: Firm, formal, and unambiguous final notice. "
            "Clearly state that this is a final reminder and request immediate settlement. "
            "Do NOT make legal threats, mention lawsuits, courts, attorneys, or collection agencies."
        )
    elif tier == "TIER_2":
        prior_ref = f" sent on {prior_contact_date}" if prior_contact_date else ""
        tone_instructions = (
            f"Tone: Firmer reminder referencing the prior reminder{prior_ref}. "
            "Communicate urgency while maintaining a polite, professional partnership tone."
        )
    else:  # TIER_1
        tone_instructions = (
            "Tone: Warm, friendly, and polite initial nudge. "
            "Assume the client simply forgot or the invoice was misplaced. Keep it short and helpful."
        )

    prompt = f"""You are an autonomous accounts receivable assistant drafting a professional payment reminder email.

INVOICE CONTEXT:
- Invoice ID: {inv_id}
- Client Name: {client_name}
- Outstanding Amount: ${amount:,.2f}
- Due Date: {due_date}
- Escalation Tier: {tier}
- Prior Contact Date: {prior_contact_date or 'None'}
- Services Rendered: {services}
- Sender / Owner Name: {owner_name}

INSTRUCTIONS & RULES:
1. {tone_instructions}
2. The body MUST include:
   - The invoice ID '{inv_id}'
   - The exact amount '${amount:,.2f}'
   - The due date '{due_date}'
3. The total email body must be under 200 words.
4. Return ONLY a valid JSON object with EXACTLY two keys: 'subject' and 'body'.
5. Do NOT include markdown code fences or any conversational preamble.

JSON Schema:
{{
  "subject": "...",
  "body": "..."
}}
"""
    return prompt.strip()


def call_llm(prompt: str, model_id: Optional[str] = None, timeout: float = 15.0) -> str:
    """Invokes the configured LLM provider using LiteLLM."""
    try:
        import litellm  # type: ignore
    except ImportError:
        raise RuntimeError("litellm is required for LLM inference. Please install litellm.")

    selected_model = (
        model_id
        or os.environ.get("LLM_MODEL_ID")
        or ("xai/grok-beta" if os.environ.get("GROK_API_KEY") else "gemini/gemini-1.5-flash")
    )

    try:
        response = litellm.completion(
            model=selected_model,
            messages=[{"role": "user", "content": prompt}],
            timeout=timeout,
            temperature=0.2,
        )
        return response.choices[0].message.content
    except TimeoutError as exc:
        raise LLMTimeoutError(f"LLM request timed out after {timeout}s: {exc}") from exc
    except Exception as exc:
        # Catch litellm timeout variants
        err_msg = str(exc).lower()
        if "timeout" in err_msg or "timed out" in err_msg:
            raise LLMTimeoutError(f"LLM request timed out: {exc}") from exc
        raise


def _extract_json_payload(raw_content: str) -> Dict[str, Any]:
    """Cleans and extracts JSON object from raw LLM string."""
    cleaned = raw_content.strip()
    # Strip markdown code fences if LLM wrapped it in ```json ... ```
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # Find outermost JSON brackets if there is extra text
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]

    return json.loads(cleaned)


@tool
def draft_email(
    invoice_data: Optional[Dict[str, Any]] = None,
    *,
    invoice_id: str = "",
    client_name: str = "",
    client_email: str = "",
    owner_name: str = "",
    owner_email: str = "",
    amount: float = 0.0,
    due_date: str = "",
    tier: str = "TIER_1",
    prior_contact_date: Optional[str] = None,
    services_description: Optional[str] = None,
    model_id: Optional[str] = None,
    timeout: float = 15.0,
    **extra: Any,
) -> Dict[str, Any]:
    """Generates a professional email draft for an overdue invoice using LLM inference.

    Args:
        invoice_data: Optional dictionary containing invoice attributes.
        invoice_id: Unique invoice identifier (e.g. 'INV-042').
        client_name: Recipient client or business name.
        client_email: Recipient billing email.
        owner_name: Name of the invoice issuer.
        owner_email: Email of the invoice issuer.
        amount: Outstanding balance in USD.
        due_date: Due date (YYYY-MM-DD).
        tier: Escalation tier ('TIER_1', 'TIER_2', 'TIER_3').
        prior_contact_date: Date of previous reminder if applicable.
        services_description: Description of services billed.
        model_id: Optional LLM model identifier.
        timeout: LLM call timeout in seconds.
        **extra: Additional attributes.

    Returns:
        Dict containing:
            subject: str
            body: str
            word_count: int
            validation_passed: bool
            tier: str
    """
    # Merge dictionary argument if supplied
    data: Dict[str, Any] = {}
    if isinstance(invoice_data, dict):
        data.update(invoice_data)

    inv_id = str(data.get("invoice_id") or invoice_id or "")
    c_name = str(data.get("client_name") or client_name or "Client")
    c_email = str(data.get("client_email") or client_email or "")
    o_name = str(data.get("owner_name") or owner_name or "Account Owner")
    o_email = str(data.get("owner_email") or owner_email or "")
    amt = float(data.get("amount") if data.get("amount") is not None else amount)
    d_date = str(data.get("due_date") or due_date or "")
    t_tier = str(data.get("tier") or tier or "TIER_1")
    p_date = data.get("prior_contact_date") or prior_contact_date
    s_desc = data.get("services_description") or services_description

    merged_context = {
        "invoice_id": inv_id,
        "client_name": c_name,
        "client_email": c_email,
        "owner_name": o_name,
        "owner_email": o_email,
        "amount": amt,
        "due_date": d_date,
        "tier": t_tier,
        "prior_contact_date": p_date,
        "services_description": s_desc,
    }

    prompt = build_draft_prompt(merged_context)

    # Attempt 1: Inference & JSON parsing
    parsed_json: Optional[Dict[str, Any]] = None
    last_raw_response = ""

    try:
        raw_response = call_llm(prompt, model_id=model_id, timeout=timeout)
        last_raw_response = raw_response
        parsed_json = _extract_json_payload(raw_response)
    except TimeoutError as exc:
        raise LLMTimeoutError(f"LLM request timed out after {timeout}s: {exc}") from exc
    except Exception:
        parsed_json = None

    # Attempt 2: Retry once on parse failure with strict formatting reminder
    if not parsed_json or not isinstance(parsed_json, dict) or "subject" not in parsed_json or "body" not in parsed_json:
        retry_prompt = (
            f"{prompt}\n\nIMPORTANT: Your previous output was not valid JSON. "
            "Output ONLY a raw JSON object with 'subject' and 'body' keys."
        )
        try:
            raw_response = call_llm(retry_prompt, model_id=model_id, timeout=timeout)
            last_raw_response = raw_response
            parsed_json = _extract_json_payload(raw_response)
        except TimeoutError as exc:
            raise LLMTimeoutError(f"LLM request timed out after {timeout}s: {exc}") from exc
        except Exception as exc:
            raise LLMParseError(f"Failed to parse LLM response into JSON: {last_raw_response}") from exc

    if not parsed_json or not isinstance(parsed_json, dict) or "subject" not in parsed_json or "body" not in parsed_json:
        raise LLMParseError(f"Failed to parse LLM response into JSON: {last_raw_response}")

    subject = str(parsed_json.get("subject", "")).strip()
    body = str(parsed_json.get("body", "")).strip()

    # Calculate actual word count
    word_count = len(body.split())

    # Tool-level safety and accuracy validation
    is_valid = validate_draft(
        body=body,
        invoice_id=inv_id,
        amount=amt,
        due_date=d_date,
    )

    return {
        "subject": subject,
        "body": body,
        "word_count": word_count,
        "validation_passed": is_valid,
        "tier": t_tier,
    }
