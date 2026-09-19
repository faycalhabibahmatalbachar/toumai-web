"""Production E2E for Toumaï reminder notification delivery."""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

API = os.environ.get("TOUMAI_API", "https://api.toumaiai.com/api/v1").rstrip("/")
WEB = os.environ.get("TOUMAI_WEB", "https://toumaiai.com").rstrip("/")
RUN_KEY = os.environ.get("GITHUB_RUN_ID", str(int(time.time())))

token = None
user_id = None
summary = []
sse_events = []
sse_stop = threading.Event()


def raw_request(method, url, body=None, bearer=None, timeout=30):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Toumai-E2E/1.0)",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    if bearer:
        headers["Authorization"] = "Bearer " + bearer
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"raw": raw[:500]}
        raise AssertionError("{} {} -> HTTP {}: {}".format(method, url, exc.code, payload)) from exc


def api(method, path, body=None, timeout=30):
    status, payload = raw_request(method, API + path, body, token, timeout)
    if not 200 <= status < 300:
        raise AssertionError("{} {} returned {}".format(method, path, status))
    if isinstance(payload, dict) and payload.get("success") is False:
        raise AssertionError("{} {} returned application failure: {}".format(method, path, payload))
    return payload


def wait_web_deploy():
    deadline = time.time() + 300
    while time.time() < deadline:
        try:
            request = urllib.request.Request(
                WEB + "/sw.js",
                headers={"User-Agent": "Mozilla/5.0 (compatible; Toumai-E2E/1.0)"},
            )
            with urllib.request.urlopen(request, timeout=20) as response:
                source = response.read().decode("utf-8", "replace")
            if "TOUMAI_NOTIFICATION" in source and "toumai-v5" in source:
                summary.append("Web production service worker: PASS")
                return
        except Exception:
            pass
        time.sleep(10)
    raise AssertionError("new Web service worker was not visible in production")


def verify_backend_health():
    status, health = raw_request("GET", "https://api.toumaiai.com/health", timeout=30)
    if status != 200 or health.get("status") != "ok":
        raise AssertionError("backend health is not OK: {}".format(health))
    if health.get("push_notifications") is not True:
        raise AssertionError("FCM v1 is not configured in production: {}".format(health))
    summary.append("Backend health + FCM v1 configuration: PASS")


def register_temp_account():
    global token, user_id
    email = "e2e-notifications-{}@example.com".format(RUN_KEY)
    password = "ToumaiE2E-{}-{}-Aa9!".format(RUN_KEY, uuid.uuid4().hex[:12])
    status, payload = raw_request(
        "POST",
        API + "/auth/register",
        {"email": email, "password": password, "name": "Toumaï Notifications E2E"},
        timeout=45,
    )
    if status != 200 or payload.get("success") is False:
        raise AssertionError("temporary registration failed: {}".format(payload))
    data = payload.get("data") or {}
    token = data.get("access_token")
    user_id = data.get("user_id")
    if not token or not user_id:
        raise AssertionError("registration did not return application tokens: {}".format(list(data.keys())))
    print("TEMP_USER_ID={}".format(user_id))
    print("TEMP_USER_EMAIL={}".format(email))
    print("::add-mask::{}".format(token))
    summary.append("Temporary authenticated account: PASS")


def wait_backend_deploy():
    deadline = time.time() + 300
    last = None
    while time.time() < deadline:
        try:
            payload = api("GET", "/notifications/capabilities")
            data = payload.get("data") or {}
            last = data
            if (
                data.get("inbox_v3") is True
                and data.get("preferences_v3") is True
                and data.get("realtime_stream") is True
                and data.get("voice_reminders") is True
            ):
                summary.append("Backend production capabilities: PASS")
                return data
        except Exception as exc:
            last = str(exc)
        time.sleep(10)
    raise AssertionError("multichannel backend capabilities not deployed: {}".format(last))


def patch_preferences(**values):
    payload = api("PATCH", "/notifications/preferences?category=%2A", values)
    data = payload.get("data") or {}
    for key, value in values.items():
        if isinstance(value, bool) and key in data and data.get(key) is not value:
            raise AssertionError("preference {} did not persist: {}".format(key, data))
    return data


