import asyncio
from pathlib import Path
from types import SimpleNamespace

import pytest

from services import tts_service

SAMPLE = (
    "Bonjour Fayçal, comment puis-je vous aider aujourd’hui ? "
    "Rendez-vous à N'Djamena le 20 septembre à 14 h 30 pour 9 000 FCFA."
)


def test_v1_uses_only_chatterbox_v3():
    assert tts_service._tts_provider_order() == ["chatterbox"]
    assert tts_service.ZENABA_VOICE_ID == "zenaba"
    assert tts_service.CHATTERBOX_ENGINE_ID == "chatterbox-multilingual-v3"
    assert tts_service.CHATTERBOX_REFERENCE_ID == "fr_f1.flac"


def test_french_detection_is_fail_closed():
    assert tts_service._looks_french_v1(SAMPLE)
    assert tts_service._looks_french_v1("14 h 30")
    assert tts_service._looks_french_v1("9 000 FCFA")
    assert not tts_service._looks_french_v1("Hello Faycal, how can I help you today?")


@pytest.mark.asyncio
async def test_zenaba_is_the_only_synthesized_voice(monkeypatch):
    calls = []

    async def fake(text, language="fr"):
        calls.append((text, language))
        return b"RIFF....WAVEaudio"

    monkeypatch.setattr(tts_service, "synthesize_chatterbox", fake)
    audio, mime = await tts_service.synthesize(SAMPLE, language="fr", voice="zenaba")
    assert audio.startswith(b"RIFF")
    assert mime == "audio/wav"
    assert len(calls) == 1
    assert calls[0][1] == "fr"


@pytest.mark.asyncio
async def test_other_voice_and_non_french_are_rejected(monkeypatch):
    async def forbidden(_text):
        raise AssertionError("engine must not be called")

    monkeypatch.setattr(tts_service, "synthesize_chatterbox", forbidden)
    with pytest.raises(tts_service.TtsProviderError) as voice_error:
        await tts_service.synthesize(SAMPLE, language="fr", voice="edge")
    assert voice_error.value.provider == "chatterbox"
    assert voice_error.value.status_code == 422

    with pytest.raises(tts_service.TtsProviderError) as language_error:
        await tts_service.synthesize("Hello, how are you?", language="fr", voice="zenaba")
    assert language_error.value.provider == "chatterbox"
    assert language_error.value.status_code == 422


@pytest.mark.asyncio
async def test_engine_failure_is_fail_closed(monkeypatch):
    async def unavailable(_text, _language="fr"):
        raise tts_service.TtsProviderError("chatterbox", "indisponible", 503)

    monkeypatch.setattr(tts_service, "synthesize_chatterbox", unavailable)
    with pytest.raises(tts_service.TtsProviderError) as error:
        await tts_service.synthesize(SAMPLE, language="fr", voice="zenaba")
    assert error.value.provider == "chatterbox"
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_live_returns_only_chatterbox_wav(monkeypatch):
    async def fake(text, language="fr"):
        assert "Bonjour" in text
        assert language == "fr"
        return b"RIFF....WAVEpcm"

    monkeypatch.setattr(tts_service, "synthesize_chatterbox", fake)
    stream = tts_service.stream_zenaba_live(SAMPLE, language="fr", voice="zenaba")
    assert await stream.__anext__() == b"RIFF....WAVEpcm"
    with pytest.raises(StopAsyncIteration):
        await stream.__anext__()


def test_chatterbox_requires_server_secret(monkeypatch):
    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            chatterbox_tts_url="https://example.invalid",
            chatterbox_tts_token="",
            chatterbox_tts_timeout_seconds=180.0,
        ),
    )
    with pytest.raises(tts_service.TtsProviderError) as error:
        asyncio.run(tts_service.synthesize_chatterbox("Bonjour."))
    assert error.value.provider == "chatterbox"
    # 500 et non 503 : une variable absente ne reviendra pas toute seule,
    # et un client qui reessaie sur 503 attendrait pour rien.
    assert error.value.status_code == 500


def test_pocket_artifacts_are_kept_but_not_active():
    source = Path("voice-zenaba-pocket/app.py").read_text(encoding="utf-8")
    config = Path("core/config.py").read_text(encoding="utf-8")
    assert 'LANGUAGE = "french_24l"' in source
    assert "pocket_tts_url" in config
    assert "pocket_tts_token" in config


def test_active_engine_never_falls_back():
    source = Path("services/tts_service.py").read_text(encoding="utf-8")
    router = Path("routers/voice.py").read_text(encoding="utf-8")
    assert "synthesize_chatterbox" in source
    assert "chatterbox_health_check" in source
    assert "chatterbox_health_check()" in router
    assert 'return ["chatterbox"]' in source

