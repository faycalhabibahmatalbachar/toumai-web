"""Voix — transcription Whisper Groq, synthèse TTS."""

import base64
import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import Response, StreamingResponse

from core.config import get_settings
from core.database import get_supabase_admin
from core.deps import get_current_user_id
from core.responses import error_response, success_response
from models.voice import SynthesizeRequest
from models.voice_telemetrie import SessionVocale
from services import (
    cloudflare_ai_service,
    groq_service,
    storage_service,
    tts_service,
    voice_telemetrie_service,
)
from services.usage_service import log_usage

logger = logging.getLogger(__name__)


def _is_table_missing_error(exc: Exception) -> bool:
    """Detect Supabase/PostgREST 'relation does not exist' errors."""
    msg = str(exc).lower()
    return any(k in msg for k in ["does not exist", "42p01", "relation", "undefined table"])

router = APIRouter(prefix="/voice", tags=["voice"])


def _safe_upstream_error_message(exc: httpx.HTTPStatusError) -> str:
    """Return a short/safe message from upstream response body."""
    response = exc.response
    try:
        payload = response.json()
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict):
                msg = err.get("message")
                if isinstance(msg, str) and msg.strip():
                    return msg[:220]
            msg = payload.get("message")
            if isinstance(msg, str) and msg.strip():
                return msg[:220]
    except ValueError:
        pass
    body = (response.text or "").strip()
    return body[:220] if body else "Erreur du service de transcription en amont"


@router.get("/health")
async def voice_health(user_id: str = Depends(get_current_user_id)):
    """État live STT/TTS (Groq + Edge-TTS gratuit / Kokoro / payants)."""
    # user_id injecté pour garder endpoint protégé/authentifié.
    _ = user_id
    settings = get_settings()
    providers = {
        "toumai_voice_v1_enabled": settings.toumai_voice_v1_enabled,
        "toumai_voice_name": settings.toumai_voice_name or "Zenaba",
        "tts_pocket_configured": bool(settings.pocket_tts_url),
        "stt_groq_configured": bool(settings.groq_api_key),
        "stt_deepgram_configured": bool(settings.deepgram_api_key),
        "tts_edge_enabled": settings.edge_tts_enabled,
        "tts_openai_configured": bool(settings.openai_api_key),
        "tts_elevenlabs_configured": bool(settings.elevenlabs_api_key),
        "tts_kokoro_configured": bool(settings.kokoro_tts_url),
        "tts_cartesia_configured": bool(settings.cartesia_api_key),
        "tts_gemini_configured": bool(settings.gemini_api_key),
        "tts_provider_priority": (settings.tts_provider_priority or "").strip(),
    }
    zenaba: dict = {}
    try:
        zenaba = await tts_service.pocket_health_check()
    except Exception as e:
        zenaba = {
            "ok": False,
            "configured": bool(settings.pocket_tts_url),
            "voice": settings.toumai_voice_name or "Zenaba",
            "engine": tts_service.POCKET_ENGINE_ID,
            "reference": tts_service.POCKET_REFERENCE_ID,
            "error": str(e),
        }
    if settings.toumai_voice_v1_enabled:
        # Aucun appel réseau vers un ancien moteur en Voice V1. Un diagnostic
        # ne doit ni consommer un quota payant ni laisser croire qu'un fallback
        # pourrait prendre la main sur Zenaba.
        disabled = {"ok": False, "disabled_by_voice_v1": True}
        edge_block: dict = dict(disabled)
        eleven: dict = dict(disabled)
        openai_tts: dict = dict(disabled)
        voxcpm_block: dict = dict(disabled)
        gemini_tts: dict = dict(disabled)
        cartesia: dict = dict(disabled)
    else:
        edge_block = {}
        try:
            edge_block = await tts_service.edge_tts_health_check()
        except Exception as e:
            edge_block = {"ok": False, "enabled": settings.edge_tts_enabled, "error": str(e)}

        eleven = {}
        try:
            eleven = await tts_service.elevenlabs_health_check()
        except Exception as e:
            eleven = {
                "ok": False,
                "configured": providers["tts_elevenlabs_configured"],
                "error": str(e),
            }

        openai_tts = {}
        try:
            openai_tts = await tts_service.openai_tts_health_check()
        except Exception as e:
            openai_tts = {
                "ok": False,
                "configured": providers["tts_openai_configured"],
                "error": str(e),
            }

        voxcpm_block = {}
        try:
            voxcpm_block = await tts_service.voxcpm_health_check()
        except Exception as e:
            voxcpm_block = {
                "ok": False,
                "configured": bool(settings.voxcpm_hf_space_url),
                "error": str(e),
            }

        gemini_tts = {}
        try:
            gemini_tts = await tts_service.gemini_tts_health_check()
        except Exception as e:
            gemini_tts = {
                "ok": False,
                "configured": bool(settings.gemini_api_key),
                "error": str(e),
            }

        cartesia = {}
        try:
            cartesia = await tts_service.cartesia_health_check()
        except Exception as e:
            cartesia = {
                "ok": False,
                "configured": bool(settings.cartesia_api_key),
                "error": str(e),
            }
    pub = settings.r2_public_base
    storage = {
        "r2_client_configured": storage_service.is_r2_client_configured(),
        "r2_public_https_configured": pub.startswith("https://"),
        "r2_public_url_set": bool(pub),
        "note": "Pour l’app secrétariat (historique audio), définir R2_PUBLIC_URL en https "
        "sinon /files/upload peut renvoyer local:// ou r2:// — non lisible côté mobile.",
    }
    if settings.toumai_voice_v1_enabled:
        tts_operational = bool(zenaba.get("ok"))
    else:
        tts_operational = bool(
            gemini_tts.get("ok")
            or cartesia.get("ok")
            or edge_block.get("ok")
            or openai_tts.get("ok")
            or eleven.get("ok")
            or providers["tts_kokoro_configured"]
            or voxcpm_block.get("ok")
        )
    return success_response(
        {
            "providers": {
                **providers,
                "tts_voxcpm_configured": bool(settings.voxcpm_hf_space_url),
            },
            "toumai_voice": zenaba,
            "edge_tts": edge_block,
            "openai_tts": openai_tts,
            "elevenlabs": eleven,
            "voxcpm": voxcpm_block,
            "gemini_tts": gemini_tts,
            "cartesia": cartesia,
            "storage": storage,
            "tts_operational": tts_operational,
        },
        "Voice health OK",
    )


