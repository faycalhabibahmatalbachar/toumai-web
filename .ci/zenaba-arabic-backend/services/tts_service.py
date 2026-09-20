"""Synthèse vocale — Edge-TTS (gratuit), Kokoro HTTP, ElevenLabs, OpenAI, VoxCPM2."""

import asyncio
import io
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import edge_tts
import httpx
from gradio_client import Client

from core.config import get_settings
from services import chadian_tts_service, prononciation

# Ce module appelait `logger` sans l'avoir jamais défini : toute synthèse
# passant par l'adaptation arabe tchadien levait un NameError, remonté à
# l'application en 502 « La synthèse vocale est momentanément
# indisponible ». Rien n'était indisponible — le code plantait.
logger = logging.getLogger(__name__)


# Alias app / OpenAI courts → courte voix française Edge (liste : `edge-tts --list-voices`).
_EDGE_VOICE_ALIASES: Dict[str, str] = {
    "ahmat": "fr-FR-HenriNeural",
    "brahim": "fr-FR-HenriNeural",
    "mariam": "fr-FR-DeniseNeural",
    "hassane": "fr-FR-HenriNeural",
    "female_fr": "fr-FR-DeniseNeural",
    "male_fr": "fr-FR-HenriNeural",
    "alloy": "fr-FR-EloiseNeural",
    "echo": "fr-FR-RemyMultilingualNeural",
    "fable": "fr-FR-VivienneMultilingualNeural",
    "onyx": "fr-FR-HenriNeural",
    "nova": "fr-FR-DeniseNeural",
    "shimmer": "fr-FR-EloiseNeural",
}

_MS_NEURAL_VOICE = re.compile(r"^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$")
# Présence d'écriture arabe : sert à décider si une voix arabe convient encore
# quand le texte n'est pas de la translittération tchadienne.
_ARABIC_SCRIPT = re.compile(r"[؀-ۿ]")


# Voix natives OpenAI (tts-1 / tts-1-hd / gpt-4o-mini-tts selon modèle).
OPENAI_TTS_NATIVE_VOICES: frozenset[str] = frozenset(
    {"alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"}
)
# Même clés métier que ElevenLabs pour que le front Flutter n’ait pas à changer.
_OPENAI_VOICE_FROM_APP_ALIAS: Dict[str, str] = {
    "ahmat": "onyx",
    "brahim": "echo",
    "mariam": "nova",
    "hassane": "onyx",
    "female_fr": "nova",
    "male_fr": "onyx",
}
_ELEVENLABS_STYLE_ID = re.compile(r"^[a-zA-Z0-9]{15,32}$")

# Aligné avec le SDK officiel (User-Agent facultatif mais évite certains filtres/CDN stricts).
_ELEVENLABS_USER_AGENT = "sayibiai-backend/1.0 (tts; httpx)"


def _elevenlabs_request_headers(api_key: str, *, accept_audio: bool) -> Dict[str, str]:
    h: Dict[str, str] = {
        "xi-api-key": api_key,
        "User-Agent": _ELEVENLABS_USER_AGENT,
    }
    if accept_audio:
        h["Content-Type"] = "application/json"
        h["Accept"] = "audio/mpeg"
    else:
        h["Accept"] = "application/json"
    return h


ELEVENLABS_BUILTIN_VOICES: Dict[str, str] = {
    "ahmat": "TTtB1x9U8PF0Vgf20IAP",
    "brahim": "93nuHbke4dTER9x2pDwE",
    "mariam": "tMyQcCxfGDdIt7wJ2RQw",
    "hassane": "c365oriviHmAhyLhpuN6",
    # Libellés parfois envoyés par le front / paramètres (évite 404 sur /text-to-speech/female_fr)
    "female_fr": "tMyQcCxfGDdIt7wJ2RQw",
    "male_fr": "93nuHbke4dTER9x2pDwE",
}

def _elevenlabs_upstream_detail(response: Optional[httpx.Response]) -> str:
    if response is None:
        return ""
    try:
        payload = response.json()
        if isinstance(payload, dict):
            err = payload.get("detail")
            if isinstance(err, dict):
                msg = err.get("message")
                if isinstance(msg, str) and msg.strip():
                    return msg.strip()[:300]
            if isinstance(err, str) and err.strip():
                return err.strip()[:300]
            msg = payload.get("message")
            if isinstance(msg, str) and msg.strip():
                return msg.strip()[:300]
    except (ValueError, json.JSONDecodeError):
        pass
    t = (response.text or "").strip()
    return t[:300] if t else ""


class TtsProviderError(RuntimeError):
    def __init__(self, provider: str, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code


ZENABA_VOICE_ID = "zenaba"
POCKET_ENGINE_ID = "pocket-tts-french-24l"
POCKET_REFERENCE_ID = "cml-tts/fr/1591_1028_000108-0004_enhanced.wav"
CHATTERBOX_ENGINE_ID = "chatterbox-multilingual-v3"
CHATTERBOX_REFERENCE_ID = "fr_f1.flac"
CHATTERBOX_ARABIC_REFERENCE_ID = "ar_prompts2.flac"
CHATTERBOX_ARABIC_ENDPOINT = "/synthesize_multilingual"


def _is_french_v1(language: Optional[str]) -> bool:
    code = (language or "fr").strip().lower().replace("_", "-")
    return code in {"fr", "fr-fr"}


_ARABIC_V1 = re.compile(r"[؀-ۿ]")
_ENGLISH_V1_HINTS = re.compile(
    r"\b(hello|hi|the|and|you|your|please|thank|thanks|today|tomorrow|"
    r"can|could|would|this|that|with|from|for|are|is)\b",
    re.IGNORECASE,
)


def _looks_french_v1(text: str) -> bool:
    """Fail-safe linguistique de Toumaï Voice V1.

    Les nombres, heures, montants et noms propres courts restent lisibles.
    Dès qu'il y a assez de langage naturel pour classifier raisonnablement, on
    exige le français. Une erreur de classification coupe la voix au lieu
    d'improviser une prononciation avec Zenaba.
    """
    raw = (text or "").strip()
    if not raw:
        return False
    if _ARABIC_V1.search(raw):
        return False

    letters = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿŒœÇç]", raw)
    if len(letters) < 12:
        return not bool(_ENGLISH_V1_HINTS.search(raw))

    if _ENGLISH_V1_HINTS.search(raw) and len(letters) < 28:
        return False

    try:
        from langdetect import DetectorFactory, detect  # noqa: PLC0415

        DetectorFactory.seed = 0
        return detect(raw) == "fr"
    except Exception:
        # Le classifieur ne doit jamais transformer une incertitude en parole.
        return False


def _voice_v1_language(text: str, language: Optional[str]) -> str:
    """Résout la langue Zenaba V1 sans deviner une langue inconnue.

    - fr / fr-FR -> français
    - ar / ar-TD / shu -> arabe
    - auto / vide -> arabe si écriture arabe ou translittération tchadienne
      reconnue, français sinon
    Toute autre langue reste fail-closed.
    """
    code = (language or "auto").strip().lower().replace("_", "-")
    if code in {"fr", "fr-fr"}:
        return "fr"
    if code in {"ar", "ar-td", "shu"}:
        return "ar"
    if code in {"", "auto"}:
        raw = (text or "").strip()
        if _ARABIC_V1.search(raw) or chadian_tts_service.looks_like_chadian_latin(raw):
            return "ar"
        return "fr"
    raise TtsProviderError(
        "chatterbox",
        f"Langue Voice V1 non prise en charge: {code}",
        422,
    )


def _prepare_voice_v1_text(text: str, language: Optional[str]) -> tuple[str, str]:
    """Valide et prépare le texte pour Zenaba V1.

    Le français conserve ses corrections de prononciation. L'arabe accepte
    l'écriture arabe directement et convertit la translittération tchadienne
    connue vers l'écriture arabe avant synthèse.
    """
    raw = (text or "").strip()
    if not raw:
        raise TtsProviderError("chatterbox", "Texte vide", 400)

    resolved = _voice_v1_language(raw, language)
    if resolved == "fr":
        if not _looks_french_v1(raw):
            raise TtsProviderError(
                "chatterbox",
                "Zenaba Voice V1 a reçu un texte qui ne ressemble pas au français.",
                422,
            )
        return prononciation.pour_la_voix(raw), "fr"

    settings = get_settings()
    if not getattr(settings, "toumai_voice_arabic_enabled", False):
        raise TtsProviderError(
            "chatterbox",
            "Zenaba arabe est préparée mais n’est pas encore activée.",
            409,
        )

    if _ARABIC_V1.search(raw):
        return raw, "ar"

    converted, _legacy_voice, did_convert = chadian_tts_service.prepare_for_tts(raw)
    if did_convert and _ARABIC_V1.search(converted):
        return converted, "ar"

    raise TtsProviderError(
        "chatterbox",
        "Zenaba arabe attend de l’écriture arabe ou de l’arabe tchadien translittéré reconnu.",
        422,
    )



