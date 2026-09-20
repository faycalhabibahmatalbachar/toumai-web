"""Configuration centralisée — variables d'environnement et paramètres applicatifs."""

import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import List, Tuple

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent


def _env_files() -> Tuple[str, ...]:
    """
    Fichiers .env chargés dans l'ordre ; le dernier l'emporte.
    Prend en charge un `.env` à la racine `sayibi_backend/` et un ancien `sql/.env`.
    """
    root_env = _BACKEND_ROOT / ".env"
    sql_env = _BACKEND_ROOT / "sql" / ".env"
    paths: list[Path] = []
    if sql_env.is_file():
        paths.append(sql_env)
    if root_env.is_file():
        paths.append(root_env)
    if not paths:
        return (str(root_env),)
    return tuple(str(p) for p in paths)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environnement
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "environment"),
    )
    log_level: str = Field(
        default="INFO",
        validation_alias=AliasChoices("LOG_LEVEL", "log_level"),
    )

    # Clés LLM / services
    groq_api_key: str = ""

    # ── OneHop AI ────────────────────────────────────────────────────────────
    #
    # PLUSIEURS CLÉS, SÉPARÉES PAR DES VIRGULES, ET C'EST VOULU.
    #
    # Une clé unique est un point de rupture unique : épuisement de crédit,
    # révocation, plafond de débit — chacun coupe TOUT. Le pool tourne entre
    # les clés, écarte définitivement celles qui rendent 401 et met au repos
    # celles qui rendent 429.
    #
    # Les espaces et les retours à la ligne sont tolérés : une liste de clés se
    # colle depuis un gestionnaire de mots de passe, pas se retape.
    onehop_api_keys: str = Field(
        default="",
        validation_alias=AliasChoices("ONEHOP_API_KEYS", "onehop_api_keys"),
    )

    # Laisser OneHop prendre la main sur les images. Les modèles Gemini image
    # y sont à moitié prix, et surtout ils ne dépendent plus de la caisse
    # AI Studio — celle qui était vide le 13 août et qui a coûté une journée.
    onehop_pour_images: bool = Field(
        default=True,
        validation_alias=AliasChoices("ONEHOP_POUR_IMAGES", "onehop_pour_images"),
    )

    # Laisser OneHop prendre la main sur la conversation écrite.
    #
    # Par défaut NON : Groq répond en quelques centaines de millisecondes et
    # c'est ce qui fait la vivacité du fil écrit. OneHop devient un repli — et
    # un repli qui, lui, ne tombe pas en même temps que Groq.
    onehop_pour_texte: bool = Field(
        default=False,
        validation_alias=AliasChoices("ONEHOP_POUR_TEXTE", "onehop_pour_texte"),
    )
    gemini_api_key: str = ""
    # Ordre de priorité, séparé par des virgules (429/404/etc. → modèle suivant).
    gemini_models: str = Field(
        default=(
            "gemini-2.5-flash,"
            "gemini-3-flash,"
            "gemini-3.1-flash-lite,"
            "gemini-2.5-flash-lite,"
            "gemini-2.0-flash,"
            "gemini-1.5-flash"
        ),
        validation_alias=AliasChoices(
            "GEMINI_MODELS",
            "GEMINI_MODEL_PRIORITY",
            "gemini_models",
        ),
    )
    mistral_api_key: str = ""
    huggingface_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("HUGGINGFACE_API_KEY", "huggingface_api_key"),
    )
    # Token DÉDIÉ aux Spaces ChadGPT (compte faycalhabib) — séparé de
    # HUGGINGFACE_API_KEY (qui reste pour FLUX/autres). Fallback sur ce dernier.
    hf_spaces_token: str = Field(
        default="",
        validation_alias=AliasChoices("HF_SPACES_TOKEN", "hf_spaces_token"),
    )

    @property
    def spaces_token(self) -> str:
        return self.hf_spaces_token or self.huggingface_api_key

    # Clé de chiffrement des intégrations per-user (mail IMAP/SMTP). Fernet.
    integrations_key: str = Field(
        default="",
        validation_alias=AliasChoices("INTEGRATIONS_KEY", "integrations_key"),
    )
    hf_image_model: str = Field(
        default="black-forest-labs/FLUX.1-schnell",
        validation_alias=AliasChoices("HF_IMAGE_MODEL", "hf_image_model"),
    )
    # ── Connecteurs / tool-calling ────────────────────────────────────────────
    # Mail (SMTP simple). Gmail : créer un "mot de passe d'application".
    smtp_host: str = Field(default="", validation_alias=AliasChoices("SMTP_HOST", "smtp_host"))
    smtp_port: int = Field(default=587, validation_alias=AliasChoices("SMTP_PORT", "smtp_port"))
    smtp_user: str = Field(default="", validation_alias=AliasChoices("SMTP_USER", "smtp_user"))
    smtp_password: str = Field(default="", validation_alias=AliasChoices("SMTP_PASSWORD", "smtp_password"))
    smtp_from: str = Field(default="", validation_alias=AliasChoices("SMTP_FROM", "smtp_from"))
    # E-mails transactionnels systeme (bienvenue, reinitialisation mot de passe) —
    # distinct du connecteur Mail par-utilisateur ci-dessus. Resend : 3000 e-mails/mois gratuits.
    resend_api_key: str = Field(default="", validation_alias=AliasChoices("RESEND_API_KEY", "resend_api_key"))
    transactional_email_from: str = Field(
        default="Toumaï AI <contact@toumaiai.com>",
        validation_alias=AliasChoices("TRANSACTIONAL_EMAIL_FROM", "transactional_email_from"),
    )
    # WhatsApp (via ton infrastructure : Moov / Meta Cloud API / whatsapp-web.js).
    whatsapp_api_url: str = Field(default="", validation_alias=AliasChoices("WHATSAPP_API_URL", "whatsapp_api_url"))
    whatsapp_api_token: str = Field(default="", validation_alias=AliasChoices("WHATSAPP_API_TOKEN", "whatsapp_api_token"))
    whatsapp_default_from: str = Field(default="", validation_alias=AliasChoices("WHATSAPP_DEFAULT_FROM", "whatsapp_default_from"))
    # Passerelle WhatsApp Baileys (HF Space Docker) — sessions par utilisateur.
    # Vide par défaut : HF interdit les bots WhatsApp ("Flagged as abusive").
    # À définir sur l'URL Render de la passerelle (voir wa-gateway/DEPLOY.md).
    whatsapp_gateway_url: str = Field(
        default="",
        validation_alias=AliasChoices("WHATSAPP_GATEWAY_URL", "whatsapp_gateway_url"),
    )
    whatsapp_gateway_token: str = Field(default="", validation_alias=AliasChoices("WHATSAPP_GATEWAY_TOKEN", "whatsapp_gateway_token"))
    # MeSomb — Mobile Money Afrique (Tchad : Airtel/Moov, Cameroun : MTN/Orange…)
    mesomb_app_key: str = Field(default="", validation_alias=AliasChoices("MESOMB_APP_KEY", "mesomb_app_key"))
    mesomb_access_key: str = Field(default="", validation_alias=AliasChoices("MESOMB_ACCESS_KEY", "mesomb_access_key"))
    mesomb_secret_key: str = Field(default="", validation_alias=AliasChoices("MESOMB_SECRET_KEY", "mesomb_secret_key"))
    # Mail IMAP (lecture). Gmail : imap.gmail.com + mot de passe d'application.
    imap_host: str = Field(default="", validation_alias=AliasChoices("IMAP_HOST", "imap_host"))
    imap_user: str = Field(default="", validation_alias=AliasChoices("IMAP_USER", "imap_user"))
    imap_password: str = Field(default="", validation_alias=AliasChoices("IMAP_PASSWORD", "imap_password"))
    # Google Calendar (OAuth 2.0). Console Google Cloud → identifiants OAuth.
    google_client_id: str = Field(default="", validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "google_client_id"))
    google_client_secret: str = Field(default="", validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET", "google_client_secret"))
    google_redirect_uri: str = Field(default="", validation_alias=AliasChoices("GOOGLE_REDIRECT_URI", "google_redirect_uri"))
    # Service d'automatisation web (Playwright, HF Space Docker).
    web_gateway_url: str = Field(
        default="https://faycalhabib-chadgpt-web-gateway.hf.space",
        validation_alias=AliasChoices("WEB_GATEWAY_URL", "web_gateway_url"),
    )
    web_gateway_token: str = Field(default="", validation_alias=AliasChoices("WEB_GATEWAY_TOKEN", "web_gateway_token"))
    openai_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENAI_API_KEY", "openai_api_key"),
    )
    elevenlabs_api_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "ELEVENLABS_API_KEY",
            "ELEVENLABS_KEY",
            "XI_API_KEY",
        ),
    )
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    omni_screen_similarity_threshold: float = Field(
        default=0.95,
        validation_alias=AliasChoices(
            "OMNI_SCREEN_SIMILARITY_THRESHOLD",
            "omni_screen_similarity_threshold",
        ),
    )

    @field_validator(
        "elevenlabs_api_key",
        "supabase_url",
        "supabase_key",
        "supabase_service_role_key",
        mode="before",
    )
    @classmethod
    def _strip_elevenlabs_api_key(cls, v: object) -> str:
        """Nettoie clés/URL collées depuis Render (espaces, retours ligne, BOM,
        guillemets, préfixe Bearer) — évite les « Illegal header value …\\n » et les 401."""
        if v is None:
            return ""
        s = str(v).strip()
        if "\n" in s or "\r" in s:
            s = s.splitlines()[0].strip()
        if s.startswith("\ufeff"):
            s = s.lstrip("\ufeff").strip()
        # ZWSP etc. (copier-coller depuis certains tableurs / PDF)
        s = "".join(ch for ch in s if unicodedata.category(ch) != "Cf")
        if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
            s = s[1:-1].strip()
        # Copier-coller d’un en-tête au lieu de la clé brute seule
        if s.lower().startswith("bearer "):
            s = s[7:].strip()
        if s.lower().startswith("xi-api-key:"):
            s = s.split(":", 1)[-1].strip()
        return s

    elevenlabs_default_voice_id: str = Field(
        default="21m00Tcm4TlvDq8ikWAM",
        validation_alias=AliasChoices(
            "ELEVENLABS_DEFAULT_VOICE_ID",
            "elevenlabs_default_voice_id",
        ),
    )
    # `flash_v2_5` et non `multilingual_v2`.
    #
    # Premier fragment audio à 75-150 ms contre 400-800 ms — cinq à huit fois
    # plus rapide, pour 32 langues dont le français. La différence de timbre
    # existe, mais elle se juge sur une lecture posée ; dans une conversation,
    # c'est le blanc avant la réponse qu'on entend.
    elevenlabs_model_id: str = Field(
        default="eleven_flash_v2_5",
        validation_alias=AliasChoices(
            "ELEVENLABS_MODEL_ID",
            "elevenlabs_model_id",
        ),
    )
    tavily_api_key: str = ""
    serper_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("SERPER_API_KEY", "serper_api_key"),
    )

    supabase_url: str = ""
    supabase_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "SUPABASE_KEY", "supabase_key"),
    )
    # URL publique du site (lien de confirmation e-mail, réinitialisation mot de passe).
    # Doit être surchargée via PUBLIC_APP_URL en production (sinon retombe sur ce défaut).
    public_app_url: str = Field(
        default="https://toumaiai.com",
        validation_alias=AliasChoices("PUBLIC_APP_URL", "public_app_url"),
    )
    # URL publique de la console d'administration — sert à construire les liens
    # de réinitialisation envoyés aux administrateurs. Sans elle, le lien
    # pointait vers le site grand public, où la page n'existe pas.
    admin_console_url: str = Field(
        default="https://admin.toumaiai.com",
        validation_alias=AliasChoices("ADMIN_CONSOLE_URL", "admin_console_url"),
    )
    # URL publique du backend lui-même — sert les fichiers statiques (/static/insta/...).
    #: Adresse publique de CETTE API. Sert à fabriquer les liens qu'un tiers
    #: viendra chercher : images générées, fichiers servis, pièces jointes que
    #: WhatsApp télécharge lui-même.
    #:
    #: Le défaut pointait encore sur `sayibi-backend.onrender.com`, suspendu
    #: depuis la migration vers Northflank. Tout lien fabriqué à partir de là
    #: renvoyait 503 — mesuré en envoyant une image générée : elle existait,
    #: son adresse était bien formée, et personne ne pouvait la télécharger.
    #: Un défaut périmé est pire qu'un défaut absent : il produit une panne qui
    #: ressemble à un bug applicatif.
    public_api_url: str = Field(
        default="https://p01--chadgpt-backend--r4r4q8bf8vw8.code.run",
        validation_alias=AliasChoices("PUBLIC_API_URL", "public_api_url"),
    )

    supabase_service_role_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_KEY",
            "SUPABASE_SERVICE_ROLE_KEY",
            "supabase_service_role_key",
        ),
    )

    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    pinecone_api_key: str = ""
    pinecone_index: str = Field(
        default="sayibi-memory",
        validation_alias=AliasChoices("PINECONE_INDEX_NAME", "PINECONE_INDEX", "pinecone_index"),
    )
    # RAG arabe tchadien : quand activé, chaque message pertinent récupère des
    # passages du corpus (versets alignés ADT19) et les injecte dans le contexte
    # pour améliorer la justesse dialectale. OFF par défaut — mode sûr : n'affecte
    # le chat que lorsqu'on l'active explicitement, après vérification de l'index.
    chadian_rag_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("CHADIAN_RAG_ENABLED", "chadian_rag_enabled"),
    )
    # Profil de voix pour l'arabe tchadien : aucune voix `ar-TD` n'existe, on
    # emprunte la phonologie la plus proche. Valeurs : egyptien (défaut,
    # ج = [g] restitue le /g/ tchadien), egyptien_h, libyen, saoudien.
    # Réglable sans redéploiement pour comparer à l'oreille.
    chadian_voice_profile: str = Field(
        default="egyptien",
        validation_alias=AliasChoices("CHADIAN_VOICE_PROFILE", "chadian_voice_profile"),
    )
    pinecone_host: str = ""
    pinecone_environment: str = Field(
        default="us-east-1",
        validation_alias=AliasChoices("PINECONE_ENVIRONMENT", "pinecone_environment"),
    )

    r2_account_id: str = ""
    #: Jeton d'API Cloudflare pour Workers AI — le DERNIER maillon de la
    #: cascade texte. Le compte est le même que R2 (`r2_account_id`) : il ne
    #: manque que ce jeton, à créer avec la permission « Workers AI: Read ».
    #: Absent, le secours reste simplement muet.
    #: Plafonds d'usage par fenêtre glissante. `0` = aucune limite, et c'est
    #: le défaut : une jauge affichée alors que rien ne bloque serait un
    #: décor, et une limite imposée sans que personne ne l'ait décidée
    #: casserait le produit pour ses utilisateurs actuels. Un chiffre mis ici
    #: s'applique VRAIMENT — `quota_service.verifier()` est appelé avant les
    #: opérations coûteuses.
    quota_5h: int = 0
    quota_semaine: int = 0
    cloudflare_ai_token: str = Field(
        default="",
        validation_alias=AliasChoices("CLOUDFLARE_AI_TOKEN", "cloudflare_ai_token"),
    )
    #: Modèles Workers AI pour le texte, par ordre de préférence. Cloudflare
    #: sert 86 modèles sur la même allocation de 10 000 neurons/jour : autant
    #: viser les gros (Nemotron 3 120B, Gemma 4 26B, GLM 4.7 Flash) et ne
    #: retomber sur Llama 8B que si les précédents ne sont pas servis.
    cloudflare_text_models: str = Field(
        default=(
            "@cf/nvidia/nemotron-3-120b,"
            "@cf/google/gemma-4-26b-it,"
            "@cf/zai/glm-4.7-flash,"
            "@cf/meta/llama-3.1-8b-instruct-fast"
        ),
        validation_alias=AliasChoices(
            "CLOUDFLARE_TEXT_MODELS", "cloudflare_text_models"
        ),
    )

    #: IMAGES par Workers AI — la porte de DERNIER recours.
    #:
    #: Elle rebranche des modèles distillés (SDXL-Lightning, FLUX-schnell) que
    #: la cascade avait volontairement retirés en août : une image visiblement
    #: inférieure sous le nom de Toumaï coûte plus qu'une absence d'image.
    #: Ce n'est défendable qu'en DERNIÈRE position — quand l'alternative n'est
    #: plus « une image moins bonne » mais « pas d'image du tout ». Mettre ce
    #: drapeau à `false` revient à l'état antérieur, sans rien retirer.
    cloudflare_images_actif: bool = Field(
        default=True,
        validation_alias=AliasChoices("CLOUDFLARE_IMAGES_ACTIF", "cloudflare_images_actif"),
    )
    #: SDXL-Lightning d'abord : lui seul accepte largeur et hauteur, donc lui
    #: seul sait honorer un format demandé. FLUX-schnell rend un carré.
    cloudflare_image_models: str = Field(
        default=(
            "@cf/bytedance/stable-diffusion-xl-lightning,"
            "@cf/black-forest-labs/flux-1-schnell"
        ),
        validation_alias=AliasChoices("CLOUDFLARE_IMAGE_MODELS", "cloudflare_image_models"),
    )

    # ── FOURNISSEURS DE TEXTE GRATUITS ────────────────────────────────────────
    #
    # Ordre du routeur : le premier de la liste répond, les suivants existent
    # pour le jour où il ne répond plus. Chacun a sa propre caisse et son
    # propre quota — c'est TOUT l'intérêt : le jour où l'un tombe (impayé,
    # quota, panne), aucun des autres n'est concerné.
    #
    #: Cerebras — tête de cascade. GPT-OSS 120B à ~3 000 jetons/s, palier
    #: gratuit sans carte : 14 400 requêtes et 1 M de jetons par jour.
    #: Clé : https://cloud.cerebras.ai (Free Tier).
    cerebras_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("CEREBRAS_API_KEY", "cerebras_api_key"),
    )
    cerebras_models: str = Field(
        default="gpt-oss-120b,qwen-3-235b-a22b-instruct-2507,llama-3.3-70b",
        validation_alias=AliasChoices("CEREBRAS_MODELS", "cerebras_models"),
    )
    #: NVIDIA NIM — les points d'accès marqués « Free » de build.nvidia.com.
    #: La clé (`nvapi-…`) est la MÊME que celle des images FLUX : un seul
    #: compte, deux usages. ~40 requêtes/minute.
    nvidia_text_models: str = Field(
        default=(
            "deepseek-ai/deepseek-v4-pro,"
            "moonshotai/kimi-k3,"
            "nvidia/nemotron-3.5-lightning-30b,"
            "deepseek-ai/deepseek-v4-flash,"
            "nvidia/llama-3.3-nemotron-super-49b-v1"
        ),
        validation_alias=AliasChoices("NVIDIA_TEXT_MODELS", "nvidia_text_models"),
    )
    #: OpenRouter — DERNIER recours réseau, et seulement lui : 50 requêtes par
    #: jour sur un compte sans crédit. En faire un moteur principal viderait le
    #: quota en une heure. Clé : https://openrouter.ai/keys
    openrouter_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENROUTER_API_KEY", "openrouter_api_key"),
    )
    #: `openrouter/free` choisit lui-même un modèle gratuit compatible : c'est
    #: le seul identifiant qui ne se périme pas quand la liste tourne.
    openrouter_models: str = Field(
        default="openrouter/free",
        validation_alias=AliasChoices("OPENROUTER_MODELS", "openrouter_models"),
    )
    #: L'ORDRE DU ROUTEUR, EN CLAIR ET MODIFIABLE SANS DÉPLOIEMENT.
    #: Un fournisseur retiré de cette liste n'est plus appelé ; un fournisseur
    #: déplacé change de rang. C'est le seul endroit où l'ordre est écrit.
    llm_ordre: str = Field(
        default=(
            "cerebras,groq,gemini,mistral,cloudflare,nvidia,openrouter,onehop"
        ),
        validation_alias=AliasChoices("LLM_ORDRE", "LLM_ORDER", "llm_ordre"),
    )
    #: Délai maximal avant le PREMIER mot d'un fournisseur. Au-delà, on passe
    #: au suivant sans l'attendre : un fournisseur qui met vingt secondes à
    #: démarrer n'est pas lent, il est indisponible — et quelqu'un regarde
    #: trois points clignoter pendant ce temps.
    llm_delai_premier_mot: float = Field(
        default=12.0,
        validation_alias=AliasChoices("LLM_DELAI_PREMIER_MOT", "llm_delai_premier_mot"),
    )
    r2_access_key: str = Field(
        default="",
        validation_alias=AliasChoices("R2_ACCESS_KEY_ID", "R2_ACCESS_KEY", "r2_access_key"),
    )
    r2_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices("R2_SECRET_ACCESS_KEY", "R2_SECRET_KEY", "r2_secret_key"),
    )
    r2_bucket: str = Field(
        default="sayibi-files",
        validation_alias=AliasChoices("R2_BUCKET_NAME", "R2_BUCKET", "r2_bucket"),
    )
    r2_public_url: str = ""
    # Northflank ne sait remplacer l'environnement d'un service qu'en bloc :
    # corriger une seule variable obligerait à renvoyer les 62 autres, clés
    # d'API comprises. Ces trois variables « supplément » se posent à côté,
    # dans un groupe de secrets, et sont fusionnées ici.
    r2_public_url_override: str = Field(
        default="",
        validation_alias=AliasChoices("R2_PUBLIC_URL_OVERRIDE",
                                      "r2_public_url_override"),
    )
    r2_jurisdiction: str = Field(
        default="",
        validation_alias=AliasChoices("R2_JURISDICTION", "r2_jurisdiction"),
    )
    r2_s3_endpoint: str = Field(
        default="",
        validation_alias=AliasChoices(
            "R2_S3_ENDPOINT",
            "R2_ENDPOINT",
            "r2_s3_endpoint",
        ),
    )

    jwt_secret: str = Field(
        default="dev-secret-change-in-production",
        validation_alias=AliasChoices("JWT_SECRET", "jwt_secret"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    # QUATRE-VINGT-DIX JOURS, ET ILS SE RENOUVELLENT A CHAQUE USAGE.
    #
    # Le jeton tourne a chaque rafraichissement et repart pour la duree
    # complete : quelqu'un qui ouvre l'application ne revoit donc jamais
    # l'ecran de connexion. La duree ne compte que pour une ABSENCE
    # prolongee, et trente jours etait court pour un usage saisonnier.
    # C'est l'ordre de grandeur des applications comparables.
    refresh_token_expire_days: int = 90

    fcm_server_key: str = Field(
        default="",
        validation_alias=AliasChoices("FCM_SERVER_KEY", "fcm_server_key"),
    )
    firebase_credentials_path: str = Field(
        default="",
        validation_alias=AliasChoices(
            "FIREBASE_CREDENTIALS_PATH",
            "firebase_credentials_path",
        ),
    )
    firebase_credentials_json: str = Field(
        default="",
        validation_alias=AliasChoices(
            "FIREBASE_CREDENTIALS_JSON",
            "firebase_credentials_json",
        ),
    )

    sayibi_internal_secret: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SAYIBI_INTERNAL_SECRET",
            "sayibi_internal_secret",
        ),
    )

    cors_origins: str = "*"
    debug: bool = False
    # Cloudflare Turnstile — anti-robot du formulaire web (voir
    # services/turnstile.py pour la portée exacte de la protection).
    turnstile_secret_key: str = Field(
        default="",
        validation_alias=AliasChoices("TURNSTILE_SECRET_KEY", "turnstile_secret_key"),
    )
    turnstile_site_key: str = Field(
        default="",
        validation_alias=AliasChoices("TURNSTILE_SITE_KEY", "turnstile_site_key"),
    )
    cors_origins_extra: str = Field(
        default="",
        validation_alias=AliasChoices("CORS_ORIGINS_EXTRA", "cors_origins_extra"),
    )
    trusted_hosts_extra: str = Field(
        default="",
        validation_alias=AliasChoices("TRUSTED_HOSTS_EXTRA", "trusted_hosts_extra"),
    )
    trusted_hosts: str = Field(
        # *.onrender.com : accepte tout sous-domaine Render (ex. sayibi-backend-xxxx.onrender.com).
        # *.code.run : Northflank (ex. p01--chadgpt-backend--xxxx.code.run).
        default=(
            "*.onrender.com,sayibi-backend.onrender.com,sayibi-web.onrender.com,"
            "*.code.run,p01--chadgpt-backend--r4r4q8bf8vw8.code.run,"
            "localhost,127.0.0.1"
        ),
        validation_alias=AliasChoices("TRUSTED_HOSTS", "trusted_hosts"),
    )

    kokoro_tts_url: str = Field(
        default="",
        validation_alias=AliasChoices("KOKORO_TTS_URL", "kokoro_tts_url"),
    )
    # Toumaï Voice V1 — identité vocale unique : Zenaba.
    #
    # Moteur ACTIF : Chatterbox Multilingual V3 (voir plus bas). Kyutai Pocket
    # TTS reste décrit ici parce que son service et ses artefacts sont
    # conservés comme option future, mais il n'est appelé par aucun chemin
    # tant que TOUMAI_VOICE_V1_ENABLED vaut vrai. Dans les deux cas, le
    # navigateur ne connaît ni l'URL amont ni le secret.
    toumai_voice_v1_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("TOUMAI_VOICE_V1_ENABLED", "toumai_voice_v1_enabled"),
    )
    toumai_voice_name: str = Field(
        default="Zenaba",
        validation_alias=AliasChoices("TOUMAI_VOICE_NAME", "toumai_voice_name"),
    )
    # Arabe Voice V1 préparé séparément : désactivé par défaut pour que
    # l'activation du français Zenaba ne change jamais de comportement tant
    # que le Space n'expose pas explicitement son endpoint multilingue arabe.
    toumai_voice_arabic_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "TOUMAI_VOICE_ARABIC_ENABLED",
            "toumai_voice_arabic_enabled",
        ),
    )
    pocket_tts_url: str = Field(
        default="",
        validation_alias=AliasChoices("POCKET_TTS_URL", "pocket_tts_url"),
    )
    pocket_tts_token: str = Field(
        default="",
        validation_alias=AliasChoices("POCKET_TTS_TOKEN", "pocket_tts_token"),
    )
    pocket_tts_timeout_seconds: float = Field(
        default=45.0,
        validation_alias=AliasChoices(
            "POCKET_TTS_TIMEOUT_SECONDS", "pocket_tts_timeout_seconds"
        ),
    )
    # Zenaba active — Chatterbox Multilingual V3 sur Hugging Face ZeroGPU.
    # Pocket TTS reste configuré comme expérimentation, mais n'est pas appelé.
    chatterbox_tts_url: str = Field(
        default="",
        validation_alias=AliasChoices("CHATTERBOX_TTS_URL", "chatterbox_tts_url"),
    )
    chatterbox_tts_token: str = Field(
        default="",
        validation_alias=AliasChoices("CHATTERBOX_TTS_TOKEN", "chatterbox_tts_token"),
    )
    chatterbox_tts_timeout_seconds: float = Field(
        default=180.0,
        validation_alias=AliasChoices("CHATTERBOX_TTS_TIMEOUT_SECONDS", "chatterbox_tts_timeout_seconds"),
    )
    # ── Gemini Live par Vertex AI ───────────────────────────────────────────
    #
    # La clé AI Studio puise dans la caisse *Prepay*, vide et non
    # rechargeable — la banque a refusé l'achat. Vertex puise dans le
    # *Postpay*, où le paiement du 13 août est réellement arrivé.
    #
    # Les identifiants sont ceux de FIREBASE_CREDENTIALS_JSON, déjà déployés :
    # le compte de service `firebase-adminsdk-fbsvc@sayibi-ai` a reçu le rôle
    # *Agent Platform User*. Aucun secret nouveau à créer.
    #
    # Mettre VERTEX_LIVE_ENABLED=false pour repasser par AI Studio.
    vertex_live_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("VERTEX_LIVE_ENABLED", "vertex_live_enabled"),
    )
    vertex_project: str = Field(
        default="sayibi-ai",
        validation_alias=AliasChoices("VERTEX_PROJECT", "vertex_project"),
    )
    #: `global` ne sert pas le Live — vérifié contre le service, seule
    #: us-central1 expose `gemini-live-2.5-flash-native-audio`.
    vertex_location: str = Field(
        default="us-central1",
        validation_alias=AliasChoices("VERTEX_LOCATION", "vertex_location"),
    )
    #: Le nom diffère de celui d'AI Studio : c'est le seul modèle Live que
    #: Vertex publie, et le seul qui ait rendu un `setupComplete`.
    gemini_live_model_vertex: str = Field(
        default="gemini-live-2.5-flash-native-audio",
        validation_alias=AliasChoices(
            "GEMINI_LIVE_MODEL_VERTEX", "gemini_live_model_vertex"
        ),
    )

    # ── Pollinations (generation d'images) ──────────────────────────────────
    #
    # SANS CLE, ON TOMBE SUR LE PALIER ANONYME.
    #
    # C'est ce qui servait toutes les images depuis que les credits AI Studio
    # sont epuises : FLUX.1 Schnell anonyme — le « vieux modele » que Faycal
    # avait repere a l'oeil. La cle ouvre le catalogue complet.
    #
    # Mesure contre le service, seeds distincts pour dejouer le cache :
    #     nanobanana-pro   200   12,1 s
    #     gpt-image-2      200   44,3 s
    #     flux             200   44,7 s
    #     seedream5-pro    500   (indisponible)
    #
    # `nanobanana-pro` est a la fois le meilleur et le plus rapide : il passe
    # en tete, les autres restent en repli.
    #: NVIDIA NIM — FLUX.1-dev, le modèle COMPLET (cinquante étapes), sur un
    #: plan gratuit sans carte bancaire. C'est la seconde porte de haut de
    #: gamme derrière OneHop ; sans elle, une saturation OneHop laissait la
    #: chaîne retomber sur `schnell`, visiblement inférieur.
    #: Clé à générer sur build.nvidia.com/settings/api-keys (préfixe `nvapi-`).
    nvidia_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("NVIDIA_API_KEY", "nvidia_api_key"),
    )

    pollinations_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("POLLINATIONS_API_KEY", "pollinations_api_key"),
    )
    pollinations_models: str = Field(
        default="nanobanana-pro,gpt-image-2,flux",
        validation_alias=AliasChoices("POLLINATIONS_MODELS", "pollinations_models"),
    )

    # Edge-TTS — gratuit, sans API key (bibliothèque edge-tts). Désactiver : retirer « edge » de TTS_PROVIDER_PRIORITY.
    edge_tts_voice: str = Field(
        default="fr-FR-DeniseNeural",
        validation_alias=AliasChoices("EDGE_TTS_VOICE", "edge_tts_voice"),
    )
    # DÉSACTIVÉ PAR DÉFAUT — DÉCISION PRODUIT, PAS TECHNIQUE.
    #
    # Edge-TTS est gratuit et toujours disponible, ce qui en faisait le dernier
    # filet du repli. Mais sa voix (Denise, Henri) s'entend immédiatement comme
    # une machine, et Faycal l'a retirée du mode Live il y a deux jours — elle
    # est revenue par la cascade, qui ne consultait pas cette liste.
    #
    # Une voix robotique n'est pas une dégradation acceptable pour Toumaï : il
    # vaut mieux ne pas parler que parler comme un automate. Remettre
    # EDGE_TTS_ENABLED=true dans l'environnement pour la réautoriser.
    edge_tts_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("EDGE_TTS_ENABLED", "edge_tts_enabled"),
    )
    # TTS OpenAI (https://platform.openai.com/docs/guides/text-to-speech) — alternative à ElevenLabs.
    openai_tts_model: str = Field(
        default="tts-1",
        validation_alias=AliasChoices("OPENAI_TTS_MODEL", "openai_tts_model"),
    )
    openai_tts_voice: str = Field(
        default="nova",
        validation_alias=AliasChoices("OPENAI_TTS_VOICE", "openai_tts_voice"),
    )
    # ── Gemini TTS — la voix naturelle ───────────────────────────────────────
    # Réutilise GEMINI_API_KEY, déjà configurée : aucune facturation nouvelle.
    #
    # C'est un modèle de LANGUE qui parle, pas un convertisseur graphème-phonème :
    # on lui décrit en français comment jouer le texte (« reprends ton souffle
    # entre les idées, n'appuie pas la fin des phrases ») et il le fait. Aucun
    # réglage SSML de hauteur ou de vitesse ne produit cela.
    gemini_tts_model: str = Field(
        default="gemini-3.1-flash-tts-preview",
        validation_alias=AliasChoices("GEMINI_TTS_MODEL", "gemini_tts_model"),
    )
    # `Sulafat` est la seule voix du catalogue décrite comme « chaleureuse ».
    gemini_tts_voice: str = Field(
        default="Sulafat",
        validation_alias=AliasChoices("GEMINI_TTS_VOICE", "gemini_tts_voice"),
    )
    gemini_tts_sample_rate: int = Field(
        default=24000,
        validation_alias=AliasChoices("GEMINI_TTS_SAMPLE_RATE", "gemini_tts_sample_rate"),
    )

    # Ordre TTS — ET GEMINI N'Y EST PLUS.
    #
    # Je l'avais mis en tête pour sa naturalité (2ᵉ au classement ELO de la
    # Speech Arena). C'était une erreur, et la mesure l'a tranchée : SEPT
    # SECONDES ET DEMIE pour synthétiser « Elon Musk est un entrepreneur. »
    # Sur une réponse de quatre phrases, la personne attend une demi-minute.
    # Une voix magnifique qui arrive trop tard n'est pas une voix, c'est une
    # attente.
    #
    # Pire encore une fois en tête : chaque réponse tentait Gemini, prenait un
    # aller-retour réseau pour un 429, PUIS retombait sur Edge. Le quota
    # ajoutait son délai à la lenteur.
    #
    # L'ordre part donc du plus RAPIDE :
    #   elevenlabs (flash v2.5)  75-150 ms
    #   cartesia   (sonic)       75-90 ms, si la clé est posée
    #   edge                     ~1 s, gratuit, le filet
    #
    # La vraie voix naturelle ne vient plus d'ici de toute façon : en mode
    # vocal, c'est Gemini Live qui parle, et cette cascade n'est plus que le
    # repli — plus le bouton « écouter » du fil écrit.
    tts_provider_priority: str = Field(
        default="elevenlabs,cartesia,edge,kokoro,openai",
        validation_alias=AliasChoices(
            "TTS_PROVIDER_PRIORITY",
            "tts_provider_priority",
        ),
    )
    # VoxCPM2 — TTS neuronal 30 langues, voice clone, voice design (Apache-2.0).
    # Déployer le HF Space openbmb/VoxCPM-Demo sur un GPU T4 (compte HF faycalhabib).
    # Ex: https://faycalhabib-voxcpm.hf.space
    voxcpm_hf_space_url: str = Field(
        default="",
        validation_alias=AliasChoices("VOXCPM_HF_SPACE_URL", "voxcpm_hf_space_url"),
    )
    # Instruction de contrôle par défaut (Voice Design) si aucune voix clone n'est fournie.
    voxcpm_default_control: str = Field(
        default="homme tchadien, voix chaleureuse et professionnelle, ton accessible",
        validation_alias=AliasChoices("VOXCPM_DEFAULT_CONTROL", "voxcpm_default_control"),
    )

    # ── Gemini Live — conversation vocale de bout en bout ────────────────────
    # Un seul modèle reçoit l'audio et produit de l'audio : plus de cascade
    # reconnaissance → modèle → synthèse. Mesuré contre le service réel :
    # premier son à 772 ms, interruption détectée par le serveur à 662 ms.
    #
    # C'est le mode PAR DÉFAUT du vocal. La cascade Deepgram reste en repli.
    gemini_live_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("GEMINI_LIVE_ENABLED", "gemini_live_enabled"),
    )
    # `flash-live` et non `native-audio`. J'ai fait l'erreur inverse, mesures
    # a l'appui, et la voici corrigee.
    #
    # Premier son apres la fin d'une phrase, meme audio, meme jour :
    #
    #   gemini-3.1-flash-live-preview            818 ms
    #   gemini-2.5-flash-native-audio-latest    2932 ms
    #   gemini-2.5-flash-native-audio + recherche 3907 ms
    #
    # J'etais passe au 2.5 parce que l'ancrage Google natif y est accepte et
    # refuse sur le 3.1. C'etait un mauvais arbitrage : j'ai multiplie par
    # cinq le delai avant la reponse — l'exigence PREMIERE — pour une
    # fonctionnalite qui a d'autres solutions. Trois secondes de silence apres
    # une question, on ne les rattrape avec aucune qualite de reponse.
    #
    # La recherche web passe donc par l'outil `web_search` du registre, et
    # l'ancrage natif reste demande : s'il est refuse, l'ouverture le retire
    # toute seule (voir `_negocier_setup`).
    gemini_live_model: str = Field(
        default="gemini-3.1-flash-live-preview",
        validation_alias=AliasChoices("GEMINI_LIVE_MODEL", "gemini_live_model"),
    )
    gemini_live_voice: str = Field(
        default="Sulafat",
        validation_alias=AliasChoices("GEMINI_LIVE_VOICE", "gemini_live_voice"),
    )
    # Silence exigé avant de conclure que l'utilisateur a fini de parler.
    #
    # « Si je prends un petit air pour respirer avant de continuer ma
    # question, elle commence à parler déjà. » C'est le défaut le plus pénible
    # d'un mode vocal : on n'ose plus marquer de pause, et parler devient un
    # exercice d'apnée.
    #
    # Google recommande 500 à 800 ms. On monte à 1200 : dans une vraie
    # conversation on hésite, on cherche un mot, on reprend son souffle au
    # milieu d'une phrase. Le coût est symétrique et il faut l'assumer — 1200
    # ms de silence avant chaque réponse — mais couper quelqu'un au milieu de
    # sa question est bien pire que de le faire attendre une demi-seconde de
    # plus.
    # LE SILENCE EXIGÉ AVANT QU'ELLE NE CONCLUE VOTRE TOUR.
    #
    # « L'AI répond plus vite au texte qu'à la voix. » Voilà le chiffre exact
    # qui l'explique : un message écrit part à l'instant où l'on appuie, alors
    # qu'une phrase parlée devait être suivie de 1,2 SECONDE de silence avant
    # que le serveur ne daigne la considérer comme finie. Ce n'était pas une
    # lenteur du modèle — c'était une attente que nous lui imposions.
    #
    # POURQUOI C'ÉTAIT À 1200, ET POURQUOI C'ÉTAIT DE TROP
    # -----------------------------------------------------
    # La valeur avait été montée pour un vrai défaut : au réglage d'origine,
    # une simple respiration au milieu d'une phrase déclenchait la réponse, et
    # parler devenait un exercice d'apnée.
    #
    # Mais deux freins avaient été posés pour un seul problème.
    # `endOfSpeechSensitivity: END_SENSITIVITY_LOW` rend DÉJÀ le modèle réticent
    # à conclure — il juge si l'énoncé SONNE fini, ce qu'aucun compteur de
    # millisecondes ne sait faire. Empiler par-dessus un plancher de 1,2 s,
    # c'est freiner deux fois : on paie la prudence en double, et on ne
    # l'obtient qu'une fois.
    #
    # 700 ms se place là où il faut : au-dessus d'une respiration en milieu de
    # phrase (150 à 300 ms) et d'une hésitation ordinaire, en dessous de la
    # pause naturelle entre deux phrases. Un demi-seconde rendu à chaque
    # échange parlé, sans redonner à personne l'impression d'être coupé.
    gemini_live_silence_ms: int = Field(
        default=700,
        validation_alias=AliasChoices(
            "GEMINI_LIVE_SILENCE_MS", "gemini_live_silence_ms"
        ),
    )

    # Recherche Google NATIVE, intégrée au modèle.
    #
    # Mesuré : avec un simple outil `web_search` de notre côté, le modèle
    # annonçait « attends, je regarde sur Internet » puis répondait DE MÉMOIRE
    # sans jamais appeler l'outil — deux fois sur trois. Une réponse de mémoire
    # déguisée en vérification est pire qu'un refus : l'utilisateur croit
    # qu'elle vient d'être vérifiée.
    #
    # La recherche native ne dépend pas de la bonne volonté du modèle : elle
    # est branchée dans sa génération, et elle n'a pas besoin de notre service
    # de recherche — lequel expire régulièrement sur ses moteurs de repli.
    # ── Ancrage web natif : ÉTEINT ───────────────────────────────────────────
    #
    # Il est facturé À LA REQUÊTE, en plus des jetons. Or il ne tient pas sa
    # promesse sur ce modèle : l'assistant annonce « je cherche, attends un
    # instant » puis répond de mémoire, sans qu'aucune requête ne parte. Sur
    # trois essais mesurés, une seule recherche a réellement eu lieu.
    #
    # Payer une fonction qui ne marche pas est un mauvais compromis ; laisser
    # l'assistant PRÉTENDRE chercher en est un pire, parce qu'on croit alors
    # une réponse vérifiée qui ne l'est pas.
    #
    # L'outil `web_search` reste disponible par appel de fonction — c'est le
    # chemin qu'on rendra fiable, parce qu'on peut l'observer : il laisse une
    # trace, on sait s'il a été appelé. GEMINI_LIVE_GOOGLE_SEARCH=true le
    # rallume si besoin.
    # ── Tamis de bruit ───────────────────────────────────────────────────────
    #
    # « Elle ne fait pas la différence entre le bruit et la personne qui
    # parle. » Silero reconnaît la PAROLE ; un seuil de niveau, lui, ne dit que
    # le poids d'un son — et un ventilateur proche pèse plus lourd qu'une voix
    # lointaine.
    #
    # Réglable sans redéploiement parce que le compromis dépend du lieu : dans
    # une pièce calme, le tamis ne sert à rien et coûte son retard ; dans un
    # marché, il fait toute la différence.
    gemini_live_tamis: bool = Field(
        default=True,
        validation_alias=AliasChoices("GEMINI_LIVE_TAMIS", "gemini_live_tamis"),
    )

    # Trames d'avance avant d'émettre. Le tamis décide d'une trame en sachant
    # ce qui l'a suivie — sans quoi la première syllabe de chaque phrase
    # tomberait avant d'avoir été reconnue comme de la voix.
    #
    # 3 trames de 50 ms = 150 ms ajoutés à la réponse. C'est un vrai prix, et
    # c'est pour ça qu'il est réglable : 0 le supprime avec ses conséquences.
    gemini_live_tamis_avance: int = Field(
        default=3,
        validation_alias=AliasChoices(
            "GEMINI_LIVE_TAMIS_AVANCE", "gemini_live_tamis_avance"
        ),
    )

    gemini_live_google_search: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "GEMINI_LIVE_GOOGLE_SEARCH", "gemini_live_google_search"
        ),
    )
    # L'instruction porte la LANGUE : `speechConfig.languageCode` fait refuser
    # la connexion (voir gemini_live.py). Elle porte aussi le registre parlé —
    # ici il ne s'agit plus d'aider une synthèse à lire un texte, mais de dire
    # à quelqu'un comment se comporter dans une conversation.
    gemini_live_instruction: str = Field(
        default=(
            "Tu es Toumaï AI, un assistant tchadien. Tu PARLES avec quelqu'un, "
            "tu ne lis pas un texte.\n"
            "Réponds en français, sauf si l'on te parle en arabe ou en anglais — "
            "alors réponds dans cette langue.\n"
            # DEUX DÉFAUTS OBSERVÉS SUR L'APPAREIL, CORRIGÉS ICI.
            #
            # 1. « Sur un simple Salut, elle appelle whatsapp_get_unread ET
            #    mail_read_inbox » — 5,7 secondes avant le premier son, pour
            #    répondre bonjour. La cause n'est pas un bug : c'est ce prompt.
            #    Il décrit longuement tout ce qu'elle sait faire sur WhatsApp,
            #    et un modèle si longuement outillé cherche à s'en servir. Il
            #    manquait la phrase inverse.
            #
            # 2. « J'ai écrit salut, elle me dit : j'ai réussi à détecter la
            #    langue, peux-tu changer la langue ou réécrire » — elle raconte
            #    son fonctionnement interne au lieu de répondre. Personne ne dit
            #    à voix haute qu'il vient de reconnaître une langue ; on répond.
            "UN BONJOUR N'EST PAS UNE DEMANDE. « Salut », « bonjour », « ça "
            "va », « tu es là » : tu réponds, et c'est tout. Tu n'ouvres ni "
            "WhatsApp, ni la boîte mail, ni l'agenda tant qu'on ne te l'a pas "
            "demandé. Aller chercher des messages que personne n'a réclamés "
            "fait attendre plusieurs secondes pour un mot de politesse — et "
            "donne l'impression de fouiller.\n"
            "N'APPELLE UN OUTIL QUE SI LA PHRASE LE RÉCLAME. Une demande porte "
            "un verbe : lis, envoie, cherche, ajoute, vérifie, résume. Sans "
            "verbe, sans question, sans sujet précis — tu réponds de toi-même. "
            "Dans le doute, demande en une phrase courte plutôt que d'aller "
            "chercher.\n"
            "NE COMMENTE JAMAIS TON PROPRE FONCTIONNEMENT. Ni la langue que tu "
            "reconnais, ni les outils dont tu disposes, ni ce que tu viens de "
            "comprendre. Tu ne dis pas « j'ai détecté la langue » ni « peux-tu "
            "réécrire » : tu réponds dans la langue de ton interlocuteur, sans "
            "l'annoncer. Quelqu'un qui explique son propre mécanisme ne "
            "converse plus, il se décrit.\n"
            "Phrases courtes. Deux ou trois suffisent presque toujours. Si le "
            "sujet est vaste, donne l'essentiel et propose de continuer.\n"
            "RESPIRE, ET LAISSE-LE S'ENTENDRE. Tu produis de la voix, pas du "
            "texte lu : prends ton souffle avant une phrase longue, marque un "
            "vrai silence à la virgule.\n"
            # LES HESITATIONS SONT DESORMAIS RATIONNEES, ET C'EST UN RETOUR EN
            # ARRIERE ASSUME.
            #
            # La version precedente les encourageait largement : « laisse
            # echapper un hmm quand tu reflechis, un ah quand tu comprends, un
            # euh quand tu cherches un mot », plus « commence parfois par un
            # souffle ». Le resultat mesure a l'usage : Faycal — « les mots de
            # sentiments humm ne sont pas controles ».
            #
            # Le raisonnement d'origine reste juste — une reponse sans une
            # seule hesitation s'entend comme une machine — mais il a ete
            # applique sans plafond. Une hesitation est rare par nature : elle
            # signale qu'on CHERCHE. Repetee, elle ne signale plus rien et
            # devient un tic, ce qui s'entend encore plus artificiel que la
            # perfection qu'on voulait eviter.
            #
            # On garde donc le principe, borne a UNE par reponse, et jamais au
            # debut — la ou elle sonne comme un demarrage laborieux.
            "UNE SEULE HÉSITATION PAR RÉPONSE, AU PLUS. Un « hmm » ou un "
            "« euh » ne vaut que s'il signale une recherche réelle : une "
            "nuance à trouver, un mot qui ne vient pas. Jamais au DÉBUT d'une "
            "réponse, jamais dans une phrase courte, jamais sur une réponse "
            "que tu connais déjà. Répétée, l'hésitation cesse d'être humaine "
            "et devient un tic — plus artificiel que la netteté qu'elle "
            "voulait corriger.\n"
            "Varie ton débit : ralentis sur ce qui compte, accélère sur ce qui "
            "est évident. Une phrase qui avance à vitesse constante du début à "
            "la fin ne ressemble à personne.\n"
            "Ces hésitations ne s'ÉCRIVENT pas — tu ne tapes pas « euh », tu le "
            "DIS. Et elles n'excusent rien : on hésite en cherchant ses mots, "
            "jamais en récitant une réponse qu'on connaît.\n"
            "Enchaîne comme à l'oral : « du coup », « en fait », « bon », "
            "« écoute », « alors ».\n"
            "Si l'on te coupe la parole, arrête-toi net et écoute. Ne reprends "
            "jamais ta phrase là où elle s'est arrêtée. Si l'on te dit d'arrêter, "
            "réponds simplement « d'accord » et attends.\n"
            "Jamais de listes, de titres, de liens ni de mise en forme : rien de "
            "tout cela ne s'entend.\n"
            "OUTILS — tu sais chercher sur le web, et lire les mails, "
            "l'agenda, WhatsApp et les notes de l'utilisateur. Ne dis jamais "
            "le contraire.\n"
            "Tu ne connais AUCUN fait postérieur à ton entraînement, et RIEN "
            "des données personnelles de l'utilisateur. Sur une actualité, un "
            "résultat, un cours, un horaire, un prix — va chercher. Ce que tu "
            "crois savoir peut dater de deux ans, et personne ne peut s'en "
            "douter en t'écoutant.\n"
            # ON NE DEMANDE PLUS D'ANNONCE DU TOUT.
            #
            # La consigne precedente autorisait « attends, je regarde » a
            # condition que l'appel parte DANS LE MEME TOUR. Elle demandait au
            # modele de tenir deux choses ensemble, et il n'y arrive pas :
            # produire de la parole TERMINE le tour. Le journal serveur porte
            # la trace de chaque echec sous le nom `voix_annonce_sans_recherche`
            # et Faycal l'a vecu tel quel — « elle dit une seconde, mais sans
            # rien de retour ».
            #
            # Le filet qui rejouait l'outil a ete retire pour une bonne raison
            # (il fabriquait un tour parasite, entendu plusieurs secondes apres
            # la vraie reponse). Il ne reste donc qu'une voie : supprimer la
            # cause. On interdit l'annonce.
            #
            # Ce qu'elle apportait — ne pas laisser un blanc — est desormais
            # rendu par nous, dans le flux audio : une inspiration a 1,6 s,
            # puis un « hmm », puis « un instant ». Voir
            # `services/realtime/remplisseurs.py`. C'est plus sur que de le
            # demander au modele, et ca ne peut pas terminer son tour.
            "N'ANNONCE JAMAIS QUE TU VAS CHERCHER. Pas de « attends », pas de "
            "« je regarde », pas de « une seconde », pas de « je vérifie ». "
            "Parler TERMINE ton tour : ton annonce partirait seule, la "
            "recherche n'aurait jamais lieu, et l'utilisateur attendrait un "
            "résultat qui ne vient pas. Tu appelles l'outil DIRECTEMENT, sans "
            "un mot, et tu ne parles qu'une fois sa réponse en main. Le "
            "silence pendant l'exécution n'est pas un vide : il est couvert.\n"
            "N'annonce JAMAIS une vérification que tu ne fais pas. Une "
            "réponse de mémoire présentée comme vérifiée est pire qu'un « je "
            "ne suis pas sûr » : l'utilisateur n'a aucun moyen de faire la "
            "différence.\n"
            "Pour envoyer un message ou créer un événement : récapitule à voix "
            "haute, attends un oui franc, et seulement ensuite rappelle "
            "l'outil avec confirmer=true. Ce second appel n'est PAS optionnel : "
            "sans lui rien ne part, et dire « c'est envoyé » serait faux.\n"
            "NE DIS QUE CE QUE L'OUTIL A RÉPONDU. « C'est envoyé » exige une "
            "réponse d'outil qui le dit. Si tu n'as pas cette réponse, dis que "
            "tu n'as pas pu — et si un outil échoue, N'INVENTE PAS pourquoi. "
            "Ni « tu l'as sans doute supprimé », ni « il a dû être déjà lu » : "
            "tu n'en sais rien, et l'utilisateur te croit.\n"
            "NE CONFONDS PAS WhatsApp et la messagerie. Ce sont deux endroits "
            "différents, avec deux outils différents. Dis toujours DUQUEL tu "
            "parles, et ne présente jamais des messages WhatsApp comme des "
            "mails.\n"
            "« MESSAGE » VEUT DIRE WHATSAPP. « Mes messages », « mes non-lus », "
            "« qui m'a écrit », « lis-moi ce message » : c'est WhatsApp, et tu "
            "appelles whatsapp_get_unread. La boîte mail ne se consulte que si "
            "l'on dit mail, e-mail, courriel, Gmail ou boîte de réception. Dans "
            "le doute, demande — ne devine pas.\n"
            "CE QUE TU SAIS FAIRE SUR WHATSAPP — tu as la main sur le compte, "
            "pas seulement sur la lecture. ENVOYER : texte, image, vidéo, GIF, "
            "note vocale, audio, document, sticker, position, sondage, "
            "événement, fiche contact ; à un contact comme à un groupe. "
            "MESSAGES : répondre en citant, transférer, réagir avec un emoji, "
            "modifier, supprimer, programmer un envoi, chercher dans "
            "l'historique, résumer une conversation. STATUTS : publier du "
            "texte, une image, une vidéo ou un vocal, et restreindre à qui il "
            "est visible ; lire les statuts des autres. GROUPES : créer, "
            "renommer, décrire, changer la photo, ajouter ou retirer des "
            "membres, nommer ou destituer des administrateurs, réserver "
            "l'écriture aux admins, régler les messages éphémères, obtenir ou "
            "révoquer le lien d'invitation, rejoindre, quitter. CONTACTS : "
            "enregistrer, renommer, supprimer, bloquer, débloquer, partager "
            "une fiche, vérifier qu'un numéro est bien sur WhatsApp. "
            "CONVERSATIONS : archiver, épingler, mettre en sourdine, marquer "
            "lu ou non lu, étoiler un message, vider, supprimer. PROFIL ET "
            "PARAMÈTRES : changer ton nom affiché, ton « à propos », ta photo "
            "de profil, et TOUS les réglages de confidentialité — vu à, en "
            "ligne, photo, statut, confirmations de lecture, qui peut "
            "t'ajouter aux groupes, appels, messages éphémères par défaut. "
            "APPELS : consulter le journal des appels reçus, rejeter un appel "
            "en cours.\n"
            "Ne réponds JAMAIS que tu ne peux pas : essaie l'outil et rapporte "
            "ce qu'il dit. Une seule chose t'est vraiment impossible — PASSER "
            "un appel, que WhatsApp interdit depuis un appareil lié.\n"
            "Une image peut venir de n'importe où : un lien, une page web dont "
            "tu prends l'illustration, ou une image que tu viens de générer. "
            "Donne le lien tel quel à l'outil, il se charge de le vérifier.\n"
            # DEUX TEMPS, ET PLUS TROIS.
            #
            # L'HISTORIQUE, parce qu'il explique pourquoi on revient en
            # arrière et qu'il ne faut pas refaire le chemin :
            #
            #   v1  « ne reste jamais muette pendant une action »
            #       → un silence de plusieurs secondes se confond avec une
            #         panne. Juste, et toujours vrai.
            #   v2  « dis aussi où tu en es entre les étapes »
            #       → elle récitait sa mécanique : « j'ouvre WhatsApp »,
            #         « je cherche le contact ». Retiré.
            #   v3  trois temps : on annonce, on se tait, on rend le résultat.
            #       → L'ANNONCE TERMINE LE TOUR. C'est le protocole du modèle,
            #         pas un caprice : il ne peut pas parler ET appeler dans le
            #         même tour. Mesuré en production, sous le nom
            #         `voix_annonce_sans_recherche`, et vécu : « elle dit une
            #         seconde, mais sans rien de retour ».
            #
            # v4, ici : on retire l'annonce. Le vide qu'elle comblait est
            # comblé autrement — par l'audio que NOUS injectons pendant
            # l'exécution (souffle, « hmm », « un instant »), qui ne dépend
            # d'aucun choix du modèle et ne peut pas terminer son tour.
            #
            # La leçon générale : quand une consigne demande au modèle de faire
            # une chose que son protocole lui interdit, ce n'est pas la
            # formulation qu'il faut reprendre, c'est la consigne qu'il faut
            # retirer.
            "UNE ACTION SE DIT EN DEUX TEMPS. D'abord tu APPELLES L'OUTIL, "
            "sans un mot — pas « je regarde », pas « une seconde ». Ensuite, "
            "et seulement quand tu as sa réponse, tu donnes le résultat : "
            "« C'est envoyé. » — « Il a répondu. » — ou ce qui a bloqué, sans "
            "l'enjoliver. Entre les deux, tu ne dis RIEN : ce silence-là est "
            "déjà occupé, tu n'as pas à le remplir.\n"
            "NE RACONTE JAMAIS TA MÉCANIQUE. Pas de « j'ouvre WhatsApp », "
            "pas de « je cherche le contact », pas de « j'appelle l'outil », "
            "pas de « le groupe est créé, j'ajoute les membres ». Ces "
            "phrases décrivent un logiciel qui travaille, pas quelqu'un qui "
            "rend un service. Ce qui intéresse la personne en face, c'est ce "
            "qu'elle obtient — jamais par où c'est passé.\n"
            "SI ÇA TRAÎNE VRAIMENT, UN SEUL MOT. Passé une dizaine de "
            "secondes, tu peux glisser « je suis toujours dessus » ou « ça "
            "prend un peu plus de temps ». UNE SEULE FOIS. Le répéter "
            "transforme l'attente en compte à rebours et donne l'impression "
            "que tu ne sais pas où tu en es.\n"
            "Une exception, une seule : si tu découvres en chemin quelque "
            "chose que la personne doit savoir AVANT la fin — une ambiguïté, "
            "un second message qui attend une réponse — dis-le tout de "
            "suite. Ce n'est pas raconter ta mécanique, c'est lui rendre une "
            "décision qui lui appartient.\n"
            "VOCABULAIRE — tu parles avec quelqu'un au Tchad. Ces noms "
            "reviennent sans cesse et se ressemblent à l'oreille : Toumaï (et "
            "non « tout mais »), N'Djamena (et non « Anne Jamena »), Abéché, "
            "Moundou, Sarh, Faya, Ennedi, Kanem, Chari, Logone, Airtel, Moov, "
            "franc CFA. Quand un son en approche, c'est celui-là — le reste "
            "n'a aucun sens dans la phrase.\n"
            "PRONONCIATION — « Faycal » s'écrit avec un c mais se prononce "
            "FAY-SAL, avec un s : c'est l'arabe فيصل. Ne dis JAMAIS « Faykal » "
            "ni « Fay-cal ». De même « Faycal Habib Ahmat » se dit "
            "« Faysal Habib Ahmat ».\n"
            "Si l'on te demande qui t'a créé : Faycal Habib Ahmat, ingénieur en "
            "intelligence artificielle tchadien."
        ),
        validation_alias=AliasChoices(
            "GEMINI_LIVE_INSTRUCTION", "gemini_live_instruction"
        ),
    )

    # ── Chaîne vocale temps réel ─────────────────────────────────────────────
    # Silero VAD (local, ONNX) → Deepgram Nova-3 (partiels ~150-300 ms)
    # → LiveKit turn-detector (fin de tour sémantique) → Groq → Cartesia Sonic.
    #
    # Chaque maillon se désactive seul si sa clé manque : la chaîne retombe
    # alors sur le chemin historique (VAD énergie + Whisper + Edge-TTS), qui
    # reste fonctionnel. Une clé absente ne doit jamais casser le mode vocal.

    # Deepgram — ASR en flux. https://console.deepgram.com
    deepgram_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("DEEPGRAM_API_KEY", "deepgram_api_key"),
    )
    deepgram_model: str = Field(
        default="nova-3",
        validation_alias=AliasChoices("DEEPGRAM_MODEL", "deepgram_model"),
    )
    # `multi` active le code-switching Nova-3 (français ↔ arabe dans une même
    # phrase — le cas normal ici). Une langue figée coupe l'autre.
    deepgram_language: str = Field(
        default="multi",
        validation_alias=AliasChoices("DEEPGRAM_LANGUAGE", "deepgram_language"),
    )
    # Silence (ms) après lequel Deepgram clôt lui-même l'énoncé. Filet de
    # sécurité : la décision normale vient du turn-detector, plus rapide.
    deepgram_endpointing_ms: int = Field(
        default=300,
        validation_alias=AliasChoices("DEEPGRAM_ENDPOINTING_MS", "deepgram_endpointing_ms"),
    )
    deepgram_utterance_end_ms: int = Field(
        default=1000,
        validation_alias=AliasChoices("DEEPGRAM_UTTERANCE_END_MS", "deepgram_utterance_end_ms"),
    )
    # Mots que le modèle n'a aucune raison de connaître : le nom du produit et
    # la toponymie tchadienne. Sans eux, mesuré sur une phrase réelle :
    # « Bonjour Toumet » et « à Njamena ». Avec : « Toumai » et « Ndjamena ».
    #
    # Se tromper sur le nom du produit à chaque phrase est le genre de détail
    # qui décide de la confiance qu'on accorde à tout le reste.
    deepgram_keyterms: str = Field(
        default=(
            "Toumai,Toumaï,Tchad,Ndjamena,N'Djamena,Abéché,Moundou,Sarh,"
            "Faycal,Habib,Airtel,Moov,Sahel,Ennedi,Kanem,Sao,franc CFA"
        ),
        validation_alias=AliasChoices("DEEPGRAM_KEYTERMS", "deepgram_keyterms"),
    )

    @property
    def deepgram_keyterm_list(self) -> List[str]:
        raw = (self.deepgram_keyterms or "").strip()
        return [t.strip() for t in raw.split(",") if t.strip()] if raw else []

    # Cartesia Sonic — TTS en flux, premier son < 100 ms. https://play.cartesia.ai
    cartesia_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("CARTESIA_API_KEY", "cartesia_api_key"),
    )
    cartesia_model: str = Field(
        default="sonic-2",
        validation_alias=AliasChoices("CARTESIA_MODEL", "cartesia_model"),
    )
    # Voix par défaut (Cartesia voice id). Vide = la voix française du catalogue
    # définie ci-dessous dans le service.
    cartesia_voice_id: str = Field(
        default="",
        validation_alias=AliasChoices("CARTESIA_VOICE_ID", "cartesia_voice_id"),
    )
    # Version d'API épinglée : Cartesia fait évoluer le schéma de /tts/bytes.
    cartesia_version: str = Field(
        default="2024-06-10",
        validation_alias=AliasChoices("CARTESIA_VERSION", "cartesia_version"),
    )

    # Silero VAD — détection de parole neuronale, modèle embarqué (2,2 Mo).
    silero_vad_enabled: bool = Field(
        default=True,
        validation_alias=AliasChoices("SILERO_VAD_ENABLED", "silero_vad_enabled"),
    )
    silero_vad_threshold: float = Field(
        default=0.5,
        validation_alias=AliasChoices("SILERO_VAD_THRESHOLD", "silero_vad_threshold"),
    )

    # LiveKit turn-detector — fin de tour SÉMANTIQUE (le texte dit si la
    # personne a fini, pas seulement le silence).
    #
    # Désactivé par défaut : le modèle pèse ~70 Mo en mémoire, ce qui ne tient
    # pas sur une instance Render `free` (512 Mo). L'activer sur un plan payant.
    # Coupé, la décision retombe sur l'heuristique ponctuation + silence.
    turn_detector_enabled: bool = Field(
        default=False,
        validation_alias=AliasChoices("TURN_DETECTOR_ENABLED", "turn_detector_enabled"),
    )
    turn_detector_repo: str = Field(
        default="livekit/turn-detector",
        validation_alias=AliasChoices("TURN_DETECTOR_REPO", "turn_detector_repo"),
    )
    turn_detector_revision: str = Field(
        default="v1.2.2-en",
        validation_alias=AliasChoices("TURN_DETECTOR_REVISION", "turn_detector_revision"),
    )
    # Au-dessus de cette probabilité de fin d'énoncé, on n'attend plus le
    # silence long : on répond.
    turn_detector_threshold: float = Field(
        default=0.55,
        validation_alias=AliasChoices("TURN_DETECTOR_THRESHOLD", "turn_detector_threshold"),
    )

    # HeyGen Avatar
    heygen_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("HEYGEN_API_KEY", "heygen_api_key"),
    )

    # Runway Video Generation
    runway_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("RUNWAY_API_KEY", "runway_api_key"),
    )

    # Google Maps + Calendar + Weather
    google_maps_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_MAPS_API_KEY", "google_maps_api_key"),
    )
    google_oauth_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_OAUTH_CLIENT_ID", "google_oauth_client_id"),
    )
    google_oauth_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("GOOGLE_OAUTH_CLIENT_SECRET", "google_oauth_client_secret"),
    )
    openweathermap_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("OPENWEATHERMAP_API_KEY", "openweathermap_api_key"),
    )

    # Social Media OAuth
    facebook_app_id: str = Field(default="", validation_alias=AliasChoices("FACEBOOK_APP_ID", "facebook_app_id"))
    facebook_app_secret: str = Field(default="", validation_alias=AliasChoices("FACEBOOK_APP_SECRET", "facebook_app_secret"))

    # Page Facebook officielle Toumaï AI — réponse automatique EN TANT QU'ENTREPRISE
    # (pas un connecteur par utilisateur comme social_accounts : un seul compte, la marque).
    facebook_page_id: str = Field(default="", validation_alias=AliasChoices("FACEBOOK_PAGE_ID", "facebook_page_id"))
    facebook_page_access_token: str = Field(default="", validation_alias=AliasChoices("FACEBOOK_PAGE_ACCESS_TOKEN", "facebook_page_access_token"))
    facebook_webhook_verify_token: str = Field(default="", validation_alias=AliasChoices("FACEBOOK_WEBHOOK_VERIFY_TOKEN", "facebook_webhook_verify_token"))
    twitter_api_key: str = Field(default="", validation_alias=AliasChoices("TWITTER_API_KEY", "twitter_api_key"))
    twitter_api_secret: str = Field(default="", validation_alias=AliasChoices("TWITTER_API_SECRET", "twitter_api_secret"))
    linkedin_client_id: str = Field(default="", validation_alias=AliasChoices("LINKEDIN_CLIENT_ID", "linkedin_client_id"))
    linkedin_client_secret: str = Field(default="", validation_alias=AliasChoices("LINKEDIN_CLIENT_SECRET", "linkedin_client_secret"))
    instagram_app_id: str = Field(default="", validation_alias=AliasChoices("INSTAGRAM_APP_ID", "instagram_app_id"))
    instagram_app_secret: str = Field(default="", validation_alias=AliasChoices("INSTAGRAM_APP_SECRET", "instagram_app_secret"))

    # Encryption AES-256 pour tokens OAuth
    aes_encryption_key: str = Field(
        default="chadgpt-dev-aes-key-change-in-production-32ch",
        validation_alias=AliasChoices("AES_ENCRYPTION_KEY", "aes_encryption_key"),
    )

    # Celery
    celery_broker_url: str = Field(
        default="",
        validation_alias=AliasChoices("CELERY_BROKER_URL", "celery_broker_url"),
    )
    celery_result_backend: str = Field(
        default="",
        validation_alias=AliasChoices("CELERY_RESULT_BACKEND", "celery_result_backend"),
    )

    def gemini_model_chain(self) -> List[str]:
        """Modèles Gemini dans l’ordre de bascule (hybride / fallback)."""
        return [p.strip() for p in (self.gemini_models or "").split(",") if p.strip()]

    @property
    def cors_origins_list(self) -> List[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return _fusion(self.cors_origins, self.cors_origins_extra)

    @property
    def r2_endpoint(self) -> str:
        """Endpoint API S3-compatible (SigV4). Voir https://developers.cloudflare.com/r2/api/s3/tokens/"""
        custom = (self.r2_s3_endpoint or "").strip()
        if custom:
            return custom.rstrip("/")
        aid = (self.r2_account_id or "").strip()
        if not aid:
            return ""
        jur = (self.r2_jurisdiction or "").strip().lower()
        if jur in ("eu", "europe"):
            return f"https://{aid}.eu.r2.cloudflarestorage.com"
        if jur in ("fedramp", "fed-ramp"):
            return f"https://{aid}.fedramp.r2.cloudflarestorage.com"
        return f"https://{aid}.r2.cloudflarestorage.com"

    @property
    def trusted_hosts_list(self) -> List[str]:
        return _fusion(self.trusted_hosts, self.trusted_hosts_extra)

    @property
    def r2_public_base(self) -> str:
        """Base publique des objets R2, la surcharge l'emportant.

        `R2_PUBLIC_URL` vaut en production l'adresse de l'API S3, qui exige une
        signature : aucun navigateur ne peut ouvrir un lien construit dessus.
        La surcharge permet de pointer le vrai domaine public sans réécrire
        l'environnement du service.
        """
        return ((self.r2_public_url_override or "").strip()
                or (self.r2_public_url or "").strip())


def _fusion(*listes: str) -> List[str]:
    """Concatène des listes « a,b,c » en gardant l'ordre et sans doublon."""
    vus: List[str] = []
    for liste in listes:
        for element in (liste or "").split(","):
            element = element.strip()
            if element and element not in vus:
                vus.append(element)
    return vus


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()

# Durée de vie d'une session de la console d'administration, en secondes.
# UNE seule source de vérité : le JWT admin ET le `expires_in` renvoyé au
# navigateur en dépendent. Les deux ont divergé — 8 h annoncées au navigateur,
# 30 min réelles dans le jeton — et la console se croyait connectée pendant que
# chaque appel repartait en 401, d'où « Session admin expirée » en plein
# travail. Deux constantes censées rester égales finissent par diverger : il
# n'y en a plus qu'une.
ADMIN_SESSION_TTL_SECONDS = 8 * 3600