@router.post("/transcribe")
async def transcribe(
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    user_id: str = Depends(get_current_user_id),
):
    """Audio → texte (Groq Whisper). Formats : webm, mp3, wav, m4a."""
    source = file or audio
    if source is None:
        return error_response("Champ audio manquant (file)", 422)
    raw = await source.read()
    if not raw:
        return error_response("Fichier audio vide", 400)
    if len(raw) > 25 * 1024 * 1024:
        return error_response("Fichier trop volumineux (max ~25 Mo)", 400)
    # Si l'utilisateur a réglé Toumaï sur l'arabe tchadien, on le dit à
    # Whisper. Sans indication il devine la langue, et sur un dialecte qu'il ne
    # connaît pas il se trompe régulièrement de langue entière.
    asr_language: Optional[str] = None
    asr_prompt: Optional[str] = None
    try:
        from routers.preferences import get_preferences

        prefs = await get_preferences(user_id)
        if (prefs.get("ai_language") or "") == "ar_td":
            asr_language = "ar"
            asr_prompt = groq_service.CHADIAN_ASR_PROMPT
    except Exception as exc:  # noqa: BLE001
        logger.warning("préférence de langue ignorée pour la transcription : %s", exc)

    async def _secours(motif: str):
        """Cloudflare Whisper quand Groq ne répond pas.

        POURQUOI UN SECOURS ICI PLUS QU'AILLEURS
        ----------------------------------------
        Un message vocal est déjà parlé quand la transcription échoue. Rendre
        une erreur, c'est demander à quelqu'un de répéter ce qu'il vient de
        dire — et à l'oral, contrairement au texte, il n'y a rien à recopier :
        la phrase est perdue.

        Whisper des deux côtés, sur deux comptes qui n'ont rien en commun.
        """
        texte = await cloudflare_ai_service.transcribe(raw)
        if not texte:
            return None
        logger.info("secours_cloudflare_whisper a servi (%s)", motif)
        return texte

    _via_secours = False
    try:
        data = await groq_service.transcribe_audio(
            raw,
            source.filename or "audio.webm",
            source.content_type,
            language=asr_language,
            prompt=asr_prompt,
        )
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if 400 <= status < 500:
            # 4xx = la demande est fautive (format, taille, clé). Un second
            # service échouerait de la même façon : on ne masque pas un défaut
            # de notre côté derrière un repli.
            return error_response(
                f"Requête de transcription invalide: {_safe_upstream_error_message(e)}",
                400,
            )
        texte = await _secours(f"HTTP {status}")
        if texte is None:
            return error_response("Service de transcription indisponible", 502)
        data, _via_secours = {"text": texte}, True
    except httpx.TimeoutException:
        texte = await _secours("délai dépassé")
        if texte is None:
            return error_response("Délai dépassé côté service de transcription", 504)
        data, _via_secours = {"text": texte}, True
    except httpx.RequestError:
        texte = await _secours("injoignable")
        if texte is None:
            return error_response("Impossible de joindre le service de transcription", 502)
        data, _via_secours = {"text": texte}, True
    except Exception as e:
        texte = await _secours(type(e).__name__)
        if texte is None:
            return error_response(f"Erreur transcription: {e}", 502)
        data, _via_secours = {"text": texte}, True
    text = data.get("text") or ""
    lang = data.get("language")
    duration = None
    if isinstance(data.get("segments"), list) and data["segments"]:
        try:
            duration = float(data["segments"][-1].get("end") or 0)
        except Exception:
            duration = None
    await log_usage(
        user_id,
        "/voice/transcribe",
        None,
        cloudflare_ai_service.MODELE_STT if _via_secours else groq_service.WHISPER_MODEL,
    )
    return success_response(
        {"text": text, "language": lang, "duration": duration},
        "Transcription OK",
    )