async def pocket_health_check() -> Dict[str, Any]:
    """Vérifie le service CPU Pocket TTS qui porte l'identité Zenaba."""
    settings = get_settings()
    base = (settings.pocket_tts_url or "").strip().rstrip("/")
    token = (settings.pocket_tts_token or "").strip()
    out: Dict[str, Any] = {
        "configured": bool(base and token),
        "voice": settings.toumai_voice_name or "Zenaba",
        "language": "fr",
        "engine": POCKET_ENGINE_ID,
        "reference": POCKET_REFERENCE_ID,
        "streaming": "audio/wav",
        "ok": False,
    }
    if not base:
        out["error"] = "POCKET_TTS_URL manquant"
        return out
    if len(token) < 32:
        out["error"] = "POCKET_TTS_TOKEN manquant ou trop court"
        return out

    headers: Dict[str, str] = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base}/health", headers=headers)
        out["status_code"] = response.status_code
        if response.status_code == 200:
            payload = response.json() if response.content else {}
            status = payload.get("status") if isinstance(payload, dict) else None
            out["ok"] = status in {None, "healthy", "ok"} or bool(
                isinstance(payload, dict) and payload.get("ok")
            )
        else:
            out["error"] = f"HTTP {response.status_code}"
    except Exception as exc:  # noqa: BLE001
        out["error"] = str(exc)[:240]
    return out


def _pocket_request(text: str) -> tuple[str, Dict[str, str], Dict[str, str], float]:
    settings = get_settings()
    base = (settings.pocket_tts_url or "").strip().rstrip("/")
    token = (settings.pocket_tts_token or "").strip()
    if not base:
        raise TtsProviderError("pocket", "POCKET_TTS_URL manquant", 503)
    if len(token) < 32:
        raise TtsProviderError(
            "pocket",
            "POCKET_TTS_TOKEN manquant ou trop court",
            503,
        )

    plain = (text or "").strip()
    if not plain:
        raise TtsProviderError("pocket", "Texte vide", 400)
    # Le Web découpe déjà plus court ; ce garde-fou protège les appels directs
    # (rappel, bouton haut-parleur, diagnostic) et évite les générations sans fin.
    if len(plain) > 600:
        raise TtsProviderError(
            "pocket",
            "Segment trop long pour Zenaba (maximum 600 caractères)",
            422,
        )

    headers: Dict[str, str] = {"Authorization": f"Bearer {token}"}
    timeout = max(5.0, float(settings.pocket_tts_timeout_seconds or 45.0))
    return f"{base}/tts", headers, {"text": plain}, timeout


async def synthesize_pocket(text: str) -> bytes:
    """Synthèse complète Pocket TTS, utilisée hors lecture live.

    Le service Pocket est démarré avec french_24l et la référence Zenaba
    préchargée : aucun sélecteur de voix n'est envoyé par le client.
    """
    url, headers, form, timeout = _pocket_request(text)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=headers, data=form)
        if response.status_code != 200:
            detail = (response.text or "").strip().replace("\n", " ")[:240]
            raise TtsProviderError(
                "pocket",
                f"Zenaba indisponible HTTP {response.status_code}"
                + (f": {detail}" if detail else ""),
                response.status_code,
            )
        audio = response.content
        if not audio:
            raise TtsProviderError("pocket", "Zenaba a renvoyé un audio vide", 502)
        if not audio.startswith(b"RIFF") or audio[8:12] != b"WAVE":
            raise TtsProviderError("pocket", "Zenaba a renvoyé un WAV invalide", 502)
        return audio
    except TtsProviderError:
        raise
    except httpx.TimeoutException as exc:
        raise TtsProviderError("pocket", "Zenaba a dépassé le délai de synthèse", 504) from exc
    except httpx.RequestError as exc:
        raise TtsProviderError("pocket", f"Service Zenaba inaccessible: {exc}", 503) from exc


async def stream_pocket_audio(text: str):
    """Relaye les octets WAV au moment où Pocket TTS les produit.

    Important : aucune accumulation en mémoire ici. Fermer le générateur ferme
    aussi la connexion httpx amont, donc une interruption Web abandonne le flux.
    """
    url, headers, form, timeout = _pocket_request(text)
    timeout_cfg = httpx.Timeout(timeout, connect=min(timeout, 10.0))
    try:
        async with httpx.AsyncClient(timeout=timeout_cfg) as client:
            async with client.stream("POST", url, headers=headers, data=form) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    detail = body.decode("utf-8", errors="replace").strip().replace("\n", " ")[:240]
                    raise TtsProviderError(
                        "pocket",
                        f"Zenaba indisponible HTTP {response.status_code}"
                        + (f": {detail}" if detail else ""),
                        response.status_code,
                    )
                content_type = (response.headers.get("content-type") or "").lower()
                if "audio/wav" not in content_type and "audio/x-wav" not in content_type:
                    raise TtsProviderError(
                        "pocket",
                        f"Zenaba a renvoyé un type audio inattendu: {content_type or 'inconnu'}",
                        502,
                    )
                seen = False
                async for chunk in response.aiter_bytes():
                    if chunk:
                        seen = True
                        yield chunk
                if not seen:
                    raise TtsProviderError("pocket", "Zenaba n’a produit aucun audio", 502)
    except TtsProviderError:
        raise
    except httpx.TimeoutException as exc:
        raise TtsProviderError("pocket", "Zenaba a dépassé le délai de synthèse", 504) from exc
    except httpx.RequestError as exc:
        raise TtsProviderError("pocket", f"Service Zenaba inaccessible: {exc}", 503) from exc


async def chatterbox_health_check() -> Dict[str, Any]:
    """Vérifie le contrat Gradio du Space Zenaba sans synthétiser."""
    settings = get_settings()
    base = (settings.chatterbox_tts_url or "").strip().rstrip("/")
    out: Dict[str, Any] = {
        "configured": bool(base),
        "voice": settings.toumai_voice_name or "Zenaba",
        "language": "fr",
        "languages": ["fr"],
        "engine": "chatterbox-multilingual-v3",
        "variant": "v3",
        "reference": CHATTERBOX_REFERENCE_ID,
        "arabic_reference": CHATTERBOX_ARABIC_REFERENCE_ID,
        "arabic_enabled": bool(getattr(settings, "toumai_voice_arabic_enabled", False)),
        "arabic_endpoint": CHATTERBOX_ARABIC_ENDPOINT,
        "arabic_ok": False,
        "ok": False,
    }
    if not base:
        out["error"] = "CHATTERBOX_TTS_URL manquant"
        return out
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(f"{base}/gradio_api/info")
        out["status_code"] = response.status_code
        if response.status_code == 200:
            payload = response.json()
            named = payload.get("named_endpoints", {}) if isinstance(payload, dict) else {}
            french_ok = "/synthesize" in named
            arabic_ok = CHATTERBOX_ARABIC_ENDPOINT in named
            out["arabic_ok"] = arabic_ok
            if arabic_ok:
                out["languages"] = ["fr", "ar"]
            out["ok"] = french_ok and (
                not out["arabic_enabled"] or arabic_ok
            )
            if not french_ok:
                out["error"] = "Endpoint Gradio /synthesize absent"
            elif out["arabic_enabled"] and not arabic_ok:
                out["error"] = (
                    "Zenaba arabe activée mais endpoint "
                    f"{CHATTERBOX_ARABIC_ENDPOINT} absent"
                )
        else:
            out["error"] = f"HTTP {response.status_code}"
    except Exception as exc:  # noqa: BLE001
        out["error"] = type(exc).__name__
    return out


def _est_une_cle_refusee(exc: BaseException) -> bool:
    """La clé a-t-elle été refusée, plutôt que le service injoignable ?

    `gradio_client` remonte toute erreur applicative du Space sous une même
    `AppError`, dont le texte est le NOM de l'exception levée côté Space. Le
    Space lève `PermissionError` quand la clé ne correspond pas, et
    `RuntimeError("Service Zenaba non configuré.")` quand son propre secret
    est absent. Vérifié le 20/09/2026 contre le Space réel.
    """
    return "PermissionError" in str(exc)


def _gradio_zenaba_predict(base: str, text: str, api_key: str) -> bytes:
    client = Client(base, verbose=False)
    result = client.predict(text, api_key, api_name="/synthesize")
    path_value = result.get("path") if isinstance(result, dict) else result
    if not isinstance(path_value, (str, Path)):
        raise RuntimeError("Réponse audio Gradio invalide")
    audio = Path(path_value).read_bytes()
    if len(audio) < 12 or not audio.startswith(b"RIFF") or audio[8:12] != b"WAVE":
        raise RuntimeError("Zenaba a renvoyé un WAV invalide")
    return audio


def _gradio_zenaba_multilingual_predict(
    base: str,
    text: str,
    language: str,
    api_key: str,
) -> bytes:
    """Endpoint additionnel du Space, sans modifier le contrat français.

    Contrat attendu côté Space:
      /synthesize_multilingual(text, language_id, api_key)

    Le français continue d'utiliser /synthesize(text, api_key). Cette séparation
    permet d'activer l'arabe sans risque de casser le chemin français déjà
    validé en production.
    """
    client = Client(base, verbose=False)
    result = client.predict(
        text,
        language,
        api_key,
        api_name=CHATTERBOX_ARABIC_ENDPOINT,
    )
    path_value = result.get("path") if isinstance(result, dict) else result
    if not isinstance(path_value, (str, Path)):
        raise RuntimeError("Réponse audio Gradio multilingue invalide")
    audio = Path(path_value).read_bytes()
    if len(audio) < 12 or not audio.startswith(b"RIFF") or audio[8:12] != b"WAVE":
        raise RuntimeError("Zenaba a renvoyé un WAV arabe invalide")
    return audio


