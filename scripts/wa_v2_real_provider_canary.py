#!/usr/bin/env python3
"""Phase 11 — manual REAL WhatsApp provider canary.

This script intentionally performs ONE real send after an explicit workflow gate.
It uses the same production path as the UI:
  /chat/stream -> pending_id -> /chat/tool/confirm -> /agent/actions/pending/status

After the mutation reaches a terminal state, it submits the SAME pending_id once
more to prove replay safety. The backend must return the already stored action;
the canary never creates a second pending action and never changes the payload.

Secrets/recipient are never printed. A missing secret/provider is BLOCKED, never PASS.
"""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DEFAULT_BASE = "https://api.toumaiai.com/api/v1"
TERMINAL_PENDING = {"done", "failed", "uncertain", "expired", "cancelled", "unknown"}
MESSAGE_STATES = {"provider_accepted", "sent", "delivered", "read"}


def marker(name: str, value: str) -> None:
    print(f"{name}={value}", flush=True)


def abort(reason: str, code: int = 2) -> None:
    marker("REAL_PHONE_PROVIDER_E2E", "BLOCKED")
    marker("PHASE_11_CERTIFICATION", "BLOCKED")
    print(f"BLOCKER={reason}", flush=True)
    raise SystemExit(code)


def env_required(name: str) -> str:
    value = (os.environ.get(name) or "").strip()
    if not value:
        abort(f"missing_secret:{name}")
    return value


def normalize_bearer_secret(raw: str) -> str:
    token = raw.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not token:
        abort("access_token_secret_empty_after_normalization")
    return token


def api_base() -> str:
    return (os.environ.get("WA_V2_CANARY_API_BASE") or DEFAULT_BASE).strip().rstrip("/")


def auth_headers() -> dict[str, str]:
    token = normalize_bearer_secret(env_required("WA_V2_CANARY_ACCESS_TOKEN"))
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def request_json(method: str, path: str, payload: Any | None = None, timeout: int = 30) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = Request(api_base() + path, data=body, headers=auth_headers(), method=method)
    try:
        with urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            return json.loads(raw or "{}")
    except HTTPError as exc:
        abort(f"http_{exc.code}:{path}")
    except (URLError, TimeoutError) as exc:
        abort(f"network:{path}:{type(exc).__name__}")
    except json.JSONDecodeError:
        abort(f"invalid_json:{path}")
    return {}


def envelope_data(body: dict[str, Any]) -> Any:
    return body.get("data") if isinstance(body, dict) else None


def recursive_values(value: Any, key: str) -> list[Any]:
    found: list[Any] = []
    if isinstance(value, dict):
        for k, v in value.items():
            if k == key:
                found.append(v)
            found.extend(recursive_values(v, key))
    elif isinstance(value, list):
        for item in value:
            found.extend(recursive_values(item, key))
    return found


def first_uuid(values: list[Any]) -> str | None:
    for value in values:
        try:
            return str(uuid.UUID(str(value)))
        except (ValueError, TypeError, AttributeError):
            continue
    return None


def first_text(values: list[Any]) -> str | None:
    for value in values:
        if value is None or isinstance(value, (dict, list, tuple, set)):
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def provider_message_id(value: Any) -> str | None:
    """Extract the real gateway/provider message id without printing payload data."""
    for key in ("provider_operation_id", "provider_message_id", "msg_id", "msgId"):
        candidate = first_text(recursive_values(value, key))
        if candidate:
            return candidate
    return None


def stream_pending_id(recipient: str, message_text: str) -> str:
    # Recipient is deliberately never printed. The message marker is non-secret.
    prompt = (
        "Sur WhatsApp, envoie exactement le message entre guillemets au contact exact "
        f"« {recipient} » : « {message_text} ». N'effectue aucune autre action."
    )
    payload = {
        "message": prompt,
        "language": "fr",
        "web_search": False,
        "ephemeral": True,
        "client_timezone": "Africa/Ndjamena",
        "client_utc_offset_minutes": 60,
    }
    req = Request(
        api_base() + "/chat/stream",
        data=json.dumps(payload).encode("utf-8"),
        headers=auth_headers(),
        method="POST",
    )
    pending: str | None = None
    try:
        with urlopen(req, timeout=90) as res:
            for raw_line in res:
                line = raw_line.decode("utf-8", errors="replace").strip()
                if not line.startswith("data:"):
                    continue
                text = line[5:].strip()
                try:
                    event = json.loads(text)
                except json.JSONDecodeError:
                    continue
                candidate = first_uuid(recursive_values(event, "pending_id"))
                if candidate:
                    pending = candidate
                if event.get("error"):
                    abort("chat_stream_error")
    except HTTPError as exc:
        abort(f"http_{exc.code}:/chat/stream")
    except (URLError, TimeoutError) as exc:
        abort(f"network:/chat/stream:{type(exc).__name__}")
    if not pending:
        abort("pending_id_not_created")
    return pending


def pending_status(pending_id: str) -> tuple[str, str | None, dict[str, Any]]:
    body = request_json("POST", "/agent/actions/pending/status", {"pending_id": pending_id})
    data = envelope_data(body)
    if not isinstance(data, dict):
        abort("pending_status_invalid")
    status = str(data.get("status") or "unknown")
    action = data.get("action") if isinstance(data.get("action"), dict) else {}
    operation_state = str(action.get("operation_state")) if action.get("operation_state") else None
    return status, operation_state, action


def observe_state(states: set[str], value: Any) -> None:
    if isinstance(value, str) and value in MESSAGE_STATES:
        states.add(value)


