#!/usr/bin/env python3
"""Phase 6 browser E2E for the WhatsApp canonical execution timeline.

The test exercises the real V2 lab component with synthetic canonical states.
No provider endpoint is called. Its purpose is to prevent UI regressions that
could visually upgrade provider acceptance, an unknown result or reconciliation
into a delivered/read/success claim.
"""

from __future__ import annotations

import http.server
import os
import socketserver
import threading
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4182
BASE_URL = f"http://127.0.0.1:{PORT}/dev/whatsapp-ui/"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        pass


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def open_lab(browser: Browser, base_url: str = BASE_URL, *, mobile: bool = False) -> tuple[BrowserContext, Page, list[str]]:
    context = browser.new_context(
        viewport={"width": 390, "height": 844} if mobile else {"width": 1280, "height": 900},
        is_mobile=mobile,
        device_scale_factor=1,
        reduced_motion="reduce",
    )
    forbidden_calls: list[str] = []

    def observe(route: Route) -> None:
        parsed = urlparse(route.request.url)
        if "/whatsapp/" in parsed.path or "/chat/stream" in parsed.path:
            forbidden_calls.append(route.request.url)
        route.continue_()

    context.route("**/*", observe)
    page = context.new_page()
    page.goto(base_url, wait_until="networkidle")
    page.get_by_test_id("wa-v2-timeline-lab").wait_for(state="visible")
    page.get_by_test_id("wa-v2-execution-timeline").wait_for(state="visible")
    return context, page, forbidden_calls


def step_status(page: Page, step: str) -> str:
    return page.get_by_test_id(f"wa-v2-timeline-step-{step}").get_attribute("data-step-status") or ""


def select_state(page: Page, state: str) -> None:
    page.get_by_test_id(f"wa-v2-timeline-select-{state}").click()
    timeline = page.get_by_test_id("wa-v2-execution-timeline")
    expect(timeline.get_attribute("data-operation-state") == state, f"Timeline did not switch to {state}")


def test_truthful_progression(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url)
    try:
        timeline = page.get_by_test_id("wa-v2-execution-timeline")
        expect(timeline.get_attribute("data-operation-state") == "provider_accepted", "Lab must start on provider_accepted")
        expect(timeline.get_attribute("data-timeline-mode") == "progress", "provider_accepted must use progression mode")
        expect(step_status(page, "requested") == "done", "requested should be behind provider_accepted")
        expect(step_status(page, "dispatching") == "done", "dispatching should be behind provider_accepted")
        expect(step_status(page, "provider_accepted") == "current", "provider_accepted must be current")
        expect(step_status(page, "sent") == "pending", "provider acceptance must NOT imply sent")
        expect(step_status(page, "delivered") == "pending", "provider acceptance must NOT imply delivered")
        expect(step_status(page, "read") == "pending", "provider acceptance must NOT imply read")
        current_copy = page.get_by_test_id("wa-v2-timeline-step-provider_accepted").inner_text()
        expect("ne prouve pas encore la remise" in current_copy, "Provider-accepted copy must explicitly deny delivery proof")

        select_state(page, "sent")
        expect(step_status(page, "provider_accepted") == "done", "provider acceptance should precede sent")
        expect(step_status(page, "sent") == "current", "sent must be current")
        expect(step_status(page, "delivered") == "pending", "sent must NOT imply delivered")
        expect(step_status(page, "read") == "pending", "sent must NOT imply read")
        sent_copy = page.get_by_test_id("wa-v2-timeline-step-sent").inner_text()
        expect("ne prouve pas encore la remise" in sent_copy, "Sent copy must explicitly deny delivery proof")

        select_state(page, "delivered")
        expect(step_status(page, "sent") == "done", "sent should precede delivered")
        expect(step_status(page, "delivered") == "current", "delivered must be current")
        expect(step_status(page, "read") == "pending", "delivery must NOT imply read")

        select_state(page, "read")
        expect(step_status(page, "delivered") == "done", "delivery should precede read")
        expect(step_status(page, "read") == "current", "read must be current")
        expect(step_status(page, "completed") == "pending", "read must not invent server reconciliation completion")
        return forbidden
    finally:
        context.close()


def test_uncertain_and_failure_do_not_fake_progress(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url)
    try:
        select_state(page, "unknown")
        timeline = page.get_by_test_id("wa-v2-execution-timeline")
        expect(timeline.get_attribute("data-timeline-mode") == "uncertain", "unknown must be neutral/uncertain")
        expect(page.get_by_test_id("wa-v2-operation-state").inner_text() == "Résultat inconnu", "Unknown wording mismatch")
        expect(page.locator('[data-testid^="wa-v2-timeline-step-"]').count() == 0, "Unknown result must not fake completed progression steps")

        select_state(page, "reconciling")
        expect(timeline.get_attribute("data-timeline-mode") == "uncertain", "reconciling must remain uncertain")
        expect("Aucun succès n’est supposé" in timeline.inner_text(), "Reconciliation must explicitly avoid success inference")
        expect(page.locator('[data-testid^="wa-v2-timeline-step-"]').count() == 0, "Reconciliation must not fake progression")

        select_state(page, "failed")
        expect(timeline.get_attribute("data-timeline-mode") == "failed", "failed must use failure mode")
        expect(page.get_by_test_id("wa-v2-operation-state").inner_text() == "Échec confirmé", "Failure wording mismatch")
        expect(page.locator('[data-testid^="wa-v2-timeline-step-"]').count() == 0, "Failure without a proven stage must not fake prior successful stages")
        return forbidden
    finally:
        context.close()


def test_mobile_no_overflow(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url, mobile=True)
    try:
        select_state(page, "provider_accepted")
        metrics = page.evaluate(
            """() => ({scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth})"""
        )
        expect(metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"Timeline causes mobile horizontal overflow: {metrics}")
        expect(page.get_by_test_id("wa-v2-execution-timeline").is_visible(), "Timeline not visible at 390px")
        return forbidden
    finally:
        context.close()


def run_suite(browser: Browser, base_url: str = BASE_URL) -> None:
    forbidden = [
        *test_truthful_progression(browser, base_url),
        *test_uncertain_and_failure_do_not_fake_progress(browser, base_url),
        *test_mobile_no_overflow(browser, base_url),
    ]
    expect(not forbidden, f"Timeline lab triggered forbidden provider/chat calls: {forbidden}")


def main() -> None:
    expect((OUT / "dev" / "whatsapp-ui" / "index.html").exists(), "Static WhatsApp V2 lab missing; run flag-enabled npm run build first")

    original_cwd = Path.cwd()
    os.chdir(OUT)
    server = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                run_suite(browser)
            finally:
                browser.close()

        print("WHATSAPP_EXPERIENCE_V2_TIMELINE_E2E=PASS")
        print("PROVIDER_ACCEPTED_NOT_DELIVERED=PASS")
        print("SENT_NOT_DELIVERED=PASS")
        print("DELIVERED_NOT_READ=PASS")
        print("UNKNOWN_NO_FAKE_SUCCESS=PASS")
        print("RECONCILING_NO_FAKE_SUCCESS=PASS")
        print("FAILED_NO_FAKE_PROGRESS=PASS")
        print("MOBILE_390_TIMELINE=PASS")
        print("TIMELINE_PROVIDER_CALLS=NONE")
        print("TIMELINE_CHAT_STREAM_CALLS=NONE")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
