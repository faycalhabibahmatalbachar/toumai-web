#!/usr/bin/env python3
"""Browser E2E for WhatsApp Experience V2 integrated into the real /chat page.

The static production build is served locally. All API calls are intercepted in
Chromium so this test cannot mutate the real Toumaï or WhatsApp backend.
Only read-only WhatsApp GETs required by the integrated UX are accepted.

Phase 4 routes recipient-targeted actions through the Contact Picker. This
legacy integration test therefore uses the non-recipient Status action to keep
certifying the direct action -> composer focus/caret contract. Phase 8 adds a
read-only /whatsapp/settings permission check before that handoff; the dedicated
permission suite separately certifies allow/deny/error semantics.
"""

from __future__ import annotations

import http.server
import json
import os
import socketserver
import threading
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4178
BASE_URL = f"http://127.0.0.1:{PORT}/chat/"
SESSION_KEY = "chadgpt_web_session_v1"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        pass


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def envelope(data: object) -> str:
    return json.dumps({"success": True, "data": data})


def mock_data(path: str) -> object:
    if path.endswith("/whatsapp/etat"):
        return {
            "code": "connecte",
            "libelle": "Connecté",
            "numero": "+23566223344",
            "nom_profil": "Compte E2E",
        }
    if path.endswith("/whatsapp/status"):
        return {"status": "connected", "number": "+23566223344"}
    if path.endswith("/whatsapp/settings"):
        # Phase 8 compatibility fixture: missing keys do not invent a denial;
        # backend tool permissions remain the final authority.
        return {}
    if path.endswith("/chat/sessions"):
        return []
    if path.endswith("/preferences"):
        return {
            "ai_name": "Toumaï",
            "ai_tone": "friendly",
            "ai_language": "fr",
            "ai_persona": "",
            "theme": "system",
            "accent_color": "default",
            "font_size": "medium",
            "notif_wa": True,
            "notif_calendar": True,
            "notif_suggestions": True,
            "timezone": "Africa/Ndjamena",
        }
    if path.endswith("/users/me") or path.endswith("/user/me") or path.endswith("/profile"):
        return {
            "id": "e2e-user",
            "email": "e2e@example.invalid",
            "full_name": "Utilisateur E2E",
            "avatar_url": None,
        }
    if "usage" in path or "quota" in path:
        return {
            "plan": "test",
            "messages_remaining": 99,
            "messages_used": 1,
            "limit": 100,
        }
    if "notifications" in path:
        return []
    return {}


def install_api_mock(context: BrowserContext, traffic: list[dict[str, str]]) -> None:
    def handler(route: Route) -> None:
        request = route.request
        parsed = urlparse(request.url)
        is_api = parsed.netloc == "api.toumaiai.com" or "/api/v1/" in parsed.path
        if not is_api:
            route.continue_()
            return

        traffic.append({"method": request.method.upper(), "url": request.url, "path": parsed.path})
        route.fulfill(status=200, content_type="application/json", body=envelope(mock_data(parsed.path)))

    context.route("**/*", handler)


def inject_session(context: BrowserContext) -> None:
    session = {
        "access_token": "e2e-access-token",
        "refresh_token": "e2e-refresh-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": 4_102_444_800_000,
        "user_id": "e2e-user",
        "is_guest": False,
    }
    context.add_init_script(
        f"localStorage.setItem({json.dumps(SESSION_KEY)}, {json.dumps(json.dumps(session))});"
    )


def assert_no_horizontal_overflow(page: Page, label: str) -> None:
    metrics = page.evaluate(
        """() => ({scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth})"""
    )
    expect(metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"{label}: horizontal overflow {metrics}")


def open_chat(context: BrowserContext) -> Page:
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.url.endswith("/chat/"), f"Authenticated E2E session was redirected: {page.url}")
    page.get_by_test_id("wa-v2-composer-entry").wait_for(state="visible")
    return page


def assert_sheet_desktop(page: Page) -> None:
    sheet = page.get_by_test_id("wa-v2-chat-sheet")
    sheet.wait_for(state="visible")
    box = sheet.bounding_box()
    expect(box is not None, "Desktop WhatsApp sheet has no bounding box")
    expect(box["x"] > 500, f"Desktop WhatsApp sheet is not right-aligned: {box}")
    expect(box["width"] < 700, f"Desktop WhatsApp sheet is unexpectedly wide: {box}")


def exercise_direct_action(page: Page, expected: str) -> None:
    status = page.locator('[data-action-id="publish_status"]')
    expect(status.is_enabled(), "Status action should be enabled for connected E2E account")
    status.click()
    page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="detached")
    textarea = page.locator("textarea").first
    expect(textarea.input_value() == expected, f"Composer starter mismatch: {textarea.input_value()!r}")
    expect(textarea.evaluate("el => document.activeElement === el"), "Composer did not receive focus after direct action selection")
    caret = textarea.evaluate("el => ({start: el.selectionStart, end: el.selectionEnd, length: el.value.length})")
    expect(caret["start"] == caret["length"] and caret["end"] == caret["length"], f"Caret not restored at end: {caret}")


