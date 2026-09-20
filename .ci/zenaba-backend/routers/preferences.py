"""
Préférences utilisateur enrichies : persona AI, voix TTS, thème, notifications.
Inclut aussi le catalogue de voix Edge-TTS gratuites + les logs d'anomalies (admin).
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from core.database import get_supabase_admin_strict
from core.deps import get_current_user_id
from core.responses import error_response, success_response

router = APIRouter(prefix="/preferences", tags=["preferences"])
logger = logging.getLogger(__name__)

_TABLE = "user_preferences"

# Voix Edge-TTS gratuites triées par naturalité (Microsoft Neural TTS, sans clé API).
# Multilingual = qualité supérieure, supporte plusieurs langues naturellement.
VOICE_CATALOG: List[Dict[str, Any]] = [
    # ── Français ──────────────────────────────────────────────────────────────
    {
        "id": "fr-FR-VivienneMultilingualNeural",
        "label": "Vivienne (FR Multilingue)",
        "lang": "fr",
        "gender": "female",
        "quality": "premium",
        "recommended": True,
        "desc": "Chaleureuse et expressive",
        "free": True,
        "sample": "Bonjour, je suis votre assistante IA Toumaï AI.",
    },
    {
        "id": "fr-FR-RemyMultilingualNeural",
        "label": "Rémy (FR Multilingue)",
        "lang": "fr",
        "gender": "male",
        "quality": "premium",
        "desc": "Posé et rassurant",
        "free": True,
        "sample": "Bonjour, je suis votre assistant IA Toumaï AI.",
    },
    {
        "id": "fr-FR-DeniseNeural",
        "label": "Denise (FR)",
        "lang": "fr",
        "gender": "female",
        "quality": "standard",
        "desc": "Claire et professionnelle",
        "free": True,
        "sample": "Bonjour, comment puis-je vous aider aujourd'hui ?",
    },
    {
        "id": "fr-FR-HenriNeural",
        "label": "Henri (FR)",
        "lang": "fr",
        "gender": "male",
        "quality": "standard",
        "desc": "Direct et posé",
        "free": True,
        "sample": "Bonjour, je suis à votre service.",
    },
    {
        "id": "fr-FR-EloiseNeural",
        "label": "Éloïse (FR)",
        "lang": "fr",
        "gender": "female",
        "quality": "standard",
        "desc": "Jeune et dynamique",
        "free": True,
        "sample": "Salut, qu'est-ce que je peux faire pour toi ?",
    },
    # ── Arabe tchadien (shuwa) ────────────────────────────────────────────────
    # Aucune voix `ar-TD` n'existe chez aucun fournisseur. Ces entrées ne
    # désignent donc pas une voix mais un PROFIL : une voix arabe empruntée,
    # associée à la graphie qui lui fait produire les sons du tchadien (voir
    # services/chadian_tts_service.py). L'identifiant reste stable côté client
    # même si la voix empruntée derrière change.
    # Les extraits sont en translittération latine, comme les réponses de
    # Toumaï : ils passent par la même conversion que la vraie synthèse, donc
    # ce qu'on entend à l'aperçu est ce qu'on entendra à l'usage.
    {
        "id": "shu:saoudien",
        "label": "Toumaï — arabe tchadien",
        "lang": "ar_td",
        "gender": "female",
        "quality": "premium",
        "recommended": True,
        "desc": "Registre des médias, celui auquel l'oreille tchadienne est habituée",
        "free": True,
        "sample": "Salaam aleekum, ana Toumaï. Kef halak al-yoom?",
    },
    {
        "id": "shu:egyptien",
        "label": "Salma — arabe tchadien",
        "lang": "ar_td",
        "gender": "female",
        "quality": "standard",
        "desc": "Restitue le /g/ tchadien (« gaal »), avec un fond d'accent cairote",
        "free": True,
        "sample": "Al-yoom fi l-suug fi filfil wa tamur wa sukkar rakhiis.",
    },
    {
        "id": "shu:egyptien_h",
        "label": "Chakir — arabe tchadien",
        "lang": "ar_td",
        "gender": "male",
        "quality": "standard",
        "desc": "Voix masculine, même prononciation du /g/",
        "free": True,
        "sample": "Salaam aleekum ya sadiig, ana gaaʼid nisaaʼidak.",
    },
    {
        "id": "shu:libyen",
        "label": "Iman — arabe tchadien",
        "lang": "ar_td",
        "gender": "female",
        "quality": "standard",
        "desc": "Garde la distinction g / j, au prix d'un accent maghrébin",
        "free": True,
        "sample": "Khalli nabda. Chunu al-daroori leek al-yoom?",
    },
    # ── Arabe ─────────────────────────────────────────────────────────────────
    {
        "id": "ar-EG-SalmaNeural",
        "label": "سلمى (AR Égypte)",
        "lang": "ar",
        "gender": "female",
        "quality": "premium",
        "recommended": True,
        "desc": "Chaleureuse et expressive",
        "free": True,
        "sample": "مرحباً، أنا مساعدتك الذكية.",
    },
    {
        "id": "ar-EG-ShakirNeural",
        "label": "شاكر (AR Égypte)",
        "lang": "ar",
        "gender": "male",
        "quality": "standard",
        "desc": "Direct et posé",
        "free": True,
        "sample": "مرحباً، كيف يمكنني مساعدتك؟",
    },
    {
        "id": "ar-SA-ZariyahNeural",
        "label": "زارية (AR Arabie Saoudite)",
        "lang": "ar",
        "gender": "female",
        "quality": "standard",
        "desc": "Douce et posée",
        "free": True,
        "sample": "السلام عليكم، كيف حالك؟",
    },
    {
        "id": "ar-TN-ReemNeural",
        "label": "ريم (AR Tunisie)",
        "lang": "ar",
        "gender": "female",
        "quality": "standard",
        "desc": "Vive et naturelle",
        "free": True,
        "sample": "أهلاً وسهلاً!",
    },
    # ── Anglais ───────────────────────────────────────────────────────────────
    {
        "id": "en-US-AriaNeural",
        "label": "Aria (EN US)",
        "lang": "en",
        "gender": "female",
        "quality": "premium",
        "recommended": True,
        "desc": "Warm and expressive",
        "free": True,
        "sample": "Hello! I'm your AI assistant, how can I help?",
    },
    {
        "id": "en-US-AndrewMultilingualNeural",
        "label": "Andrew (EN Multilingue)",
        "lang": "en",
        "gender": "male",
        "quality": "premium",
        "desc": "Calm and reassuring",
        "free": True,
        "sample": "Hello, I'm here to assist you.",
    },
    {
        "id": "en-GB-SoniaNeural",
        "label": "Sonia (EN UK)",
        "lang": "en",
        "gender": "female",
        "quality": "standard",
        "desc": "Clear British accent",
        "free": True,
        "sample": "Good day, how may I assist you?",
    },
]

# Langues de réponse proposées. La clé est ce qu'on enregistre, la valeur ce
# qu'on écrit au modèle : « Réponds TOUJOURS en fr » est ambigu pour un LLM,
# « en français » ne l'est pas.
AI_LANGUAGES: Dict[str, str] = {
    "auto": "",
    "fr": "en français",
    "en": "en anglais",
    "ar": "en arabe littéraire",
    # L'arabe tchadien s'écrit en translittération latine dans tout le corpus :
    # sans cette précision le modèle répond en écriture arabe, et le lecteur
    # tchadien ne s'y retrouve pas.
    "ar_td": "en arabe tchadien (le dialecte parlé au Tchad), en translittération latine",
}

# Précisions ajoutées APRÈS la consigne principale. Insérées dans le libellé,
# elles se retrouvaient coupées par le « par défaut » qui suit.
_PRECISIONS: Dict[str, str] = {
    "ar_td": " N'emploie pas l'arabe littéraire des manuels.",
}


def language_instruction(code: Optional[str]) -> str:
    """Consigne de langue à ajouter au prompt système, vide si « auto ».

    La préférence est un DÉFAUT, jamais un verrou. Écrire « réponds TOUJOURS
    en français » à quelqu'un qui pose sa question en arabe tchadien produit
    une réponse à côté — l'utilisateur y voit un bug, pas un réglage.

    Ce n'est pas théorique : 10 des 12 comptes portent `ai_language = "fr"`
    avec le ton par défaut, valeur posée à l'inscription et jamais choisie.
    Tant que le chat ignorait ce champ, personne ne s'en apercevait ; le jour
    où il l'a lu, ces comptes se sont retrouvés verrouillés sur une langue
    qu'ils n'avaient pas demandée — et le compte réglé sur « ar » a répondu
    en arabe à tout, y compris aux messages français.
    """
    cle = (code or "auto").strip()
    label = AI_LANGUAGES.get(cle)
    if not label:
        return ""
    return (
        f" Réponds {label} par défaut. Si l'utilisateur écrit dans une autre "
        "langue, réponds dans la sienne." + _PRECISIONS.get(cle, "")
    )


_ALLOWED_FIELDS = {
    # "ai_name" volontairement absent : l'identité de l'assistant est fixe
    # (Toumaï AI) et non modifiable par l'utilisateur.
    "ai_tone", "ai_language", "ai_persona",
    "tts_voice", "tts_speed",
    "theme", "accent_color", "font_size",
    "notif_wa", "notif_calendar", "notif_suggestions",
    "timezone",
    # LA MÉMOIRE SE COUPE, ET C'EST UN DROIT.
    #
    # Toumaï AI retenait des faits sans que personne ne puisse dire non. Le
    # bouton existe désormais, et il agit VRAIMENT : quand il est éteint,
    # `memory_service` n'extrait plus rien et n'injecte plus rien. Un
    # interrupteur qui ne coupe pas serait pire que pas d'interrupteur.
    "memory_enabled",
    # Réglés depuis la page Mémoire (migration 080) : niveau et sources.
    "memory_level",
    "memory_source_conversations",
    "memory_source_whatsapp",
}


def _db():
    return get_supabase_admin_strict()


async def get_preferences(user_id: str) -> Dict[str, Any]:
    """Retourne les préférences utilisateur (défauts si pas encore configuré)."""
    c = _db()
    if not c:
        return _defaults(user_id)
    try:
        res = c.table(_TABLE).select("*").eq("user_id", user_id).limit(1).execute()
        if res.data:
            row = res.data[0]
            # L'identité de l'assistant est fixe et non modifiable : toute
            # valeur historique (ChadGPT, nom personnalisé…) est écrasée.
            row["ai_name"] = "Toumaï AI"
            # Toumaï Voice V1 n'expose qu'une seule identité vocale.
            # Toute préférence historique (Vivienne, ElevenLabs, arabe, etc.)
            # est neutralisée à la lecture afin qu'aucun ancien compte ne
            # réactive une autre voix par accident.
            row["tts_voice"] = "zenaba"
            return row
    except Exception as exc:
        logger.debug("get_preferences: %s", exc)
    return _defaults(user_id)


def _defaults(user_id: str) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "ai_name": "Toumaï AI",
        "ai_tone": "friendly",
        "ai_language": "auto",
        "ai_persona": "",
        "tts_voice": "zenaba",
        "tts_speed": 1.0,
        "theme": "dark",
        "accent_color": "#6C63FF",
        "font_size": "medium",
        "notif_wa": True,
        "notif_calendar": True,
        "notif_suggestions": True,
        "timezone": "Africa/Ndjamena",
        # Activée par défaut : c'est ce qui rend l'assistant utile d'une
        # conversation à l'autre. Mais elle se coupe en un geste, et la page
        # dit exactement ce qu'elle retient.
        "memory_enabled": True,
        "memory_level": "balanced",
        "memory_source_conversations": True,
        "memory_source_whatsapp": True,
    }


class PreferencesBody(BaseModel):
    ai_name: Optional[str] = Field(None, max_length=50)
    ai_tone: Optional[str] = Field(None, pattern="^(friendly|professional|casual|concise)$")
    # Restreint aux langues réellement gérées : une valeur libre s'enregistrait
    # sans effet, et l'utilisateur croyait avoir choisi.
    ai_language: Optional[str] = Field(None, pattern="^(auto|fr|en|ar|ar_td)$")
    ai_persona: Optional[str] = Field(None, max_length=2000)
    tts_voice: Optional[str] = Field(None, pattern="^zenaba$")
    tts_speed: Optional[float] = Field(None, ge=0.5, le=2.0)
    theme: Optional[str] = Field(None, pattern="^(dark|light|system)$")
    accent_color: Optional[str] = Field(None, max_length=20)
    font_size: Optional[str] = Field(None, pattern="^(small|medium|large)$")
    notif_wa: Optional[bool] = None
    notif_calendar: Optional[bool] = None
    notif_suggestions: Optional[bool] = None
    timezone: Optional[str] = Field(None, max_length=60)
    memory_enabled: Optional[bool] = None
    memory_level: Optional[str] = Field(None, pattern="^(minimal|balanced|advanced)$")
    memory_source_conversations: Optional[bool] = None
    memory_source_whatsapp: Optional[bool] = None


@router.get("")
async def get_prefs(user_id: str = Depends(get_current_user_id)):
    """Récupère toutes les préférences de l'utilisateur."""
    return success_response(await get_preferences(user_id), "OK")