async def synthesize_chatterbox(text: str, language: str = "fr") -> bytes:
    """Chatterbox Multilingual V3, Zenaba français/arabe, fail-closed."""
    settings = get_settings()
    base = (settings.chatterbox_tts_url or "").strip().rstrip("/")
    token = (settings.chatterbox_tts_token or "").strip()
    # UNE VARIABLE ABSENTE N'EST PAS UNE INDISPONIBILITÉ PASSAGÈRE.
    #
    # En 503, un client bien élevé réessaie : il attendra indéfiniment que
    # revienne un service qui n'a jamais été configuré, et l'interface dira
    # « réessayez dans quelques secondes » pendant des jours. 500 dit la
    # vérité : ça ne marchera pas tant que personne n'aura posé la variable.
    if not base:
        raise TtsProviderError("chatterbox", "CHATTERBOX_TTS_URL manquant", 500)
    if not token:
        raise TtsProviderError("chatterbox", "CHATTERBOX_TTS_TOKEN manquant", 500)
    plain = (text or "").strip()
    if not plain:
        raise TtsProviderError("chatterbox", "Texte vide", 400)
    if len(plain) > 1200:
        raise TtsProviderError("chatterbox", "Segment trop long pour Zenaba", 422)
    timeout = max(5.0, float(settings.chatterbox_tts_timeout_seconds or 180.0))
    try:
        if language == "ar":
            if not getattr(settings, "toumai_voice_arabic_enabled", False):
                raise TtsProviderError(
                    "chatterbox",
                    "Zenaba arabe est désactivée.",
                    409,
                )
            call = asyncio.to_thread(
                _gradio_zenaba_multilingual_predict,
                base,
                plain,
                "ar",
                token,
            )
        else:
            call = asyncio.to_thread(_gradio_zenaba_predict, base, plain, token)
        return await asyncio.wait_for(call, timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise TtsProviderError("chatterbox", "Zenaba a dépassé le délai de synthèse", 504) from exc
    except TtsProviderError:
        raise
    except Exception as exc:  # noqa: BLE001
        # UNE CLÉ REFUSÉE N'EST PAS UNE PANNE DE RÉSEAU.
        #
        # Les deux cas arrivaient ici sous le même « Service Zenaba
        # inaccessible » : un secret mal recopié envoyait alors chercher une
        # panne d'hébergeur, pendant que le défaut tenait en deux valeurs
        # différentes de part et d'autre.
        if _est_une_cle_refusee(exc):
            raise TtsProviderError(
                "chatterbox",
                "Zenaba a refusé la clé serveur : CHATTERBOX_TTS_TOKEN ne "
                "correspond pas au secret ZENABA_API_KEY du Space.",
                502,
            ) from exc
        # LE NOM DE L'EXCEPTION, PAS SON TEXTE.
        #
        # Le texte d'une erreur amont peut contenir une URL signée ou un
        # en-tête ; son type, non. « Service Zenaba inaccessible (ReadTimeout) »
        # suffit à savoir où chercher sans rien laisser fuir.
        raise TtsProviderError(
            "chatterbox",
            f"Service Zenaba inaccessible ({type(exc).__name__})",
            503,
        ) from exc


async def stream_zenaba_live(
    text: str,
    language: str = "fr",
    voice: Optional[str] = None,
):
    """Zenaba via Chatterbox Multilingual V3, français uniquement, fail-closed.

    Chatterbox V3 renvoie un WAV complet ; aucun moteur ni navigateur de secours
    n'est essayé si la génération échoue.
    """
    settings = get_settings()
    if not settings.toumai_voice_v1_enabled:
        raise TtsProviderError("chatterbox", "Toumaï Voice V1 est désactivé.", 409)
    requested_voice = (voice or "").strip().lower()
    if requested_voice not in {"", "default", "auto", ZENABA_VOICE_ID}:
        raise TtsProviderError(
            "chatterbox",
            "Zenaba est l'unique voix disponible dans Toumaï Voice V1.",
            422,
        )
    spoken, resolved_language = _prepare_voice_v1_text(text, language)
    yield await synthesize_chatterbox(spoken, resolved_language)
def _normalize_edge_voice(voice: Optional[str]) -> str:
    settings = get_settings()
    default = (settings.edge_tts_voice or "fr-FR-DeniseNeural").strip()
    raw = (voice or "").strip()
    if not raw or raw.lower() in {"default", "auto"}:
        return default
    key = raw.lower()
    mapped = _EDGE_VOICE_ALIASES.get(key)
    if mapped:
        return mapped
    if _MS_NEURAL_VOICE.match(raw):
        return raw
    if _ELEVENLABS_STYLE_ID.match(raw):
        return default
    return default


async def edge_tts_health_check() -> Dict[str, Any]:
    """Edge-TTS : pas de clé ; vérifie que le catalogue amont répond."""
    settings = get_settings()
    out: Dict[str, Any] = {
        "configured": True,
        "no_api_key": True,
        "default_voice": settings.edge_tts_voice,
        "enabled": settings.edge_tts_enabled,
        "ok": False,
    }
    if not settings.edge_tts_enabled:
        out["error"] = "EDGE_TTS_ENABLED=false — fournisseur edge désactivé"
        return out
    try:
        voices = await edge_tts.list_voices()
        n = len(voices) if isinstance(voices, list) else 0
        out["voices_count"] = n
        out["ok"] = n > 0
        if not out["ok"]:
            out["error"] = "Catalogue Edge-TTS vide ou inattendu"
    except Exception as e:
        out["error"] = str(e)[:300]
    return out


async def synthesize_edge_tts(text: str, voice: Optional[str] = None) -> bytes:
    """TTS via edge-tts (MP3), sans clé API."""
    settings = get_settings()
    if not settings.edge_tts_enabled:
        raise TtsProviderError("edge", "EDGE_TTS_ENABLED=false")
    vid = _normalize_edge_voice(voice)
    plain = text.strip()
    if not plain:
        raise TtsProviderError("edge", "Texte vide")
    communicate = edge_tts.Communicate(plain[:5000], voice=vid)
    chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk.get("type") == "audio" and chunk.get("data"):
            chunks.append(chunk["data"])
    data = b"".join(chunks)
    if not data:
        raise TtsProviderError("edge", "Flux audio Edge-TTS vide")
    return data


async def elevenlabs_health_check() -> Dict[str, Any]:
    """
    Vérifie la connectivité ElevenLabs et la validité de la voix par défaut.
    Utilise /v1/voices (léger) pour diagnostiquer rapidement la config.
    """
    settings = get_settings()
    out: Dict[str, Any] = {
        "configured": bool(settings.elevenlabs_api_key),
        "default_voice_id": settings.elevenlabs_default_voice_id,
        "model_id": settings.elevenlabs_model_id,
        "builtin_voices": ELEVENLABS_BUILTIN_VOICES,
        "ok": False,
    }
    if not settings.elevenlabs_api_key:
        out["error"] = "ELEVENLABS_API_KEY manquant"
        return out

    key = settings.elevenlabs_api_key
    headers = _elevenlabs_request_headers(key, accept_audio=False)
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.get("https://api.elevenlabs.io/v1/voices", headers=headers)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            st = e.response.status_code if e.response is not None else None
            if st == 401:
                out["ok"] = False
                out["error"] = (
                    "ElevenLabs 401 sur GET /v1/voices — la clé API est refusée. "
                    "Vérifiez sur Render → service web → Environment : ELEVENLABS_API_KEY = "
                    "la clé brute du compte ElevenLabs (voir Profile → API keys), puis "
                    "**Save + Manual Deploy**. Si la même clé marche en local, la valeur déployée est différente "
                    "(ancien secret, mauvais service, typo). Détail amont ci-dessous si présent."
                )
                out["api_key_length"] = len(key)
                out["api_key_has_sk_prefix"] = key.startswith("sk_")
                out["upstream"] = _elevenlabs_upstream_detail(e.response)
                return out
            raise
        payload = r.json() if r.content else {}
        voices = payload.get("voices") if isinstance(payload, dict) else []
        if not isinstance(voices, list):
            voices = []
        ids = [str(v.get("voice_id")) for v in voices if isinstance(v, dict) and v.get("voice_id")]
        out["voices_count"] = len(ids)
        out["default_voice_exists"] = settings.elevenlabs_default_voice_id in ids
        out["ok"] = True
        out["api_key_length"] = len(key)
        return out


#: Voix réellement présentes dans le compte, découvertes une fois puis gardées.
#:
#: POURQUOI DÉCOUVRIR PLUTÔT QUE CODER EN DUR
#: -------------------------------------------
#: Les identifiants étaient écrits dans le code : `21m00Tcm4TlvDq8ikWAM` par
#: défaut, plus quatre alias (ahmat, brahim, mariam, hassane). Diagnostic du
#: 18 août, sur la production :
#:
#:     ok                    true      la clé fonctionne
#:     voices_count          27        le compte contient 27 voix
#:     default_voice_exists  false     mais AUCUNE n'est celle-là
#:
#: Les cinq identifiants codés en dur avaient disparu du compte, et chaque
#: demande de synthèse repartait en HTTP 400. Vu de l'application : « une erreur
#: est survenue » sur le bouton Écouter, sans plus d'explication.
#:
#: Un identifiant de voix appartient au compte, pas au code : il change quand on
#: renomme, supprime ou reclone une voix. Le coder en dur, c'est parier que
#: personne ne touchera jamais à la bibliothèque — un pari qu'on vient de perdre.
_VOIX_COMPTE: List[Dict[str, Any]] = []
_VOIX_LUES = False


async def voix_du_compte(force: bool = False) -> List[Dict[str, Any]]:
    """Les voix que ce compte ElevenLabs possède réellement.

    Lues une seule fois : la bibliothèque d'un compte ne change pas entre deux
    requêtes, et une lecture par synthèse ajouterait un aller-retour à chaque
    phrase prononcée.
    """
    global _VOIX_LUES
    if _VOIX_LUES and not force:
        return _VOIX_COMPTE
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        _VOIX_LUES = True
        return _VOIX_COMPTE
    try:
        headers = _elevenlabs_request_headers(
            settings.elevenlabs_api_key, accept_audio=False
        )
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(
                "https://api.elevenlabs.io/v1/voices", headers=headers
            )
        r.raise_for_status()
        _VOIX_COMPTE.clear()
        for v in (r.json().get("voices") or []):
            vid, nom = v.get("voice_id"), v.get("name")
            if vid and nom:
                _VOIX_COMPTE.append({"id": vid, "nom": nom,
                                     "labels": v.get("labels") or {}})
        logger.info("elevenlabs_voix_compte=%d", len(_VOIX_COMPTE))
    except Exception as exc:  # noqa: BLE001
        logger.warning("lecture des voix ElevenLabs impossible : %s", exc)
    _VOIX_LUES = True
    return _VOIX_COMPTE


async def _voix_valide(candidat: str) -> str:
    """Rend `candidat` s'il existe dans le compte, sinon une voix qui existe.

    C'est le filet qui manquait : sans lui, un identifiant périmé fait échouer
    la synthèse au lieu de la faire sonner autrement.
    """
    voix = await voix_du_compte()
    if not voix:
        return candidat
    connus = {v["id"] for v in voix}
    if candidat in connus:
        return candidat
    remplacant = voix[0]["id"]
    logger.warning(
        "voix ElevenLabs %s absente du compte — repli sur %s (%s)",
        candidat, remplacant, voix[0]["nom"],
    )
    return remplacant


async def synthesize_elevenlabs(
    text: str,
    voice_id: Optional[str] = None,
) -> bytes:
    """TTS ElevenLabs (mp3)."""
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise TtsProviderError("elevenlabs", "ELEVENLABS_API_KEY manquant")

    def _normalized_voice_id(candidate: Optional[str]) -> str:
        v = (candidate or "").strip()
        if not v or v.lower() in {"default", "auto"}:
            return settings.elevenlabs_default_voice_id or ELEVENLABS_BUILTIN_VOICES["ahmat"]
        alias = ELEVENLABS_BUILTIN_VOICES.get(v.lower())
        if alias:
            return alias
        return v

    vid = await _voix_valide(_normalized_voice_id(voice_id))
    headers = _elevenlabs_request_headers(settings.elevenlabs_api_key, accept_audio=True)
    body = {
        "text": text,
        "model_id": settings.elevenlabs_model_id,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{vid}",
                headers=headers,
                json=body,
            )
            r.raise_for_status()
            return r.content
        except httpx.HTTPStatusError as e:
            # Si voice_id invalide côté client, on retente sur la voix par défaut serveur.
            status = e.response.status_code if e.response is not None else None
            fallback_voice = settings.elevenlabs_default_voice_id or ELEVENLABS_BUILTIN_VOICES["ahmat"]
            if status == 404 and vid != fallback_voice:
                r2 = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{fallback_voice}",
                    headers=headers,
                    json=body,
                )
                r2.raise_for_status()
                return r2.content
            if status == 401:
                detail = _elevenlabs_upstream_detail(e.response)
                base = "ElevenLabs a refusé la clé API (401)."
                key = settings.elevenlabs_api_key
                hint = (
                    f" longueur_clé={len(key)}, préfixe_sk={'oui' if key.startswith('sk_') else 'non'}. "
                    "Mettre à jour ELEVENLABS_API_KEY sur le **service web** Render, pas seulement un worker ; "
                    "enregistrer puis redéployer. Vérifier qu’aucun caractère invisible n’a été collé."
                )
                if detail:
                    msg = f"{base} Détail amont: {detail}. {hint}"
                else:
                    msg = (
                        f"{base} Vérifiez ELEVENLABS_API_KEY (profil ElevenLabs → API keys ; "
                        f"voir https://elevenlabs.io/docs/api-reference/authentication). {hint}"
                    )
                raise TtsProviderError("elevenlabs", msg, status_code=401) from e
            raise TtsProviderError(
                "elevenlabs",
                f"Erreur ElevenLabs HTTP {status or 'inconnue'}",
                status_code=status,
            ) from e
        except httpx.RequestError as e:
            raise TtsProviderError("elevenlabs", f"Réseau ElevenLabs indisponible: {e}") from e