def test_desktop(browser: Browser, traffic: list[dict[str, str]]) -> None:
    context = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    inject_session(context)
    install_api_mock(context, traffic)
    try:
        page = open_chat(context)
        assert_no_horizontal_overflow(page, "desktop chat")
        entry = page.get_by_test_id("wa-v2-composer-entry")
        entry.click()
        assert_sheet_desktop(page)
        expect(page.get_by_text("Connecté", exact=True).count() >= 1, "Connected status not visible in chat sheet")
        exercise_direct_action(page, "Sur WhatsApp, publie un statut : ")

        entry.click()
        page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")
        page.keyboard.press("Escape")
        page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="detached")
        active_testid = page.evaluate("document.activeElement?.getAttribute('data-testid')")
        expect(active_testid == "wa-v2-composer-entry", f"Focus was not restored to WhatsApp entry: {active_testid!r}")

        empty_entry = page.get_by_test_id("wa-v2-empty-entry")
        if empty_entry.count() and empty_entry.is_visible():
            empty_entry.click()
            page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")
            page.get_by_label("Fermer", exact=True).click()
            page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="detached")

        entry.click()
        sheet = page.get_by_test_id("wa-v2-chat-sheet")
        sheet.wait_for(state="visible")
        for _ in range(30):
            page.keyboard.press("Tab")
            inside = page.evaluate(
                """() => {
                  const sheet = document.querySelector('[data-testid="wa-v2-chat-sheet"]');
                  return !!sheet && sheet.contains(document.activeElement);
                }"""
            )
            expect(inside, "Keyboard focus escaped the WhatsApp modal sheet")
        page.keyboard.press("Escape")
        assert_no_horizontal_overflow(page, "desktop chat after interactions")
    finally:
        context.close()


def test_mobile(browser: Browser, traffic: list[dict[str, str]]) -> None:
    context = browser.new_context(
        viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=1, reduced_motion="reduce"
    )
    inject_session(context)
    install_api_mock(context, traffic)
    try:
        page = open_chat(context)
        assert_no_horizontal_overflow(page, "mobile chat")
        page.get_by_test_id("wa-v2-composer-entry").click()
        sheet = page.get_by_test_id("wa-v2-chat-sheet")
        sheet.wait_for(state="visible")
        box = sheet.bounding_box()
        expect(box is not None, "Mobile WhatsApp drawer has no bounding box")
        expect(box["x"] <= 2, f"Mobile drawer is not edge-to-edge: {box}")
        expect(box["width"] >= 386, f"Mobile drawer does not use viewport width: {box}")
        expect(abs((box["y"] + box["height"]) - 844) <= 3, f"Mobile drawer is not bottom-aligned: {box}")
        exercise_direct_action(page, "Sur WhatsApp, publie un statut : ")
        assert_no_horizontal_overflow(page, "mobile chat after WhatsApp selection")
    finally:
        context.close()


def assert_read_only_whatsapp_traffic(traffic: list[dict[str, str]]) -> None:
    whatsapp = [item for item in traffic if "/whatsapp/" in item["path"]]
    expect(whatsapp, "No WhatsApp state reads were observed")
    forbidden = [item for item in whatsapp if item["method"] != "GET"]
    expect(not forbidden, f"WhatsApp mutation detected in Phase 2C: {forbidden}")
    # Phase 8 legitimately adds a read-only permission check. No other endpoint
    # is accepted here, so the old integration gate still catches scope creep.
    allowed_suffixes = ("/whatsapp/etat", "/whatsapp/status", "/whatsapp/settings")
    unexpected_reads = [item for item in whatsapp if not item["path"].endswith(allowed_suffixes)]
    expect(not unexpected_reads, f"Unexpected WhatsApp endpoint used in /chat integration: {unexpected_reads}")
    settings_reads = [item for item in whatsapp if item["path"].endswith("/whatsapp/settings")]
    expect(settings_reads, "Phase 8 permission read was not exercised by direct action handoff")
    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Selecting a WhatsApp action auto-submitted chat: {streams}")


def main() -> None:
    expect((OUT / "chat" / "index.html").exists(), "Static /chat export missing; run flag-enabled npm run build first")
    original_cwd = Path.cwd()
    os.chdir(OUT)
    server = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    traffic: list[dict[str, str]] = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            test_desktop(browser, traffic)
            test_mobile(browser, traffic)
            browser.close()
        assert_read_only_whatsapp_traffic(traffic)
        print("WHATSAPP_EXPERIENCE_V2_CHAT_E2E=PASS")
        print("DESKTOP_CHAT=PASS")
        print("MOBILE_390_CHAT=PASS")
        print("FOCUS_RESTORE=PASS")
        print("FOCUS_TRAP=PASS")
        print("COMPOSER_PREPARE=PASS")
        print("WHATSAPP_READS_ONLY=PASS")
        print("PERMISSION_SETTINGS_READ=PASS")
        print("PERMISSION_SETTINGS_SCOPE=READ_ONLY")
        print("MUTATION_CALLS=NONE")
        print("CHAT_STREAM_AUTO_SUBMIT=NONE")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
