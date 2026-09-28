#!/usr/bin/env python3
"""Phase 9 browser E2E for WhatsApp Experience V2 recent activity.

Recent activity is explicitly user-triggered and read-only. The server contract
already masks recipient identifiers; the UI must render that value as received,
never synthesize a raw number, never mutate WhatsApp and never submit chat.
"""

from __future__ import annotations

import http.server
import json
import os
import socketserver
import threading
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4184
BASE_URL = f"http://127.0.0.1:{PORT}/chat/"
SESSION_KEY = "chadgpt_web_session_v1"
DEV_MODE = os.environ.get("WA_V2_E2E_DEV_MODE") == "1"
MASKED_RECIPIENT = "+23566•••001"
RAW_RECIPIENT = "+23566000001"


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


@dataclass
class Scenario:
    mode: str = "ready"
    traffic: list[dict[str, str]] = field(default_factory=list)

    @property
    def activity_gets(self) -> int:
        return sum(1 for item in self.traffic if item["method"] == "GET" and item["path"].endswith("/whatsapp/activity"))


def activity_payload(mode: str) -> object:
    if mode == "empty":
        return {"items": [], "stats": {"total": 0, "messages": 0, "medias": 0, "actions": 0, "errors": 0}}
    return {
        "items": [
            {
                "tool": "whatsapp_send_message",
                "category": "messages",
                "recipient_masked": MASKED_RECIPIENT,
                "preview": "Bonjour, le dossier est prêt.",
                "ok": True,
                "created_at": "2026-09-28T14:20:00Z",
            },
            {
                "tool": "whatsapp_send_document",
                "category": "medias",
                "recipient_masked": "+23599•••777",
                "preview": "rapport.pdf",
                "ok": False,
                "created_at": "2026-09-28T13:10:00Z",
            },
        ],
        "stats": {"total": 2, "messages": 1, "medias": 1, "actions": 0, "errors": 1},
    }


def common_mock(path: str) -> object:
    if path.endswith("/whatsapp/etat"):
        return {
            "code": "connecte",
            "pret": True,
            "lecture_possible": True,
            "libelle": "Connecté",
            "numero": "+23566223344",
            "nom_profil": "Compte E2E",
        }
    if path.endswith("/whatsapp/status"):
        return {"status": "connected", "number": "+23566223344"}
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
        return {"id": "e2e-user", "email": "e2e@example.invalid", "full_name": "Utilisateur E2E", "avatar_url": None}
    if "usage" in path or "quota" in path:
        return {"plan": "test", "messages_remaining": 99, "messages_used": 1, "limit": 100}
    if "notifications" in path:
        return []
    return {}


def install_api_mock(context: BrowserContext, scenario: Scenario) -> None:
    def handler(route: Route) -> None:
        request = route.request
        parsed = urlparse(request.url)
        is_api = parsed.netloc == "api.toumaiai.com" or "/api/v1/" in parsed.path
        if not is_api:
            route.continue_()
            return

        method = request.method.upper()
        scenario.traffic.append({"method": method, "url": request.url, "path": parsed.path, "body": request.post_data or ""})

        if parsed.path.endswith("/whatsapp/activity"):
            if scenario.mode == "error":
                route.fulfill(status=503, content_type="application/json", body=json.dumps({"success": False, "detail": "activity unavailable"}))
                return
            data: object = activity_payload(scenario.mode)
        else:
            data = common_mock(parsed.path)

        route.fulfill(status=200, content_type="application/json", body=envelope(data))

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
    context.add_init_script(f"localStorage.setItem({json.dumps(SESSION_KEY)}, {json.dumps(json.dumps(session))});")


def open_chat(browser: Browser, scenario: Scenario, *, mobile: bool = False) -> tuple[BrowserContext, Page]:
    context = browser.new_context(
        viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900},
        is_mobile=mobile,
        device_scale_factor=1,
        reduced_motion="reduce",
    )
    inject_session(context)
    install_api_mock(context, scenario)
    page = context.new_page()
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.url.endswith("/chat/"), f"Authenticated E2E session was redirected: {page.url}")
    page.get_by_test_id("wa-v2-composer-entry").wait_for(state="visible")
    return context, page


def open_activity(page: Page, scenario: Scenario) -> None:
    page.get_by_test_id("wa-v2-composer-entry").click()
    page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")
    expect(scenario.activity_gets == 0, f"Activity loaded before explicit user request: {scenario.activity_gets}")
    page.get_by_test_id("wa-v2-open-activity").click()
    page.get_by_test_id("wa-v2-recent-activity").wait_for(state="visible")


def assert_initial_read_contract(scenario: Scenario, label: str) -> None:
    if DEV_MODE:
        expect(1 <= scenario.activity_gets <= 2, f"{label}: expected one or two dev activity reads, got {scenario.activity_gets}")
    else:
        expect(scenario.activity_gets == 1, f"{label}: expected exactly one production activity read, got {scenario.activity_gets}")


