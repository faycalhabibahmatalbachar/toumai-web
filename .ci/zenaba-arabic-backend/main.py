# Production deployment marker: gates E-L + migrations 090-094 rollout 2026-09-18
"""Point d'entrée FastAPI — ChadGpt backend."""

import asyncio
import logging
import os
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from core.config import get_settings
from core.database import supabase_admin_credential_status
from core.database import init_db

_keepalive_log = logging.getLogger("keepalive")


async def _keepalive_loop() -> None:
    """Ping /health toutes les 10 min pour empêcher Render de mettre l'instance en veille."""
    # Render expose RENDER_EXTERNAL_URL automatiquement en production.
    base = (
        os.environ.get("RENDER_EXTERNAL_URL", "").rstrip("/")
        or f"http://localhost:{os.environ.get('PORT', 8000)}"
    )
    url = f"{base}/health"
    await asyncio.sleep(30)  # Attendre le démarrage complet avant le premier ping.
    while True:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.get(url)
            _keepalive_log.debug("keepalive ping → %s %s", url, r.status_code)
        except Exception as exc:
            _keepalive_log.warning("keepalive ping échoué: %s", exc)
        await asyncio.sleep(600)  # 10 minutes


_reminder_log = logging.getLogger("reminders")


async def _reminder_loop() -> None:
    """Vérifie et envoie les rappels WhatsApp toutes les 60 secondes."""
    await asyncio.sleep(45)  # Attendre le démarrage complet
    while True:
        try:
            from services import reminder_service, whatsapp_gateway
            due = await reminder_service.get_due_reminders()
            for rem in due:
                try:
                    await whatsapp_gateway.send_message(
                        rem["user_id"], rem["chat_id"],
                        f"⏰ *Rappel Toumaï AI :* {rem['text']}",
                    )
                    await reminder_service.complete_reminder(rem)
                    _reminder_log.info("reminder sent: %s → %s (recurrence=%s)", rem["id"], rem["chat_id"], rem.get("recurrence"))
                except Exception as exc:
                    _reminder_log.warning("reminder send échoué %s: %s", rem["id"], exc)
        except Exception as exc:
            _reminder_log.warning("reminder_loop: %s", exc)
        await asyncio.sleep(60)


_fb_poll_log = logging.getLogger("sayibi.facebook_poll")


async def _facebook_poll_loop() -> None:
    """Filet de sécurité Facebook : relit les commentaires de la Page toutes les
    2 minutes via l'API Graph et les traite (les webhooks Meta étant livrés de
    façon peu fiable tant que l'app n'a pas l'Accès avancé). Anti-doublon en base."""
    await asyncio.sleep(60)  # Attendre le démarrage complet
    while True:
        try:
            from services import facebook_page_service
            n = await facebook_page_service.poll_recent_comments()
            if n:
                _fb_poll_log.debug("facebook poll: %d commentaire(s) inspecté(s)", n)
        except Exception as exc:
            _fb_poll_log.warning("facebook_poll_loop: %s", exc)
        await asyncio.sleep(120)


from middleware.account_status import AccountStatusMiddleware
from middleware.ip_blocklist import IPBlocklistMiddleware
from middleware.logger import RequestLoggingMiddleware, setup_logging
from middleware.rate_limiter import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware
from middleware.user_context import UserContextMiddleware
from services import fcm_service
from routers import admin_staff
from routers import signalement as signalement_router
from routers import controle_donnees as controle_donnees_router
from routers import alarm, agent, agent_actions, auth, chat, cv, documents, generate, image, internal, omni, search, user, voice
from routers import cv_studio as cv_studio_router
from routers import agent_etat as agent_etat_router
from routers import media, social, surveillance, avatar, files, proactivity
from routers import voice_realtime as voice_realtime_router
from routers import admin as admin_router
from routers import admin_channels as admin_channels_router
from routers import admin_security as admin_security_router
from routers import admin_emails as admin_emails_router
from routers import admin_connectors as admin_connectors_router
from routers import admin_onehop as admin_onehop_router
from routers import image_edition as image_edition_router
from services import onehop_service
from services import cloudflare_ai_service as _cloudflare_ai
from services import llm_cascade as _llm_cascade
from services import cloudflare_image_service as _cloudflare_images
from services import web_search_service as _recherche_web
from routers import whatsapp, whatsapp_automations, google, mail
from routers import corpus as corpus_router
from routers import memory, export
from routers import preferences as preferences_router
from routers import notifications as notifications_router
from routers import stealth as stealth_router
from routers import mesomb as mesomb_router
from routers import abonnements as abonnements_router
from routers import contact as contact_router
from routers import paiements as paiements_router
from routers import airtel as airtel_router
from routers import onecs as onecs_router
from routers import browser_agent as browser_agent_router
from routers import code_exec as code_exec_router
from routers import sites as sites_router
from routers import automations as automations_router
from routers import facebook as facebook_router
from routers import code_studio as code_studio_router
from routers import app_config as app_config_router
from routers import today as today_router

