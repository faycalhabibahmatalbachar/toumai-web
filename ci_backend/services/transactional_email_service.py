"""
E-mails transactionnels système : bienvenue à l'inscription, réinitialisation
de mot de passe. Distinct du connecteur Mail par utilisateur (services/tools/mail_tool.py)
— ici c'est TOUMAÏ AI qui écrit à SES utilisateurs, pas l'IA qui écrit pour eux.

Envoi via Resend (https://resend.com, 3000 e-mails/mois gratuits). Nécessite
RESEND_API_KEY + un domaine d'expéditeur vérifié (contact@toumaiai.com).
"""

import html
import logging
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

import httpx

from core.config import get_settings
from services import email_overrides
from services.email_overrides import TexteGabarit

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

_BRAND_TERRA = "#c2562f"
_BRAND_GOLD = "#d9a441"
_BRAND_INK = "#1f1b16"
_BRAND_MUTED = "#6b6255"
_BRAND_BORDER = "#e5dfd3"


def is_configured() -> bool:
    return bool(get_settings().resend_api_key)


_SOCIAL_LINKS = (
    ("WhatsApp", "https://wa.me/23591912191"),
    ("Facebook", "https://www.facebook.com/profile.php?id=61591724459792"),
    ("E-mail", "mailto:contact@toumaiai.com"),
)


def _wrapper(preheader: str, body_html: str) -> str:
    """Squelette commun : bandeau de marque, logo+nom, corps, footer boutons
    réseaux + liens légaux + coordonnées — boutons en pastille colorée (pas de
    SVG/image externe par canal) pour un rendu fiable dans tous les clients
    mail (Outlook desktop ignore le CSS avancé et le SVG).

    Le `<style>` en tête gère le mode sombre pour les clients qui l'honorent
    (Apple Mail, Outlook.com, la plupart des mobiles) ; ceux qui l'ignorent
    (Gmail desktop, Outlook desktop) affichent simplement la version claire —
    jamais de texte illisible dans un sens comme dans l'autre.
    """
    from datetime import datetime, timezone

    annee = datetime.now(timezone.utc).year
    social_buttons = "".join(
        f'<td style="padding:0 5px;">'
        f'<a href="{url}" style="display:inline-block;padding:8px 16px;border-radius:999px;'
        f'background:{_BRAND_TERRA if label == "WhatsApp" else ("#1877F2" if label == "Facebook" else _BRAND_INK)};'
        f'color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;">{label}</a>'
        f"</td>"
        for label, url in _SOCIAL_LINKS
    )
    return f"""\
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Toumaï AI</title>
<style>
  @media (prefers-color-scheme: dark) {{
    body, .tmi-bg {{ background:#211d18 !important; }}
    .tmi-card {{ background:#2a251f !important; border-color:#3f382f !important; }}
    .tmi-ink {{ color:#ede7db !important; }}
    .tmi-muted {{ color:#b5ac9c !important; }}
    .tmi-border-top {{ border-color:#3f382f !important; }}
    .tmi-footer {{ background:#211d18 !important; }}
  }}
</style>
</head>
<body class="tmi-bg" style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">{preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="tmi-bg" style="background:#faf7f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" class="tmi-card" style="max-width:480px;background:#ffffff;border-radius:20px;border:1px solid {_BRAND_BORDER};overflow:hidden;">
        <tr><td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,{_BRAND_TERRA},{_BRAND_GOLD});">&nbsp;</td></tr>
        <tr><td class="tmi-border-top" style="padding:26px 32px;text-align:center;border-bottom:1px solid {_BRAND_BORDER};">
          <img src="https://toumaiai.com/icon-48.png" width="32" height="32" alt="Toumaï AI" style="border-radius:8px;vertical-align:middle;">
          <span class="tmi-ink" style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:16px;font-weight:700;color:{_BRAND_INK};">Toumaï AI</span>
        </td></tr>
        <tr><td class="tmi-ink" style="padding:32px 32px 28px 32px;color:{_BRAND_INK};font-size:15px;line-height:1.6;">
          {body_html}
        </td></tr>
        <tr><td class="tmi-footer tmi-border-top" style="padding:22px 32px;border-top:1px solid {_BRAND_BORDER};text-align:center;background:#faf7f2;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px auto;">
            <tr>{social_buttons}</tr>
          </table>
          <p class="tmi-muted" style="margin:0 0 4px 0;font-size:11.5px;color:{_BRAND_MUTED};">
            Toumaï AI — L'assistant IA tchadien · <a href="https://toumaiai.com" style="color:{_BRAND_MUTED};">toumaiai.com</a>
          </p>
          <p class="tmi-muted" style="margin:0 0 10px 0;font-size:11.5px;color:{_BRAND_MUTED};">
            +235 68 66 37 37 &nbsp;·&nbsp; +235 91 91 21 91 &nbsp;·&nbsp; contact@toumaiai.com
          </p>
          <p class="tmi-muted" style="margin:0 0 12px 0;font-size:11px;color:{_BRAND_MUTED};">
            <a href="https://toumaiai.com/privacy-choices" style="color:{_BRAND_MUTED};text-decoration:underline;">Centre de confidentialité</a>
            &nbsp;|&nbsp;
            <a href="mailto:contact@toumaiai.com" style="color:{_BRAND_MUTED};text-decoration:underline;">Nous contacter</a>
            &nbsp;|&nbsp;
            <a href="https://toumaiai.com/terms" style="color:{_BRAND_MUTED};text-decoration:underline;">Conditions</a>
          </p>
          <!-- MENTION LÉGALE ET ADRESSE POSTALE.
               Ce n'est pas de l'ornement : un courrier commercial doit porter
               l'identité et l'adresse physique de l'expéditeur — c'est ce
               qu'exigent le CAN-SPAM américain et le RGPD, et c'est aussi l'un
               des signaux que les filtres anti-spam vérifient. Son absence
               pesait sur la délivrabilité autant que sur la conformité. -->
          <p class="tmi-muted" style="margin:0 0 3px 0;font-size:11px;color:{_BRAND_MUTED};">
            © {annee} Toumaï AI. Tous droits réservés.
          </p>
          <p class="tmi-muted" style="margin:0;font-size:11px;color:{_BRAND_MUTED};">
            Toumaï AI, N'Djaména, Tchad.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _cta(label: str, url: str) -> str:
    """Bouton d'action — table + fond plein, seule forme fiable dans Outlook."""
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:{_BRAND_TERRA};border-radius:999px;">
    <a href="{url}" style="display:inline-block;padding:12px 28px;color:#ffffff;
      text-decoration:none;font-weight:600;font-size:14px;">{label}</a>
  </td></tr>
