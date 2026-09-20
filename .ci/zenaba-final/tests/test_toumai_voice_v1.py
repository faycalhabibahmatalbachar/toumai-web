import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from services import tts_service


SAMPLE = (
    "Bonjour Fayçal, comment puis-je vous aider aujourd’hui ? "
    "Rendez-vous à N'Djamena le 19 septembre à 14 h 30 pour 9 000 FCFA."
)

REFERENCE = "1591_1028_000108-0004_enhanced.wav"
REFERENCE_SHA256 = "d8a8b161c37c0ce8c50345828c586c2d63ebeeb16dafdbe0ccb6011ccfaf3192"


def test_v1_uses_only_pocket():
    assert tts_service._tts_provider_order() == ["pocket"]
    assert tts_service.ZENABA_VOICE_ID == "zenaba"
    assert tts_service.POCKET_ENGINE_ID == "pocket-tts-french-24l"
    assert tts_service.POCKET_REFERENCE_ID.endswith(REFERENCE)


def test_french_detection_is_fail_closed():
    assert tts_service._looks_french_v1(SAMPLE)
    assert not tts_service._looks_french_v1(
        "Hello Faycal, how can I help you today?"
    )
    assert tts_service._looks_french_v1("15 h 30")
    assert tts_service._looks_french_v1("9 000 FCFA")


@pytest.mark.asyncio
async def test_zenaba_is_the_only_synthesized_voice(monkeypatch):
    calls = []

    async def fake(text):
        calls.append(text)
        return b"RIFF....WAVEaudio"

    monkeypatch.setattr(tts_service, "synthesize_pocket", fake)
    audio, mime = await tts_service.synthesize(
        SAMPLE,
        language="fr",
        voice="zenaba",
    )
    assert audio.startswith(b"RIFF")
    assert mime == "audio/wav"
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_old_voice_is_rejected_before_provider(monkeypatch):
    called = False

    async def forbidden(_text):
        nonlocal called
        called = True
        return b"x"

    monkeypatch.setattr(tts_service, "synthesize_pocket", forbidden)
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await tts_service.synthesize(
            SAMPLE,
            language="fr",
            voice="fr-FR-DeniseNeural",
        )
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 422
    assert not called


@pytest.mark.asyncio
async def test_non_french_is_rejected_before_provider(monkeypatch):
    called = False

    async def forbidden(_text):
        nonlocal called
        called = True
        return b"x"

    monkeypatch.setattr(tts_service, "synthesize_pocket", forbidden)
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await tts_service.synthesize(
            "Hello Faycal, how can I help you today?",
            language="fr",
            voice="zenaba",
        )
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 422
    assert not called


@pytest.mark.asyncio
async def test_engine_failure_is_fail_closed(monkeypatch):
    async def unavailable(_text):
        raise tts_service.TtsProviderError("pocket", "indisponible", 503)

    monkeypatch.setattr(tts_service, "synthesize_pocket", unavailable)
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await tts_service.synthesize(
            SAMPLE,
            language="fr",
            voice="zenaba",
        )
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_live_stream_preserves_native_pocket_chunks(monkeypatch):
    async def fake_stream(text):
        assert "Bonjour" in text
        yield b"RIFF"
        yield b"....WAVE"
        yield b"pcm"

    monkeypatch.setattr(tts_service, "stream_pocket_audio", fake_stream)
    stream = tts_service.stream_zenaba_live(
        SAMPLE,
        language="fr",
        voice="zenaba",
    )
    assert await stream.__anext__() == b"RIFF"
    assert await stream.__anext__() == b"....WAVE"
    assert await stream.__anext__() == b"pcm"
    with pytest.raises(StopAsyncIteration):
        await stream.__anext__()