@router.put("")
async def update_prefs(body: PreferencesBody, user_id: str = Depends(get_current_user_id)):
    """Met à jour les préférences (upsert partiel)."""
    c = _db()
    data = {k: v for k, v in body.model_dump().items() if v is not None and k in _ALLOWED_FIELDS}
    if not data:
        return success_response({}, "Rien à mettre à jour")
    if not c:
        return success_response({"user_id": user_id, **data}, "Sauvegardé (sans DB)")
    try:
        c.table(_TABLE).upsert({"user_id": user_id, **data}, on_conflict="user_id").execute()
        if any(k.startswith("memory_") for k in data):
            # Sinon le bloc de mémoire en cache survit 90 s au réglage.
            from services import memory_service

            memory_service.invalidate_memory_block_cache(user_id)
        return success_response({"user_id": user_id, **data}, "Préférences enregistrées")
    except Exception as exc:
        logger.warning("update_prefs: %s", exc)
        return error_response(str(exc), 500)


#: Voix Toumaï V1. Une seule identité publique, aucun fournisseur ni
#: identifiant technique exposé à l'utilisateur.
_ECHANTILLON = (
    "Bonjour Fayçal, comment puis-je vous aider aujourd’hui ? "
    "Je peux lire vos réponses, vos rappels et vos notifications "
    "avec une voix naturelle et agréable."
)


