# -*- coding: utf-8 -*-
"""Smoke-test réel Zenaba Arabe V1.

Pré-requis :
- TOUMAI_VOICE_V1_ENABLED=true
- TOUMAI_VOICE_ARABIC_ENABLED=true
- Space Zenaba avec /synthesize_multilingual(text, language_id, api_key)
- CHATTERBOX_TTS_URL / CHATTERBOX_TTS_TOKEN configurés

Le script n'affiche aucun secret et n'utilise que des phrases fixes non privées.
"""

import asyncio
import os
import struct
import sys
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import tts_service  # noqa: E402

ARABIC = "السلام عليكم. اليوم في نجامينا، الموعد الساعة الثانية والنصف."
CHADIAN_LATIN = "Fi l-bidaaya, Allah khalag al-samaawaat."
OUTPUT = Path(os.getenv("ZENABA_ARABIC_SMOKE_OUTPUT", "zenaba-arabic-smoke.wav"))


def _duration(audio: bytes) -> float:
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return 0.0
    channels, rate = struct.unpack_from("<HI", audio, 22)
    bits = struct.unpack_from("<H", audio, 34)[0]
    bps = rate * channels * (bits // 8)
    return round((len(audio) - 44) / bps, 2) if bps else 0.0


async def _one(name: str, text: str, language: str, *, save: bool = False) -> bool:
    started = time.monotonic()
    try:
        audio, mime = await tts_service.synthesize(
            text,
            language=language,
            voice="zenaba",
        )
    except Exception as exc:  # noqa: BLE001
        detail = (
            str(exc)
            if isinstance(exc, tts_service.TtsProviderError)
            else type(exc).__name__
        )
        print(f"{name}: FAIL — {detail}")
        return False

    elapsed = int((time.monotonic() - started) * 1000)
    valid = (
        mime == "audio/wav"
        and len(audio) >= 44
        and audio[:4] == b"RIFF"
        and audio[8:12] == b"WAVE"
    )
    if save and valid:
        OUTPUT.write_bytes(audio)
    print(
        f"{name}: {'PASS' if valid else 'FAIL'} — "
        f"{len(audio)} bytes, {_duration(audio)} s, {elapsed} ms"
    )
    return valid


async def main() -> int:
    settings = tts_service.get_settings()
    if not settings.toumai_voice_v1_enabled:
        print("FAIL — TOUMAI_VOICE_V1_ENABLED=false")
        return 2
    if not getattr(settings, "toumai_voice_arabic_enabled", False):
        print("BLOCKED — TOUMAI_VOICE_ARABIC_ENABLED=false")
        return 3

    standard = await _one("arabe", ARABIC, "ar", save=True)
    chadian = await _one("arabe tchadien translittéré", CHADIAN_LATIN, "shu")
    return 0 if standard and chadian else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