</table>"""


def _title(text: str) -> str:
    return (
        f'<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;'
        f'color:{_BRAND_INK};">{text}</h1>'
    )


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px 0;">{text}</p>'


def _note(text: str) -> str:
    return f'<p style="margin:0;color:{_BRAND_MUTED};font-size:13px;">{text}</p>'


def _details(rows: "list[tuple[str, str]]") -> str:
    """Encadré « voici exactement ce qui s'est passé ».

    Les e-mails de sécurité les plus utiles sont ceux qui permettent de trancher
    en trois secondes : est-ce moi, oui ou non ? Une phrase où appareil, heure et
    lieu sont noyés dans la prose oblige à relire. Un tableau se balaie du regard.
    Les lignes vides sont écartées : afficher « Lieu : — » ne renseigne personne
    et donne l'impression d'un gabarit mal rempli.
    """
    lignes = "".join(
        f"""<tr>
          <td style="padding:7px 0;font-size:13px;color:{_BRAND_MUTED};white-space:nowrap;
            vertical-align:top;width:38%;">{html.escape(str(cle))}</td>
          <td style="padding:7px 0;font-size:13px;color:{_BRAND_INK};font-weight:500;">{html.escape(str(val))}</td>
        </tr>"""
        for cle, val in rows
        if val and val.strip()
    )
    if not lignes:
        return ""
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
  style="margin:0 0 20px 0;background:#faf7f2;border:1px solid {_BRAND_BORDER};
  border-radius:12px;padding:6px 18px;">
  {lignes}
</table>"""


#: Objet réutilisé quand aucune surcharge n'existe — immuable, donc partageable.
_AUCUNE = TexteGabarit()