@router.get("/voices")
async def list_voices(lang: Optional[str] = Query(None)):
    """Retourne l'unique voix officielle de Toumaï pour la V1 française."""
    requested = (lang or "fr").strip().lower()
    if requested not in {"fr", "fr-fr"}:
        return success_response({"voices": [], "count": 0}, "Français uniquement en V1")
    voice = {
        "id": "zenaba",
        "label": "Zenaba",
        "lang": "fr",
        "gender": "female",
        "quality": "official",
        "recommended": True,
        "desc": "Voix officielle de Toumaï · Français",
        "free": True,
        "premium": False,
        "sample": _ECHANTILLON,
    }
    return success_response({"voices": [voice], "count": 1}, "OK")


@router.get("/anomaly-logs")
async def get_anomaly_logs(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=50, ge=1, le=200),
    level: Optional[str] = Query(None),
):
    """Logs d'anomalies de l'utilisateur (pour diagnostic depuis l'app)."""
    c = _db()
    if not c:
        return success_response({"logs": []}, "Sans DB")
    try:
        q = (
            c.table("anomaly_logs")
            .select("id,level,source,tool,path,message,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if level:
            q = q.eq("level", level)
        res = q.execute()
        return success_response({"logs": res.data or [], "count": len(res.data or [])}, "OK")
    except Exception as exc:
        return error_response(str(exc), 500)


# ── Notifications : catégories et heures calmes ─────────────────────────────


class NotificationsBody(BaseModel):
    categories: Optional[Dict[str, bool]] = None
    quiet_hours: Optional[Dict[str, Any]] = None


@router.get("/notifications")
async def get_notifications_prefs(user_id: str = Depends(get_current_user_id)):
    """Toutes les catégories, avec leur valeur réelle et si elles se coupent."""
    from services import notification_preferences as np

    c = _db()
    ligne: Dict[str, Any] = {}
    if c:
        try:
            res = (
                c.table(_TABLE)
                .select("notification_prefs,notif_wa,notif_calendar,notif_suggestions,timezone")
                .eq("user_id", user_id).limit(1).execute()
            )
            ligne = (res.data or [{}])[0] or {}
        except Exception as exc:  # noqa: BLE001
            logger.warning("get_notifications_prefs: %s", exc)
            return error_response("Préférences indisponibles", 500)
    r = np.reglages(ligne)
    return success_response(
        {
            "categories": [
                {"key": cle, "enabled": r["categories"][cle], "locked": verrou}
                for cle, _prefixes, _defaut, verrou in np.CATEGORIES
            ],
            "quiet_hours": r["quiet_hours"],
            "timezone": r["timezone"],
        },
        "OK",
    )


@router.put("/notifications")
async def put_notifications_prefs(
    body: NotificationsBody, user_id: str = Depends(get_current_user_id)
):
    """Enregistre les choix. Les catégories verrouillées ne se coupent pas,
    même si la requête le demande."""
    import re

    from services import notification_preferences as np

    c = _db()
    if not c:
        return error_response("Base non disponible", 503)
    try:
        res = c.table(_TABLE).select("notification_prefs").eq("user_id", user_id).limit(1).execute()
        actuel = dict(((res.data or [{}])[0] or {}).get("notification_prefs") or {})
    except Exception as exc:  # noqa: BLE001
        logger.warning("put_notifications_prefs: lecture %s", exc)
        return error_response("Préférences indisponibles", 500)

    categories = dict(actuel.get("categories") or {})
    connues = {cle: verrou for cle, _p, _d, verrou in np.CATEGORIES}
    for cle, valeur in (body.categories or {}).items():
        if cle not in connues:
            return error_response(f"Catégorie inconnue : {cle}", 400)
        if connues[cle]:
            continue
        categories[cle] = bool(valeur)

    calme = dict(actuel.get("quiet_hours") or {})
    if body.quiet_hours is not None:
        for champ in ("start", "end"):
            if champ in body.quiet_hours:
                v = str(body.quiet_hours[champ])
                if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", v):
                    return error_response("Heure invalide (format HH:MM)", 400)
                calme[champ] = v
        if "enabled" in body.quiet_hours:
            calme["enabled"] = bool(body.quiet_hours["enabled"])

    nouveau = {
        **actuel,
        "categories": categories,
        "quiet_hours": calme,
        # Les canaux multicanaux (push/web/realtime/voice) appartiennent au
        # même document. Modifier une catégorie historique ne doit jamais les
        # effacer.
        "channels": dict(actuel.get("channels") or {}),
    }
    try:
        c.table(_TABLE).upsert(
            {"user_id": user_id, "notification_prefs": nouveau}, on_conflict="user_id"
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("put_notifications_prefs: écriture %s", exc)
        return error_response("Enregistrement impossible", 500)
    np.oublier(user_id)
    return await get_notifications_prefs(user_id=user_id)