@pytest.mark.asyncio
async def test_live_stream_rejects_other_voice_before_pocket(monkeypatch):
    called = False

    async def forbidden(_text):
        nonlocal called
        called = True
        yield b"x"

    monkeypatch.setattr(tts_service, "stream_pocket_audio", forbidden)
    stream = tts_service.stream_zenaba_live(
        SAMPLE,
        language="fr",
        voice="fr-FR-DeniseNeural",
    )
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await stream.__anext__()
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 422
    assert not called


@pytest.mark.asyncio
async def test_live_stream_rejects_non_french_before_pocket(monkeypatch):
    called = False

    async def forbidden(_text):
        nonlocal called
        called = True
        yield b"x"

    monkeypatch.setattr(tts_service, "stream_pocket_audio", forbidden)
    stream = tts_service.stream_zenaba_live(
        "Hello Faycal, how can I help you today?",
        language="fr",
        voice="zenaba",
    )
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await stream.__anext__()
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 422
    assert not called


def test_pocket_service_identity_and_security_are_fixed():
    source = Path("voice-zenaba-pocket/app.py").read_text(encoding="utf-8")
    assert 'LANGUAGE = "french_24l"' in source
    assert REFERENCE in source
    assert REFERENCE_SHA256 in source
    assert "ZENABA_SERVICE_TOKEN" in source
    assert "ZENABA_ALLOW_UNAUTHENTICATED" in source
    assert 'HF_TOKEN = os.getenv("HF_TOKEN"' in source
    assert "kyutai/pocket-tts" in source
    assert 'access_log=False' in source
    assert "voice_url" not in source
    assert "voice_wav" not in source
    assert "Queue(maxsize=16)" in source
    assert "put_interruptible" in source
    assert "queue.put(item, timeout=0.25)" in source
    assert "_generation_lock.acquire(timeout=0.25)" in source
    assert "if not acquired or cancelled.is_set()" in source


def test_pocket_image_is_cpu_only_and_reference_is_pinned():
    docker = Path("voice-zenaba-pocket/Dockerfile").read_text(encoding="utf-8")
    assert "https://download.pytorch.org/whl/cpu" in docker
    assert "519207ec31386971c13631b9a177d63a1a5d05af" in docker
    assert REFERENCE_SHA256 in docker
    assert "USER zenaba" in docker
    assert "HEALTHCHECK" in docker


def test_chatterbox_v1_artifacts_are_not_shipped():
    source = Path("services/tts_service.py").read_text(encoding="utf-8")
    config = Path("core/config.py").read_text(encoding="utf-8")
    assert "synthesize_chatterbox" not in source
    assert "chatterbox_health_check" not in source
    assert "CHATTERBOX_TTS_URL" not in config
    assert not Path("voice-zenaba").exists()


def test_pocket_request_requires_a_real_shared_secret(monkeypatch):
    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            pocket_tts_url="http://zenaba:8000",
            pocket_tts_token="",
            pocket_tts_timeout_seconds=45.0,
        ),
    )
    with pytest.raises(tts_service.TtsProviderError) as exc:
        tts_service._pocket_request("Bonjour.")
    assert exc.value.provider == "pocket"
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_v1_stream_never_generates_pocket_segments_concurrently(monkeypatch):
    active = 0
    peak = 0

    async def fake_synthesize(*_args, **_kwargs):
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
        return b"RIFF....WAVEpcm", "audio/wav"

    monkeypatch.setattr(tts_service, "synthesize", fake_synthesize)

    stream = tts_service.synthesize_stream(
        "Première phrase française. Deuxième phrase française. Troisième phrase française.",
        language="fr",
        voice="zenaba",
        lookahead=3,
    )
    items = []
    async for item in stream:
        items.append(item)

    assert len(items) >= 2
    assert peak == 1


def test_voice_v1_health_does_not_probe_legacy_engines():
    router = Path("routers/voice.py").read_text(encoding="utf-8")
    assert "disabled_by_voice_v1" in router
    assert "if settings.toumai_voice_v1_enabled:" in router
    assert "zenaba = await tts_service.pocket_health_check()" in router