def _normalize_openai_voice(voice: Optional[str]) -> str:
    """Convertit les alias app (ahmat, female_fr, IDs ElevenLabs…) en nom de voix OpenAI."""
    settings = get_settings()
    default = (settings.openai_tts_voice or "nova").strip().lower()
    if default not in OPENAI_TTS_NATIVE_VOICES:
        default = "nova"
    raw = (voice or "").strip().lower()
    if not raw or raw in {"default", "auto"}:
        return default
    if raw in OPENAI_TTS_NATIVE_VOICES:
        return raw
    mapped = _OPENAI_VOICE_FROM_APP_ALIAS.get(raw)
    if mapped:
        return mapped
    # ID de voix ElevenLabs / identifiant opaque → voix par défaut OpenAI
    if _ELEVENLABS_STYLE_ID.match(raw):
        return default
    return default


async def openai_tts_health_check() -> Dict[str, Any]:
    """
    Vérifie OPENAI_API_KEY (GET /v1/models, pas de coût TTS).
    """
    settings = get_settings()
    out: Dict[str, Any] = {
        "configured": bool(settings.openai_api_key),
        "model_default": settings.openai_tts_model,
        "voice_default": settings.openai_tts_voice,
        "ok": False,
    }
    if not settings.openai_api_key:
        out["error"] = "OPENAI_API_KEY manquant"
        return out
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            r = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                params={"limit": 1},
            )
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            st = e.response.status_code if e.response is not None else None
            detail = ""
            try:
                if e.response is not None:
                    pj = e.response.json()
                    if isinstance(pj, dict) and isinstance(pj.get("error"), dict):
                        msg = pj["error"].get("message")
                        if isinstance(msg, str):
                            detail = msg[:280]
            except (ValueError, TypeError):
                detail = (e.response.text or "")[:200] if e.response is not None else ""
            out["error"] = (
                f"OpenAI HTTP {st or '?'} — clé ou quota refusé."
                + (f" Détail: {detail}" if detail else "")
            )
            return out
        except httpx.RequestError as e:
            out["error"] = f"Réseau OpenAI: {e}"
            return out
    out["ok"] = True
    return out


async def synthesize_openai(text: str, voice: Optional[str] = None) -> bytes:
    """TTS OpenAI (MP3)."""
    settings = get_settings()
    if not settings.openai_api_key:
        raise TtsProviderError("openai", "OPENAI_API_KEY manquant")
    ov = _normalize_openai_voice(voice)
    model = (settings.openai_tts_model or "tts-1").strip() or "tts-1"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "voice": ov,
        "input": text[:4096],
        "response_format": "mp3",
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers=headers,
                json=body,
            )
            r.raise_for_status()
            return r.content
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else None
            detail = ""
            try:
                if e.response is not None:
                    pj = e.response.json()
                    if isinstance(pj, dict) and isinstance(pj.get("error"), dict):
                        msg = pj["error"].get("message")
                        if isinstance(msg, str):
                            detail = msg[:300]
            except (ValueError, TypeError):
                detail = (e.response.text or "")[:220] if e.response is not None else ""
            raise TtsProviderError(
                "openai",
                f"Erreur OpenAI TTS HTTP {status or '?'}" + (f": {detail}" if detail else ""),
                status_code=status,
            ) from e
        except httpx.RequestError as e:
            raise TtsProviderError("openai", f"Réseau OpenAI indisponible: {e}") from e


# ── Gemini TTS ──────────────────────────────────────────────────────────────
# Deuxième au classement ELO de la Speech Arena (préférence humaine en aveugle,
# 1206 contre 1178 pour ElevenLabs v3), et surtout : c'est un MODÈLE DE LANGUE
# qui parle. Il ne convertit pas des caractères en phonèmes — il comprend ce
# qu'il lit, et on lui dit COMMENT le dire en français ordinaire.
#
# C'est ce qui permet la respiration. Aucune balise SSML, aucun réglage de
# hauteur ou de vitesse ne produit ce que produit « respire entre les idées,
# ne récite pas » : les moteurs classiques n'ont pas de représentation de ce
# qu'est une idée.

GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"

# Endpoint HISTORIQUE, gardé comme repli automatique.
#
# `/v1beta/interactions` est l'API récente, celle qui porte le modèle 3.1 et le
# streaming. C'est une préversion : son enveloppe a déjà changé une fois, et
# rien ne garantit qu'elle ne bougera pas encore. `:generateContent` avec
# `responseModalities: ["AUDIO"]` est en place depuis les modèles 2.5, stable,
# et rend le même PCM 24 kHz.
#
# Le repli n'est pas de la prudence décorative : si l'API récente change de
# forme un matin, la conversation vocale doit continuer de parler — avec une
# voix d'une génération en arrière plutôt qu'avec un silence.
GEMINI_TTS_FALLBACK_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)
GEMINI_TTS_FALLBACK_MODEL = "gemini-2.5-flash-preview-tts"

# Voix préconstruites, choisies sur leur caractère annoncé par Google.
# `Sulafat` est la seule décrite comme « chaleureuse » — c'est le registre de
# Toumaï. Les autres couvrent les alias de voix déjà exposés par l'application.
GEMINI_DEFAULT_VOICE = "Sulafat"
_GEMINI_VOICE_FROM_APP_ALIAS: Dict[str, str] = {
    "ahmat": "Algieba",        # Smooth
    "brahim": "Achird",        # Friendly
    "hassane": "Sadaltager",   # Knowledgeable
    "male_fr": "Algieba",
    "mariam": "Sulafat",       # Warm
    "female_fr": "Sulafat",
    "alloy": "Schedar",
    "echo": "Achird",
    "fable": "Vindemiatrix",
    "onyx": "Algieba",
    "nova": "Sulafat",
    "shimmer": "Autonoe",
}
_GEMINI_VOICES = frozenset(
    {
        "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
        "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
        "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
        "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird",
        "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
    }
)