def notification_stream():
    request = urllib.request.Request(
        API + "/notifications/stream",
        headers={"Authorization": "Bearer " + str(token), "Accept": "text/event-stream"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            event_name = None
            data_lines = []
            for raw in response:
                if sse_stop.is_set():
                    return
                line = raw.decode("utf-8", "replace").rstrip("\r\n")
                if not line:
                    if data_lines and event_name == "notification":
                        try:
                            sse_events.append(json.loads("\n".join(data_lines)))
                        except Exception:
                            pass
                    event_name = None
                    data_lines = []
                    continue
                if line.startswith("event:"):
                    event_name = line[6:].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[5:].lstrip())
    except Exception as exc:
        if not sse_stop.is_set():
            sse_events.append({"_stream_error": str(exc)})


def create_chat_reminder(marker):
    body = {
        "message": "Rappelle-moi dans 1 minute de vérifier " + marker,
        "session_id": None,
        "language": "fr",
        "model_preference": "auto",
        "web_search": False,
        "ephemeral": False,
    }
    request = urllib.request.Request(
        API + "/chat/stream",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + str(token),
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        method="POST",
    )
    events = []
    with urllib.request.urlopen(request, timeout=120) as response:
        data_lines = []
        for raw in response:
            line = raw.decode("utf-8", "replace").rstrip("\r\n")
            if not line:
                if data_lines:
                    try:
                        events.append(json.loads("\n".join(data_lines)))
                    except Exception:
                        pass
                data_lines = []
                continue
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())

    errors = [evt.get("error") for evt in events if isinstance(evt, dict) and evt.get("error")]
    if errors:
        raise AssertionError("chat reminder failed: {}".format(errors))
    if not any(evt.get("done") is True for evt in events if isinstance(evt, dict)):
        raise AssertionError("chat stream did not finish: {}".format(events[-5:]))
    return events


def notifications(include_archived=True):
    suffix = "?limit=100&offset=0"
    if include_archived:
        suffix += "&include_archived=true"
    payload = api("GET", "/notifications" + suffix)
    return payload.get("data") or []


def wait_notification(marker, timeout=170):
    deadline = time.time() + timeout
    while time.time() < deadline:
        for row in notifications(True):
            text_value = " ".join(
                [
                    str(row.get("title") or ""),
                    str(row.get("body") or ""),
                    str(row.get("event") or ""),
                ]
            )
            if row.get("event") == "personal.reminder" and marker in text_value:
                return row
        time.sleep(5)
    raise AssertionError("reminder {} did not reach Inbox".format(marker))


