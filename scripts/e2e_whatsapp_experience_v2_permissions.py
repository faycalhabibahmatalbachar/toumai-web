#!/usr/bin/env python3
"""Phase 8 browser E2E for the contextual WhatsApp permission gate.

The gate is an extra client-side UX protection. Backend tool permissions remain
the final authority. These scenarios prove that explicit permission=false stops
the flow before target selection/composer handoff, while allowed or temporarily
missing legacy keys preserve the existing flow. No provider mutation is allowed.
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
PORT = 4183
BASE_URL = f"http://127.0.0.1:{PORT}/chat/"
SESSION_KEY = "chadgpt_web_session_v1"
DEV_MODE = os.environ.get("WA_V2_E2E_DEV_MODE") == "1"


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
    permission: bool | None = True
    settings_error: bool = False
    traffic: list[dict[str, str]] = field(default_factory=list)

    @property
    def settings_gets(self) -> int:
        return sum(1 for item in self.traffic if item["method"] == "GET" and item["path"].endswith("/whatsapp/settings"))

    @property
    def contacts_gets(self) -> int:
        return sum(1 for item in self.traffic if item["method"] == "GET" and item["path"].endswith("/whatsapp/contacts"))


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
    if path.endswith("/whatsapp/contacts"):
        return {
            "contacts": [{"jid": "opaque-amina@s.whatsapp.net", "number": "23566000001", "name": "Amina"}],
            "count": 1,
            "source": "passerelle",
            "derniere_synchronisation": "2026-09-28T12:00:00Z",
            "total_en_base": 1,
        }
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

        if parsed.path.endswith("/whatsapp/settings"):
            if scenario.settings_error:
                route.fulfill(status=503, content_type="application/json", body=json.dumps({"success": False, "detail": "settings unavailable"}))
                return
            data: object = {} if scenario.permission is None else {
                "send_text": scenario.permission,
                "post_status": scenario.permission,
            }
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


def choose_action(page: Page, action_id: str) -> None:
    page.get_by_test_id("wa-v2-composer-entry").click()
    page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")
    action = page.locator(f'[data-action-id="{action_id}"]')
    expect(action.is_enabled(), f"Action {action_id} should be enabled for connected account")
    action.click()


def assert_settings_read_count(scenario: Scenario, label: str) -> None:
    if DEV_MODE:
        expect(1 <= scenario.settings_gets <= 2, f"{label}: expected one or two dev permission reads, got {scenario.settings_gets}")
    else:
        expect(scenario.settings_gets == 1, f"{label}: expected exactly one production permission read, got {scenario.settings_gets}")


def test_allowed_permission(browser: Browser) -> Scenario:
    scenario = Scenario(permission=True)
    context, page = open_chat(browser, scenario)
    try:
        choose_action(page, "send_text")
        page.get_by_test_id("wa-v2-contact-picker").wait_for(state="visible")
        assert_settings_read_count(scenario, "Allowed permission")
        expect(scenario.contacts_gets >= 1, "Allowed action did not continue to target selection")
        expect(page.locator("textarea").first.input_value() == "", "Permission check prepared composer before target/preview")
        return scenario
    finally:
        context.close()


def test_denied_permission(browser: Browser) -> Scenario:
    scenario = Scenario(permission=False)
    context, page = open_chat(browser, scenario)
    try:
        choose_action(page, "send_text")
        denied = page.get_by_test_id("wa-v2-permission-denied")
        denied.wait_for(state="visible")
        assert_settings_read_count(scenario, "Denied permission")
        expect("Permission désactivée" in denied.inner_text(), "Denied permission explanation missing")
        expect(page.get_by_test_id("wa-v2-permission-manage").is_visible(), "Denied state must expose the existing permission settings entry point")
        expect(page.get_by_test_id("wa-v2-contact-picker").count() == 0, "Denied action reached Contact Picker")
        expect(scenario.contacts_gets == 0, "Denied action read the carnet before permission approval")
        expect(page.locator("textarea").first.input_value() == "", "Denied action prepared composer")
        page.get_by_test_id("wa-v2-permission-back").click()
        page.get_by_test_id("wa-v2-action-center").wait_for(state="visible")
        return scenario
    finally:
        context.close()


def test_settings_error_fail_closed(browser: Browser) -> Scenario:
    scenario = Scenario(settings_error=True)
    context, page = open_chat(browser, scenario)
    try:
        choose_action(page, "send_text")
        error = page.get_by_test_id("wa-v2-permission-error")
        error.wait_for(state="visible")
        expect("ne continue pas" in error.inner_text(), "Permission read failure did not fail closed")
        expect(scenario.contacts_gets == 0, "Permission error reached Contact Picker")
        expect(page.locator("textarea").first.input_value() == "", "Permission error prepared composer")
        return scenario
    finally:
        context.close()


def test_legacy_missing_key_compatibility(browser: Browser) -> Scenario:
    scenario = Scenario(permission=None)
    context, page = open_chat(browser, scenario, mobile=True)
    try:
        choose_action(page, "send_text")
        page.get_by_test_id("wa-v2-contact-picker").wait_for(state="visible")
        assert_settings_read_count(scenario, "Legacy missing permission key")
        expect(scenario.contacts_gets >= 1, "Missing legacy key incorrectly blocked an otherwise backend-governed action")
        metrics = page.evaluate("() => ({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})")
        expect(metrics["sw"] <= metrics["cw"] + 1, f"Mobile permission flow overflowed horizontally: {metrics}")
        return scenario
    finally:
        context.close()


def assert_read_only(scenarios: list[Scenario]) -> None:
    traffic = [item for scenario in scenarios for item in scenario.traffic]
    settings_calls = [item for item in traffic if item["path"].endswith("/whatsapp/settings")]
    expect(settings_calls, "Permission gate never read /whatsapp/settings")
    expect(all(item["method"] == "GET" for item in settings_calls), f"Permission gate mutated settings: {settings_calls}")
    whatsapp_mutations = [item for item in traffic if "/whatsapp/" in item["path"] and item["method"] != "GET"]
    expect(not whatsapp_mutations, f"Permission gate produced WhatsApp mutations: {whatsapp_mutations}")
    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Permission gate auto-submitted chat: {streams}")


def run_suite(browser: Browser, base_url: str) -> None:
    global BASE_URL
    BASE_URL = base_url
    scenarios = [
        test_allowed_permission(browser),
        test_denied_permission(browser),
        test_settings_error_fail_closed(browser),
        test_legacy_missing_key_compatibility(browser),
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
        print("WHATSAPP_EXPERIENCE_V2_PERMISSIONS_E2E=PASS")
        print("PERMISSION_ALLOWED_FLOW=PASS")
        print("EXPLICIT_PERMISSION_DENIED=BLOCKED")
        print("PERMISSION_MANAGEMENT_ENTRYPOINT=VISIBLE")
        print("PERMISSION_READ_ERROR=FAIL_CLOSED")
        print("LEGACY_MISSING_KEY=BACKEND_GOVERNED_COMPAT")
        print("PERMISSION_SETTINGS_MUTATIONS=NONE")
        print("WHATSAPP_MUTATIONS=NONE")
        print("CHAT_STREAM_AUTO_SUBMIT=NONE")
        print(f"PERMISSION_READ_CONTRACT={'DEV_1_OR_2' if DEV_MODE else 'PRODUCTION_EXACTLY_1'}")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
