#!/usr/bin/env python3
"""Smoke-test production du service Pocket Zenaba.

Utilisation:
  ZENABA_BASE_URL=https://... \
  ZENABA_SERVICE_TOKEN=... \
  python voice-zenaba-pocket/smoke.py

Le script n'imprime jamais le secret et n'utilise qu'une phrase fixe non privée.
"""

from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("ZENABA_BASE_URL", "").strip().rstrip("/")
TOKEN = os.environ.get("ZENABA_SERVICE_TOKEN", "").strip()
OUTPUT = Path(os.environ.get("ZENABA_SMOKE_OUTPUT", "zenaba-smoke.wav"))
TEXT = (
    "Bonjour Fayçal. Aujourd'hui à N'Djamena, votre rendez-vous est prévu "
    "à quatorze heures trente pour neuf mille francs CFA."
)


def fail(message: str) -> None:
    raise SystemExit(f"FAIL {message}")


def request(
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
    body: bytes | None = None,
    timeout: float = 30.0,
):
    req = urllib.request.Request(
        BASE + path,
        data=body,
        method=method,
        headers=headers or {},
    )
    return urllib.request.urlopen(req, timeout=timeout)


def form_body(field: str, value: str) -> tuple[bytes, str]:
    boundary = "----toumai-" + secrets.token_hex(12)
    payload = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field}"\r\n\r\n'
        f"{value}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")
    return payload, f"multipart/form-data; boundary={boundary}"


if not BASE.startswith(("http://", "https://")):
    fail("ZENABA_BASE_URL manquant ou invalide")
if len(TOKEN) < 32:
    fail("ZENABA_SERVICE_TOKEN manquant ou trop court")

# 1) Readiness
with request("GET", "/health", timeout=10.0) as response:
    if response.status != 200:
        fail(f"/health HTTP {response.status}")
    health = json.loads(response.read().decode("utf-8"))

expected = {
    "status": "healthy",
    "engine": "pocket-tts-french-24l",
    "voice": "Zenaba",
    "language": "fr",
    "reference": "1591_1028_000108-0004_enhanced.wav",
}
for key, value in expected.items():
    if health.get(key) != value:
        fail(f"/health {key}={health.get(key)!r}, attendu {value!r}")
if health.get("streaming") is not True:
    fail("/health streaming != true")
if health.get("hf_authenticated") is not True:
    fail("/health hf_authenticated != true")
print("PASS health")

# 2) Auth fail-closed
bad_body, bad_type = form_body("text", "Bonjour.")
try:
    request(
        "POST",
        "/tts",
        headers={
            "Authorization": "Bearer mauvais-secret",
            "Content-Type": bad_type,
        },
        body=bad_body,
        timeout=10.0,
    )
    fail("un mauvais token a été accepté")
except urllib.error.HTTPError as exc:
    if exc.code != 401:
        fail(f"mauvais token -> HTTP {exc.code}, attendu 401")
print("PASS auth_fail_closed")

# 3) Vrai streaming WAV
body, content_type = form_body("text", TEXT)
started = time.perf_counter()
with request(
    "POST",
    "/tts",
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": content_type,
        "Accept": "audio/wav",
    },
    body=body,
    timeout=90.0,
) as response:
    if response.status != 200:
        fail(f"/tts HTTP {response.status}")
    media = (response.headers.get("Content-Type") or "").lower()
    if "audio/wav" not in media and "audio/x-wav" not in media:
        fail(f"/tts Content-Type inattendu: {media}")

    prefix = response.read(12)
    first_bytes_ms = (time.perf_counter() - started) * 1000
    if prefix[:4] != b"RIFF" or prefix[8:12] != b"WAVE":
        fail(f"WAV invalide: {prefix.hex()}")

    remainder = response.read()
    audio = prefix + remainder

elapsed_ms = (time.perf_counter() - started) * 1000
if len(audio) < 4096:
    fail(f"audio trop petit: {len(audio)} octets")
OUTPUT.write_bytes(audio)
print(
    "PASS tts_stream "
    f"bytes={len(audio)} first_bytes_ms={first_bytes_ms:.0f} "
    f"total_ms={elapsed_ms:.0f} output={OUTPUT}"
)

# 4) Taille maximale fail-closed
long_body, long_type = form_body("text", "a" * 601)
try:
    request(
        "POST",
        "/tts",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": long_type,
        },
        body=long_body,
        timeout=10.0,
    )
    fail("un texte >600 caractères a été accepté")
except urllib.error.HTTPError as exc:
    if exc.code != 422:
        fail(f"texte trop long -> HTTP {exc.code}, attendu 422")
print("PASS max_length")

print("ZENABA_SERVICE_SMOKE_OK")