def _surcharge(template_id: str) -> TexteGabarit:
    """Textes personnalisés par un administrateur pour ce gabarit.

    Isolé dans une fonction pour une raison précise : si la base est
    indisponible, un e-mail doit partir quand même. Un mot de passe oublié qui
    n'arrive pas parce qu'une table de personnalisation ne répond pas serait un
    échec bien plus grave que l'absence de personnalisation.
    """
    try:
        return email_overrides.pour(template_id)
    except Exception:
        logger.warning("Surcharge e-mail « %s » illisible", template_id, exc_info=True)
        return _AUCUNE


def _sujet(template_id: str, defaut: str) -> str:
    return _surcharge(template_id).subject or defaut


def _cta(label: str, url: str) -> str:
    """Bouton d'action — table + fond plein, seule forme fiable dans Outlook."""
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background:{_BRAND_TERRA};border-radius:999px;">
    <a href="{url}" style="display:inline-block;padding:12px 28px;color:#ffffff;
      text-decoration:none;font-weight:600;font-size:14px;">{label}</a>
  </td></tr>
</table>"""


def _title(text: str) -> str:
    return (
        f'<h1 style="margin:0 0 16px 0;font-size:22px;font-weight:600;'
        f'color:{_BRAND_INK};">{text}</h1>'
    )


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px 0;">{text}</p>'


def _note(text: str) -> str:
    return f'<p style="margin:0;color:{_BRAND_MUTED};font-size:13px;">{text}</p>'


def _details(rows: "list[tuple[str, str]]") -> str:
    """Encadré « voici exactement ce qui s'est passé ».

    Les e-mails de sécurité les plus utiles sont ceux qui permettent de trancher
    en trois secondes : est-ce moi, oui ou non ? Une phrase où appareil, heure et
    lieu sont noyés dans la prose oblige à relire. Un tableau se balaie du regard.
    Les lignes vides sont écartées : afficher « Lieu : — » ne renseigne personne
    et donne l'impression d'un gabarit mal rempli.
    """
    lignes = "".join(
        f"""<tr>
          <td style="padding:7px 0;font-size:13px;color:{_BRAND_MUTED};white-space:nowrap;
            vertical-align:top;width:38%;">{html.escape(str(cle))}</td>
          <td style="padding:7px 0;font-size:13px;color:{_BRAND_INK};font-weight:500;">{html.escape(str(val))}</td>
        </tr>"""
        for cle, val in rows
        if val and val.strip()
    )
    if not lignes:
        return ""
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
  style="margin:0 0 20px 0;background:#faf7f2;border:1px solid {_BRAND_BORDER};
  border-radius:12px;padding:6px 18px;">
  {lignes}
</table>"""


def _welcome_body(name: str, t: TexteGabarit = _AUCUNE) -> str:
    display_name = name.strip().split(" ")[0] if name.strip() else "et bienvenue"
    return (
        _title(t.title or f"Bonjour {display_name},")
        + _p(t.intro or
            "Votre compte est actif. Toumaï AI est un assistant conçu au Tchad, "
            "qui vous répond en français, en anglais et en arabe — y compris "
            "l'arabe tchadien, que peu d'assistants comprennent."
        )
        + _p(
            "Le plus simple pour commencer est de lui demander quelque chose de "
            "concret : résumer un document, rédiger une réponse, expliquer un "
            "texte administratif. Il sait aussi générer des images, et se relier "
            "à votre WhatsApp, votre messagerie et votre agenda quand vous le "
            "souhaitez."
        )
        + _cta(t.cta_label or "Commencer une conversation", "https://toumaiai.com/chat")
        + _note(t.note or
            "Une question, une remarque ? Répondez à cet e-mail : il arrive dans "
            "une vraie boîte, lue par l'équipe."
        )
    )


def _reset_body(name: str, reset_link: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Réinitialisation de votre mot de passe")
        + _p(t.intro or
            f"{hello}, nous avons reçu une demande de réinitialisation pour votre "
            "compte Toumaï AI. Le lien ci-dessous est valable une heure et ne "
            "fonctionne qu'une seule fois."
        )
        + _cta(t.cta_label or "Choisir un nouveau mot de passe", reset_link)
        + _note(t.note or
            "Vous n'êtes pas à l'origine de cette demande ? Vous pouvez ignorer "
            "cet e-mail : votre mot de passe actuel reste valable et personne "
            "n'a eu accès à votre compte."
        )
    )


