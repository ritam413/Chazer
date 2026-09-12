"""Chazer Autonomous Invoice Collection Agent CLI Runner (AGENT-04).

Usage:
    python -m agent.main [options]
    python agent/main.py [options]

Options:
    --threshold FLOAT         High-value threshold in USD (default: 10000.0)
    --window-hours INT        Contact window guard in hours (default: 72)
    --owner-id STR            Owner ID (default: 'demo_owner')
    --model-id STR            LLM model ID override (e.g. 'gemini/gemini-1.5-flash')
    --live                    Run with live Resend API dispatch (disables sandbox)
    --sandbox                 Force sandbox email simulation (default: True)
    --help, -h                Show this help message
"""

import argparse
import json
import os
import sys
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from agent.chazer_agent import ChazerCollectionAgent, SweepSummary


def format_currency(amount: float) -> str:
    return f"${amount:,.2f}"


def run_cli_sweep(
    owner_id: str = "demo_owner",
    threshold: float = 10000.0,
    window_hours: int = 72,
    sandbox: bool = True,
    model_id: Optional[str] = None,
) -> int:
    """Executes the CLI sweep, printing formatted telemetry output."""
    print("=" * 70)
    print("  CHAZER AUTONOMOUS COLLECTION AGENT — SWEEP EXECUTION")
    print("=" * 70)
    print(f"  Owner ID:               {owner_id}")
    print(f"  High-Value Threshold:   {format_currency(threshold)}")
    print(f"  Contact Window Guard:   {window_hours} hours")
    print(f"  Email Mode:             {'SANDBOX (Simulated)' if sandbox else 'LIVE RESEND API'}")
    print(f"  LLM Model:              {model_id or os.environ.get('LLM_MODEL_ID', 'gemini/gemini-1.5-flash')}")
    print("-" * 70)

    agent = ChazerCollectionAgent(
        owner_id=owner_id,
        high_value_threshold=threshold,
        contact_window_hours=window_hours,
        sandbox=sandbox,
        model_id=model_id,
    )

    print(f"[*] Starting collection sweep loop...")
    summary: SweepSummary = agent.run_sweep()

    print("\n" + "=" * 70)
    print("  SWEEP EXECUTION RESULTS")
    print("=" * 70)
    print(f"  Sweep ID:               {summary.sweep_id}")
    print(f"  Status:                 {summary.status}")
    print(f"  Duration:               {summary.duration_ms} ms")
    print(f"  Invoices Evaluated:     {summary.invoices_processed}")
    print(f"  Emails Dispatched:      {summary.emails_sent}")
    print(f"  Decisions Escalated:    {summary.escalated_count}")
    print(f"  Invoices Skipped:       {summary.skipped_count}")
    print(f"  Invoices Failed:        {summary.failed_count}")
    print("-" * 70)

    print("  Per-Invoice Telemetry Breakdown:")
    for item in summary.details:
        inv = item.get("invoice_id", "N/A")
        action = item.get("action", "UNKNOWN")
        tier = item.get("tier", "")
        tier_str = f" [{tier}]" if tier else ""
        resend_id = item.get("resend_id")
        dec_id = item.get("decision_id")
        reason = item.get("reason") or item.get("error") or ""

        detail_suffix = ""
        if resend_id:
            detail_suffix = f" -> Resend ID: {resend_id}"
        elif dec_id:
            detail_suffix = f" -> Decision Queue ID: {dec_id}"
        elif reason:
            detail_suffix = f" -> {reason}"

        print(f"    • {inv:<10} {action:<22}{tier_str}{detail_suffix}")

    print("=" * 70 + "\n")
    return 0 if summary.failed_count == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="Chazer Autonomous Collection Agent CLI Runner")
    parser.add_argument("--threshold", type=float, default=10000.0, help="High-value threshold in USD (default: 10000.0)")
    parser.add_argument("--window-hours", type=int, default=72, help="Contact window in hours (default: 72)")
    parser.add_argument("--owner-id", type=str, default="demo_owner", help="Workspace owner ID (default: 'demo_owner')")
    parser.add_argument("--model-id", type=str, default=None, help="LLM model identifier")
    parser.add_argument("--live", action="store_true", help="Enable live email sending via Resend API")
    parser.add_argument("--sandbox", action="store_true", default=True, help="Force sandbox mode (default: True)")

    args = parser.parse_args()
    is_sandbox = not args.live if args.live else args.sandbox

    exit_code = run_cli_sweep(
        owner_id=args.owner_id,
        threshold=args.threshold,
        window_hours=args.window_hours,
        sandbox=is_sandbox,
        model_id=args.model_id,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