# La consigne de jeu. Elle n'est PAS lue à voix haute : le modèle la traite
# comme une indication de mise en bouche, à la manière du « Say cheerfully: »
# de la documentation.
#
# Chaque ligne répond à un défaut précis des voix de synthèse :
#   • le débit régulier de métronome, qui trahit la machine en trois mots ;
#   • l'absence de souffle, un humain reprenant son air entre deux idées ;
#   • la montée finale systématique, qui fait sonner chaque phrase pareil ;
#   • l'articulation de speaker, trop propre pour une conversation.
GEMINI_STYLE_FR = (
    "Lis ce qui suit comme si tu parlais à quelqu'un en face de toi, pas comme "
    "si tu lisais un texte. Voix chaleureuse et posée, débit naturel qui varie "
    "un peu. Reprends ton souffle entre les idées. Ne détache pas les mots, "
    "n'appuie pas la fin des phrases. Ton amical, jamais théâtral. Dis :\n\n"
)
GEMINI_STYLE_AR = (
    "اقرأ ما يلي كأنك تتحدث مع شخص أمامك، لا كأنك تقرأ نصًا. صوت دافئ وهادئ، "
    "إيقاع طبيعي متغير. خذ نفسًا بين الأفكار. نبرة ودودة، غير مسرحية. قل:\n\n"
)
GEMINI_STYLE_EN = (
    "Read the following as if you were talking to someone in front of you, not "
    "reading a script. Warm, unhurried voice with a naturally varying pace. "
    "Take a breath between ideas. Friendly, never theatrical. Say:\n\n"
)


def _gemini_style(language: Optional[str]) -> str:
    code = (language or "fr").split("-")[0].split("_")[0].strip().lower()
    if code == "ar":
        return GEMINI_STYLE_AR
    if code == "en":
        return GEMINI_STYLE_EN
    return GEMINI_STYLE_FR


def _gemini_voice(voice: Optional[str]) -> str:
    settings = get_settings()
    raw = (voice or "").strip()
    if raw in _GEMINI_VOICES:
        return raw
    mapped = _GEMINI_VOICE_FROM_APP_ALIAS.get(raw.lower())
    if mapped:
        return mapped
    configured = (settings.gemini_tts_voice or "").strip()
    if configured in _GEMINI_VOICES:
        return configured
    return GEMINI_DEFAULT_VOICE


def wrap_pcm_as_wav(pcm: bytes, rate: int = 24000, channels: int = 1) -> bytes:
    """En-tête WAV de 44 octets suivi du PCM 16 bits.

    Gemini rend des ÉCHANTILLONS bruts, sans conteneur. Le lecteur audio de
    l'application joue des fichiers : sans cet en-tête il reçoit un flux qu'il
    ne sait pas identifier et ne joue rien — silence complet, sans erreur.
    """
    import struct  # noqa: PLC0415

    bits = 16
    byte_rate = rate * channels * bits // 8
    block_align = channels * bits // 8
    header = b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVE"
    header += b"fmt " + struct.pack(
        "<IHHIIHH", 16, 1, channels, rate, byte_rate, block_align, bits
    )
    header += b"data" + struct.pack("<I", len(pcm))
    return header + pcm


async def synthesize_gemini(
    text: str,
    language: str = "fr",
    voice: Optional[str] = None,
    *,
    style: Optional[str] = None,
) -> bytes:
    """TTS Gemini 3.1 Flash → WAV 24 kHz.

    Pas de streaming intra-phrase ici : la synthèse est déjà découpée phrase
    par phrase en amont (`synthesize_stream`), et la première phrase — courte —
    porte seule la latence perçue. Ajouter un second niveau de streaming
    obligerait le client à recoller des morceaux de conteneur, pour un gain
    qui se compte en dizaines de millisecondes.
    """
    settings = get_settings()
    directive = style if style is not None else _gemini_style(language)
    spoken = f"{directive}{text[:4000]}"
    voix = _gemini_voice(voice)

    recent_model = (
        settings.gemini_tts_model or "gemini-3.1-flash-tts-preview"
    ).strip()

    # DEUX CAISSES, ET L'ARGENT N'EST PAS DANS CELLE QU'ON INTERROGEAIT.
    #
    # AI Studio (clé API) puise dans le porte-monnaie *Prepay* : celui de
    # Faycal est à zéro, et l'achat de crédits a été refusé par sa banque.
    # Vertex (compte de service) puise dans le *Postpay* — c'est là que le
    # paiement du 13 août est réellement arrivé, et c'est déjà par là que
    # passe Gemini Live.
    #
    # Le TTS, lui, frappait encore à la mauvaise porte : « prepayment credits
    # are depleted » sur une facture pourtant réglée. On essaie donc Vertex
    # d'abord, avec le compte de service DÉJÀ déployé.
    from .realtime import vertex_acces  # noqa: PLC0415

    tentatives: List[tuple] = []
    entetes_par_url: Dict[str, Dict[str, str]] = {}

    if vertex_acces.disponible():
        jeton = vertex_acces.jeton()
        if jeton:
            url_vertex = (
                f"https://{vertex_acces.region()}-aiplatform.googleapis.com/v1"
                f"/projects/{vertex_acces.projet()}/locations/{vertex_acces.region()}"
                f"/publishers/google/models/{GEMINI_TTS_FALLBACK_MODEL}:generateContent"
            )
            tentatives.append((
                url_vertex,
                {
                    "contents": [{"role": "user", "parts": [{"text": spoken}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voix}}
                        },
                    },
                },
            ))
            entetes_par_url[url_vertex] = {
                "Authorization": f"Bearer {jeton}",
                "Content-Type": "application/json",
            }

    key = (settings.gemini_api_key or "").strip()
    if not key and not tentatives:
        raise TtsProviderError(
            "gemini",
            "ni compte de service Vertex ni GEMINI_API_KEY : aucune voix Gemini possible",
        )
    headers = {"x-goog-api-key": key, "Content-Type": "application/json"}

    tentatives += [] if not key else [
        (
            GEMINI_TTS_URL,
            {
                "model": recent_model,
                "input": spoken,
                "response_format": {"type": "audio"},
                "generation_config": {"speech_config": [{"voice": voix}]},
            },
        ),
        (
            GEMINI_TTS_FALLBACK_URL.format(model=GEMINI_TTS_FALLBACK_MODEL),
            {
                "contents": [{"parts": [{"text": spoken}]}],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voix}}
                    },
                },
            },
        ),
    ]

    dernier: Optional[TtsProviderError] = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for index, (url, body) in enumerate(tentatives):
            try:
                r = await client.post(
                    url, headers=entetes_par_url.get(url, headers), json=body
                )
                r.raise_for_status()
                b64 = _gemini_audio_field(r.json())
                if not b64:
                    raise TtsProviderError("gemini", "réponse sans audio")
                import base64  # noqa: PLC0415

                pcm = base64.b64decode(b64)
                if not pcm:
                    raise TtsProviderError("gemini", "audio vide")
                if index > 0:
                    logger.info("Gemini TTS : repli sur :generateContent")
                return wrap_pcm_as_wav(
                    pcm, rate=int(settings.gemini_tts_sample_rate or 24000)
                )
            except httpx.HTTPStatusError as e:
                status = e.response.status_code if e.response is not None else None
                dernier = TtsProviderError(
                    "gemini",
                    f"Erreur Gemini TTS HTTP {status or '?'}"
                    + (f": {_gemini_error_detail(e.response)}"),
                    status_code=status,
                )
                # Une clé refusée ou un quota épuisé le seront tout autant sur
                # l'autre endpoint : réessayer ne ferait qu'ajouter une seconde
                # d'attente avant le même échec.
                if status in (401, 403, 429):
                    raise dernier from e
            except httpx.RequestError as e:
                dernier = TtsProviderError(
                    "gemini", f"Réseau Gemini indisponible: {e}"
                )
            except TtsProviderError as e:
                dernier = e

    raise dernier or TtsProviderError("gemini", "synthèse impossible")


def _gemini_error_detail(response: Optional[httpx.Response]) -> str:
    if response is None:
        return ""
    try:
        payload = response.json()
        if isinstance(payload, list) and payload:
            payload = payload[0]
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or err)[:280]
            return str(payload)[:280]
    except ValueError:
        pass
    return (response.text or "")[:220]


def _gemini_audio_field(payload: Any) -> str:
    """Extrait l'audio base64 de la réponse.

    Plusieurs chemins sont acceptés : l'API `interactions` est récente et son
    enveloppe a déjà bougé une fois. Chercher à quelques endroits coûte trois
    lignes ; se tromper d'un niveau rend un silence sans message d'erreur.
    """
    if not isinstance(payload, dict):
        return ""
    for chemin in (
        ("interaction", "output_audio", "data"),
        ("output_audio", "data"),
        ("interaction", "output_audio"),
        ("output_audio",),
    ):
        noeud: Any = payload
        for cle in chemin:
            if not isinstance(noeud, dict):
                noeud = None
                break
            noeud = noeud.get(cle)
        if isinstance(noeud, str) and noeud:
            return noeud
    # Repli sur l'ancienne enveloppe `generateContent` (inlineData), au cas où
    # le modèle configuré soit un `gemini-2.5-*-preview-tts`.
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        for part in parts:
            data = (part.get("inlineData") or part.get("inline_data") or {}).get("data")
            if data:
                return data
    except (KeyError, IndexError, TypeError):
        pass
    return ""


