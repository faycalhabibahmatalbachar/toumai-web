#!/usr/bin/env python3
"""Phase 3 browser E2E for the WhatsApp Experience V2 connection flow.

The production static build is served locally and every Toumaï API request is
intercepted inside Chromium. The test exercises the real React connection UI
and the real frontend runtime contract while a deterministic fake provider
controls when canonical WhatsApp state becomes connected.

This is intentionally NOT a real-phone/provider certification. Its purpose is
to prove that the web client makes only the expected connection mutations and
never presents Connected before canonical backend state says so.
"""

from __future__ import annotations

import http.server
import json
import os
import socketserver
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Browser, BrowserContext, Page, Route, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
PORT = 4179
BASE_URL = f"http://127.0.0.1:{PORT}/chat/"
SESSION_KEY = "chadgpt_web_session_v1"
QR_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2+S0AAAAASUVORK5CYII="


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
    initial: str = "disconnected"
    connected: bool = False
    mode: str | None = None
    link_calls: int = 0
    pairing_calls: int = 0
    current_pairing_code: str | None = None
    code_expires_at: float | None = None
    traffic: list[dict[str, str]] = field(default_factory=list)

    def etat(self) -> dict[str, object]:
        if self.connected:
            return {
                "code": "connecte",
                "pret": True,
                "lecture_possible": True,
                "libelle": "Connecté",
                "numero": "+23566223344",
                "nom_profil": "Compte E2E",
            }
        if self.mode == "qr":
            return {
                "code": "qr",
                "pret": False,
                "lecture_possible": False,
                "libelle": "Scannez le QR",
                "action": "scanner",
                "progression": {
                    "etapes": [
                        {"cle": "demarrage", "libelle": "Démarrage", "etat": "termine"},
                        {"cle": "scan", "libelle": "Scanner le QR", "etat": "en_cours"},
                        {"cle": "confirmation", "libelle": "Confirmation", "etat": "en_attente"},
                    ],
                    "rang": 2,
                    "total": 3,
                    "libelle_courant": "Scanner le QR",
                    "termine": False,
                },
            }
        if self.mode == "pairing":
            expiry_ms = int((self.code_expires_at or time.time()) * 1000)
            return {
                "code": "jumelage",
                "pret": False,
                "lecture_possible": False,
                "libelle": "Code de couplage prêt",
                "action": "saisir_code",
                "code_jumelage": self.current_pairing_code,
                "code_expire_le": expiry_ms,
                "progression": {
                    "etapes": [
                        {"cle": "demarrage", "libelle": "Démarrage", "etat": "termine"},
                        {"cle": "code", "libelle": "Saisir le code", "etat": "en_cours"},
                        {"cle": "confirmation", "libelle": "Confirmation", "etat": "en_attente"},
                    ],
                    "rang": 2,
                    "total": 3,
                    "libelle_courant": "Saisir le code",
                    "termine": False,
                },
            }
        if self.initial == "expired":
            return {
                "code": "session_expiree",
                "pret": False,
                "lecture_possible": False,
                "libelle": "Session expirée",
                "action": "reconnecter",
            }
        return {
            "code": "deconnecte",
            "pret": False,
            "lecture_possible": False,
            "libelle": "Non connecté",
            "action": "connecter",
        }

    def raw(self) -> dict[str, object]:
        if self.connected:
            return {"status": "connected", "number": "+23566223344"}
        if self.mode == "qr":
            return {"status": "qr", "qr": QR_DATA}
        if self.mode == "pairing":
            expiry = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.code_expires_at or time.time()))
            return {
                "status": "pairing",
                "pairingCode": self.current_pairing_code,
                "codeExpiresAt": expiry,
            }
        if self.initial == "expired":
            return {"status": "session_expiree", "number": "+23566223344"}
        return {"status": "disconnected"}