def _security_footer_note() -> str:
    return _note(
        "Ce n'était pas vous ? Changez votre mot de passe sans attendre, puis "
        'écrivez-nous à <a href="mailto:contact@toumaiai.com" '
        f'style="color:{_BRAND_MUTED};">contact@toumaiai.com</a> — nous examinons '
        "ces signalements en priorité."
    )


def _password_changed_body(name: str, when: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Votre mot de passe a été modifié")
        + _p(t.intro or
            f"{hello}, le mot de passe de votre compte Toumaï AI vient d'être "
            "changé. Aucune action n'est nécessaire si vous en êtes à l'origine."
        )
        + _details([("Date du changement", when)])
        + _p(
            "Par sécurité, les sessions ouvertes sur vos autres appareils devront "
            "être réauthentifiées."
        )
        + _security_footer_note()
    )


_MOIS_FR = (
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
)


def _format_security_datetime(when: str, timezone_name: str = "") -> str:
    """Horodatage lisible et non ambigu pour un événement de sécurité."""
    try:
        instant = datetime.fromisoformat(str(when).replace("Z", "+00:00"))
        if instant.tzinfo is None:
            instant = instant.replace(tzinfo=timezone.utc)
        instant = instant.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return str(when or "").strip()

    zone = timezone.utc
    label = "UTC"
    if timezone_name:
        try:
            zone = ZoneInfo(timezone_name)
            label = timezone_name
        except Exception:
            zone = timezone.utc
            label = "UTC"

    local = instant.astimezone(zone)
    offset = local.utcoffset()
    if offset is None:
        offset_label = "UTC"
    else:
        total_minutes = int(offset.total_seconds() // 60)
        sign = "+" if total_minutes >= 0 else "-"
        total_minutes = abs(total_minutes)
        hours, minutes = divmod(total_minutes, 60)
        offset_label = f"UTC{sign}{hours:02d}:{minutes:02d}"

    return (
        f"{local.day} {_MOIS_FR[local.month - 1]} {local.year} "
        f"à {local:%H:%M:%S} ({label}, {offset_label})"
    )


def _new_login_body(
    name: str,
    device: str,
    when: str,
    place: str,
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
    event_reference: str = "",
    t: TexteGabarit = _AUCUNE,
) -> str:
    hello_raw = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    hello = html.escape(hello_raw)
    readable_when = _format_security_datetime(when, timezone_name)
    details = [
        ("Appareil", device),
        ("Date et heure", readable_when),
        ("Adresse IP publique", ip_address),
        ("Lieu", place),
        ("Réseau / ASN", network),
        ("VPN / Proxy / Tor", privacy),
    ]

    return (
        _title(t.title or "Nouvelle connexion à votre compte")
        + _p(t.intro or
            f"{hello}, votre compte Toumaï AI vient d'être utilisé depuis un "
            "appareil que nous ne connaissions pas encore."
        )
        + _details(details)
        + _note(
            "Connexion inconnue ? Sécurisez immédiatement votre compte depuis "
            "Sécurité → Appareils et sessions."
        )
    )



def _security_test_body(
    name: str,
    device: str,
    when: str,
    place: str,
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
) -> str:
    hello_raw = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    hello = html.escape(hello_raw)
    readable_when = _format_security_datetime(when, timezone_name)
    return (
        _title("Test des alertes de sécurité")
        + _p(
            f"{hello}, ce message vérifie que les alertes de sécurité Toumaï AI "
            "arrivent correctement sur votre e-mail."
        )
        + _details([
            ("Appareil", device),
            ("Date et heure", readable_when),
            ("Adresse IP publique", ip_address),
            ("Lieu", place),
            ("Réseau / ASN", network),
            ("VPN / Proxy / Tor", privacy),
        ])
        + _note(
            "Si vous voyez cet e-mail, le canal e-mail de sécurité fonctionne."
        )
    )

def _account_blocked_body(name: str, reason: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Votre compte a été suspendu")
        + _p(t.intro or
            f"{hello}, l'accès à votre compte Toumaï AI a été suspendu par notre "
            "équipe. Vous ne pouvez plus vous connecter tant que la suspension "
            "est en vigueur."
        )
        + _details([("Motif", reason)])
        + _p(
            "<strong>Vos données sont conservées.</strong> Conversations, "
            "documents et connecteurs restent intacts et vous seront rendus tels "
            "quels si l'accès est rétabli."
        )
        + _note(t.note or
            "Vous pensez qu'il s'agit d'une erreur ? Répondez à cet e-mail ou "
            "écrivez-nous sur WhatsApp au +235 91 91 21 91. Nous réexaminons "
            "chaque contestation, et nous vous répondons dans tous les cas."
        )
    )


def _account_reactivated_body(name: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Votre accès est rétabli")
        + _p(t.intro or
            f"{hello}, la suspension de votre compte Toumaï AI a été levée. Vous "
            "pouvez vous reconnecter dès maintenant."
        )
        + _p(
            "Vos conversations, vos documents et vos connecteurs sont intacts : "
            "vous reprenez exactement là où vous vous étiez arrêté."
        )
        + _cta(t.cta_label or "Retourner sur Toumaï AI", "https://toumaiai.com/chat")
        + _note(t.note or "Merci de votre patience pendant cette vérification.")
    )


def _email_verification_body(name: str, verify_link: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Confirmez votre adresse e-mail")
        + _p(t.intro or
            f"{hello}, il reste une étape pour sécuriser votre compte : confirmer "
            "que cette adresse vous appartient. C'est elle qui vous permettra de "
            "récupérer l'accès si vous perdez votre mot de passe."
        )
        + _cta(t.cta_label or "Confirmer mon adresse", verify_link)
        + _note(t.note or
            "Le lien est valable 24 heures. Vous n'avez pas créé de compte "
            "Toumaï AI ? Ignorez cet e-mail, aucun compte ne sera activé."
        )
    )


def _connector_linked_body(name: str, connector: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or f"{connector} est relié à votre compte")
        + _p(t.intro or
            f"{hello}, Toumaï AI peut désormais agir sur {connector} dans la "
            "limite des autorisations que vous avez accordées."
        )
        + _details([("Connecteur", connector), ("Autorisé par", "vous, depuis l'application")])
        + _p(
            "Vous gardez la main : les autorisations se retirent à tout moment "
            "depuis les Connecteurs, et la coupure est immédiate."
        )
        + _cta(t.cta_label or "Gérer mes connecteurs", "https://toumaiai.com/settings?tab=connectors")
        + _security_footer_note()
    )