# Les routeurs ont maintenant chargé `services.ai_router`. On installe ensuite
# la politique runtime-first UNE FOIS, avant toute requête : heure, météo,
# conversions et données privées de connecteurs ne préchargent plus Wikipédia
# ou des images Web avant même que l'outil interne ait eu la chance de répondre.
from services import ai_router as _chat_ai_router
from services import runtime_web_policy as _runtime_web_policy
_chat_ai_router.should_search_web = _runtime_web_policy.wrap(_chat_ai_router.should_search_web)


async def _wa_reconcile_loop():
    """Rapproche les preuves WhatsApp et entretient les drafts de planification."""
    from services import metriques, wa_operations
    from services.agents import schedule_state

    passage = 0
    while True:
        await asyncio.sleep(60)
        passage += 1

        try:
            await wa_operations.rapprocher(limite=40)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logging.getLogger(__name__).debug("rapprochement WhatsApp : passe ignorée")

        # Toutes les 5 minutes, la MEME boucle entretient les brouillons
        # persistants. Pas de second worker, pas de setTimeout, pas de dépendance
        # à une conversation rouverte. Le RPC DB utilise SKIP LOCKED, donc
        # plusieurs répliques API peuvent exécuter cette passe sans double effet.
        if passage % 5 == 0:
            try:
                entretien = await schedule_state.cleanup_stale_global(limit=100)
                if not entretien.get("ok"):
                    metriques.incr("schedule_maintenance_error_total")
                else:
                    expires = int(entretien.get("expired") or 0)
                    repris = int(entretien.get("reclaimed") or 0)
                    expurges = int(entretien.get("redacted") or 0)
                    if expires:
                        metriques.incr("schedule_draft_expired_total", expires)
                    if repris:
                        metriques.incr("schedule_execution_reclaimed_total", repris)
                    if expurges:
                        metriques.incr("schedule_tombstone_redacted_total", expurges)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                metriques.incr("schedule_maintenance_error_total")
                logging.getLogger(__name__).debug("entretien drafts WhatsApp : passe ignorée")

        # Une fois par heure, minimiser les follow-ups terminés anciens.
        # Les métriques agrégées restent calculables mais numéro, texte de
        # relance et identifiants provider disparaissent après rétention.
        if passage % 60 == 0:
            try:
                from services.automation_core.followups import FollowupOperations

                redacted = await asyncio.to_thread(
                    FollowupOperations().cleanup_terminal,
                    retention_days=30,
                    limit=200,
                )
                if redacted:
                    metriques.incr("followup_redacted_total", redacted)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                metriques.incr("followup_runtime_error_total", phase="retention")
                logging.getLogger(__name__).debug("rétention follow-up : passe ignorée")


        # Même cadence pour Document-to-Action : les résultats/IDs provider
        # terminaux anciens sont redacted, mais suggestion_id + fingerprint
        # restent pour conserver l'idempotence des retries tardifs.
        if passage % 60 == 0:
            try:
                from services.document_action_execution_service import (
                    cleanup_terminal_document_actions,
                )

                redacted = await asyncio.to_thread(
                    cleanup_terminal_document_actions,
                    retention_days=30,
                    limit=200,
                )
                if redacted:
                    metriques.incr("document_action_redacted_total", redacted)
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                metriques.incr("document_action_maintenance_error_total")
                logging.getLogger(__name__).debug(
                    "rétention Document-to-Action : passe ignorée"
                )


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    setup_logging(s.debug, s.log_level)
    await init_db()
    # LE MOTEUR DE RECHERCHE SE CONSTRUIT ICI, PAS AU PREMIER APPEL.
    #
    # Mesure du 01/09/2026 en production : la premiere recherche web coutait
    # 2477 ms contre 285-318 ms ensuite. Un import paye en ligne, dans une
    # coroutine — donc 2,5 secondes de boucle d'evenements bloquee pour TOUS
    # les utilisateurs, pas seulement pour celui qui avait pose la question.
    #
    # Synchrone et non attendu en tache de fond : la construction ne fait
    # aucun appel reseau et prend quelques microsecondes. La differer
    # rouvrirait la fenetre qu'on ferme.
    from services import web_search_service as _recherche
    _recherche.prechauffer()

    task = asyncio.create_task(_keepalive_loop())
    reminder_task = asyncio.create_task(_reminder_loop())
    fb_poll_task = asyncio.create_task(_facebook_poll_loop())
    # Les messages WhatsApp programmés vivaient dans un `setTimeout` de la
    # passerelle, effacé à chaque redéploiement. Cet ouvrier les relit en base :
    # un redémarrage ne perd plus rien.
    from services import wa_scheduler as _wa_sched
    wa_sched_task = asyncio.create_task(_wa_sched.boucle_ouvrier())
    from services import quota_reset_notification_service as _quota_reset_notifications
    quota_reset_task = asyncio.create_task(_quota_reset_notifications.worker_loop())

    # Automation OS est durable et multi-réplique : les définitions et runs sont
    # réclamés atomiquement en base avec leases + fencing tokens. Il peut donc
    # vivre dans chaque réplique API sans double effet. Le drapeau permet un
    # arrêt d'urgence sans rollback de schéma ni redéploiement de code.
    automation_os_task = None
    automation_enabled = os.getenv("AUTOMATION_OS_WORKER_ENABLED", "1").strip().lower()
    if automation_enabled not in {"0", "false", "no", "off"}:
        from services.automation_core.worker import automation_worker_loop
        automation_os_task = asyncio.create_task(automation_worker_loop())

    # LE RAPPROCHEMENT DES OPÉRATIONS VIT ICI, PAS SEULEMENT DANS CELERY.
    #
    # La tâche planifiée `wa-reconcile` existe, mais le service Celery ne
    # reprend pas toujours le code au même moment que l'API : le 18/09/2026,
    # deux opérations certifiées sont restées « accepté » sans qu'aucune passe
    # ne vienne les rapprocher. Une preuve qui n'arrive jamais doit finir en
    # `unknown`, et cela ne peut pas dépendre d'un autre conteneur.
    #
    # Sans effet de bord en multi-réplique : une transition ne recule jamais et
    # rejouer un accusé ne change rien.
    reconcile_task = asyncio.create_task(_wa_reconcile_loop())

    background_tasks = [task, reminder_task, fb_poll_task, wa_sched_task, quota_reset_task,
                        reconcile_task]
    if automation_os_task is not None:
        background_tasks.append(automation_os_task)

    yield
    for background_task in background_tasks:
        background_task.cancel()
    for background_task in background_tasks:
        try:
            await background_task
        except asyncio.CancelledError:
            pass


