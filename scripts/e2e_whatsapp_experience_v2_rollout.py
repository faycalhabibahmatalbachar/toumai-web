#!/usr/bin/env python3
"""Phase 10 rollout/rollback browser certification for WhatsApp Experience V2.

The same assertions run against a Next dev server in FAST or the exported
production build in FULL. API calls are intercepted, so the test cannot mutate
Toumaï or a real WhatsApp account.
"""

from __future__ import annotations

import http.server
import json
import os
import shutil
import socketserver
import threading
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4183
SESSION_KEY = "chadgpt_web_session_v1"
EXPECT = os.environ.get("WA_V2_ROLLOUT_EXPECT", "on").strip().lower()
EXTERNAL_BASE_URL = os.environ.get("WA_V2_ROLLOUT_BASE_URL")
BASE_URL = EXTERNAL_BASE_URL or f"http://127.0.0.1:{PORT}/chat/"


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
            "nom_profil": "Compte rollout E2E",
        }
    if path.endswith("/whatsapp/status"):
        return {"status": "connected", "number": "+23566223344"}
    if path.endswith("/whatsapp/settings"):
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
            "id": "rollout-e2e-user",
            "email": "rollout@example.invalid",
            "full_name": "Utilisateur Rollout",
            "avatar_url": None,
        }
    if "usage" in path or "quota" in path:
        return {"plan": "test", "messages_remaining": 99, "messages_used": 1, "limit": 100}
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
        "access_token": "rollout-e2e-access-token",
        "refresh_token": "rollout-e2e-refresh-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "expires_at": 4_102_444_800_000,
        "user_id": "rollout-e2e-user",
        "is_guest": False,
    }
    context.add_init_script(
        f"localStorage.setItem({json.dumps(SESSION_KEY)}, {json.dumps(json.dumps(session))});"
    )


def assert_no_horizontal_overflow(page: Page, label: str) -> None:
    metrics = page.evaluate(
        "() => ({scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth})"
    )
    expect(metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"{label}: horizontal overflow {metrics}")


def open_authenticated_chat(context: BrowserContext) -> Page:
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    expect("/chat" in page.url, f"Authenticated rollout session was redirected: {page.url}")
    return page


def assert_read_only(traffic: list[dict[str, str]], *, require_whatsapp: bool) -> None:
    whatsapp = [item for item in traffic if "/whatsapp/" in item["path"]]
    if require_whatsapp:
        expect(whatsapp, "Feature-ON rollout did not exercise WhatsApp state reads")
    else:
        expect(not whatsapp, f"Feature-OFF rollout unexpectedly mounted/called WhatsApp V2: {whatsapp}")
    mutations = [item for item in whatsapp if item["method"] != "GET"]
    expect(not mutations, f"Rollout gate observed WhatsApp mutation: {mutations}")
    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Rollout gate auto-submitted chat: {streams}")


def test_enabled(browser) -> list[dict[str, str]]:
    traffic: list[dict[str, str]] = []
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        device_scale_factor=1,
        reduced_motion="reduce",
    )
    inject_session(context)
    install_api_mock(context, traffic)
    try:
        page = open_authenticated_chat(context)
        entry = page.get_by_test_id("wa-v2-composer-entry")
        entry.wait_for(state="visible")
        page.evaluate("document.documentElement.dir = 'rtl'")
        entry.click()
        sheet = page.get_by_test_id("wa-v2-chat-sheet")
        sheet.wait_for(state="visible")
        box = sheet.bounding_box()
        expect(box is not None, "Feature-ON V2 sheet has no bounding box")
        expect(box["width"] <= 390 and box["width"] >= 386, f"Feature-ON mobile drawer width invalid: {box}")
        expect(box["x"] >= -2 and box["x"] <= 4, f"Feature-ON RTL mobile drawer escaped viewport: {box}")
        assert_no_horizontal_overflow(page, "feature-on RTL mobile chat")
        page.keyboard.press("Escape")
        sheet.wait_for(state="detached")
        expect(
            page.evaluate("document.activeElement?.getAttribute('data-testid')") == "wa-v2-composer-entry",
            "Feature-ON rollout did not restore focus after Escape",
        )
    finally:
        context.close()
    assert_read_only(traffic, require_whatsapp=True)
    return traffic