def _admin_reset_body(name: str, reset_link: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Réinitialisation — console d'administration")
        + _p(t.intro or
            f"{hello}, une réinitialisation du mot de passe de votre accès "
            "administrateur a été demandée. Le lien est valable une heure et ne "
            "fonctionne qu'une seule fois."
        )
        + _cta(t.cta_label or "Choisir un nouveau mot de passe", reset_link)
        + _note(t.note or
            "Vous n'êtes pas à l'origine de cette demande ? Ne suivez pas le lien "
            "et prévenez l'équipe : une tentative sur un compte administrateur "
            "mérite d'être tracée, même si elle échoue."
        )
    )


def _admin_invite_body(name: str, role: str, invite_link: str, t: TexteGabarit = _AUCUNE) -> str:
    hello = name.strip().split(" ")[0] if name.strip() else "Bonjour"
    return (
        _title(t.title or "Votre accès à la console Toumaï AI")
        + _p(t.intro or
            f"{hello}, un accès à la console d'administration vous a été ouvert. "
            "Il vous reste à choisir votre mot de passe pour l'activer."
        )
        + _details([("Rôle attribué", role)])
        + _p(
            "La console donne accès à des données d'utilisateurs réels. "
            "L'authentification à deux facteurs vous sera proposée dès votre "
            "première connexion : activez-la."
        )
        + _cta(t.cta_label or "Activer mon accès", invite_link)
        + _note(t.note or
            "Ce lien est personnel et nominatif. Ne le transmettez à personne, "
            "même au sein de l'équipe."
        )
    )


