#!/usr/bin/env python3
"""Pipeline 3X targeted browser runner for WhatsApp Experience V2.

FAST is a development gate, not a release certificate. It deliberately reuses
existing E2E scenario functions against a Next.js dev server, avoiding the
production build/export cycle. FULL certification remains authoritative before
phase certification or merge.
"""

from __future__ import annotations

import importlib.util
import os
import shutil
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


def wait_for_server(timeout: float = 35.0) -> None:
    deadline = time.monotonic() + timeout
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(BASE_URL, timeout=1.5) as response:
                if response.status < 500:
                    return
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            last_error = exc
        time.sleep(0.35)
    fail(f"Next dev server did not become ready at {BASE_URL}: {last_error}")


def browser_for(playwright):
    explicit = os.environ.get("WA_V2_BROWSER_EXECUTABLE")
    executable = explicit or shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if executable:
        print(f"WA_V2_FAST_BROWSER={executable}")
        return playwright.chromium.launch(headless=True, executable_path=executable)
    print("WA_V2_FAST_BROWSER=PLAYWRIGHT_BUNDLED")
    return playwright.chromium.launch(headless=True)


def run_contacts() -> None:
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
        return "contacts"

    joined = "\n".join(changed)
    if any(token in joined for token in (
        "WhatsAppContactPicker.tsx",
        "e2e_whatsapp_experience_v2_contacts.py",
        "wa_v2_fast.py",
    )):
        return "contacts"

    # Unknown/shared surfaces still get contract + TypeScript from the workflow,
    # but we refuse to pretend they received targeted browser coverage.
    return "contract-only"


def main() -> None:
    suite = sys.argv[1] if len(sys.argv) > 1 else auto_suite()
    if suite == "contract-only":
        print("WA_V2_FAST_SUITE=contract-only")
        print("WA_V2_FAST_BROWSER_E2E=SKIPPED_NO_TARGET_MAPPING")
        print("FULL_CERTIFICATION_REQUIRED=YES")
        return
    if suite != "contacts":
        fail(f"Unsupported FAST suite: {suite}. Supported now: contacts, contract-only")

    env = os.environ.copy()
    env["NEXT_PUBLIC_WHATSAPP_EXPERIENCE_V2"] = "1"
    command = ["npm", "run", "dev", "--", "--hostname", HOST, "--port", str(PORT)]
    server = subprocess.Popen(
        command,
        cwd=ROOT,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )
    try:
        wait_for_server()
        run_contacts()
    finally:
        server.terminate()
        try:
            server.wait(timeout=8)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=4)


if __name__ == "__main__":
    main()