async def gemini_tts_health_check() -> Dict[str, Any]:
    """Synthétise deux mots — c'est le seul moyen de savoir si ce modèle
    précis est autorisé sur la clé, la liste des modèles ne le disant pas."""
    settings = get_settings()
    out: Dict[str, Any] = {
        "configured": bool(settings.gemini_api_key),
        "model": settings.gemini_tts_model,
        "voice": settings.gemini_tts_voice or GEMINI_DEFAULT_VOICE,
        "ok": False,
    }
    if not settings.gemini_api_key:
        out["error"] = "GEMINI_API_KEY manquant"
        return out
    try:
        audio = await synthesize_gemini("Bonjour.", "fr")
        out["ok"] = len(audio) > 44
        out["bytes"] = len(audio)
    except Exception as exc:  # noqa: BLE001
        out["error"] = str(exc)[:280]
    return out


# ── Cartesia Sonic ──────────────────────────────────────────────────────────
# Le premier son sort en moins de 100 ms, là où Edge-TTS demande environ une
# seconde. Sur une conversation vocale c'est LE chiffre qui compte : c'est le
# blanc entre la fin de la question et le début de la réponse, celui qui donne
# l'impression de parler à une machine ou à quelqu'un.

CARTESIA_TTS_URL = "https://api.cartesia.ai/tts/bytes"

# Voix du catalogue Cartesia. Sonic est multilingue, mais la voix porte un
# accent : une voix française lisant de l'arabe s'entend immédiatement.
_CARTESIA_VOICE_BY_LANGUAGE: Dict[str, str] = {
    "fr": "65b25c5d-ff07-4687-a04c-da2f43ef6fa9",  # French Narrator Lady
    "en": "a0e99841-438c-4a64-b679-ae501e7d6091",  # Barbershop Man
    "ar": "5c5ad5e7-1020-476b-8b91-fdcbe9cc313c",  # Arabic Narrator
}

# Alias métier de l'app → voix Cartesia, pour que le réglage de voix existant
# continue de vouloir dire quelque chose sans que le front change.
_CARTESIA_VOICE_FROM_APP_ALIAS: Dict[str, str] = {
    "ahmat": "63ff761f-c1e8-414b-b969-d1833d1c870c",   # Confident British Man
    "brahim": "63ff761f-c1e8-414b-b969-d1833d1c870c",
    "hassane": "63ff761f-c1e8-414b-b969-d1833d1c870c",
    "male_fr": "5c3c89e5-535f-43ef-b14d-f8ffe148c1f0",  # French Conversational Man
    "mariam": "65b25c5d-ff07-4687-a04c-da2f43ef6fa9",
    "female_fr": "65b25c5d-ff07-4687-a04c-da2f43ef6fa9",
}

# Codes de langue acceptés par Sonic. Tout le reste retombe sur le français —
# la langue de l'app.
_CARTESIA_LANGUAGES = frozenset(
    {"en", "fr", "de", "es", "pt", "zh", "ja", "hi", "it", "ko", "nl", "pl", "ru", "sv", "tr"}
)


def _cartesia_language(language: Optional[str]) -> str:
    code = (language or "fr").split("-")[0].split("_")[0].strip().lower()
    if code in {"auto", ""}:
        return "fr"
    # L'arabe tchadien n'existe pas chez Cartesia ; `apply_chadian_arabic` a
    # déjà converti le texte en écriture arabe en amont, mais Sonic ne
    # référence pas `ar` dans ses langues supportées : on laisse alors le
    # fournisseur suivant prendre la main plutôt que de lire de l'arabe avec
    # une prosodie française.
    return code if code in _CARTESIA_LANGUAGES else ""


def _cartesia_voice_id(voice: Optional[str], language: str) -> str:
    settings = get_settings()
    raw = (voice or "").strip()
    lowered = raw.lower()
    if lowered and lowered not in {"default", "auto"}:
        mapped = _CARTESIA_VOICE_FROM_APP_ALIAS.get(lowered)
        if mapped:
            return mapped
        # Un UUID passe tel quel : c'est déjà un identifiant Cartesia.
        if len(raw) == 36 and raw.count("-") == 4:
            return raw
    configured = (settings.cartesia_voice_id or "").strip()
    if configured:
        return configured
    return _CARTESIA_VOICE_BY_LANGUAGE.get(language, _CARTESIA_VOICE_BY_LANGUAGE["fr"])


async def synthesize_cartesia(
    text: str,
    language: str = "fr",
    voice: Optional[str] = None,
) -> bytes:
    """TTS Cartesia Sonic → MP3.

    On demande du MP3 et non du PCM brut : la lecture côté application passe
    par `audioplayers`, qui joue un conteneur, pas des échantillons nus. Le
    surcoût d'encodage est de quelques millisecondes, sans commune mesure avec
    ce qu'il faudrait sinon empaqueter à la main à chaque segment.
    """
    settings = get_settings()
    key = (settings.cartesia_api_key or "").strip()
    if not key:
        raise TtsProviderError("cartesia", "CARTESIA_API_KEY manquant")

    lang = _cartesia_language(language)
    if not lang:
        raise TtsProviderError(
            "cartesia", f"langue « {language} » non prise en charge par Sonic"
        )

    body = {
        "model_id": (settings.cartesia_model or "sonic-2").strip(),
        "transcript": text[:4000],
        "voice": {"mode": "id", "id": _cartesia_voice_id(voice, lang)},
        "language": lang,
        "output_format": {
            "container": "mp3",
            "sample_rate": 44100,
            "bit_rate": 128000,
        },
    }
    headers = {
        "X-API-Key": key,
        "Cartesia-Version": (settings.cartesia_version or "2024-06-10").strip(),
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(CARTESIA_TTS_URL, headers=headers, json=body)
            r.raise_for_status()
            if not r.content:
                raise TtsProviderError("cartesia", "réponse audio vide")
            return r.content
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else None
            detail = ""
            if e.response is not None:
                try:
                    pj = e.response.json()
                    if isinstance(pj, dict):
                        detail = str(pj.get("error") or pj.get("message") or pj)[:280]
                except ValueError:
                    detail = (e.response.text or "")[:220]
            raise TtsProviderError(
                "cartesia",
                f"Erreur Cartesia HTTP {status or '?'}" + (f": {detail}" if detail else ""),
                status_code=status,
            ) from e
        except httpx.RequestError as e:
            raise TtsProviderError("cartesia", f"Réseau Cartesia indisponible: {e}") from e


async def cartesia_health_check() -> Dict[str, Any]:
    """Vérifie la clé Cartesia sans consommer de crédit de synthèse."""
    settings = get_settings()
    key = (settings.cartesia_api_key or "").strip()
    out: Dict[str, Any] = {
        "configured": bool(key),
        "model": settings.cartesia_model,
        "voice_id": settings.cartesia_voice_id or "(défaut par langue)",
        "ok": False,
    }
    if not key:
        out["error"] = "CARTESIA_API_KEY manquant"
        return out
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                "https://api.cartesia.ai/voices/",
                headers={
                    "X-API-Key": key,
                    "Cartesia-Version": (settings.cartesia_version or "2024-06-10").strip(),
                },
                params={"limit": 1},
            )
        out["status_code"] = r.status_code
        out["ok"] = r.status_code == 200
        if r.status_code != 200:
            out["error"] = (r.text or "")[:200]
    except Exception as exc:  # noqa: BLE001
        out["error"] = str(exc)
    return out


def _tts_provider_order(prefer_kokoro: bool = False, prefer_voxcpm: bool = False) -> List[str]:
    """Ordre des moteurs TTS.

    En Toumaï Voice V1, Zenaba/Chatterbox Multilingual V3 est l'unique moteur actif. Les anciens
    fournisseurs restent dans le code uniquement comme mécanisme explicite de
    rollback lorsque TOUMAI_VOICE_V1_ENABLED=false.
    """
    settings = get_settings()
    if settings.toumai_voice_v1_enabled:
        return ["chatterbox"]

    raw = (settings.tts_provider_priority or "").replace(" ", "").lower()
    valid = {"gemini", "cartesia", "edge", "openai", "elevenlabs", "kokoro", "voxcpm"}
    parts = [p for p in raw.split(",") if p in valid]
    if not parts:
        parts = ["elevenlabs", "cartesia", "kokoro", "openai"]
    if not settings.edge_tts_enabled:
        parts = [p for p in parts if p != "edge"]
    if prefer_voxcpm:
        parts = ["voxcpm"] + [p for p in parts if p != "voxcpm"]
    elif prefer_kokoro:
        parts = ["kokoro"] + [p for p in parts if p != "kokoro"]

    seen: set[str] = set()
    out: List[str] = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


