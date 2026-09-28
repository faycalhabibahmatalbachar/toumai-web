#!/usr/bin/env python3
"""Pipeline 3X targeted browser runner for WhatsApp Experience V2.

FAST is a development gate, not a release certificate. It deliberately reuses
existing E2E scenario functions against a Next.js dev server, avoiding the
production build/export cycle. FULL certification remains authoritative before
phase certification or merge.

Unknown/shared changes fall back to the contacts browser suite rather than
silently skipping browser coverage. Dedicated surfaces are mapped to their
smallest truthful suite, including chat integration, connection/reconnect,
contacts, permissions, recent activity, rollout/rollback, canonical execution
timeline and compact canonical result.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HOST = "127.0.0.1"
PORT = int(os.environ.get("WA_V2_FAST_PORT", "4190"))
BASE_URL = f"http://{HOST}:{PORT}/chat/"
LAB_URL = f"http://{HOST}:{PORT}/dev/whatsapp-ui/"


def fail(message: str) -> None:
    raise RuntimeError(message)


def load_module(filename: str):
    path = ROOT / "scripts" / filename
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        fail(f"Cannot load E2E module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[path.stem] = module
    spec.loader.exec_module(module)
    return module


def wait_for_url(url: str, timeout: float = 35.0) -> None:
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            last_error = exc
        time.sleep(0.35)
    fail(f"Next dev server did not become ready at {url}: {last_error}")


def wait_for_server(timeout: float = 35.0) -> None:
    wait_for_url(BASE_URL, timeout)


def start_dev(flag: str, port: int) -> subprocess.Popen:
    env = os.environ.copy()
    env["NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2"] = flag
    return subprocess.Popen(
        ["npm", "run", "dev", "--", "--hostname", HOST, "--port", str(port)],
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )


def stop_dev(server: subprocess.Popen) -> None:
    if server.poll() is not None:
        return
    try:
        os.killpg(server.pid, signal.SIGTERM)
        server.wait(timeout=8)
    except (ProcessLookupError, subprocess.TimeoutExpired):
        try:
            os.killpg(server.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        server.wait(timeout=4)


def browser_for(playwright):
    explicit = os.environ.get("WA_V2_BROWSER_EXECUTABLE")
    executable = explicit or shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if executable:
        print(f"WA_V2_FAST_BROWSER={executable}")
        return playwright.chromium.launch(headless=True, executable_path=executable)
    print("WA_V2_FAST_BROWSER=PLAYWRIGHT_BUNDLED")
    return playwright.chromium.launch(headless=True)


def run_chat() -> None:
    suite = load_module("e2e_whatsapp_experience_v2_chat.py")
    suite.BASE_URL = BASE_URL
    traffic: list[dict[str, str]] = []
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            suite.test_desktop(browser, traffic)
            suite.test_mobile(browser, traffic)
            suite.assert_read_only_whatsapp_traffic(traffic)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=chat")
    print("WHATSAPP_EXPERIENCE_V2_CHAT_FAST_E2E=PASS")
    print("WHATSAPP_READS_ONLY=PASS")
    print("PERMISSION_SETTINGS_READ=PASS")
    print("MUTATION_CALLS=NONE")
    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_connection() -> None:
    suite = load_module("e2e_whatsapp_experience_v2_connection.py")
    suite.BASE_URL = BASE_URL
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            scenarios = [
                suite.test_qr_flow(browser),
                suite.test_pairing_expiry_refresh(browser),
                suite.test_expired_reconnect(browser),
            ]
            suite.assert_expected_connection_traffic(scenarios)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=connection")
    print("WHATSAPP_EXPERIENCE_V2_CONNECTION_FAST_E2E=PASS")
    print("QR_FLOW=PASS")
    print("PAIRING_EXPIRY_REFRESH=PASS")
    print("RECONNECT_FLOW=PASS")
    print("CONNECTION_MUTATIONS_EXPECTED_ONLY=PASS")
    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
    print("REAL_PHONE_PROVIDER_E2E=NOT_RUN")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_contacts() -> None:
    os.environ["WA_V2_E2E_DEV_MODE"] = "1"
    suite = load_module("e2e_whatsapp_experience_v2_contacts.py")
    suite.BASE_URL = BASE_URL
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            scenarios = [
                suite.test_trusted_contact_handoff(browser),
                suite.test_unroutable_contact_and_back(browser),
                suite.test_stale_source_warning(browser),
                suite.test_empty_state(browser),
                suite.test_mobile_picker(browser),
            ]
            suite.assert_read_only_traffic(scenarios)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=contacts")
    print("WHATSAPP_EXPERIENCE_V2_CONTACTS_FAST_E2E=PASS")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_permissions() -> None:
    os.environ["WA_V2_E2E_DEV_MODE"] = "1"
    suite = load_module("e2e_whatsapp_experience_v2_permissions.py")
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            suite.run_suite(browser, BASE_URL)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=permissions")
    print("WHATSAPP_EXPERIENCE_V2_PERMISSIONS_FAST_E2E=PASS")
    print("EXPLICIT_PERMISSION_DENIED=BLOCKED")
    print("PERMISSION_READ_ERROR=FAIL_CLOSED")
    print("PERMISSION_SETTINGS_MUTATIONS=NONE")
    print("WHATSAPP_MUTATIONS=NONE")
    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_activity() -> None:
    os.environ["WA_V2_E2E_DEV_MODE"] = "1"
    suite = load_module("e2e_whatsapp_experience_v2_activity.py")
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            suite.run_suite(browser, BASE_URL)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=activity")
    print("WHATSAPP_EXPERIENCE_V2_ACTIVITY_FAST_E2E=PASS")
    print("ACTIVITY_EXPLICIT_TRIGGER_ONLY=PASS")
    print("ACTIVITY_SERVER_MASK_PRESERVED=PASS")
    print("ACTIVITY_MUTATIONS=NONE")
    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_timeline() -> None:
    suite = load_module("e2e_whatsapp_experience_v2_timeline.py")
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            suite.run_suite(browser, LAB_URL)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=timeline")
    print("WHATSAPP_EXPERIENCE_V2_TIMELINE_FAST_E2E=PASS")
    print("TIMELINE_PROVIDER_CALLS=NONE")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_result() -> None:
    suite = load_module("e2e_whatsapp_experience_v2_result.py")
    with sync_playwright() as playwright:
        browser = browser_for(playwright)
        try:
            suite.run_suite(browser, LAB_URL)
        finally:
            browser.close()

    print("WA_V2_FAST_SUITE=result")
    print("WHATSAPP_EXPERIENCE_V2_RESULT_FAST_E2E=PASS")
    print("RESULT_PROVIDER_CALLS=NONE")
    print("RESULT_CHAT_STREAM_CALLS=NONE")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def run_rollout() -> None:
    script = ROOT / "scripts" / "e2e_whatsapp_experience_v2_rollout.py"
    base_port = PORT
    for flag, expected, port in (("1", "on", base_port), ("0", "off", base_port + 1)):
        url = f"http://{HOST}:{port}/chat/"
        server = start_dev(flag, port)
        try:
            wait_for_url(url)
            env = os.environ.copy()
            env["WA_V2_ROLLOUT_EXPECT"] = expected
            env["WA_V2_ROLLOUT_BASE_URL"] = url
            subprocess.run([sys.executable, str(script)], cwd=ROOT, env=env, check=True)
        finally:
            stop_dev(server)

    print("WA_V2_FAST_SUITE=rollout")
    print("WHATSAPP_EXPERIENCE_V2_ROLLOUT_FAST_E2E=PASS")
    print("FEATURE_FLAG_ON=V2_ACCESSIBLE")
    print("FEATURE_FLAG_OFF=LEGACY_FALLBACK")
    print("FLAG_OFF_WHATSAPP_CALLS=NONE")
    print("ROLLBACK_PATH=ENV_FLAG_OFF")
    print("REAL_PHONE_PROVIDER_E2E=NOT_RUN")
    print("FAST_GATE_RELEASE_CERTIFICATE=NO")


def auto_suite() -> str:
    override = os.environ.get("WA_V2_FAST_SUITE")
    if override:
        return override
    try:
        changed = subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD^", "HEAD"],
            cwd=ROOT,
            text=True,
        ).splitlines()
    except subprocess.CalledProcessError:
        changed = []

    joined = "\n".join(changed)
    if any(token in joined for token in (
        "e2e_whatsapp_experience_v2_rollout.py",
        "verify-whatsapp-rollout-readiness.mjs",
        "lib/whatsapp-ui/feature.ts",
    )):
        print("WA_V2_FAST_MAPPING=rollout")
        return "rollout"

    if "e2e_whatsapp_experience_v2_chat.py" in joined:
        print("WA_V2_FAST_MAPPING=chat")
        return "chat"

    if any(token in joined for token in (
        "WhatsAppConnectorCard.tsx",
        "WhatsAppConnectionFlow.tsx",
        "e2e_whatsapp_experience_v2_connection.py",
        "verify-whatsapp-connection-race.mjs",
    )):
        print("WA_V2_FAST_MAPPING=connection")
        return "connection"

    if any(token in joined for token in (
        "WhatsAppPermissionGate.tsx",
        "e2e_whatsapp_experience_v2_permissions.py",
        "verify-whatsapp-permission-gate.mjs",
    )):
        print("WA_V2_FAST_MAPPING=permissions")
        return "permissions"

    if any(token in joined for token in (
        "WhatsAppRecentActivity.tsx",
        "e2e_whatsapp_experience_v2_activity.py",
        "verify-whatsapp-recent-activity.mjs",
    )):
        print("WA_V2_FAST_MAPPING=activity")
        return "activity"

    if any(token in joined for token in (
        "WhatsAppResultCard.tsx",
        "e2e_whatsapp_experience_v2_result.py",
        "ActionExecutionCard.tsx",
    )):
        print("WA_V2_FAST_MAPPING=result")
        return "result"

    if any(token in joined for token in (
        "WhatsAppExecutionTimeline.tsx",
        "e2e_whatsapp_experience_v2_timeline.py",
    )):
        print("WA_V2_FAST_MAPPING=timeline")
        return "timeline"

    if any(token in joined for token in (
        "WhatsAppContactPicker.tsx",
        "WhatsAppActionPreview.tsx",
        "e2e_whatsapp_experience_v2_contacts.py",
    )):
        print("WA_V2_FAST_MAPPING=contacts")
        return "contacts"

    print("WA_V2_FAST_MAPPING=fallback-contacts")
    return "contacts"


def main() -> None:
    suite = sys.argv[1] if len(sys.argv) > 1 else auto_suite()
    if suite == "contract-only":
        print("WA_V2_FAST_SUITE=contract-only")
        print("WA_V2_FAST_BROWSER_E2E=SKIPPED_EXPLICITLY")
        print("FULL_CERTIFICATION_REQUIRED=YES")
        return
    if suite not in {"chat", "connection", "contacts", "permissions", "activity", "timeline", "result", "rollout"}:
        fail(f"Unsupported FAST suite: {suite}. Supported now: chat, connection, contacts, permissions, activity, timeline, result, rollout, contract-only")

    if suite == "rollout":
        run_rollout()
        return

    server = start_dev("1", PORT)
    try:
        wait_for_server()
        if suite == "chat":
            run_chat()
        elif suite == "connection":
            run_connection()
        elif suite == "permissions":
            run_permissions()
        elif suite == "activity":
            run_activity()
        elif suite == "timeline":
            run_timeline()
        elif suite == "result":
            run_result()
        else:
            run_contacts()
    finally:
        stop_dev(server)


if __name__ == "__main__":
    main()