async def _send(to_email: str, subject: str, html: str) -> bool:
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("E-mail transactionnel non envoyé (RESEND_API_KEY manquant): %s -> %s", subject, to_email)
        return False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                RESEND_API_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.transactional_email_from,
                    "to": [to_email],
                    "subject": subject,
                    "html": html,
                },
            )
        if r.status_code >= 400:
            logger.warning("Resend a refusé l'envoi (%s): %s", r.status_code, r.text[:300])
            return False
        return True
    except Exception as e:
        logger.warning("Envoi e-mail transactionnel échoué: %s", e)
        return False


async def send_welcome_email(to_email: str, name: str = "") -> bool:
    html = _wrapper("Bienvenue sur Toumaï AI !", _welcome_body(name, t=_surcharge("welcome")))
    return await _send(to_email, _sujet("welcome", "Bienvenue sur Toumaï AI 👋"), html)


async def send_password_reset_email(to_email: str, reset_link: str, name: str = "") -> bool:
    html = _wrapper("Réinitialisez votre mot de passe Toumaï AI", _reset_body(name, reset_link, t=_surcharge("password_reset")))
    return await _send(to_email, _sujet("password_reset", "Réinitialisation de votre mot de passe — Toumaï AI"), html)


async def send_password_changed_email(to_email: str, when: str, name: str = "") -> bool:
    html = _wrapper("Votre mot de passe Toumaï AI a changé", _password_changed_body(name, when, t=_surcharge("password_changed")))
    return await _send(to_email, _sujet("password_changed", "Votre mot de passe a été modifié — Toumaï AI"), html)


async def send_new_login_email(
    to_email: str,
    device: str,
    when: str,
    place: str = "",
    name: str = "",
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
    event_reference: str = "",
) -> bool:
    rendered = _wrapper(
        "Nouvelle connexion à votre compte Toumaï AI",
        _new_login_body(
            name,
            device,
            when,
            place,
            ip_address=ip_address,
            network=network,
            privacy=privacy,
            timezone_name=timezone_name,
            event_reference=event_reference,
            t=_surcharge("new_login"),
        ),
    )
    return await _send(
        to_email,
        _sujet("new_login", "Nouvelle connexion à votre compte — Toumaï AI"),
        rendered,
    )


async def send_security_test_email(
    to_email: str,
    device: str,
    when: str,
    place: str = "",
    name: str = "",
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
) -> bool:
    rendered = _wrapper(
        "Test des alertes de sécurité Toumaï AI",
        _security_test_body(
            name,
            device,
            when,
            place,
            ip_address=ip_address,
            network=network,
            privacy=privacy,
            timezone_name=timezone_name,
        ),
    )
    return await _send(
        to_email,
        "Test des alertes de sécurité — Toumaï AI",
        rendered,
    )


async def send_account_blocked_email(to_email: str, reason: str = "", name: str = "") -> bool:
    html = _wrapper("Votre compte Toumaï AI a été suspendu", _account_blocked_body(name, reason, t=_surcharge("account_blocked")))
    return await _send(to_email, _sujet("account_blocked", "Votre compte a été suspendu — Toumaï AI"), html)


async def send_account_reactivated_email(to_email: str, name: str = "") -> bool:
    html = _wrapper("Votre compte Toumaï AI est réactivé", _account_reactivated_body(name, t=_surcharge("account_reactivated")))
    return await _send(to_email, _sujet("account_reactivated", "Votre compte est réactivé — Toumaï AI"), html)


async def send_email_verification_email(to_email: str, verify_link: str, name: str = "") -> bool:
    html = _wrapper("Confirmez votre adresse e-mail", _email_verification_body(name, verify_link, t=_surcharge("email_verification")))
    return await _send(to_email, _sujet("email_verification", "Confirmez votre adresse e-mail — Toumaï AI"), html)


async def send_connector_linked_email(to_email: str, connector: str, name: str = "") -> bool:
    html = _wrapper(f"{connector} est relié à votre compte", _connector_linked_body(name, connector, t=_surcharge("connector_linked")))
    return await _send(to_email, _sujet("connector_linked", f"{connector} est relié à votre compte — Toumaï AI"), html)


async def send_admin_reset_email(to_email: str, reset_link: str, name: str = "") -> bool:
    html = _wrapper("Réinitialisation de votre accès administrateur", _admin_reset_body(name, reset_link, t=_surcharge("admin_reset")))
    return await _send(to_email, _sujet("admin_reset", "Réinitialisation — console Toumaï AI"), html)