@router.post("/metrics")
async def enregistrer_metriques(
    session: SessionVocale,
    user_id: str = Depends(get_current_user_id),
):
    """Recoit la telemetrie d'UNE session vocale, a sa fermeture.

    POURQUOI CETTE ROUTE EXISTE
    ---------------------------
    Le mode vocal tenait son carnet de bord dans un fichier local du telephone.
    On savait donc deboguer un appareil qu'on tient en main, et rien d'autre :
    ni la latence reelle des utilisateurs, ni le taux de coupure, ni les
    reconnexions, ni les micros refuses. Aucune amelioration de latence ne
    pouvait etre jugee autrement qu'a l'oreille, sur un seul telephone.

    CE QU'ELLE N'ACCEPTE PAS
    ------------------------
    Aucun audio, aucune transcription, aucun texte de conversation. Le schema
    refuse tout champ inconnu (`extra="forbid"`) : un client qui tenterait
    d'ajouter une transcription recoit une erreur, il ne reussit pas a moitie.

    ELLE REPOND TOUJOURS SUCCES
    ---------------------------
    Une mesure ne doit jamais casser ce qu'elle mesure. Si la base est
    indisponible, la session de l'utilisateur — deja terminee — ne doit pas en
    souffrir, et le telephone ne doit pas se mettre a reessayer d'envoyer les
    mesures d'une conversation finie. Le contrat est donc « j'ai recu », pas
    « j'ai enregistre ».
    """
    session_id = voice_telemetrie_service.enregistrer(session, user_id)
    return success_response(
        {"session_id": session_id, "tours": len(session.tours)},
        "Mesures recues",
    )


@router.get("/chadian-profiles")
async def chadian_profiles(user_id: str = Depends(get_current_user_id)):
    """Profils de voix pour l'arabe tchadien.

    Aucune voix `ar-TD` n'existe : on emprunte la phonologie la plus proche.
    Le choix se fait à l'oreille, ces profils sont donc exposés au client.
    """
    from services import chadian_tts_service

    return success_response(
        {
            "profiles": chadian_tts_service.list_profiles(),
            "default": chadian_tts_service.DEFAULT_PROFILE,
            "note": "Aucune voix tchadienne (ar-TD) ni soudanaise (ar-SD) "
                    "n'existe en synthèse. Ces profils empruntent la voix dont "
                    "la prononciation se rapproche le plus.",
        },
        "OK",
    )