def common_mock(path: str) -> object:
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

        method = request.method.upper()
        body = request.post_data or ""
        scenario.traffic.append({"method": method, "url": request.url, "path": parsed.path, "body": body})

        if parsed.path.endswith("/whatsapp/etat"):
            data: object = scenario.etat()
        elif parsed.path.endswith("/whatsapp/status"):
            data = scenario.raw()
        elif parsed.path.endswith("/whatsapp/link") and method == "POST":
            scenario.link_calls += 1
            scenario.mode = "qr"
            data = scenario.raw()
        elif parsed.path.endswith("/whatsapp/refresh-code") and method == "POST":
            scenario.pairing_calls += 1
            scenario.mode = "pairing"
            scenario.current_pairing_code = "13572468" if scenario.pairing_calls == 1 else "24681357"
            scenario.code_expires_at = time.time() + 1.4
            data = {
                "pairingCode": scenario.current_pairing_code,
                "codeExpiresAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(scenario.code_expires_at)),
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


def open_whatsapp_sheet(page: Page) -> None:
    page.get_by_test_id("wa-v2-composer-entry").click()
    page.get_by_test_id("wa-v2-chat-sheet").wait_for(state="visible")


def wait_until(predicate, timeout_s: float, message: str) -> None:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    raise AssertionError(message)


def test_qr_flow(browser: Browser) -> Scenario:
    scenario = Scenario()
    context, page = open_chat(browser, scenario)
    try:
        open_whatsapp_sheet(page)
        send_action = page.locator('[data-action-id="send_text"]')
        expect(send_action.is_disabled(), "Disconnected WhatsApp actions must remain disabled")

        page.get_by_role("button", name="Connecter", exact=True).click()
        page.get_by_test_id("wa-v2-connection-flow").wait_for(state="visible")
        page.get_by_alt_text("QR code de connexion WhatsApp").wait_for(state="visible")
        wait_until(lambda: scenario.link_calls == 1, 2.0, f"Expected exactly one QR link call, got {scenario.link_calls}")

        expect(page.get_by_text("Connecté", exact=True).count() == 0, "UI claimed Connected before canonical state did")
        expect(send_action.count() == 0 or send_action.is_disabled(), "Actions became usable before canonical connected state")

        scenario.connected = True
        page.get_by_test_id("wa-v2-connection-flow").wait_for(state="detached", timeout=7000)
        page.get_by_text("Connecté", exact=True).wait_for(state="visible")
        expect(page.locator('[data-action-id="send_text"]').is_enabled(), "Actions did not unlock after canonical connected state")
        expect(scenario.link_calls == 1, f"QR flow retriggered link unexpectedly: {scenario.link_calls}")
        return scenario
    finally:
        context.close()


def test_pairing_expiry_refresh(browser: Browser) -> Scenario:
    scenario = Scenario()
    context, page = open_chat(browser, scenario, mobile=True)
    try:
        open_whatsapp_sheet(page)
        sheet = page.get_by_test_id("wa-v2-chat-sheet")
        box = sheet.bounding_box()
        expect(box is not None and box["width"] >= 386, f"Mobile connection drawer is not viewport width: {box}")

        page.get_by_role("button", name="Connecter", exact=True).click()
        page.get_by_test_id("wa-v2-connection-flow").wait_for(state="visible")
        page.get_by_test_id("wa-v2-connection-mode-pairing").click()
        wait_until(lambda: scenario.pairing_calls >= 1, 3.0, "Pairing-code request was not issued")
        page.get_by_text("13572468", exact=True).wait_for(state="visible", timeout=4000)
        expect(page.get_by_text("Connecté", exact=True).count() == 0, "Pairing flow claimed Connected before canonical confirmation")

        page.get_by_text("Code expiré", exact=True).wait_for(state="visible", timeout=5000)
        page.get_by_role("button", name="Nouveau code", exact=True).click()
        wait_until(lambda: scenario.pairing_calls >= 2, 3.0, "Expired pairing code was not refreshed")
        page.get_by_text("24681357", exact=True).wait_for(state="visible", timeout=4000)

        scenario.connected = True
        page.get_by_test_id("wa-v2-connection-flow").wait_for(state="detached", timeout=7000)
        page.get_by_text("Connecté", exact=True).wait_for(state="visible")
        expect(page.locator('[data-action-id="send_text"]').is_enabled(), "Pairing confirmation did not unlock actions")
        return scenario
    finally:
        context.close()


def test_expired_reconnect(browser: Browser) -> Scenario:
    scenario = Scenario(initial="expired")
    context, page = open_chat(browser, scenario)
    try:
        open_whatsapp_sheet(page)
        page.get_by_text("Session expirée", exact=True).wait_for(state="visible")
        page.get_by_role("button", name="Reconnecter", exact=True).click()
        flow = page.get_by_test_id("wa-v2-connection-flow")
        flow.wait_for(state="visible")
        page.get_by_text("Reconnecter WhatsApp", exact=True).wait_for(state="visible")
        page.get_by_alt_text("QR code de connexion WhatsApp").wait_for(state="visible")
        wait_until(lambda: scenario.link_calls == 1, 2.0, "Reconnect did not issue exactly one QR link call")
        expect(page.get_by_text("Connecté", exact=True).count() == 0, "Reconnect flow claimed Connected before provider confirmation")

        scenario.connected = True
        flow.wait_for(state="detached", timeout=7000)
        page.get_by_text("Connecté", exact=True).wait_for(state="visible")
        expect(page.locator('[data-action-id="send_text"]').is_enabled(), "Actions stayed disabled after reconnect confirmation")
        return scenario
    finally:
        context.close()


def assert_expected_connection_traffic(scenarios: list[Scenario]) -> None:
    traffic = [item for scenario in scenarios for item in scenario.traffic]
    whatsapp_mutations = [
        item for item in traffic if "/whatsapp/" in item["path"] and item["method"] != "GET"
    ]
    allowed_suffixes = ("/whatsapp/link", "/whatsapp/refresh-code")
    forbidden = [
        item for item in whatsapp_mutations if not item["path"].endswith(allowed_suffixes)
    ]
    expect(not forbidden, f"Unexpected WhatsApp mutation in connection E2E: {forbidden}")

    link_calls = [item for item in whatsapp_mutations if item["path"].endswith("/whatsapp/link")]
    refresh_calls = [item for item in whatsapp_mutations if item["path"].endswith("/whatsapp/refresh-code")]
    expect(len(link_calls) >= 2, f"QR/reconnect link mutations were not exercised: {link_calls}")
    expect(len(refresh_calls) >= 2, f"Pairing generation/refresh mutations were not exercised: {refresh_calls}")

    for item in link_calls:
        expect(item["body"].strip() in ("{}", ""), f"QR link must not send an invented phone number: {item}")

    streams = [item for item in traffic if "/chat/stream" in item["path"]]
    expect(not streams, f"Connection flow auto-submitted the chat composer: {streams}")
    logout = [item for item in traffic if item["path"].endswith("/whatsapp/logout")]
    expect(not logout, f"Connection flow disconnected the account unexpectedly: {logout}")


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
                test_qr_flow(browser),
                test_pairing_expiry_refresh(browser),
                test_expired_reconnect(browser),
            ]
            browser.close()

        assert_expected_connection_traffic(scenarios)
        print("WHATSAPP_EXPERIENCE_V2_CONNECTION_E2E=PASS")
        print("QR_FLOW=PASS")
        print("PAIRING_FLOW=PASS")
        print("PAIRING_EXPIRY_REFRESH=PASS")
        print("RECONNECT_FLOW=PASS")
        print("CANONICAL_CONNECTED_GATE=PASS")
        print("CONNECTION_MUTATIONS_EXPECTED_ONLY=PASS")
        print("CHAT_STREAM_AUTO_SUBMIT=NONE")
        print("REAL_PHONE_PROVIDER_E2E=NOT_RUN")
    finally:
        server.shutdown()
        server.server_close()
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()