async def synthesize_voxcpm(
    text: str,
    control_instruction: Optional[str] = None,
    ref_wav_path: Optional[str] = None,
) -> bytes:
    """TTS VoxCPM2 via HF Space gradio_client.

    Modes :
    - Voice Design : control_instruction seul (ex: "homme tchadien chaleureux") → no reference audio
    - Controllable Cloning : ref_wav_path + control_instruction
    - Ultimate Cloning : ref_wav_path seul (transcription implicite)
    Retourne des bytes WAV (audio/wav).
    """
    settings = get_settings()
    space_url = (settings.voxcpm_hf_space_url or "").strip()
    if not space_url:
        raise TtsProviderError("voxcpm", "VOXCPM_HF_SPACE_URL manquant")

    ctrl = control_instruction or settings.voxcpm_default_control or ""

    def _call_sync() -> bytes:
        try:
            from gradio_client import Client, handle_file  # noqa: PLC0415
        except ImportError as exc:
            raise TtsProviderError("voxcpm", "gradio_client non installé") from exc

        hf_token = settings.spaces_token or None
        # `gradio_client` a renommé `hf_token` en `token`. Avec la version
        # installée (>= 2), l'ancien nom lève un TypeError immédiat : le
        # clonage vocal échouait en moins d'une seconde et retombait sur la
        # voix empruntée, sans que rien ne le signale — le repli masquait la
        # panne. On tente le nom actuel, puis l'ancien.
        try:
            client = Client(space_url, token=hf_token)
        except TypeError:
            client = Client(space_url, hf_token=hf_token)

        # Prépare ref_wav si fourni
        ref_input = handle_file(ref_wav_path) if ref_wav_path else None

        result = client.predict(
            text=text,
            control_instruction=ctrl,
            ref_wav=ref_input,
            api_name="/generate",
        )

        # gradio_client retourne soit un chemin de fichier tmp, soit un dict {"path":...}
        if isinstance(result, dict):
            result = result.get("path") or result.get("url") or result.get("name") or ""
        if isinstance(result, str) and result:
            with open(result, "rb") as fh:
                return fh.read()

        # Si le Space retourne directement un tuple (sr, np_array)
        if isinstance(result, (list, tuple)) and len(result) == 2:
            try:
                import numpy as np  # noqa: PLC0415
                import soundfile as sf  # noqa: PLC0415
                sr, arr = result
                buf = io.BytesIO()
                sf.write(buf, np.array(arr), samplerate=sr, format="WAV")
                return buf.getvalue()
            except ImportError as exc:
                raise TtsProviderError("voxcpm", "numpy/soundfile requis pour convertir l'audio VoxCPM") from exc

        raise TtsProviderError("voxcpm", f"Format de réponse VoxCPM inattendu : {type(result)}")

    try:
        # gradio_client est synchrone → exécution dans un thread
        loop = asyncio.get_event_loop()
        data = await asyncio.wait_for(
            loop.run_in_executor(None, _call_sync),
            timeout=120.0,
        )
        if not data:
            raise TtsProviderError("voxcpm", "Réponse audio VoxCPM vide")
        return data
    except asyncio.TimeoutError as exc:
        raise TtsProviderError("voxcpm", "VoxCPM HF Space timeout (>120s) — Space endormi ou CPU saturé") from exc
    except TtsProviderError:
        raise
    except Exception as exc:
        raise TtsProviderError("voxcpm", f"Erreur VoxCPM : {exc}") from exc


async def voxcpm_health_check() -> Dict[str, Any]:
    """Vérifie la disponibilité du HF Space VoxCPM."""
    settings = get_settings()
    space_url = (settings.voxcpm_hf_space_url or "").strip()
    out: Dict[str, Any] = {
        "configured": bool(space_url),
        "space_url": space_url,
        "default_control": settings.voxcpm_default_control,
        "ok": False,
    }
    if not space_url:
        out["error"] = "VOXCPM_HF_SPACE_URL manquant"
        return out
    try:
        async with httpx.AsyncClient(timeout=20.0) as c:
            r = await c.get(space_url.rstrip("/") + "/info")
            out["status_code"] = r.status_code
            out["ok"] = r.status_code in (200, 404)  # 404 = Space up mais endpoint /info inexistant
    except Exception as exc:
        out["error"] = str(exc)[:200]
    return out


async def synthesize_kokoro(text: str, language: str = "fr") -> bytes:
    """TTS Kokoro via service auto-hébergé (POST /synthesize attendu)."""
    settings = get_settings()
    if not settings.kokoro_tts_url:
        raise TtsProviderError("kokoro", "KOKORO_TTS_URL manquant")
    url = settings.kokoro_tts_url.rstrip("/") + "/synthesize"
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            url,
            json={"text": text, "language": language},
        )
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else None
            raise TtsProviderError(
                "kokoro",
                f"Erreur Kokoro HTTP {status or 'inconnue'}",
                status_code=status,
            ) from e
        return r.content


def apply_chadian_arabic(
    text: str,
    language: str,
    voice: Optional[str],
    prefer_voxcpm: bool,
    voxcpm_control: Optional[str],
    voxcpm_ref_wav: Optional[str],
) -> Tuple[str, str, Optional[str], bool, Optional[str], Optional[str]]:
    """Adapte texte et voix quand la réponse est en arabe tchadien.

    Le corpus — et donc les réponses du modèle — est écrit en translittération
    LATINE, qu'aucune voix arabe ne sait lire. Il n'existe pas de voix `ar-TD` :
    on convertit vers l'écriture arabe avec une graphie choisie pour le SON que
    la voix cible produira, et on emprunte la phonologie la plus proche.

    Deux façons d'arriver ici :
      • l'utilisateur a choisi l'arabe tchadien dans ses préférences — la voix
        reçue vaut alors « shu:<profil> », et ce profil l'emporte ;
      • rien n'a été choisi, et le texte est reconnu comme de l'arabe tchadien.

    Toute erreur est absorbée : mieux vaut une voix approximative que pas de
    voix. C'est aussi ce qui a caché pendant un temps un import cassé — d'où
    l'avertissement en clair dans les logs.
    """
    settings = get_settings()
    try:
        from services import chadian_tts_service as cts

        forced = cts.profile_from_voice(voice)
        profile = (
            forced
            or getattr(settings, "chadian_voice_profile", None)
            or cts.DEFAULT_PROFILE
        )
        converted, chadian_voice, did_convert = cts.prepare_for_tts(text, profile)

        if did_convert:
            text = converted
        elif forced and _ARABIC_SCRIPT.search(text):
            # Profil tchadien demandé et texte déjà en écriture arabe : la voix
            # arabe convient, on la garde.
            pass
        else:
            # RIEN À FAIRE ICI, et c'est le cas de très loin le plus fréquent :
            # une réponse en français ou en anglais. En sortant l'affectation de
            # `voice` du bloc conditionnel lors d'une refonte, TOUTE synthèse —
            # quelle que soit la langue — se retrouvait imposée à une voix arabe.
            # Symptôme rapporté : « le TTS parle avec une voix étrange, et même
            # après changement ça reste la même voix ». C'était ça.
            #
            # Un identifiant « shu:… » ne veut rien dire pour Edge ou OpenAI :
            # s'il n'y a rien à convertir, on le neutralise plutôt que de le
            # transmettre tel quel au fournisseur.
            return (
                text, language, None if forced else voice,
                prefer_voxcpm, voxcpm_control, voxcpm_ref_wav,
            )

        # La voix demandée par l'appelant est écartée : une voix française ne
        # sait pas lire de l'arabe.
        voice = chadian_voice
        language = "ar"

        # CLONAGE VOCAL TCHADIEN. Si un moteur de clonage est disponible, on
        # l'utilise avec un extrait RÉEL du corpus comme référence : la réponse
        # sort avec une voix tchadienne authentique plutôt qu'un accent
        # saoudien ou égyptien emprunté. Repli automatique si le clonage échoue.
        clip = cts.reference_clip()
        if clip and settings.voxcpm_hf_space_url:
            prefer_voxcpm = True
            voxcpm_ref_wav = clip
            voxcpm_control = voxcpm_control or cts.CLONE_CONTROL
            logger.info("arabe tchadien : clonage vocal activé (référence réelle)")
    except Exception as exc:  # noqa: BLE001
        logger.warning("adaptation arabe tchadien ignorée : %s", exc)

    return text, language, voice, prefer_voxcpm, voxcpm_control, voxcpm_ref_wav


