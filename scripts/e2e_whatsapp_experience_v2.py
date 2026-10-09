#!/usr/bin/env python3
"""Browser E2E certification for the isolated WhatsApp Experience V2 lab.

This test serves the static Next.js export locally and proves the visual lab can
be interacted with without calling the real WhatsApp/chat runtime.
"""

from __future__ import annotations

import contextlib
import http.server
import os
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4177
BASE_URL = f"http://127.0.0.1:{PORT}/dev/whatsapp-ui/"

FORBIDDEN_NETWORK_MARKERS = (
    "/connectors/whatsapp",
    "/whatsapp/link",
    "/whatsapp/send",
    "/chat/stream",
    "send_whatsapp",
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        pass


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def action(page: Page, action_id: str):
    return page.locator(f'[data-action-id="{action_id}"]')


def assert_no_horizontal_overflow(page: Page, label: str) -> None:
    overflow = page.evaluate(
        """() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        })"""
    )
    expect(
        overflow["scrollWidth"] <= overflow["clientWidth"] + 1,
        f"{label}: horizontal overflow {overflow}",
    )


def open_lab(context: BrowserContext, requests: list[str]) -> Page:
    page = context.new_page()
    page.on("request", lambda request: requests.append(request.url))
    page.goto(BASE_URL, wait_until="networkidle")
    page.get_by_test_id("wa-v2-lab").wait_for(state="visible")
    page.get_by_test_id("wa-v2-action-center").wait_for(state="visible")
    expect("WhatsApp Experience V2" in page.locator("body").inner_text(), "Lab title missing")
    return page


def test_connected_actions(page: Page) -> None:
    page.get_by_role("button", name="Connecté", exact=True).click()
    message = action(page, "send_text")
    expect(message.is_enabled(), "Message action must be enabled when connected")
    message.click()
    inspector = page.get_by_test_id("wa-v2-selected-action")
    inspector.wait_for(state="visible")
    text = inspector.inner_text()
    expect("Message" in text, "Selected action label missing")
    expect("send_text" in text, "Selected action ID missing")
    expect("Sélection locale uniquement" in text, "Lab must state local-only action selection")


def test_disconnected_and_recovery(page: Page) -> None:
    page.get_by_role("button", name="Déconnecté", exact=True).click()
    expect(action(page, "send_text").is_disabled(), "Actions must be disabled while disconnected")
    connect = page.get_by_role("button", name="Connecter", exact=True)
    expect(connect.is_visible(), "Connect CTA missing when disconnected")
    connect.click()
    expect(page.get_by_text("Connexion…", exact=True).is_visible(), "Connect CTA must move lab to loading/connecting state")


def test_expired_and_offline(page: Page) -> None:
    page.get_by_role("button", name="Expiré", exact=True).click()
    expect(action(page, "send_text").is_disabled(), "Actions must be disabled for expired session")
    reconnect = page.get_by_role("button", name="Reconnecter", exact=True)
    expect(reconnect.is_visible(), "Reconnect CTA missing for expired session")

    page.get_by_role("button", name="Hors ligne", exact=True).click()
    expect(action(page, "send_text").is_disabled(), "Actions must be disabled when service is offline")
    expect(page.get_by_text("Service indisponible", exact=True).is_visible(), "Offline status is not visible")
    expect(page.get_by_role("button", name="Connecter", exact=True).count() == 0, "Offline state must not offer a fake connect recovery")


def test_keyboard_focus(page: Page) -> None:
    page.get_by_role("button", name="Connecté", exact=True).click()
    page.locator("body").click(position={"x": 4, "y": 4})
    found_focus = False
    visible_treatment = False
    for _ in range(20):
        page.keyboard.press("Tab")
        info = page.evaluate(
            """() => {
              const el = document.activeElement;
              if (!el) return null;
              const s = getComputedStyle(el);
              return {
                tag: el.tagName,
                disabled: !!el.disabled,
                outline: s.outlineStyle,
                shadow: s.boxShadow
              };
            }"""
        )
        if info and info["tag"] in ("BUTTON", "A") and not info["disabled"]:
            found_focus = True
            if info["outline"] != "none" or info["shadow"] != "none":
                visible_treatment = True
                break
    expect(found_focus, "Keyboard navigation did not reach an interactive control")
    expect(visible_treatment, "Focused control has no detectable visible focus treatment")


def test_reduced_motion(page: Page) -> None:
    page.get_by_role("button", name="Chargement", exact=True).click()
    skeleton = page.locator('[aria-hidden="true"] .animate-pulse').first
    expect(skeleton.count() == 1, "Loading skeleton missing")
    animation = skeleton.evaluate("el => getComputedStyle(el).animationName")
    expect(animation == "none", f"Reduced-motion context must disable skeleton animation, got {animation!r}")


def test_rtl_smoke(page: Page) -> None:
    page.get_by_role("button", name="Connecté", exact=True).click()
    page.evaluate("document.documentElement.dir = 'rtl'")
    expect(page.evaluate("document.documentElement.dir") == "rtl", "RTL direction was not applied")
    assert_no_horizontal_overflow(page, "RTL desktop")
    expect(action(page, "send_text").is_visible(), "Primary action disappeared in RTL")
    page.evaluate("document.documentElement.dir = 'ltr'")


def test_mobile(browser: Browser, requests: list[str]) -> None:
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        reduced_motion="reduce",
        is_mobile=True,
        device_scale_factor=1,
    )
    try:
        page = open_lab(context, requests)
        assert_no_horizontal_overflow(page, "Mobile 390px")
        page.get_by_role("button", name="Connecté", exact=True).click()
        expect(action(page, "send_text").is_visible(), "Message action missing on mobile")
        action(page, "send_text").click()
        expect(page.get_by_test_id("wa-v2-selected-action").is_visible(), "Action inspector did not open on mobile")

        page.get_by_role("button", name="Déconnecté", exact=True).click()
        expect(action(page, "send_text").is_disabled(), "Disconnected action is enabled on mobile")
        assert_no_horizontal_overflow(page, "Mobile disconnected")
    finally:
        context.close()


def assert_no_provider_calls(requests: list[str]) -> None:
    forbidden = [
        url
        for url in requests
        if any(marker.lower() in url.lower() for marker in FORBIDDEN_NETWORK_MARKERS)
    ]
    expect(not forbidden, f"Visual lab made forbidden provider/runtime calls: {forbidden}")


def main() -> None:
    expect((OUT / "dev" / "whatsapp-ui" / "index.html").exists(), "Static lab export missing; run npm run build first")

    original_cwd = Path.cwd()
    os.chdir(OUT)
    server = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    requests: list[str] = []

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            desktop = browser.new_context(
                viewport={"width": 1440, "height": 900},
                reduced_motion="reduce",
            )
            try:
                page = open_lab(desktop, requests)
                assert_no_horizontal_overflow(page, "Desktop")
                test_connected_actions(page)
                test_disconnected_and_recovery(page)
                test_expired_and_offline(page)
                test_keyboard_focus(page)
                test_reduced_motion(page)
                test_rtl_smoke(page)
            finally:
                desktop.close()

            test_mobile(browser, requests)
            browser.close()

        assert_no_provider_calls(requests)
        print("WHATSAPP_EXPERIENCE_V2_BROWSER_E2E=PASS")
        print("DESKTOP=PASS")
        print("MOBILE_390=PASS")
        print("KEYBOARD_FOCUS=PASS")
        print("REDUCED_MOTION=PASS")
        print("RTL_SMOKE=PASS")
        print("PROVIDER_CALLS=NONE")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