def exercise_legacy_fallback(browser, *, mobile: bool) -> list[dict[str, str]]:
    traffic: list[dict[str, str]] = []
    kwargs = {"viewport": {"width": 390, "height": 844}, "reduced_motion": "reduce"} if mobile else {
        "viewport": {"width": 1440, "height": 900}, "reduced_motion": "reduce"
    }
    if mobile:
        kwargs.update({"is_mobile": True, "device_scale_factor": 1})
    context = browser.new_context(**kwargs)
    inject_session(context)
    install_api_mock(context, traffic)
    try:
        page = open_authenticated_chat(context)
        expect(page.get_by_test_id("wa-v2-composer-entry").count() == 0, "V2 composer entry exists with feature flag OFF")
        expect(page.get_by_test_id("wa-v2-chat-sheet").count() == 0, "V2 sheet exists with feature flag OFF")
        legacy = page.get_by_role("button", name="Faire une action sur WhatsApp")
        legacy.wait_for(state="visible")
        legacy.click()
        textarea = page.locator("textarea").first
        expect(textarea.input_value() == "Sur WhatsApp, ", f"Legacy fallback changed: {textarea.input_value()!r}")
        expect(textarea.evaluate("el => document.activeElement === el"), "Legacy fallback did not focus the composer")
        caret = textarea.evaluate("el => ({start: el.selectionStart, end: el.selectionEnd, length: el.value.length})")
        expect(caret["start"] == caret["length"] and caret["end"] == caret["length"], f"Legacy fallback caret invalid: {caret}")
        expect(page.get_by_test_id("wa-v2-chat-sheet").count() == 0, "Legacy fallback opened V2 sheet with flag OFF")
        assert_no_horizontal_overflow(page, "feature-off mobile" if mobile else "feature-off desktop")
    finally:
        context.close()
    assert_read_only(traffic, require_whatsapp=False)
    return traffic


def test_disabled(browser) -> None:
    desktop = exercise_legacy_fallback(browser, mobile=False)
    mobile = exercise_legacy_fallback(browser, mobile=True)
    assert_read_only(desktop + mobile, require_whatsapp=False)


def launch_browser(playwright):
    explicit = os.environ.get("WA_V2_BROWSER_EXECUTABLE")
    executable = explicit or shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if executable:
        return playwright.chromium.launch(headless=True, executable_path=executable)
    return playwright.chromium.launch(headless=True)


def run() -> None:
    expect(EXPECT in {"on", "off"}, f"WA_V2_ROLLOUT_EXPECT must be on or off, got {EXPECT!r}")
    if not EXTERNAL_BASE_URL:
        expect((OUT / "chat" / "index.html").exists(), "Static /chat export missing; run npm run build first")

    original_cwd = Path.cwd()
    server = None
    if not EXTERNAL_BASE_URL:
        os.chdir(OUT)
        server = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
        threading.Thread(target=server.serve_forever, daemon=True).start()

    try:
        with sync_playwright() as playwright:
            browser = launch_browser(playwright)
            try:
                if EXPECT == "on":
                    test_enabled(browser)
                    print("FEATURE_FLAG_ON=PASS")
                    print("V2_ACCESSIBLE=PASS")
                    print("MOBILE_390_ROLLOUT=PASS")
                    print("RTL_CHAT_SMOKE=PASS")
                    print("REDUCED_MOTION_CHAT_SMOKE=PASS")
                    print("MUTATION_CALLS=NONE")
                    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
                else:
                    test_disabled(browser)
                    print("FEATURE_FLAG_OFF=PASS")
                    print("LEGACY_FALLBACK=PASS")
                    print("FLAG_OFF_WHATSAPP_CALLS=NONE")
                    print("ROLLBACK_ENV_FLAG=PASS")
                    print("MOBILE_390_ROLLBACK=PASS")
                    print("CHAT_STREAM_AUTO_SUBMIT=NONE")
            finally:
                browser.close()
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
            os.chdir(original_cwd)


if __name__ == "__main__":
    run()