@router.post("/synthesize")
async def synthesize(
    body: SynthesizeRequest,
    user_id: str = Depends(get_current_user_id),
    raw: bool = False,
    prefer_voxcpm: bool = False,
    voxcpm_control: Optional[str] = None,
):
    """Texte → audio.

    En Voice V1, Zenaba/Pocket TTS french_24l est l'unique moteur français.
    Les anciens fournisseurs ne servent qu'au rollback explicite lorsque
    Voice V1 est coupé.
    """
    logger.info(
        "sayibi_voice_synthesize user=%s raw=%s text_len=%s voice=%s prefer_voxcpm=%s",
        user_id[:8] if user_id else "",
        raw,
        len(body.text or ""),
        (body.voice or "")[:32],
        prefer_voxcpm,
    )
    try:
        audio, mime = await tts_service.synthesize(
            body.text,
            body.language,
            body.voice,
            prefer_kokoro=False,
            prefer_voxcpm=prefer_voxcpm,
            voxcpm_control=voxcpm_control,
        )
    except tts_service.TtsProviderError as e:
        return error_response(str(e), e.status_code or 502)
    except Exception as e:
        msg = str(e)
        if (
            "ElevenLabs" in msg
            or "ELEVENLABS" in msg
            or "OpenAI" in msg
            or "OPENAI_API_KEY" in msg
        ):
            return error_response(msg, 502)
        if "Aucun service TTS opérationnel" in msg:
            return error_response(msg, 503)
        return error_response(msg, 502)
    await log_usage(user_id, "/voice/synthesize", len(body.text), "tts")
    logger.info(
        "sayibi_voice_synthesize_ok user=%s bytes=%s mime=%s raw=%s",
        user_id[:8] if user_id else "",
        len(audio) if audio else 0,
        mime,
        raw,
    )
    if raw:
        return Response(content=audio, media_type=mime)
    b64 = base64.standard_b64encode(audio).decode("ascii")
    return success_response(
        {"audio_base64": b64, "mime_type": mime},
        "Synthèse OK",
    )