async def send_admin_invite_email(to_email: str, role: str, invite_link: str, name: str = "") -> bool:
    html = _wrapper("Votre accès à la console Toumaï AI", _admin_invite_body(name, role, invite_link, t=_surcharge("admin_invite")))
    return await _send(to_email, _sujet("admin_invite", "Votre accès administrateur — Toumaï AI"), html)


# ─── Rendu sans envoi ─────────────────────────────────────────────────────────
#
# Les gabarits vivaient dans des fonctions privées : impossible de les VOIR
# ailleurs qu'en production, chez un utilisateur, avec un logo cassé ou une
# variable non remplacée. Ces fonctions rendent le HTML exact qui partirait, ce
# qui permet à la console admin d'en faire un aperçu et aux tests de vérifier
# que chaque gabarit produit bien un document complet.
#
# Chacune reprend le même `_wrapper(preheader, corps)` que son homologue
# `send_*` : si les deux divergeaient, l'aperçu mentirait — c'est pourquoi le
# test `test_emails.py` compare les deux.


def render_welcome(name: str = "") -> str:
    return _wrapper("Bienvenue sur Toumaï AI !", _welcome_body(name, t=_surcharge("welcome")))


def render_password_reset(name: str, reset_link: str) -> str:
    return _wrapper("Réinitialisez votre mot de passe Toumaï AI", _reset_body(name, reset_link, t=_surcharge("password_reset")))


def render_password_changed(name: str, when: str) -> str:
    return _wrapper("Votre mot de passe Toumaï AI a changé", _password_changed_body(name, when, t=_surcharge("password_changed")))


def render_new_login(
    name: str,
    device: str,
    when: str,
    place: str = "",
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
    event_reference: str = "",
) -> str:
    return _wrapper(
        "Nouvelle connexion à votre compte Toumaï AI",
        _new_login_body(
            name,
            device,
            when,
            place,
            ip_address=ip_address,
            network=network,
            privacy=privacy,
            timezone_name=timezone_name,
            event_reference=event_reference,
            t=_surcharge("new_login"),
        ),
    )


def render_security_test(
    name: str,
    device: str,
    when: str,
    place: str = "",
    *,
    ip_address: str = "",
    network: str = "",
    privacy: str = "",
    timezone_name: str = "",
) -> str:
    return _wrapper(
        "Test des alertes de sécurité Toumaï AI",
        _security_test_body(
            name,
            device,
            when,
            place,
            ip_address=ip_address,
            network=network,
            privacy=privacy,
            timezone_name=timezone_name,
        ),
    )


def render_account_blocked(name: str, reason: str = "") -> str:
    return _wrapper("Votre compte Toumaï AI a été suspendu", _account_blocked_body(name, reason, t=_surcharge("account_blocked")))


def render_account_reactivated(name: str = "") -> str:
    return _wrapper("Votre compte Toumaï AI est réactivé", _account_reactivated_body(name, t=_surcharge("account_reactivated")))


def render_email_verification(name: str, verify_link: str) -> str:
    return _wrapper("Confirmez votre adresse e-mail", _email_verification_body(name, verify_link, t=_surcharge("email_verification")))


def render_connector_linked(name: str, connector: str) -> str:
    return _wrapper(
        f"{connector} est relié à votre compte", _connector_linked_body(name, connector, t=_surcharge("connector_linked"))
    )


def render_admin_reset(name: str, reset_link: str) -> str:
    return _wrapper(
        "Réinitialisation de votre accès administrateur", _admin_reset_body(name, reset_link, t=_surcharge("admin_reset"))
    )


def render_admin_invite(name: str, role: str, invite_link: str) -> str:
    return _wrapper(
        "Votre accès à la console Toumaï AI", _admin_invite_body(name, role, invite_link, t=_surcharge("admin_invite"))
    )


async def send_raw(to_email: str, subject: str, html: str) -> bool:
    """Envoie un HTML déjà rendu.

    Réservé aux envois de test depuis la console : le corps est fourni tel quel,
    donc aucun gabarit ne peut être contourné par accident dans le code métier,
    qui doit continuer à passer par les `send_*`.
    """
    return await _send(to_email, subject, html)
