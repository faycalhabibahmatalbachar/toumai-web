#!/usr/bin/env python3
"""Static safety contract for the Phase 11 real-provider canary."""

from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/whatsapp-experience-v2-real-provider-canary.yml"
HARNESS = ROOT / "scripts/wa_v2_real_provider_canary.py"


def require(condition: bool, label: str) -> None:
    if not condition:
        raise SystemExit(f"WA_V2_REAL_PROVIDER_CANARY_CONTRACT=FAIL:{label}")


workflow = WORKFLOW.read_text(encoding="utf-8")
harness = HARNESS.read_text(encoding="utf-8")

# Python must parse before any real-provider run is even possible.
ast.parse(harness, filename=str(HARNESS))

on_block = workflow.split("on:\n", 1)[1].split("\npermissions:", 1)[0]
require("workflow_dispatch:" in on_block, "manual_dispatch_missing")
for forbidden in ("push:", "pull_request:", "schedule:", "workflow_run:"):
    require(forbidden not in on_block, f"automatic_trigger_present:{forbidden[:-1]}")

require('default: "false"' in workflow, "real_send_default_must_be_false")
require('WA_V2_CANARY_EXPLICIT_SEND: ${{ inputs.confirm_real_send }}' in workflow,
        "explicit_send_input_not_wired")
require('environment: whatsapp-real-provider-canary' in workflow, "protected_environment_missing")
require('permissions:\n  contents: read' in workflow, "permissions_not_read_only")
require('${{ secrets.WA_V2_CANARY_ACCESS_TOKEN }}' in workflow, "token_not_secret_backed")
require('${{ secrets.WA_V2_CANARY_RECIPIENT }}' in workflow, "recipient_not_secret_backed")
require('python3 scripts/wa_v2_real_provider_canary.py' in workflow, "harness_not_executed")

for route in (
    "/whatsapp/etat",
    "/whatsapp/settings",
    "/chat/stream",
    "/chat/tool/confirm",
    "/agent/actions/pending/status",
):
    require(route in harness, f"production_route_missing:{route}")

require('ephemeral": True' in harness, "canary_chat_must_be_ephemeral")
require('pending_id' in harness and 'awaiting_confirmation' in harness,
        "server_pending_confirmation_not_enforced")
require('provider_accepted' in harness and 'sent' in harness and 'delivered' in harness and 'read' in harness,
        "provider_truth_states_missing")
require('REAL_PHONE_PROVIDER_E2E' in harness and 'PHASE_11_CERTIFICATION' in harness,
        "phase11_verdict_markers_missing")
require('WA_V2_CANARY_EXPLICIT_SEND' in harness, "runtime_send_gate_missing")
require('print(recipient' not in harness and 'print(token' not in harness,
        "secret_or_recipient_print_detected")

print("WA_V2_REAL_PROVIDER_CANARY_CONTRACT=PASS")
print("REAL_PROVIDER_TRIGGER=MANUAL_ONLY")
print("REAL_PROVIDER_ENVIRONMENT_GUARD=PASS")
print("REAL_PROVIDER_SECRET_DISCLOSURE_GUARD=PASS")
print("REAL_PROVIDER_PRODUCTION_PATH_CONTRACT=PASS")
print("REAL_PROVIDER_AUTOMATIC_SEND=FORBIDDEN")
print("REAL_PROVIDER_RUNTIME_EXECUTION=NOT_RUN_BY_STATIC_GATE")
