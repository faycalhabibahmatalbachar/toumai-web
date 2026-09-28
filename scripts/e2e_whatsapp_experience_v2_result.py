#!/usr/bin/env python3
"""Phase 7 browser E2E for the WhatsApp compact canonical result card.

The real V2 lab is exercised with synthetic canonical states. The test proves
that provider acceptance and sent are never upgraded to verified success, that
verified success is reserved for delivered/read/completed, that uncertain and
failure states stay truthful, and that details are collapsed until the user
explicitly opens them. No provider or chat call is allowed.
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
PORT = 4183
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
        viewport={"width": 390, "height": 844} if mobile else {"width": 1280, "height": 1000},
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
    page.get_by_test_id("wa-v2-result-lab").wait_for(state="visible")
    page.get_by_test_id("wa-v2-result-card").wait_for(state="visible")
    return context, page, forbidden_calls


def select_state(page: Page, state: str) -> None:
    page.get_by_test_id(f"wa-v2-result-select-{state}").click()
    card = page.get_by_test_id("wa-v2-result-card")
    expect(card.get_attribute("data-operation-state") == state, f"Result card did not switch to {state}")
    expect(page.get_by_test_id("wa-v2-result-expanded").count() == 0, f"Selecting {state} must collapse details by default")
    expect(page.get_by_test_id("wa-v2-result-details-toggle").get_attribute("aria-expanded") == "false", "Details toggle not collapsed")


def assert_result(
    page: Page,
    *,
    state: str,
    tone: str,
    verified: bool,
    terminal: bool,
    label: str,
) -> None:
    card = page.get_by_test_id("wa-v2-result-card")
    expect(card.get_attribute("data-operation-state") == state, f"Canonical state mismatch for {state}")
    expect(card.get_attribute("data-result-tone") == tone, f"Tone mismatch for {state}")
    expect(card.get_attribute("data-result-verified") == ("true" if verified else "false"), f"Verified truth mismatch for {state}")
    expect(card.get_attribute("data-result-terminal") == ("true" if terminal else "false"), f"Terminal truth mismatch for {state}")
    expect(page.get_by_test_id("wa-v2-result-label").inner_text().startswith(label), f"Label mismatch for {state}")


def test_truth_mapping(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url)
    try:
        # Lab starts on sent. A send acknowledgement is not delivery proof.
        assert_result(page, state="sent", tone="neutral", verified=False, terminal=False, label="Envoyée")
        sent_detail = page.get_by_test_id("wa-v2-result-detail").inner_text()
        expect("remise" in sent_detail.lower() and "pas confirmée" in sent_detail.lower(), "Sent result must deny delivery proof")

        select_state(page, "provider_accepted")
        assert_result(page, state="provider_accepted", tone="neutral", verified=False, terminal=False, label="Acceptée par WhatsApp")
        provider_detail = page.get_by_test_id("wa-v2-result-detail").inner_text()
        expect("ne prouve" in provider_detail.lower(), "Provider acceptance must explicitly deny final proof")

        for state, label in (("delivered", "Remise"), ("read", "Lue"), ("completed", "Action vérifiée")):
            select_state(page, state)
            assert_result(page, state=state, tone="success", verified=True, terminal=True, label=label)

        select_state(page, "unknown")
        assert_result(page, state="unknown", tone="warning", verified=False, terminal=False, label="Résultat inconnu")

        select_state(page, "reconciling")
        assert_result(page, state="reconciling", tone="warning", verified=False, terminal=False, label="Vérification en cours")
        expect("sans supposer de succès" in page.get_by_test_id("wa-v2-result-detail").inner_text().lower(), "Reconciling must explicitly avoid fake success")

        select_state(page, "partial_success")
        assert_result(page, state="partial_success", tone="warning", verified=False, terminal=False, label="Résultat partiel · 1 problème")

        select_state(page, "failed")
        assert_result(page, state="failed", tone="error", verified=False, terminal=True, label="Échec confirmé")

        select_state(page, "blocked")
        assert_result(page, state="blocked", tone="error", verified=False, terminal=True, label="Opération bloquée")

        select_state(page, "needs_relink")
        assert_result(page, state="needs_relink", tone="error", verified=False, terminal=True, label="Reconnexion requise")

        select_state(page, "cancelled")
        assert_result(page, state="cancelled", tone="neutral", verified=False, terminal=True, label="Annulée")
        return forbidden
    finally:
        context.close()


def test_details_explicit(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url)
    try:
        select_state(page, "delivered")
        expect(page.get_by_test_id("wa-v2-result-expanded").count() == 0, "Compact result details must start collapsed")
        toggle = page.get_by_test_id("wa-v2-result-details-toggle")
        toggle.click()
        expanded = page.get_by_test_id("wa-v2-result-expanded")
        expanded.wait_for(state="visible")
        expect(toggle.get_attribute("aria-expanded") == "true", "Details toggle did not expose expanded state")
        timeline = expanded.get_by_test_id("wa-v2-execution-timeline")
        expect(timeline.get_attribute("data-operation-state") == "delivered", "Expanded details must preserve the same canonical state")
        toggle.click()
        expect(page.get_by_test_id("wa-v2-result-expanded").count() == 0, "Details did not collapse again")
        return forbidden
    finally:
        context.close()


def test_mobile_compact(browser: Browser, base_url: str = BASE_URL) -> list[str]:
    context, page, forbidden = open_lab(browser, base_url, mobile=True)
    try:
        select_state(page, "sent")
        metrics = page.evaluate(
            """() => ({scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth})"""
        )
        expect(metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"Compact result causes mobile horizontal overflow: {metrics}")
        box = page.get_by_test_id("wa-v2-result-card").bounding_box()
        expect(box is not None and box["width"] <= 390, f"Compact result exceeds 390px viewport: {box}")
        expect(page.get_by_test_id("wa-v2-result-details-toggle").is_visible(), "Details control unavailable on mobile")
        return forbidden
    finally:
        context.close()


def run_suite(browser: Browser, base_url: str = BASE_URL) -> None:
    forbidden = [
        *test_truth_mapping(browser, base_url),
        *test_details_explicit(browser, base_url),
        *test_mobile_compact(browser, base_url),
    ]
    expect(not forbidden, f"Compact result lab triggered forbidden provider/chat calls: {forbidden}")


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

        print("WHATSAPP_EXPERIENCE_V2_RESULT_E2E=PASS")
        print("PROVIDER_ACCEPTED_RESULT_NEUTRAL=PASS")
        print("SENT_RESULT_NEUTRAL=PASS")
        print("VERIFIED_SUCCESS_ONLY_DELIVERED_READ_COMPLETED=PASS")
        print("UNKNOWN_RESULT_WARNING=PASS")
        print("RECONCILING_RESULT_WARNING=PASS")
        print("FAILED_RESULT_ERROR=PASS")
        print("BLOCKED_RESULT_ERROR=PASS")
        print("NEEDS_RELINK_RESULT_ERROR=PASS")
        print("RESULT_TERMINAL_TRUTH_MAPPING=PASS")
        print("RESULT_DETAILS_COLLAPSED_BY_DEFAULT=PASS")
        print("RESULT_DETAILS_EXPLICIT_TOGGLE=PASS")
        print("MOBILE_390_COMPACT_RESULT=PASS")
        print("RESULT_PROVIDER_CALLS=NONE")
        print("RESULT_CHAT_STREAM_CALLS=NONE")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()