def test_une_cle_refusee_ne_se_deguise_pas_en_panne_reseau(monkeypatch):
    """Une cle qui ne correspond pas doit le dire, et pas autre chose.

    Mesure du 20/09/2026 contre le Space reel : quand la cle ne correspond
    pas, `gradio_client` leve une `AppError` dont le texte est le nom de
    l'exception levee cote Space, « PermissionError ». Sans tri, ce cas
    ressortait en 503 « Service Zenaba inaccessible » et envoyait chercher une
    panne d'hebergeur pendant que le defaut tenait en deux valeurs differentes
    de part et d'autre.
    """

    class FauxAppError(Exception):
        pass

    def refuse(_base, _text, _key):
        raise FauxAppError("PermissionError")

    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            chatterbox_tts_url="https://exemple.hf.space",
            chatterbox_tts_token="une-cle",
            chatterbox_tts_timeout_seconds=180.0,
        ),
    )
    monkeypatch.setattr(tts_service, "_gradio_zenaba_predict", refuse)
    with pytest.raises(tts_service.TtsProviderError) as error:
        asyncio.run(tts_service.synthesize_chatterbox("Bonjour Faycal."))
    assert error.value.provider == "chatterbox"
    assert error.value.status_code == 502
    assert "cle serveur" in str(error.value).replace("é", "e").lower()
    assert "ZENABA_API_KEY" in str(error.value)

def test_aucune_synthese_declenchable_sans_authentification():
    """Un anonyme ne doit pas pouvoir consommer le quota ZeroGPU du Space.

    La sonde de synthese reelle a d'abord ete posee sur /health, qui est
    public : elle repondait a n'importe qui, et chaque appel coutait un
    passage GPU. Elle vit desormais derriere l'authentification, dans
    /voice/health?synthese=1, et hors ligne dans scripts/smoke_zenaba.py.
    """
    principal = Path("main.py").read_text(encoding="utf-8")
    routeur = Path("routers/voice.py").read_text(encoding="utf-8")

    # /health n'appelle plus rien qui synthetise.
    assert "synthesize_chatterbox" not in principal
    assert "voice_probe" not in principal
    # La porte passive, elle, reste visible : elle ne coute aucun GPU.
    assert "voice_engine" in principal

    # La sonde active existe toujours, et elle est protegee.
    assert "_sonde_zenaba_reelle" in routeur
    assert "synthese: int = 0" in routeur
    assert "get_current_user_id" in routeur
    assert Path("scripts/smoke_zenaba.py").exists()


AR_SAMPLE = "السلام عليكم، كيف الحال اليوم في نجامينا؟"
CHADIAN_LATIN_SAMPLE = "Fi l-bidaaya, Allah khalag al-samaawaat."


@pytest.mark.asyncio
async def test_arabic_voice_v1_isolated_behind_flag(monkeypatch):
    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            toumai_voice_v1_enabled=True,
            toumai_voice_arabic_enabled=False,
        ),
    )
    with pytest.raises(tts_service.TtsProviderError) as exc:
        await tts_service.synthesize(
            AR_SAMPLE,
            language="ar",
            voice="zenaba",
        )
    assert exc.value.provider == "chatterbox"
    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_arabic_voice_v1_uses_multilingual_chatterbox(monkeypatch):
    calls = []

    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            toumai_voice_v1_enabled=True,
            toumai_voice_arabic_enabled=True,
        ),
    )

    async def fake(text, language="fr"):
        calls.append((text, language))
        return b"RIFF....WAVEarabic"

    monkeypatch.setattr(tts_service, "synthesize_chatterbox", fake)
    audio, mime = await tts_service.synthesize(
        AR_SAMPLE,
        language="ar",
        voice="zenaba",
    )
    assert audio.startswith(b"RIFF")
    assert mime == "audio/wav"
    assert calls == [(AR_SAMPLE, "ar")]


def test_arabic_auto_detection_and_chadian_transliteration(monkeypatch):
    monkeypatch.setattr(
        tts_service,
        "get_settings",
        lambda: SimpleNamespace(
            toumai_voice_arabic_enabled=True,
        ),
    )
    assert tts_service._voice_v1_language(AR_SAMPLE, "auto") == "ar"
    assert tts_service._voice_v1_language(CHADIAN_LATIN_SAMPLE, "auto") == "ar"

    prepared, language = tts_service._prepare_voice_v1_text(
        CHADIAN_LATIN_SAMPLE,
        "shu",
    )
    assert language == "ar"
    assert any("\u0600" <= ch <= "\u06ff" for ch in prepared)
    assert "Fi l-bidaaya" not in prepared


def test_arabic_space_contract_is_additive_not_a_french_break():
    source = Path("services/tts_service.py").read_text(encoding="utf-8")
    assert 'CHATTERBOX_ARABIC_ENDPOINT = "/synthesize_multilingual"' in source
    assert 'api_name="/synthesize"' in source
    assert "api_name=CHATTERBOX_ARABIC_ENDPOINT" in source
    assert 'CHATTERBOX_ARABIC_REFERENCE_ID = "ar_prompts2.flac"' in source
    assert "toumai_voice_arabic_enabled" in source