def main() -> int:
    if (os.environ.get("WA_V2_CANARY_EXPLICIT_SEND") or "").lower() != "true":
        abort("explicit_real_send_gate_not_true")

    recipient = env_required("WA_V2_CANARY_RECIPIENT")
    _ = normalize_bearer_secret(env_required("WA_V2_CANARY_ACCESS_TOKEN"))

    # 1) Real connector preflight.
    etat_body = request_json("GET", "/whatsapp/etat")
    etat = envelope_data(etat_body)
    connected = isinstance(etat, dict) and etat.get("code") == "connecte" and bool(etat.get("pret"))
    marker("REAL_PROVIDER_CONNECTED", "PASS" if connected else "BLOCKED")
    if not connected:
        abort("whatsapp_not_connected")

    # 2) Permission preflight. The canary never changes user permissions.
    settings_body = request_json("GET", "/whatsapp/settings")
    settings = envelope_data(settings_body)
    if not isinstance(settings, dict) or settings.get("send_text") is not True:
        abort("send_text_permission_not_enabled")

    nonce = uuid.uuid4().hex[:10]
    canary_message = f"Toumai AI real-provider canary {nonce}"

    # 3) Create a real server-side pending confirmation through the chat runtime.
    pending_id = stream_pending_id(recipient, canary_message)
    marker("PENDING_ID", pending_id)
    before_status, _, _ = pending_status(pending_id)
    if before_status != "awaiting_confirmation":
        abort(f"unexpected_pending_state_before_confirm:{before_status}")
    marker("REAL_PROVIDER_ACTION_CREATED", "PASS")

    # 4) Explicit confirmation — this is the ONLY point where the real mutation is allowed.
    confirm = request_json("POST", "/chat/tool/confirm", {"pending_id": pending_id})
    confirm_success = bool(confirm.get("success"))
    confirm_data = envelope_data(confirm)
    observed: set[str] = set()
    for value in recursive_values(confirm_data, "operation_state"):
        observe_state(observed, value)
    action_id = first_uuid(recursive_values(confirm_data, "action_id"))
    provider_id = provider_message_id(confirm_data)
    marker("REAL_PROVIDER_CONFIRM", "PASS" if confirm_success else "FAILED")

    # Even a false application success can represent an uncertain provider result; reconcile,
    # but never relaunch the mutation.
    deadline = time.monotonic() + max(15, min(int(os.environ.get("WA_V2_CANARY_MAX_WAIT_SECONDS", "60")), 180))
    final_pending = "unknown"
    final_action: dict[str, Any] = {}
    while time.monotonic() < deadline:
        final_pending, op_state, final_action = pending_status(pending_id)
        observe_state(observed, op_state)
        if final_pending in TERMINAL_PENDING:
            break
        time.sleep(2)

    # 5) Replay proof. Re-submit ONLY the same consumed pending_id after the first execution.
    # Backend contract: this must read the stored action and MUST NOT call the provider again.
    replay = request_json("POST", "/chat/tool/confirm", {"pending_id": pending_id})
    replay_data = envelope_data(replay)
    replay_pending = first_text(recursive_values(replay_data, "pending_status"))
    replay_action_id = first_uuid(recursive_values(replay_data, "action_id"))
    replay_provider_id = provider_message_id(replay_data)

    if provider_id is None:
        provider_id = replay_provider_id
    same_action = bool(action_id and replay_action_id and action_id == replay_action_id)
    same_provider_id = bool(provider_id and replay_provider_id and provider_id == replay_provider_id)
    replay_safe = bool(
        final_pending == "done"
        and replay.get("success") is True
        and replay_pending == "done"
        and same_action
        and same_provider_id
    )

    marker("ACTION_ID", action_id or "NOT_PROVEN")
    marker("PROVIDER_MESSAGE_ID", provider_id or "NOT_PROVEN")
    marker("FINAL_PENDING_STATUS", final_pending)
    marker("REAL_PROVIDER_REPLAY_GUARD", "PASS" if replay_safe else "NOT_PROVEN")

    accepted = bool(observed & {"provider_accepted", "sent", "delivered", "read"}) or bool(provider_id)
    sent = bool(observed & {"sent", "delivered", "read"})
    delivered = bool(observed & {"delivered", "read"})
    read = "read" in observed

    marker("REAL_PROVIDER_ACCEPTED", "PASS" if accepted else "NOT_PROVEN")
    marker("REAL_PROVIDER_SENT", "PASS" if sent else "NOT_PROVEN")
    marker("REAL_PROVIDER_DELIVERED", "PASS" if delivered else "NOT_PROVEN")
    marker("REAL_PROVIDER_READ", "PASS" if read else "NOT_PROVEN")

    # Certification requires a real provider ID, an ACK at least as strong as SENT,
    # a terminal done pending, and proof that replay returned the SAME stored action.
    if confirm_success and provider_id and sent and final_pending == "done" and replay_safe:
        marker("REAL_PHONE_PROVIDER_E2E", "PASS")
        marker("PHASE_11_CERTIFICATION", "PASS")
        return 0

    if accepted:
        marker("REAL_PHONE_PROVIDER_E2E", "PARTIAL")
        marker("PHASE_11_CERTIFICATION", "PARTIAL")
        print(
            f"BLOCKER=provider_or_replay_proof_not_strong_enough:pending_{final_pending}",
            flush=True,
        )
        return 3

    marker("REAL_PHONE_PROVIDER_E2E", "BLOCKED")
    marker("PHASE_11_CERTIFICATION", "BLOCKED")
    print(f"BLOCKER=no_real_provider_send_proof:pending_{final_pending}", flush=True)
    return 4


if __name__ == "__main__":
    raise SystemExit(main())