def test_ready_activity(browser: Browser) -> Scenario:
    scenario = Scenario(mode="ready")
    context, page = open_chat(browser, scenario)
    try:
        open_activity(page, scenario)
        page.get_by_test_id("wa-v2-activity-list").wait_for(state="visible")
        assert_initial_read_contract(scenario, "Ready activity")
        expect(page.get_by_test_id("wa-v2-activity-item").count() == 2, "Unexpected recent activity item count")
        expect(page.get_by_test_id("wa-v2-activity-recipient").first.inner_text() == MASKED_RECIPIENT, "Server-masked recipient was altered")
        expect(page.get_by_text(RAW_RECIPIENT, exact=True).count() == 0, "UI exposed or synthesized a raw recipient number")
        expect(page.get_by_test_id("wa-v2-activity-stats").is_visible(), "Activity stats are missing")
        expect(page.locator("textarea").first.input_value() == "", "Opening activity modified the composer")
        page.get_by_test_id("wa-v2-activity-back").click()
        page.get_by_test_id("wa-v2-action-center").wait_for(state="visible")
        return scenario
    finally:
        context.close()


def test_empty_activity(browser: Browser) -> Scenario:
    scenario = Scenario(mode="empty")
    context, page = open_chat(browser, scenario)
    try:
        open_activity(page, scenario)
        page.get_by_test_id("wa-v2-activity-empty").wait_for(state="visible")
        assert_initial_read_contract(scenario, "Empty activity")
        return scenario
    finally:
        context.close()


def test_error_activity(browser: Browser) -> Scenario:
    scenario = Scenario(mode="error")
    context, page = open_chat(browser, scenario)
    try:
        open_activity(page, scenario)
        error = page.get_by_test_id("wa-v2-activity-error")
        error.wait_for(state="visible")
        expect("Aucune donnée n’est inventée" in error.inner_text(), "Activity error did not remain truthful")
        expect(page.get_by_test_id("wa-v2-activity-item").count() == 0, "Error state rendered invented activity")
        return scenario
    finally:
        context.close()


def test_mobile_activity(browser: Browser) -> Scenario:
    scenario = Scenario(mode="ready")
    context, page = open_chat(browser, scenario, mobile=True)
    try:
        open_activity(page, scenario)
        page.get_by_test_id("wa-v2-activity-list").wait_for(state="visible")
        metrics = page.evaluate("() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})")
        expect(metrics["sw"] <= metrics["cw"] + 1, f"Mobile activity overflowed horizontally: {metrics}")
        return scenario
    finally:
        context.close()


def assert_read_only(scenarios: list[Scenario]) -> None:
    traffic = [item for scenario in scenarios for item in scenario.traffic]
    activity = [item for item in traffic if item["path"].endswith("/whatsapp/activity")]
    expect(activity, "Recent activity endpoint was never exercised")
    expect(all(item["method"] == "GET" for item in activity), f"Recent activity used a non-GET method: {activity}")
    whatsapp_mutations = [item for item in traffic if "/whatsapp/" in item["path"] and item["method"] != "GET"]
    expect(not whatsapp_mutations, f"Recent activity produced WhatsApp mutations: {whatsapp_mutations}")
    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Recent activity auto-submitted chat: {streams}")


def run_suite(browser: Browser, base_url: str) -> None:
    global BASE_URL
    BASE_URL = base_url
    scenarios = [
        test_ready_activity(browser),
        test_empty_activity(browser),
        test_error_activity(browser),
        test_mobile_activity(browser),
    ]
    assert_read_only(scenarios)


def main() -> None:
    expect((OUT / "chat" / "index.html").exists(), "Static /chat export missing; run flag-enabled npm run build first")
    original_cwd = Path.cwd()
    os.chdir(OUT)
    server = ReusableTCPServer(("127.0.0.1", PORT), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            run_suite(browser, BASE_URL)
            browser.close()
        print("WHATSAPP_EXPERIENCE_V2_ACTIVITY_E2E=PASS")
        print("ACTIVITY_EXPLICIT_TRIGGER_ONLY=PASS")
        print("ACTIVITY_SERVER_MASK_PRESERVED=PASS")
        print("RAW_RECIPIENT_SYNTHESIS=FORBIDDEN")
        print("ACTIVITY_EMPTY_STATE=PASS")
        print("ACTIVITY_ERROR_NO_FAKE_DATA=PASS")
        print("MOBILE_390_ACTIVITY=PASS")
        print("ACTIVITY_MUTATIONS=NONE")
        print("CHAT_STREAM_AUTO_SUBMIT=NONE")
        print(f"ACTIVITY_INITIAL_READ_CONTRACT={'DEV_1_OR_2' if DEV_MODE else 'PRODUCTION_EXACTLY_1'}")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