@router.post("/synthesize/live")
async def synthesize_live(
    body: SynthesizeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Zenaba en vrai streaming WAV Pocket TTS.

    Contrairement au flux NDJSON historique, cette route ne met pas une phrase
    WAV complète en base64. Elle relaie immédiatement les chunks PCM/WAV Pocket
    au navigateur. Le premier en-tête est validé avant d'envoyer la réponse.
    """
    stream = tts_service.stream_zenaba_live(
        body.text,
        body.language,
        body.voice,
    )
    try:
        # httpx/proxy peut fragmenter même les 12 premiers octets. On accumule
        # juste assez pour valider RIFF/WAVE sans jamais bufferiser l'audio.
        prefix = bytearray()
        while len(prefix) < 12:
            prefix.extend(await stream.__anext__())
    except StopAsyncIteration:
        await stream.aclose()
        return error_response("Zenaba n’a produit aucun audio", 502)
    except tts_service.TtsProviderError as e:
        await stream.aclose()
        return error_response(str(e), e.status_code or 502)
    except Exception as e:  # noqa: BLE001
        await stream.aclose()
        return error_response(f"Zenaba indisponible : {e}", 502)

    if bytes(prefix[:4]) != b"RIFF" or bytes(prefix[8:12]) != b"WAVE":
        await stream.aclose()
        return error_response("Zenaba a renvoyé un flux WAV invalide", 502)

    first = bytes(prefix)
    await log_usage(user_id, "/voice/synthesize/live", len(body.text or ""), "tts")

    async def _wav():
        try:
            yield first
            async for chunk in stream:
                if chunk:
                    yield chunk
        finally:
            # Une fermeture de page, un barge-in ou un AbortController côté
            # navigateur ferme aussi la connexion Pocket TTS amont.
            await stream.aclose()

    return StreamingResponse(
        _wav(),
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
            "Content-Disposition": 'inline; filename="zenaba.wav"',
            "X-Toumai-Voice": "Zenaba",
        },
    )


@router.post("/synthesize/stream")
async def synthesize_stream(
    body: SynthesizeRequest,
    user_id: str = Depends(get_current_user_id),
    format: str = "ndjson",
    max_chars: int = 240,
    prefer_voxcpm: bool = False,
):
    """Texte → audio diffusé phrase par phrase, pour une réponse vocale immédiate.

    `/voice/synthesize` ne rend la main qu'une fois la totalité du texte
    synthétisée : sur une longue réponse, l'utilisateur attend en silence. Ici
    chaque phrase part dès qu'elle est prête, et le délai avant le premier son
    ne dépend plus que de la première phrase.

    - `format=ndjson` (défaut) : une ligne JSON par segment
      `{"index", "text", "mime_type", "audio_base64"}`. Fonctionne avec tous
      les fournisseurs, y compris ceux qui renvoient du WAV.
    - `format=mpeg` : flux `audio/mpeg` continu, directement jouable. Exige un
      fournisseur qui renvoie du MP3 ; sinon la requête est refusée avec une
      explication plutôt que de produire un fichier illisible.
    """
    fmt = (format or "ndjson").lower()
    if fmt not in {"ndjson", "mpeg"}:
        return error_response("format doit valoir 'ndjson' ou 'mpeg'", 422)

    stream = tts_service.synthesize_stream(
        body.text,
        body.language,
        body.voice,
        max_chars=max_chars,
        prefer_voxcpm=prefer_voxcpm,
    )

    # Le premier segment est synthétisé tout de suite : il donne le mime réel
    # du flux, et c'est lui qui porte la latence perçue.
    try:
        first = await stream.__anext__()
    except StopAsyncIteration:
        return error_response("Texte vide après découpage", 400)
    except tts_service.TtsProviderError as e:
        return error_response(str(e), e.status_code or 502)
    except Exception as e:  # noqa: BLE001
        return error_response(f"Synthèse indisponible : {e}", 502)

    await log_usage(user_id, "/voice/synthesize/stream", len(body.text or ""), "tts")

    if fmt == "mpeg":
        _, _, audio0, mime0 = first
        if mime0 != "audio/mpeg":
            await stream.aclose()
            return error_response(
                f"Le fournisseur actif renvoie « {mime0 or 'aucun audio'} » : "
                "un flux MPEG continu n'est pas possible. Utiliser format=ndjson.",
                409,
            )

        async def _binary():
            yield audio0
            async for _idx, _seg, audio, mime in stream:
                # Concaténer un conteneur différent produirait un fichier
                # corrompu : on saute le segment et on le signale.
                if audio and mime == "audio/mpeg":
                    yield audio
                elif audio:
                    logger.warning(
                        "segment ignoré dans le flux mpeg (mime=%s)", mime
                    )

        return StreamingResponse(
            _binary(),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    async def _ndjson():
        def line(index: int, text: str, audio: bytes, mime: str) -> bytes:
            payload = {
                "index": index,
                "text": text,
                "mime_type": mime,
                "audio_base64": (
                    base64.standard_b64encode(audio).decode("ascii") if audio else ""
                ),
            }
            return (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")

        yield line(*first)
        try:
            async for index, segment, audio, mime in stream:
                yield line(index, segment, audio, mime)
        except Exception as exc:  # noqa: BLE001
            logger.warning("voice stream interrupted after first segment: %s", exc)
            payload = {
                "error": str(exc),
                "mime_type": "",
                "audio_base64": "",
            }
            yield (json.dumps(payload, ensure_ascii=False) + "\n").encode("utf-8")

    return StreamingResponse(
        _ndjson(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.post("/voxcpm/clone")
async def voxcpm_clone(
    text: str,
    ref_audio: UploadFile = File(...),
    control: Optional[str] = None,
    raw: bool = False,
    user_id: str = Depends(get_current_user_id),
):
    """Voice Clone VoxCPM2 : envoyer un audio de référence (5-30s) → ChadGPT répond dans cette voix.
    text : le texte à synthétiser.
    ref_audio : fichier audio de référence (wav, mp3, m4a…).
    control : instruction additionnelle (ex: 'parler plus lentement').
    """
    import tempfile
    import os

    raw_ref = await ref_audio.read()
    if not raw_ref:
        return error_response("Fichier audio de référence vide", 400)
    if len(raw_ref) > 10 * 1024 * 1024:
        return error_response("Fichier de référence trop grand (max 10 Mo)", 400)

    # Sauvegarde temporaire car gradio_client prend un chemin fichier
    suffix = os.path.splitext(ref_audio.filename or "ref.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw_ref)
        tmp_path = tmp.name

    try:
        audio, mime = await tts_service.synthesize(
            text,
            prefer_voxcpm=True,
            voxcpm_control=control or "",
            voxcpm_ref_wav=tmp_path,
        )
    except Exception as e:
        return error_response(f"VoxCPM clone error: {e}", 502)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    await log_usage(user_id, "/voice/voxcpm/clone", len(text), "voxcpm")
    if raw:
        return Response(content=audio, media_type=mime)
    b64 = base64.standard_b64encode(audio).decode("ascii")
    return success_response({"audio_base64": b64, "mime_type": mime}, "Voice Clone OK")


@router.post("/voxcpm/design")
async def voxcpm_design(
    body: SynthesizeRequest,
    control: str = "homme tchadien, voix chaleureuse et professionnelle",
    raw: bool = False,
    user_id: str = Depends(get_current_user_id),
):
    """Voice Design VoxCPM2 : créer une voix unique depuis une description texte.
    control : description de la voix (ex: 'femme douce, 30 ans, ton calme, légèrement formel').
    Aucun audio de référence requis — purement génératif.
    """
    try:
        audio, mime = await tts_service.synthesize(
            body.text,
            body.language,
            prefer_voxcpm=True,
            voxcpm_control=control,
        )
    except Exception as e:
        return error_response(f"VoxCPM design error: {e}", 502)

    await log_usage(user_id, "/voice/voxcpm/design", len(body.text), "voxcpm")
    if raw:
        return Response(content=audio, media_type=mime)
    b64 = base64.standard_b64encode(audio).decode("ascii")
    return success_response({"audio_base64": b64, "mime_type": mime, "control": control}, "Voice Design OK")


@router.get("/call-log")
async def get_call_log(
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
):
    """Historique des appels gérés par le secrétariat vocal."""
    try:
        c = get_supabase_admin()
        if not c:
            return success_response([], "OK")
        res = (
            c.table("inbound_calls")
            .select(
                "id,caller_phone,caller_name,call_timestamp,call_duration_seconds,"
                "summary,transcription,sentiment,urgency_level,user_read,recording_url"
            )
            .eq("user_id", user_id)
            .order("call_timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return success_response(res.data or [], "OK")
    except Exception as e:
        if _is_table_missing_error(e):
            logger.warning("inbound_calls table not yet migrated: %s", e)
            return success_response([], "OK — table pending migration")
        return error_response(str(e), 500)


@router.post("/sms/inbound")
async def inbound_sms_webhook(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """
    Reçoit un SMS entrant depuis le bridge Flutter natif.
    Stocke et analyse avec LLM. Retourne une réponse automatique si configurée.
    """
    try:
        import uuid
        phone = payload.get("phone", "")
        body = payload.get("body", "")
        c = get_supabase_admin()
        auto_reply = None
        if c:
            try:
                c.table("sms_log").insert({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "direction": "inbound",
                    "phone_number": phone,
                    "body": body,
                    "ai_generated": False,
                    "read": False,
                }).execute()
            except Exception as e_ins:
                if not _is_table_missing_error(e_ins):
                    raise
                logger.warning("sms_log table not yet migrated: %s", e_ins)

            try:
                settings_res = c.table("call_settings").select("auto_sms_reply,auto_sms_template").eq("user_id", user_id).execute()
                if settings_res.data and settings_res.data[0].get("auto_sms_reply"):
                    template = settings_res.data[0].get("auto_sms_template", "")
                    auto_reply = {"phone": phone, "body": template}
            except Exception as e_cfg:
                logger.warning("call_settings read failed: %s", e_cfg)

        return success_response(
            {"stored": True, "auto_reply": auto_reply},
            "SMS traité",
        )
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/sms/confirm-sent")
async def confirm_sms_sent(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """Confirme l'envoi d'un SMS depuis Flutter."""
    try:
        c = get_supabase_admin()
        if c:
            try:
                c.table("sms_log").insert({
                    "user_id": user_id,
                    "direction": "outbound",
                    "phone_number": payload.get("phone", ""),
                    "body": payload.get("body", ""),
                    "ai_generated": payload.get("ai_generated", False),
                }).execute()
            except Exception as e_ins:
                if not _is_table_missing_error(e_ins):
                    raise
                logger.warning("sms_log table not yet migrated: %s", e_ins)
        return success_response({"confirmed": True}, "SMS confirmé")
    except Exception as e:
        return error_response(str(e), 500)


@router.get("/sms/history")
async def get_sms_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
):
    """Historique des SMS entrants et sortants."""
    try:
        c = get_supabase_admin()
        if not c:
            return success_response([], "OK")
        res = (
            c.table("sms_log")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return success_response(res.data or [], "OK")
    except Exception as e:
        if _is_table_missing_error(e):
            logger.warning("sms_log table not yet migrated: %s", e)
            return success_response([], "OK — table pending migration")
        return error_response(str(e), 500)