async def synthesize(
    text: str,
    language: str = "fr",
    voice: Optional[str] = None,
    prefer_kokoro: bool = False,
    prefer_voxcpm: bool = False,
    voxcpm_control: Optional[str] = None,
    voxcpm_ref_wav: Optional[str] = None,
) -> Tuple[bytes, str]:
    """
    Retourne (audio_bytes, mime_type).
    Ordre : TTS_PROVIDER_PRIORITY (edge / kokoro / elevenlabs / openai par défaut).
    prefer_voxcpm=True : VoxCPM en tête (in-app chat haute qualité).
    prefer_kokoro=True : Kokoro en tête.
    voxcpm_control : instruction Voice Design (ex: "homme tchadien chaleureux").
    voxcpm_ref_wav : chemin local vers audio de référence pour Voice Clone.
    """
    errors: list[str] = []
    settings = get_settings()

    # V1 : une seule identité vocale, français + arabe sous kill-switch,
    # toujours fail-closed.
    if settings.toumai_voice_v1_enabled:
        requested_voice = (voice or "").strip().lower()
        if requested_voice not in {"", "default", "auto", ZENABA_VOICE_ID}:
            raise TtsProviderError(
                "chatterbox",
                "Zenaba est l'unique voix disponible dans Toumaï Voice V1.",
                422,
            )
        spoken, resolved_language = _prepare_voice_v1_text(text, language)
        audio = await synthesize_chatterbox(spoken, resolved_language)
        return audio, "audio/wav"

    # ANCIEN PIPELINE — rollback explicite seulement.
    # ON ÉCRIT CE QU'ON VEUT ENTENDRE.
    #
    # « Faycal » place un `c` devant un `a` : toute synthèse française le lit
    # /k/, et rend « Faykal ». Ce n'est pas une erreur du fournisseur, c'est la
    # règle de la langue. La seule correction fiable est orthographique —
    # « Fayçal » — et elle se pose ici, au dernier moment, sur du texte qui ne
    # sera jamais affiché. Voir `services/prononciation.py`.
    text = prononciation.pour_la_voix(text)

    text, language, voice, prefer_voxcpm, voxcpm_control, voxcpm_ref_wav = (
        apply_chadian_arabic(
            text, language, voice, prefer_voxcpm, voxcpm_control, voxcpm_ref_wav
        )
    )

    async def _try(name: str, fn):
        try:
            data = await fn()
            if data:
                return data
        except Exception as e:
            errors.append(f"{name}: {e}")
        return None

    for provider in _tts_provider_order(prefer_kokoro=prefer_kokoro, prefer_voxcpm=prefer_voxcpm):
        if provider == "gemini" and settings.gemini_api_key:
            data = await _try(
                "gemini", lambda: synthesize_gemini(text, language, voice)
            )
            if data:
                return data, "audio/wav"
        elif provider == "cartesia" and settings.cartesia_api_key:
            data = await _try(
                "cartesia", lambda: synthesize_cartesia(text, language, voice)
            )
            if data:
                return data, "audio/mpeg"
        elif provider == "voxcpm" and settings.voxcpm_hf_space_url:
            data = await _try(
                "voxcpm",
                lambda: synthesize_voxcpm(text, voxcpm_control, voxcpm_ref_wav),
            )
            if data:
                return data, "audio/wav"
        elif provider == "edge" and settings.edge_tts_enabled:
            data = await _try("edge", lambda: synthesize_edge_tts(text, voice))
            if data:
                return data, "audio/mpeg"
        elif provider == "openai" and settings.openai_api_key:
            data = await _try("openai", lambda: synthesize_openai(text, voice))
            if data:
                return data, "audio/mpeg"
        elif provider == "elevenlabs" and settings.elevenlabs_api_key:
            data = await _try("elevenlabs", lambda: synthesize_elevenlabs(text, voice))
            if data:
                return data, "audio/mpeg"
        elif provider == "kokoro" and settings.kokoro_tts_url:
            data = await _try("kokoro", lambda: synthesize_kokoro(text, language))
            if data:
                return data, "audio/mpeg"

    joined = "; ".join(errors)
    if "401 Unauthorized" in joined or "refusé la clé" in joined:
        raise RuntimeError(
            "Synthèse vocale indisponible (erreur auth sur un fournisseur payant). "
            "Par défaut le backend utilise Edge-TTS (gratuit) et Kokoro. "
            "Vérifiez TTS_PROVIDER_PRIORITY ou les clés payantes."
            f" Détail : {joined}"
        )
    detail = f" ({joined})" if errors else ""
    raise RuntimeError(
        "Aucun service TTS opérationnel (gemini / cartesia / voxcpm / edge / kokoro / "
        "elevenlabs / openai). Vérifiez GEMINI_API_KEY, CARTESIA_API_KEY, "
        "VOXCPM_HF_SPACE_URL, edge-tts (EDGE_TTS_ENABLED), KOKORO_TTS_URL, ou clés payantes."
        + detail
    )


# ── Synthèse au fil de l'eau ─────────────────────────────────────────────────
# La synthèse d'un texte entier ne rend la main qu'une fois le dernier mot
# produit : sur une réponse de dix lignes, l'utilisateur attend l'intégralité
# avant d'entendre le premier mot. Découper en phrases et diffuser chaque
# segment dès qu'il est prêt ramène ce délai à celui de la PREMIÈRE phrase.

# Fins de phrase, ponctuation arabe comprise : point, virgule arabe (،),
# point-virgule arabe (؛), point d'interrogation arabe (؟).
_SENTENCE_END = re.compile(r"(?<=[.!?؟۔…:；;])\s+|\n+")
# Repli quand une « phrase » reste trop longue : on coupe sur une virgule.
_SOFT_BREAK = re.compile(r"(?<=[,،])\s+")


def split_sentences(text: str, max_chars: int = 240, min_chars: int = 80) -> List[str]:
    """Découpe un texte en segments synthétisables, dans l'ordre de lecture.

    Chaque segment reste sous `max_chars` : au-delà, la synthèse d'un seul
    morceau redevient longue et l'intérêt du streaming disparaît. La coupe
    cherche d'abord une fin de phrase, puis une virgule, et n'ampute un mot
    qu'en dernier recours.

    `min_chars` évite l'excès inverse : une suite de phrases très courtes
    deviendrait une rafale d'appels réseau. Le premier segment échappe au
    regroupement, puisque c'est lui qui fixe le délai avant le premier son.
    """
    raw = (text or "").strip()
    if not raw:
        return []

    def _split_long(chunk: str) -> List[str]:
        if len(chunk) <= max_chars:
            return [chunk]
        parts: List[str] = []
        for piece in _SOFT_BREAK.split(chunk):
            piece = piece.strip()
            if not piece:
                continue
            if len(piece) <= max_chars:
                parts.append(piece)
                continue
            # Toujours trop long : couper sur le dernier espace avant la limite.
            while len(piece) > max_chars:
                cut = piece.rfind(" ", 0, max_chars)
                if cut <= 0:
                    cut = max_chars
                parts.append(piece[:cut].strip())
                piece = piece[cut:].strip()
            if piece:
                parts.append(piece)
        return parts

    pieces: List[str] = []
    for sentence in _SENTENCE_END.split(raw):
        sentence = (sentence or "").strip()
        if not sentence:
            continue
        pieces.extend(p for p in _split_long(sentence) if p)

    # Regroupement. Sans lui, « Aywa. Tamaam. Chukran. » déclencherait trois
    # appels de synthèse pour trois mots : le coût par appel dépasse largement
    # le gain de latence. On regroupe donc jusqu'à `min_chars`, SAUF pour le
    # premier segment — c'est lui qui détermine le délai avant le premier son,
    # et on le veut le plus court possible.
    out: List[str] = []
    for piece in pieces:
        if (
            out
            and len(out) >= 1
            and len(out[-1]) < min_chars
            and len(out[-1]) + 1 + len(piece) <= max_chars
            and len(out) > 1
        ):
            out[-1] = f"{out[-1]} {piece}"
        else:
            out.append(piece)
    return out


async def synthesize_stream(
    text: str,
    language: str = "fr",
    voice: Optional[str] = None,
    *,
    max_chars: int = 240,
    lookahead: int = 3,
    prefer_voxcpm: bool = False,
    voxcpm_control: Optional[str] = None,
    voxcpm_ref_wav: Optional[str] = None,
):
    """Produit (index, segment_texte, audio_bytes, mime) au fil de la synthèse.

    En Toumaï Voice V1, le flux est Zenaba Chatterbox français/arabe et
    fail-closed :
    un segment qui échoue interrompt la lecture au lieu de créer un trou audio
    invisible que l'interface pourrait prendre pour un succès.
    """
    settings = get_settings()

    if settings.toumai_voice_v1_enabled:
        requested_voice = (voice or "").strip().lower()
        if requested_voice not in {"", "default", "auto", ZENABA_VOICE_ID}:
            raise TtsProviderError(
                "chatterbox",
                "Zenaba est l'unique voix disponible dans Toumaï Voice V1.",
                422,
            )
        # Avant le DÉCOUPAGE : la conversion d'arabe tchadien translittéré et
        # les corrections françaises doivent rester stables entre segments.
        spoken, language = _prepare_voice_v1_text(text, language)
        voice = ZENABA_VOICE_ID
        prefer_voxcpm = False
        voxcpm_control = None
        voxcpm_ref_wav = None
        max_chars = min(max(80, max_chars), 320)
        # UN SEUL GPU EN FACE, DONC UNE SEULE GÉNÉRATION À LA FOIS.
        lookahead = 1
    else:
        # Ancien pipeline : conserver les corrections historiques.
        text = prononciation.pour_la_voix(text)
        spoken, language, voice, prefer_voxcpm, voxcpm_control, voxcpm_ref_wav = (
            apply_chadian_arabic(
                text, language, voice, prefer_voxcpm, voxcpm_control, voxcpm_ref_wav
            )
        )

    segments = split_sentences(spoken, max_chars=max_chars)
    if not segments:
        return

    async def _one(seg: str) -> Tuple[bytes, str]:
        return await synthesize(
            seg,
            language,
            voice,
            prefer_voxcpm=prefer_voxcpm,
            voxcpm_control=voxcpm_control,
            voxcpm_ref_wav=voxcpm_ref_wav,
        )

    # Préchargement. Chaque appel au fournisseur porte un coût fixe de
    # connexion de l'ordre de la seconde, bien supérieur au temps de synthèse
    # d'une phrase courte. En lançant les segments suivants pendant que le
    # premier est encore en cours, ce coût n'est payé qu'une fois : la lecture
    # d'un segment couvre la préparation des suivants. L'ordre de livraison
    # reste celui du texte — c'est de la parole, elle ne se réordonne pas.
    pending: List[asyncio.Task] = []
    next_to_launch = 0
    try:
        while next_to_launch < min(lookahead, len(segments)):
            pending.append(asyncio.create_task(_one(segments[next_to_launch])))
            next_to_launch += 1

        for index, segment in enumerate(segments):
            task = pending.pop(0)
            if next_to_launch < len(segments):
                pending.append(asyncio.create_task(_one(segments[next_to_launch])))
                next_to_launch += 1
            try:
                audio, mime = await task
            except Exception as exc:  # noqa: BLE001
                logger.warning("segment %d non synthétisé : %s", index, exc)
                if settings.toumai_voice_v1_enabled:
                    raise
                # Ancien pipeline uniquement : conserver le comportement de
                # compatibilité historique derrière le rollback explicite.
                yield index, segment, b"", ""
                continue
            yield index, segment, audio, mime
    finally:
        for task in pending:
            task.cancel()