_settings = get_settings()
_show_docs = _settings.environment == "development" or _settings.debug

app = FastAPI(
    title="Toumaï AI API",
    description="Backend multilingue FR/AR/EN — chat, documents, voix, génération, recherche (Toumaï AI).",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _show_docs else None,
    redoc_url="/redoc" if _show_docs else None,
    openapi_url="/openapi.json" if _show_docs else None,
)

settings = get_settings()

# Ordre : le **dernier** add_middleware est le plus **externe** — CORS en dernier pour que
# toutes les réponses (y compris 429 du rate limit) reçoivent Access-Control-Allow-Origin.
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.trusted_hosts_list,
    )

app.add_middleware(AccountStatusMiddleware)
app.add_middleware(IPBlocklistMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(UserContextMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Origines explicites : variable CORS_ORIGINS (Render / .env).
# Regex en complément : localhost, Cloudflare Pages (*.pages.dev), LAN (admin sur IP locale),
# Vercel (*.vercel.app), GitHub Pages (*.github.io), is-a.dev et le domaine officiel toumaiai.com.
_LOCALHOST_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
_CLOUDFLARE_PAGES_ORIGIN_REGEX = r"^https://[a-zA-Z0-9.-]+\.pages\.dev$"
_LAN_ORIGIN_REGEX = r"^https?://(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$"
_VERCEL_APP_ORIGIN_REGEX = r"^https://[a-zA-Z0-9.-]+\.vercel\.app$"
_GITHUB_PAGES_ORIGIN_REGEX = r"^https://[a-zA-Z0-9-]+\.github\.io$"
_IS_A_DEV_ORIGIN_REGEX = r"^https://[a-zA-Z0-9.-]+\.is-a\.dev$"
# Le site public et la console admin sont servis sur des hôtes distincts.
# Autoriser explicitement les deux évite qu'un changement de plateforme du
# frontend (Vercel aujourd'hui) casse les appels authentifiés de l'admin.
_TOUMAI_ORIGIN_REGEX = r"^https://(www\.|admin\.)?toumaiai\.com$"
_BROWSER_ORIGIN_REGEX = (
    f"{_LOCALHOST_ORIGIN_REGEX}|{_CLOUDFLARE_PAGES_ORIGIN_REGEX}|{_LAN_ORIGIN_REGEX}|"
    f"{_VERCEL_APP_ORIGIN_REGEX}|{_GITHUB_PAGES_ORIGIN_REGEX}|{_IS_A_DEV_ORIGIN_REGEX}|{_TOUMAI_ORIGIN_REGEX}"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=_BROWSER_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
app.include_router(auth.router, prefix=f"{API}")
app.include_router(signalement_router.router, prefix=f"{API}")
app.include_router(controle_donnees_router.router, prefix=f"{API}")
app.include_router(cv.router, prefix=f"{API}")
# Moteur CV : génération, édition conversationnelle, rendu A4, ATS, variantes.
# `cv` (ci-dessus) reste monté : il sert le mode formulaire manuel.
app.include_router(cv_studio_router.router, prefix=f"{API}")
app.include_router(admin_staff.router, prefix=f"{API}")
app.include_router(admin_emails_router.router, prefix=f"{API}")
app.include_router(admin_connectors_router.router, prefix=f"{API}")
app.include_router(admin_onehop_router.router, prefix=f"{API}")
app.include_router(agent.router, prefix=f"{API}")
app.include_router(agent_actions.router, prefix=f"{API}")
app.include_router(agent_etat_router.router, prefix=f"{API}")
app.include_router(chat.router, prefix=f"{API}")
app.include_router(voice.router, prefix=f"{API}")
# Même préfixe `/voice` : le WebSocket temps réel est une entrée du même
# domaine, pas un service à part. Déclaré après, ses routes ne masquent rien.
app.include_router(voice_realtime_router.router, prefix=f"{API}")
app.include_router(image_edition_router.router, prefix=f"{API}")
app.include_router(alarm.router, prefix=f"{API}")
app.include_router(documents.router, prefix=f"{API}")
app.include_router(generate.router, prefix=f"{API}")
app.include_router(image.router, prefix=f"{API}")
app.include_router(search.router, prefix=f"{API}")
app.include_router(user.router, prefix=f"{API}")
app.include_router(internal.router, prefix=f"{API}")
app.include_router(omni.router, prefix=f"{API}")
app.include_router(media.router, prefix=f"{API}")
app.include_router(social.router, prefix=f"{API}")
app.include_router(surveillance.router, prefix=f"{API}")
app.include_router(avatar.router, prefix=f"{API}")
app.include_router(files.router, prefix=f"{API}")
app.include_router(proactivity.router, prefix=f"{API}")
app.include_router(whatsapp.router, prefix=f"{API}")
app.include_router(whatsapp_automations.router, prefix=f"{API}")
app.include_router(corpus_router.router, prefix=f"{API}")
app.include_router(google.router, prefix=f"{API}")
app.include_router(mail.router, prefix=f"{API}")
app.include_router(memory.router, prefix=f"{API}")
app.include_router(export.router, prefix=f"{API}")
app.include_router(preferences_router.router, prefix=f"{API}")
app.include_router(notifications_router.router, prefix=f"{API}")
app.include_router(stealth_router.router, prefix=f"{API}")
app.include_router(mesomb_router.router, prefix=f"{API}")
app.include_router(abonnements_router.router, prefix=f"{API}")
app.include_router(contact_router.router, prefix=f"{API}")
app.include_router(paiements_router.router, prefix=f"{API}")
app.include_router(airtel_router.router, prefix=f"{API}")
app.include_router(onecs_router.router, prefix=f"{API}")
app.include_router(browser_agent_router.router, prefix=f"{API}")
app.include_router(code_exec_router.router, prefix=f"{API}")
app.include_router(sites_router.router, prefix=f"{API}")
app.include_router(facebook_router.router, prefix=f"{API}")
app.include_router(code_studio_router.router, prefix=f"{API}")
app.include_router(app_config_router.router, prefix=f"{API}")
app.include_router(automations_router.router, prefix=f"{API}")
app.include_router(today_router.router, prefix=f"{API}")
# Admin console — panel d'administration entreprise
app.include_router(admin_router.router, prefix=f"{API}")
app.include_router(admin_channels_router.router, prefix=f"{API}")
app.include_router(admin_security_router.router, prefix=f"{API}")

# Fichiers statiques publics (images INSTA servies dans le chat, etc.) → /static/...
_STATIC_DIR = Path(__file__).resolve().parent / "static"
_STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")


def _vertex_pret() -> bool:
    try:
        from services import vertex_image_service
        return bool(vertex_image_service.configure())
    except Exception:
        return False


def _images_recentes() -> list:
    try:
        from services import image_gen_service

        return image_gen_service.dernieres_portes()
    except Exception:  # noqa: BLE001
        return []


async def _vertex_modeles() -> dict:
    try:
        from services import vertex_image_service

        if not vertex_image_service.configure():
            return {}
        return await vertex_image_service.modeles_disponibles()
    except Exception:  # noqa: BLE001
        return {}


async def _vertex_sonde() -> dict:
    try:
        from services import vertex_image_service

        if not vertex_image_service.configure():
            return {"etat": "compte_absent", "detail": ""}
        return await vertex_image_service.sonder()
    except Exception as exc:  # noqa: BLE001
        return {"etat": "erreur", "detail": str(exc)[:120]}


def _voix_sessions() -> int:
    try:
        from services.realtime import sessions_actives
        return sessions_actives.combien()
    except Exception:  # noqa: BLE001
        return 0


def _vertex_compte() -> str:
    try:
        from services.realtime import vertex_acces
        return vertex_acces.compte()
    except Exception:
        return ""


async def _lecture_sonde() -> dict:
    """Quelle voie sait lire une image. Voir `vision_service.sonder_lecture`."""
    try:
        from services import vision_service

        return await vision_service.sonder_lecture()
    except Exception as exc:  # noqa: BLE001
        return {"voie_retenue": "", "raisons": {"sonde": str(exc)[:160]}}


def _images_disponibles() -> dict:
    """Quelles portes de génération d'images répondent, sans rien révéler de plus."""
    etat = {}
    for nom, module in (
        ("onehop", "onehop_service"),
        ("vertex", "vertex_image_service"),
        ("nvidia", "nvidia_image_service"),
        ("cloudflare", "cloudflare_image_service"),
    ):
        try:
            from importlib import import_module

            etat[nom] = bool(import_module(f"services.{module}").configure())
        except Exception:  # noqa: BLE001
            etat[nom] = False
    etat["any"] = any(v for k, v in etat.items() if k != "any")
    return etat


async def _voix_disponible() -> dict:
    """La voix active, et si sa porte répond. Booléens et noms, rien d'autre."""
    s = get_settings()
    etat = {
        "v1": bool(s.toumai_voice_v1_enabled),
        "voice": (s.toumai_voice_name or "Zenaba"),
        "engine": "chatterbox-multilingual-v3",
        "url_configured": bool((s.chatterbox_tts_url or "").strip()),
        "token_configured": bool((s.chatterbox_tts_token or "").strip()),
        "space_reachable": False,
    }
    if not etat["url_configured"]:
        return etat
    try:
        from services import tts_service

        sonde = await tts_service.chatterbox_health_check()
        etat["space_reachable"] = bool(sonde.get("ok"))
        if not sonde.get("ok"):
            # Le NOM de l'échec, pas son texte : un message amont peut porter
            # une URL signée, son type non.
            etat["probe"] = str(sonde.get("error") or "")[:80]
    except Exception as exc:  # noqa: BLE001
        etat["probe"] = type(exc).__name__
    return etat


@app.get("/health/metrics")
async def health_metrics():
    """Compteurs d'exploitation de cette instance.

    `alertes` liste les compteurs dont la valeur attendue est zéro et qui ne le
    sont pas : un nom d'outil inventé par le modèle, une régression d'état
    bloquée, un repli sur la recherche web pour une action WhatsApp. Ces
    trois-là ne doivent jamais bouger.
    """
    from services import metriques

    return {"compteurs": metriques.instantane(), "alertes": list(metriques.alertes())}


@app.get("/health")
async def health(vision: int = 0):
    """Santé du service et disponibilité des intégrations.

    `?vision=1` ajoute la sonde de LECTURE d'image. Elle est optionnelle parce
    qu'elle coûte un appel réel à chaque fournisseur : la mettre dans la
    réponse par défaut ferait payer trois requêtes à chaque contrôle de santé,
    dont il y en a un par minute.
    """
    s = get_settings()
    fcm_v1 = False
    try:
        fcm_v1 = fcm_service.fcm_v1_configured()
    except Exception:
        fcm_v1 = False
    search_state = _recherche_web.moteurs_disponibles()
    search_ready = bool(search_state.get("tavily") or search_state.get("duckduckgo"))
    charge = {
        "status": "ok",
        # Public liveness only: never expose provider order, quota counters,
        # service-account identities, regional model probes, or recent activity.
        "database": bool(s.supabase_url and s.supabase_key),
        "database_privileged": supabase_admin_credential_status()["privileged"],
        "cache": bool(s.upstash_redis_url),
        "storage": bool(s.r2_account_id and s.r2_access_key),
        "search": search_ready,
        "whatsapp": bool(s.whatsapp_gateway_url),
        "push_notifications": fcm_v1,
        "voice": bool(s.gemini_live_enabled and s.gemini_api_key),
        # UNE PORTE D'IMAGES FERMÉE DOIT SE VOIR D'ICI.
        #
        # Le 18/09/2026, les quatre fournisseurs étaient indisponibles en même
        # temps (crédits épuisés d'un côté, clés absentes de l'autre) : côté
        # application, on voyait une attente puis rien, et rien dans cette
        # réponse ne permettait de le constater. Booléens seuls : aucun nom de
        # clé, aucun quota, aucun ordre de cascade.
        "images": _images_disponibles(),
        # LA VOIX AUSSI A UNE PORTE, ET ELLE DOIT SE VOIR D'ICI.
        #
        # Le 20/09/2026, la synthèse échouait en production alors que le
        # service et le Space étaient debout tous les deux. Il a fallu ouvrir
        # les journaux pour savoir laquelle des trois causes possibles était
        # en jeu, et les journaux étaient noyés sous le bruit des tâches de
        # fond. Trois booléens et un nom de moteur auraient suffi.
        #
        # La sonde ne synthétise rien : elle interroge le contrat Gradio du
        # Space. Elle ne coûte donc pas de GPU, et ne dit rien des secrets,
        # seulement s'ils sont posés.
        "voice_engine": await _voix_disponible(),
    }
    # LA SONDE ACTIVE N'EST PAS ICI.
    #
    # Une synthese reelle coute un passage ZeroGPU. Exposee sur /health,
    # elle laissait n'importe qui sur Internet consommer le quota du Space
    # en boucle. Elle vit desormais sur /voice/health?synthese=1, derriere
    # l'authentification, et dans scripts/smoke_zenaba.py pour les
    # verifications hors ligne.
    return charge

@app.get("/")
async def root():
    s = get_settings()
    docs = "/docs" if (s.environment == "development" or s.debug) else None
    return {"name": "ChadGpt", "docs": docs, "health": "/health"}


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": exc.errors(),
            "message": "Validation des entrées",
            "code": 422,
        },
    )


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        detail = exc.detail
        if not isinstance(detail, str):
            detail = str(detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": detail,
                "code": exc.status_code,
            },
        )
    if get_settings().debug:
        tb = traceback.format_exc()
    else:
        tb = str(exc)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "message": tb if get_settings().debug else "Erreur interne du serveur",
            "code": 500,
        },
    )