def wait_realtime(marker, timeout=25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        matches = [evt for evt in sse_events if marker in json.dumps(evt, ensure_ascii=False)]
        if matches:
            return matches
        time.sleep(1)
    return []


def main():
    try:
        wait_web_deploy()
        verify_backend_health()
        register_temp_account()
        wait_backend_deploy()

        prefs = patch_preferences(
            push_enabled=True,
            web_push_enabled=False,
            realtime_enabled=True,
            voice_enabled=True,
            quiet_hours_enabled=False,
            timezone="Africa/Ndjamena",
            locale="fr",
        )
        assert prefs.get("inbox_enabled") is True
        assert prefs.get("realtime_enabled") is True
        assert prefs.get("voice_enabled") is True
        summary.append("Channel preferences persistence: PASS")

        vapid = api("GET", "/notifications/web-push/vapid-public-key")
        configured = bool(vapid.get("configured"))
        summary.append(
            "Web Push provider configuration: "
            + ("PASS" if configured else "BLOCKED_CONFIG (VAPID environment missing)")
        )

        fake_endpoint = "https://push.example.test/e2e/" + str(uuid.uuid4())
        subscribed = api(
            "POST",
            "/notifications/web-push/subscribe",
            {"endpoint": fake_endpoint, "keys": {"p256dh": "B" * 88, "auth": "A" * 24}},
        )
        assert (subscribed.get("data") or {}).get("subscribed") is True
        unsubscribed = api(
            "DELETE",
            "/notifications/web-push/subscription",
            {"endpoint": fake_endpoint},
        )
        assert (unsubscribed.get("data") or {}).get("subscribed") is False
        summary.append("Web Push subscription lifecycle API: PASS")

        thread = threading.Thread(target=notification_stream, daemon=True)
        thread.start()
        time.sleep(3)

        marker1 = "E2E-REALTIME-" + RUN_KEY
        create_chat_reminder(marker1)
        first = wait_notification(marker1)
        first_id = str(first.get("id") or "")
        if not first_id:
            raise AssertionError("first reminder has no notification id")
        summary.append("Chat -> Automation reminder -> Inbox: PASS")

        realtime = wait_realtime(marker1)
        if not realtime:
            raise AssertionError("first reminder missing from realtime stream: {}".format(sse_events[-10:]))
        if not any(evt.get("voice_enabled") is True for evt in realtime):
            raise AssertionError("voice opt-in flag missing from realtime event: {}".format(realtime))
        summary.append("Inbox -> authenticated realtime SSE: PASS")
        summary.append("Voice opt-in propagation: PASS")

        unread = api("GET", "/notifications/unread-count")
        if int(unread.get("unread_count") or 0) < 1:
            raise AssertionError("unread count did not include reminder: {}".format(unread))
        api("POST", "/notifications/{}/read".format(urllib.parse.quote(first_id)))
        read_row = next((r for r in notifications(True) if str(r.get("id")) == first_id), None)
        if not read_row or not read_row.get("read_at"):
            raise AssertionError("read state missing: {}".format(read_row))
        summary.append("Unread count + mark read: PASS")

        api("POST", "/notifications/{}/archive".format(urllib.parse.quote(first_id)))
        if any(str(r.get("id")) == first_id for r in notifications(False)):
            raise AssertionError("archived notification still visible in default Inbox")
        archived = next((r for r in notifications(True) if str(r.get("id")) == first_id), None)
        if not archived or not archived.get("archived_at"):
            raise AssertionError("archive state missing: {}".format(archived))
        summary.append("Archive semantics: PASS")

        now = datetime.now(ZoneInfo("Africa/Ndjamena"))
        patch_preferences(
            realtime_enabled=True,
            voice_enabled=True,
            quiet_hours_enabled=True,
            quiet_start=(now - timedelta(minutes=2)).strftime("%H:%M"),
            quiet_end=(now + timedelta(minutes=12)).strftime("%H:%M"),
            timezone="Africa/Ndjamena",
        )

        marker2 = "E2E-QUIET-" + RUN_KEY
        create_chat_reminder(marker2)
        second = wait_notification(marker2)
        second_id = str(second.get("id") or "")
        if not second_id:
            raise AssertionError("quiet-hours reminder has no Inbox id")
        time.sleep(8)
        if any(marker2 in json.dumps(evt, ensure_ascii=False) for evt in sse_events):
            raise AssertionError("quiet-hours reminder leaked into realtime stream")
        summary.append("Quiet hours preserve Inbox and suppress realtime/voice: PASS")

        mission_rows = [
            row
            for row in notifications(True)
            if row.get("event") == "personal.reminder"
            and RUN_KEY in ((row.get("title") or "") + (row.get("body") or ""))
        ]
        if len(mission_rows) != 2:
            raise AssertionError("expected exactly two E2E reminder rows, found {}".format(len(mission_rows)))
        summary.append("Reminder persistence/cardinality: PASS")
        summary.append("Mobile Push no-device fallback to durable Inbox: PASS")
    finally:
        sse_stop.set()
        print("\n=== TOUMAI NOTIFICATION E2E SUMMARY ===")
        for line in summary:
            print(line)
        if user_id:
            print("CLEANUP_USER_ID={}".format(user_id))
        step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
        if step_summary:
            with open(step_summary, "a", encoding="utf-8") as handle:
                handle.write("## Toumaï notification production E2E\n\n")
                for line in summary:
                    handle.write("- " + line + "\n")
                if user_id:
                    handle.write("- Temporary user id for cleanup: " + user_id + "\n")


if __name__ == "__main__":
    main()
