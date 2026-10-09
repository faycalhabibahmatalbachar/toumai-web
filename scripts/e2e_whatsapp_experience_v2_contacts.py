#!/usr/bin/env python3
"""Phase 4 + Phase 5 browser E2E for WhatsApp Experience V2.

The production static /chat build runs in Chromium. Toumaï API calls are
intercepted so the test exercises the real Contact Picker, real Action Preview,
real Action Center and real composer handoff without sending any WhatsApp
message or invoking the chat runtime.

Critical safety invariants:
- recipient identity comes only from the synchronized carnet `number` field;
- numeric-looking JIDs are never converted into routable numbers;
- choosing a contact opens an explicit preview before composer handoff;
- preview/modify/confirm never performs a WhatsApp mutation;
- only explicit preview confirmation may prepare the existing Toumaï composer.

The same scenarios are reused by Pipeline 3X against `next dev`. React's
development mount checks may perform the initial read twice. FAST therefore
allows one or two initial read-only carnet GETs, but still proves that typing
never causes additional network search. FULL production certification requires
exactly one initial carnet GET.
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
PORT = 4180
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


CONTACTS = [
    {"jid": "opaque-amina@s.whatsapp.net", "number": "23566000001", "name": "Amina"},
    {"jid": "opaque-mahamat@s.whatsapp.net", "number": "23566000002", "name": "Mahamat"},
    # This JID intentionally looks like a phone number. It is NOT a routable
    # number and must never be derived/selected when the canonical number is null.
    {"jid": "23569999999@lid", "number": None, "name": "Sans numéro"},
]


@dataclass
class Scenario:
    contacts: list[dict[str, object]] = field(default_factory=lambda: [dict(item) for item in CONTACTS])
    source: str = "passerelle"
    traffic: list[dict[str, str]] = field(default_factory=list)

    @property
    def contacts_gets(self) -> int:
        return sum(1 for item in self.traffic if item["method"] == "GET" and item["path"].endswith("/whatsapp/contacts"))

    def carnet(self) -> dict[str, object]:
        return {
            "contacts": self.contacts,
            "count": len(self.contacts),
            "source": self.source,
            "derniere_synchronisation": "2026-09-27T18:00:00Z",
            "total_en_base": len(self.contacts),
        }


def expect_initial_carnet_reads(scenario: Scenario, label: str) -> int:
    count = scenario.contacts_gets
    if DEV_MODE:
        expect(1 <= count <= 2, f"{label}: dev mode expected one or two initial carnet reads, got {count}")
    else:
        expect(count == 1, f"{label}: production expected exactly one initial carnet read, got {count}")
    return count


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
        return {
            "id": "e2e-user",
            "email": "e2e@example.invalid",
            "full_name": "Utilisateur E2E",
            "avatar_url": None,
        }
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

        item = {
            "method": request.method.upper(),
            "url": request.url,
            "path": parsed.path,
            "body": request.post_data or "",
        }
        scenario.traffic.append(item)

        if parsed.path.endswith("/whatsapp/contacts"):
            data: object = scenario.carnet()
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
    context.add_init_script(
        f"localStorage.setItem({json.dumps(SESSION_KEY)}, {json.dumps(json.dumps(session))});"
    )


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


def open_picker(page: Page, action_id: str = "send_text") -> None:
    page.get_by_test_id("wa-v2-composer-entry").click()
    page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")
    action = page.locator(f'[data-action-id="{action_id}"]')
    expect(action.is_enabled(), f"Action {action_id} should be enabled for connected account")
    action.click()
    page.get_by_test_id("wa-v2-contact-picker").wait_for(state="visible")
    search = page.get_by_test_id("wa-v2-contact-search")
    search.wait_for(state="visible")
    expect(search.evaluate("el => document.activeElement === el"), "Contact search did not receive focus")


def expect_preview(page: Page, *, action: str, name: str, number: str, starter: str) -> None:
    preview = page.get_by_test_id("wa-v2-action-preview")
    preview.wait_for(state="visible")
    expect(page.get_by_test_id("wa-v2-chat-sheet").is_visible(), "Preview unexpectedly dismissed the WhatsApp sheet")
    expect(page.get_by_test_id("wa-v2-preview-action").inner_text() == action, "Preview action label mismatch")
    recipient = page.get_by_test_id("wa-v2-preview-recipient")
    expect(name in recipient.inner_text(), f"Preview recipient name mismatch: {recipient.inner_text()!r}")
    expect(page.get_by_test_id("wa-v2-preview-number").inner_text() == number, "Preview did not preserve trusted carnet number")
    expect(page.get_by_test_id("wa-v2-preview-starter").inner_text() == starter, "Preview starter mismatch")
    expect("Rien n’est encore envoyé" in page.get_by_test_id("wa-v2-preview-not-sent").inner_text(), "Preview safety notice missing")
    textarea = page.locator("textarea").first
    expect(textarea.input_value() == "", "Contact selection prepared the composer before explicit preview confirmation")


def assert_no_horizontal_overflow(page: Page, label: str) -> None:
    metrics = page.evaluate(
        """() => ({scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth})"""
    )
    expect(metrics["scrollWidth"] <= metrics["clientWidth"] + 1, f"{label}: horizontal overflow {metrics}")


def test_trusted_contact_handoff(browser: Browser) -> Scenario:
    scenario = Scenario()
    context, page = open_chat(browser, scenario)
    try:
        open_picker(page)
        initial_reads = expect_initial_carnet_reads(scenario, "Trusted contact")

        search = page.get_by_test_id("wa-v2-contact-search")
        search.fill("Maha")
        page.get_by_text("Mahamat", exact=True).wait_for(state="visible")
        expect(page.get_by_text("Amina", exact=True).count() == 0, "Local search did not filter unrelated contact")
        expect(
            scenario.contacts_gets == initial_reads,
            f"Typing in contact search triggered network reads: initial={initial_reads}, now={scenario.contacts_gets}",
        )

        option = page.locator('[data-contact-jid="opaque-mahamat@s.whatsapp.net"]')
        expect(option.is_enabled(), "Routable carnet contact should be selectable")
        expect(option.get_attribute("data-contact-number") == "23566000002", "Picker changed the trusted carnet number")
        option.click()

        expected = "Sur WhatsApp, envoie un message à Mahamat (+23566000002) : "
        expect_preview(page, action="Message", name="Mahamat", number="+23566000002", starter=expected)
        expect("opaque-mahamat" not in page.get_by_test_id("wa-v2-preview-starter").inner_text(), "Preview leaked a WhatsApp JID")

        page.get_by_test_id("wa-v2-preview-modify").click()
        page.get_by_test_id("wa-v2-contact-picker").wait_for(state="visible")
        search = page.get_by_test_id("wa-v2-contact-search")
        expect(search.evaluate("el => document.activeElement === el"), "Modify did not restore focus to contact search")
        search.fill("Maha")
        page.locator('[data-contact-jid="opaque-mahamat@s.whatsapp.net"]').click()
        expect_preview(page, action="Message", name="Mahamat", number="+23566000002", starter=expected)

        page.get_by_test_id("wa-v2-preview-confirm").click()
        page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="detached")
        textarea = page.locator("textarea").first
        expect(textarea.input_value() == expected, f"Trusted contact handoff mismatch: {textarea.input_value()!r}")
        expect("opaque-mahamat" not in textarea.input_value(), "Composer leaked/used a WhatsApp JID instead of the trusted number")
        expect(textarea.evaluate("el => document.activeElement === el"), "Composer did not receive focus after preview confirmation")
        caret = textarea.evaluate("el => ({start: el.selectionStart, end: el.selectionEnd, length: el.value.length})")
        expect(caret["start"] == caret["length"] and caret["end"] == caret["length"], f"Caret not at end after preview confirmation: {caret}")
        return scenario
    finally:
        context.close()


def test_unroutable_contact_and_back(browser: Browser) -> Scenario:
    scenario = Scenario()
    context, page = open_chat(browser, scenario)
    try:
        open_picker(page)
        search = page.get_by_test_id("wa-v2-contact-search")
        search.fill("Sans")
        option = page.locator('[data-contact-jid="23569999999@lid"]')
        option.wait_for(state="visible")
        expect(option.is_disabled(), "Contact with number=null must be disabled even if JID looks numeric")
        expect(option.get_attribute("data-contact-number") == "", "Unroutable contact unexpectedly exposes a derived number")
        expect(page.get_by_text("Numéro indisponible", exact=True).is_visible(), "Unroutable contact explanation missing")

        page.get_by_test_id("wa-v2-contact-back").click()
        page.get_by_test_id("wa-v2-action-center").wait_for(state="visible")
        expect(page.locator('[data-action-id="send_text"]').is_enabled(), "Back from picker did not restore Action Center")
        textarea = page.locator("textarea").first
        expect("23569999999" not in textarea.input_value(), "Numeric-looking JID was injected into composer")
        return scenario
    finally:
        context.close()


def test_stale_source_warning(browser: Browser) -> Scenario:
    scenario = Scenario(source="base")
    context, page = open_chat(browser, scenario)
    try:
        open_picker(page)
        warning = page.get_by_test_id("wa-v2-contact-stale-warning")
        warning.wait_for(state="visible")
        expect("contacts récents peuvent manquer" in warning.inner_text(), "Stale carnet warning is not explicit")
        return scenario
    finally:
        context.close()


def test_empty_state(browser: Browser) -> Scenario:
    scenario = Scenario(contacts=[])
    context, page = open_chat(browser, scenario)
    try:
        open_picker(page)
        page.get_by_test_id("wa-v2-contact-empty").wait_for(state="visible")
        expect_initial_carnet_reads(scenario, "Empty carnet")
        sync_mutations = [item for item in scenario.traffic if "/whatsapp/" in item["path"] and item["method"] != "GET"]
        expect(not sync_mutations, f"Read-only picker tried to mutate/synchronize the carnet: {sync_mutations}")
        return scenario
    finally:
        context.close()


def test_mobile_picker(browser: Browser) -> Scenario:
    scenario = Scenario()
    context, page = open_chat(browser, scenario, mobile=True)
    try:
        assert_no_horizontal_overflow(page, "mobile before picker")
        open_picker(page)
        sheet = page.get_by_test_id("wa-v2-chat-sheet")
        box = sheet.bounding_box()
        expect(box is not None and box["x"] <= 2 and box["width"] >= 386, f"Mobile contact picker drawer is not edge-to-edge: {box}")
        page.get_by_test_id("wa-v2-contact-search").fill("Ami")
        page.locator('[data-contact-jid="opaque-amina@s.whatsapp.net"]').click()
        expected = "Sur WhatsApp, envoie un message à Amina (+23566000001) : "
        expect_preview(page, action="Message", name="Amina", number="+23566000001", starter=expected)
        assert_no_horizontal_overflow(page, "mobile preview")
        page.get_by_test_id("wa-v2-preview-confirm").click()
        page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="detached")
        textarea = page.locator("textarea").first
        expect(textarea.input_value() == expected, "Mobile trusted-contact starter mismatch")
        expect(textarea.evaluate("el => document.activeElement === el"), "Mobile composer focus not restored after preview confirmation")
        assert_no_horizontal_overflow(page, "mobile after picker")
        return scenario
    finally:
        context.close()


def assert_read_only_traffic(scenarios: list[Scenario]) -> None:
    traffic = [item for scenario in scenarios for item in scenario.traffic]
    contacts_reads = [item for item in traffic if item["path"].endswith("/whatsapp/contacts")]
    expect(contacts_reads, "No carnet reads were observed in Contact Picker E2E")
    expect(all(item["method"] == "GET" for item in contacts_reads), f"Carnet mutation detected: {contacts_reads}")

    whatsapp_mutations = [item for item in traffic if "/whatsapp/" in item["path"] and item["method"] != "GET"]
    expect(not whatsapp_mutations, f"Contact Picker / Preview produced WhatsApp mutations: {whatsapp_mutations}")

    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Contact selection or preview auto-submitted chat: {streams}")


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
            scenarios = [
                test_trusted_contact_handoff(browser),
                test_unroutable_contact_and_back(browser),
                test_stale_source_warning(browser),
                test_empty_state(browser),
                test_mobile_picker(browser),
            ]
            browser.close()

        assert_read_only_traffic(scenarios)
        print("WHATSAPP_EXPERIENCE_V2_CONTACTS_E2E=PASS")
        print("WHATSAPP_EXPERIENCE_V2_PREVIEW_E2E=PASS")
        print("CONTACT_SEARCH_LOCAL=PASS")
        print("TRUSTED_NUMBER_PREVIEW=PASS")
        print("PREVIEW_BEFORE_COMPOSER=PASS")
        print("PREVIEW_MODIFY_LOOP=PASS")
        print("PREVIEW_EXPLICIT_CONFIRMATION=PASS")
        print("TRUSTED_NUMBER_HANDOFF=PASS")
        print("OPAQUE_JID_NOT_DERIVED=PASS")
        print("UNROUTABLE_CONTACT_DISABLED=PASS")
        print("STALE_SOURCE_WARNING=PASS")
        print("EMPTY_STATE=PASS")
        print("MOBILE_390_CONTACT_PICKER_PREVIEW=PASS")
        print("WHATSAPP_MUTATIONS=NONE")
        print("CHAT_STREAM_AUTO_SUBMIT=NONE")
        print(f"CONTACT_INITIAL_READ_CONTRACT={'DEV_1_OR_2' if DEV_MODE else 'PRODUCTION_EXACTLY_1'}")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
