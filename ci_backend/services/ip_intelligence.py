"""Contexte réseau haute fiabilité pour les alertes de sécurité.

Objectif: ne jamais transformer une géolocalisation IP approximative en
affirmation trop précise.

Sources indépendantes:
- MaxMind GeoIP/GeoLite local (si des fichiers MMDB sont montés);
- ipapi.is;
- ipwho.is;
- RIPEstat/RIS pour vérifier le préfixe et l'ASN réellement annoncés.

La ville n'est conservée que si au moins deux sources indépendantes concordent.
En cas de désaccord, on descend vers région/pays. L'ASN affiché est vérifié via
RIPEstat (ou par consensus de deux fournisseurs si RIPE est indisponible).

Aucune latitude/longitude n'est exposée aux templates d'e-mail ou Push.
"""

from __future__ import annotations

import asyncio
import ipaddress
import logging
import os
import re
import time
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

import httpx

try:
    import geoip2.database
except Exception:  # pragma: no cover - dépendance optionnelle au runtime
    geoip2 = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

_IPAPI_URL = "https://api.ipapi.is/"
_IPWHOIS_URL = "https://ipwho.is/{ip}"
_RIPE_NETWORK_URL = "https://stat.ripe.net/data/network-info/data.json"
_RIPE_PREFIX_URL = "https://stat.ripe.net/data/prefix-overview/data.json"
_AFRINIC_AUTNUM_URL = "https://rdap.afrinic.net/rdap/autnum/{asn}"

_CACHE_TTL_SECONDS = 6 * 60 * 60
_CACHE_MAX = 1024
_cache: dict[str, tuple[float, dict[str, str]]] = {}

_TECHNICAL_ORG_RE = re.compile(
    r"(?:^|[\s_.-])(?:subscriber|subscribers|customer|customers|client|clients|"
    r"pool|block|dynamic|dhcp|broadband_pool|mobile_pool|ip_pool)(?:[\s_.-]|$)",
    re.IGNORECASE,
)


def _enabled() -> bool:
    raw = os.environ.get("SECURITY_IP_GEOLOCATION_ENABLED", "true").strip().lower()
    return raw not in {"0", "false", "no", "off"}


def _clean(value: Any, limit: int = 160) -> str:
    text = str(value or "").strip()
    return text[:limit]


def _public_ip(value: str) -> str:
    try:
        address = ipaddress.ip_address((value or "").strip())
    except ValueError:
        return ""
    return str(address) if address.is_global else ""


def _cached(ip: str) -> dict[str, str] | None:
    item = _cache.get(ip)
    if not item:
        return None
    created, data = item
    if time.monotonic() - created > _CACHE_TTL_SECONDS:
        _cache.pop(ip, None)
        return None
    return dict(data)


def _store(ip: str, data: dict[str, str]) -> None:
    if len(_cache) >= _CACHE_MAX:
        oldest = min(_cache, key=lambda key: _cache[key][0])
        _cache.pop(oldest, None)
    _cache[ip] = (time.monotonic(), dict(data))


def _norm(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().casefold()
    return re.sub(r"\s+", " ", text)


def _vote_location_pair(
    signals: list[dict[str, str]],
    field: str,
    *,
    minimum: int = 2,
) -> tuple[str, int]:
    """Confirme ville/région seulement avec le même pays (code ou nom)."""
    candidates: list[tuple[str, str, str]] = []
    for item in signals:
        value = (item.get(field) or "").strip()
        if not value:
            continue
        country_key = _norm(item.get("country_code") or item.get("country"))
        if not country_key:
            continue
        candidates.append((_norm(value), country_key, value))
    if not candidates:
        return "", 0
    counts = Counter((value_key, country_key) for value_key, country_key, _ in candidates)
    (winner_value, winner_country), votes = counts.most_common(1)[0]
    if votes < minimum:
        return "", votes
    for value_key, country_key, original in candidates:
        if value_key == winner_value and country_key == winner_country:
            return original, votes
    return "", votes


def _asn_number(value: Any) -> str:
    raw = str(value or "").strip().upper()
    if not raw:
        return ""
    match = re.search(r"(?:AS)?\s*(\d{1,10})", raw)
    return f"AS{match.group(1)}" if match else ""


def _safe_org(value: Any) -> str:
    label = _clean(value, 180)
    if not label or _TECHNICAL_ORG_RE.search(label):
        return ""
    label = re.sub(r"\s+", " ", label.replace("_", " ")).strip()

    # RIPE peut renvoyer "ORG - ORG" pour certains holders. Un doublon
    # d'annuaire n'apporte aucune information à l'utilisateur.
    parts = [part.strip() for part in re.split(r"\s+-\s+", label) if part.strip()]
    if len(parts) == 2 and _norm(parts[0]) == _norm(parts[1]):
        label = parts[0]
    return label


def _rdap_vcard_fn(entity: dict[str, Any]) -> str:
    """Nom d'organisation dans une entité RDAP vCard."""
    vcard = entity.get("vcardArray")
    if not isinstance(vcard, list) or len(vcard) != 2 or not isinstance(vcard[1], list):
        return ""
    for item in vcard[1]:
        if (
            isinstance(item, list)
            and len(item) >= 4
            and str(item[0]).casefold() == "fn"
        ):
            return _safe_org(item[3])
    return ""


def _rdap_registrant_name(payload: dict[str, Any]) -> str:
    """Résout le détenteur légal de l'ASN, jamais une personne technique."""
    entities = payload.get("entities")
    if not isinstance(entities, list):
        return ""

    # Le registrant organisation est la source la plus autoritative.
    for entity in entities:
        if not isinstance(entity, dict):
            continue
        roles = {
            str(role).casefold()
            for role in (entity.get("roles") or [])
            if role
        }
        if "registrant" not in roles:
            continue
        name = _rdap_vcard_fn(entity)
        if name:
            return name
    return ""


def _vote(signals: list[dict[str, str]], key: str, *, minimum: int) -> tuple[str, int]:
    values = [(item.get(key) or "").strip() for item in signals if (item.get(key) or "").strip()]
    if not values:
        return "", 0
    normalized = [_norm(value) for value in values]
    counts = Counter(normalized)
    winner, votes = counts.most_common(1)[0]
    if votes < minimum:
        return "", votes
    for value in values:
        if _norm(value) == winner:
            return value, votes
    return "", votes


def _maxmind_signal(ip: str) -> dict[str, str]:
    if geoip2 is None:
        return {}

    result: dict[str, str] = {"source": "maxmind"}
    city_path = os.environ.get("SECURITY_GEOIP_CITY_DB", "").strip()
    asn_path = os.environ.get("SECURITY_GEOIP_ASN_DB", "").strip()

    if city_path and Path(city_path).is_file():
        try:
            with geoip2.database.Reader(city_path) as reader:  # type: ignore[union-attr]
                response = reader.city(ip)
                city_names = getattr(response.city, "names", {}) or {}
                country_names = getattr(response.country, "names", {}) or {}
                subdivision = response.subdivisions.most_specific
                subdivision_names = getattr(subdivision, "names", {}) or {}
                result.update(
                    {
                        "city": _clean(city_names.get("fr") or city_names.get("en")),
                        "region": _clean(
                            subdivision_names.get("fr") or subdivision_names.get("en")
                        ),
                        "country": _clean(
                            country_names.get("fr") or country_names.get("en")
                        ),
                        "country_code": _clean(getattr(response.country, "iso_code", ""), 8),
                        "timezone": _clean(getattr(response.location, "time_zone", ""), 80),
                        "accuracy_radius_km": _clean(
                            getattr(response.location, "accuracy_radius", ""), 16
                        ),
                    }
                )
        except Exception as exc:  # noqa: BLE001
            logger.info("MaxMind City indisponible pour %s (%s)", ip, type(exc).__name__)

    if asn_path and Path(asn_path).is_file():
        try:
            with geoip2.database.Reader(asn_path) as reader:  # type: ignore[union-attr]
                response = reader.asn(ip)
                result["asn"] = _asn_number(
                    getattr(response, "autonomous_system_number", "")
                )
                result["org"] = _safe_org(
                    getattr(response, "autonomous_system_organization", "")
                )
        except Exception as exc:  # noqa: BLE001
            logger.info("MaxMind ASN indisponible pour %s (%s)", ip, type(exc).__name__)

    cleaned = {k: v for k, v in result.items() if v}
    # Sans DB MMDB montée, ne pas compter "maxmind" comme source vide.
    return cleaned if len(cleaned) > 1 else {}


async def _ipapi_signal(client: httpx.AsyncClient, ip: str) -> dict[str, str]:
    try:
        params: dict[str, str] = {"q": ip}
        api_key = os.environ.get("SECURITY_IPAPI_KEY", "").strip()
        if api_key:
            params["key"] = api_key
        response = await client.get(
            _IPAPI_URL,
            params=params,
            headers={"User-Agent": "ToumaiAI-Security/2.0"},
        )
        if response.status_code != 200:
            return {}
        payload = response.json()
        if not isinstance(payload, dict) or payload.get("error"):
            return {}
    except Exception as exc:  # noqa: BLE001
        logger.info("ipapi.is indisponible pour %s (%s)", ip, type(exc).__name__)
        return {}

    location = payload.get("location") if isinstance(payload.get("location"), dict) else {}
    asn_raw = payload.get("asn")
    company_raw = payload.get("company")

    asn = ""
    org = ""
    if isinstance(asn_raw, dict):
        asn = _asn_number(asn_raw.get("asn"))
        org = _safe_org(asn_raw.get("org") or asn_raw.get("descr"))
    else:
        asn = _asn_number(asn_raw)
        # ipapi peut renvoyer "AS123 ORG" comme chaîne unique.
        raw = _clean(asn_raw)
        if asn and raw.upper().startswith(asn):
            org = _safe_org(raw[len(asn):].strip())

    company = (
        _safe_org(company_raw.get("name"))
        if isinstance(company_raw, dict)
        else _safe_org(company_raw)
    )

    result = {
        "source": "ipapi",
        "city": _clean(payload.get("city") or location.get("city")),
        "region": _clean(
            payload.get("region") or location.get("state") or location.get("region")
        ),
        "country": _clean(payload.get("country") or location.get("country")),
        "country_code": _clean(
            payload.get("country_code") or location.get("country_code"), 8
        ),
        "timezone": _clean(payload.get("timezone") or location.get("timezone"), 80),
        "asn": asn,
        "org": org,
        "company": company,
    }

    security_fields = ("is_vpn", "is_proxy", "is_tor")
    if all(field in payload for field in security_fields):
        result["security_checked"] = "1"
        for field in security_fields:
            result[field] = "1" if bool(payload.get(field)) else "0"

    return {k: v for k, v in result.items() if v}


async def _ipwhois_signal(client: httpx.AsyncClient, ip: str) -> dict[str, str]:
    try:
        response = await client.get(
            _IPWHOIS_URL.format(ip=ip),
            headers={"User-Agent": "ToumaiAI-Security/2.0"},
        )
        if response.status_code != 200:
            return {}
        payload = response.json()
        if not isinstance(payload, dict) or payload.get("success") is False:
            return {}
    except Exception as exc:  # noqa: BLE001
        logger.info("ipwho.is indisponible pour %s (%s)", ip, type(exc).__name__)
        return {}

    connection = (
        payload.get("connection") if isinstance(payload.get("connection"), dict) else {}
    )
    timezone = payload.get("timezone")
    timezone_name = (
        timezone.get("id") if isinstance(timezone, dict) else timezone
    )

    return {
        key: value
        for key, value in {
            "source": "ipwhois",
            "city": _clean(payload.get("city")),
            "region": _clean(payload.get("region")),
            "country": _clean(payload.get("country")),
            "country_code": _clean(payload.get("country_code"), 8),
            "timezone": _clean(timezone_name, 80),
            "asn": _asn_number(connection.get("asn")),
            "org": (
                _safe_org(connection.get("org"))
                or _safe_org(connection.get("isp"))
            ),
        }.items()
        if value
    }


async def _ripe_signal(client: httpx.AsyncClient, ip: str) -> dict[str, str]:
    try:
        response = await client.get(
            _RIPE_NETWORK_URL,
            params={"resource": ip},
            headers={"User-Agent": "ToumaiAI-Security/2.0"},
        )
        if response.status_code != 200:
            return {}
        payload = response.json()
        data = payload.get("data") if isinstance(payload, dict) else {}
        if not isinstance(data, dict):
            return {}
        raw_asns = data.get("asns") if isinstance(data.get("asns"), list) else []
        prefix = _clean(data.get("prefix"), 80)
        asn = _asn_number(raw_asns[0]) if len(raw_asns) == 1 else ""
        if not prefix and not asn:
            return {}
    except Exception as exc:  # noqa: BLE001
        logger.info("RIPEstat network-info indisponible pour %s (%s)", ip, type(exc).__name__)
        return {}

    holder = ""
    if prefix:
        try:
            overview = await client.get(
                _RIPE_PREFIX_URL,
                params={"resource": prefix},
                headers={"User-Agent": "ToumaiAI-Security/2.0"},
            )
            if overview.status_code == 200:
                p = overview.json()
                d = p.get("data") if isinstance(p, dict) else {}
                entries = d.get("asns") if isinstance(d, dict) and isinstance(d.get("asns"), list) else []
                if asn:
                    wanted = asn.removeprefix("AS")
                    for item in entries:
                        if not isinstance(item, dict):
                            continue
                        if str(item.get("asn") or "").strip() == wanted:
                            holder = _safe_org(item.get("holder"))
                            break
        except Exception as exc:  # noqa: BLE001
            logger.info("RIPEstat prefix-overview indisponible pour %s (%s)", ip, type(exc).__name__)

    return {
        key: value
        for key, value in {
            "source": "ripe",
            "asn": asn,
            "prefix": prefix,
            "org": holder,
        }.items()
        if value
    }


async def _afrinic_operator_signal(
    client: httpx.AsyncClient,
    asn: str,
) -> dict[str, str]:
    """Nom légal du détenteur ASN depuis le registre AFRINIC.

    Pour un ASN hors zone AFRINIC, un 404 est simplement ignoré.
    """
    normalized = _asn_number(asn)
    if not normalized:
        return {}
    try:
        response = await client.get(
            _AFRINIC_AUTNUM_URL.format(asn=normalized.removeprefix("AS")),
            headers={
                "User-Agent": "ToumaiAI-Security/2.1",
                "Accept": "application/rdap+json, application/json",
            },
        )
        if response.status_code != 200:
            return {}
        payload = response.json()
        if not isinstance(payload, dict):
            return {}
        operator_name = _rdap_registrant_name(payload)
        if not operator_name:
            return {}
        return {
            "source": "afrinic",
            "asn": normalized,
            "operator_name": operator_name,
        }
    except Exception as exc:  # noqa: BLE001
        logger.info(
            "AFRINIC RDAP indisponible pour %s (%s)",
            normalized,
            type(exc).__name__,
        )
        return {}


def _merge(public_ip: str, signals: list[dict[str, str]]) -> dict[str, str]:
    usable = [s for s in signals if s and s.get("source")]
    result: dict[str, str] = {"ip": public_ip}

    geo_sources = [
        dict(s)
        for s in usable
        if s.get("source") not in {"ripe", "afrinic"}
    ]

    # Certains fournisseurs gratuits renvoient le nom du pays sans code ISO.
    # Si une autre source donne le code pour le même pays, on l'infère avant
    # le vote afin que "Chad" + "TD" ne deviennent pas artificiellement deux
    # pays différents.
    country_aliases = {
        _norm(s.get("country")): (s.get("country_code") or "").strip()
        for s in geo_sources
        if (s.get("country") or "").strip() and (s.get("country_code") or "").strip()
    }
    for source in geo_sources:
        if not (source.get("country_code") or "").strip():
            inferred = country_aliases.get(_norm(source.get("country")))
            if inferred:
                source["country_code"] = inferred

    # Ville/région: deux sources indépendantes doivent concorder.
    city, city_votes = _vote_location_pair(geo_sources, "city", minimum=2)
    region, region_votes = _vote_location_pair(geo_sources, "region", minimum=2)

    # Pays: le code ISO est la clé de consensus, afin que "Chad" et "Tchad"
    # ne soient pas considérés comme deux pays différents.
    country_code, country_code_votes = _vote(
        geo_sources, "country_code", minimum=2
    )
    if not country_code:
        country_code, country_code_votes = _vote(
            geo_sources, "country_code", minimum=1
        )

    country = ""
    country_votes = 0
    if country_code:
        matching = [
            s for s in geo_sources
            if _norm(s.get("country_code")) == _norm(country_code)
            and (s.get("country") or "").strip()
        ]
        if matching:
            # MaxMind local est préféré pour le libellé (notamment français),
            # mais la confirmation vient du code ISO partagé.
            preferred = next(
                (s for s in matching if s.get("source") == "maxmind"),
                matching[0],
            )
            country = (preferred.get("country") or "").strip()
            country_votes = country_code_votes
    if not country:
        country, country_votes = _vote(geo_sources, "country", minimum=2)
    if not country:
        country, country_votes = _vote(geo_sources, "country", minimum=1)

    timezone_name, timezone_votes = _vote(geo_sources, "timezone", minimum=2)
    if city and city_votes >= 2:
        result["city"] = city
        result["city_confirmed"] = "1"
    if region and region_votes >= 2:
        result["region"] = region
        result["region_confirmed"] = "1"
    if country:
        result["country"] = country
        result["country_confirmed"] = "1" if country_votes >= 2 else "0"
    if country_code:
        result["country_code"] = country_code
    if timezone_name and timezone_votes >= 2:
        result["timezone"] = timezone_name

    maxmind = next((s for s in usable if s.get("source") == "maxmind"), {})
    if maxmind.get("accuracy_radius_km"):
        result["accuracy_radius_km"] = maxmind["accuracy_radius_km"]

    # Vérification réseau: RIPE/RIS prime pour l'ASN/prefix annoncé.
    ripe = next((s for s in usable if s.get("source") == "ripe"), {})
    provider_asns = [
        s.get("asn", "")
        for s in usable
        if s.get("source") != "ripe" and s.get("asn")
    ]
    asn = ripe.get("asn", "")
    holder = _safe_org(ripe.get("org", ""))

    if asn:
        result["asn"] = asn
        result["asn_verified"] = "1"
        if ripe.get("prefix"):
            result["prefix"] = ripe["prefix"]
        if not holder:
            for s in usable:
                if s.get("asn") == asn:
                    holder = _safe_org(s.get("org") or s.get("company"))
                    if holder:
                        break
    else:
        normalized_asns = [_asn_number(value) for value in provider_asns if value]
        counts = Counter(normalized_asns)
        if counts:
            candidate, votes = counts.most_common(1)[0]
            if candidate and votes >= 2:
                result["asn"] = candidate
                result["asn_verified"] = "1"
                for s in usable:
                    if s.get("asn") == candidate:
                        holder = _safe_org(s.get("org") or s.get("company"))
                        if holder:
                            break

    registry = next((s for s in usable if s.get("source") == "afrinic"), {})
    registry_operator = _safe_org(registry.get("operator_name", ""))
    if (
        registry_operator
        and result.get("asn")
        and registry.get("asn") == result.get("asn")
    ):
        result["operator_name"] = registry_operator
        result["operator_verified"] = "1"
    elif holder:
        result["operator_name"] = holder
        result["operator_verified"] = "1"

    # Compatibilité interne : le nom réseau historique devient l'opérateur
    # canonique, pas un pool ou une description de sous-réseau.
    if result.get("operator_name"):
        result["network_org"] = result["operator_name"]

    # Les signaux VPN/Proxy/Tor restent fournis uniquement par une source qui
    # déclare explicitement avoir effectué ces contrôles.
    privacy_source = next(
        (s for s in usable if s.get("security_checked") == "1"),
        {},
    )
    if privacy_source:
        result["security_checked"] = "1"
        for field in ("is_vpn", "is_proxy", "is_tor"):
            if field in privacy_source:
                result[field] = privacy_source[field]

    result["geo_sources"] = str(len(geo_sources))
    result["network_sources"] = str(
        len([s for s in usable if s.get("asn") or s.get("prefix")])
    )
    return result


async def lookup(ip_address: str | None) -> dict[str, str]:
    """Croise les sources et retourne seulement les données assez solides."""

    public_ip = _public_ip(ip_address or "")
    if not public_ip:
        return {}

    base = {"ip": public_ip}
    if not _enabled():
        return base

    cached = _cached(public_ip)
    if cached is not None:
        return cached

    local_signal = await asyncio.to_thread(_maxmind_signal, public_ip)

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(3.0),
            follow_redirects=False,
        ) as client:
            remote = await asyncio.gather(
                _ipapi_signal(client, public_ip),
                _ipwhois_signal(client, public_ip),
                _ripe_signal(client, public_ip),
                return_exceptions=True,
            )

            candidate_signals = [
                item for item in remote if isinstance(item, dict) and item
            ]
            ripe_candidate = next(
                (item.get("asn", "") for item in candidate_signals if item.get("source") == "ripe"),
                "",
            )
            if not ripe_candidate:
                provider_asns = [
                    _asn_number(item.get("asn", ""))
                    for item in candidate_signals
                    if item.get("asn")
                ]
                counts = Counter(asn for asn in provider_asns if asn)
                ripe_candidate = (
                    counts.most_common(1)[0][0]
                    if counts and counts.most_common(1)[0][1] >= 2
                    else ""
                )

            registry_signal = (
                await _afrinic_operator_signal(client, ripe_candidate)
                if ripe_candidate
                else {}
            )
            if registry_signal:
                remote = [*remote, registry_signal]
    except Exception as exc:  # noqa: BLE001
        logger.info(
            "security IP intelligence indisponible pour %s (%s)",
            public_ip,
            type(exc).__name__,
        )
        remote = []

    signals: list[dict[str, str]] = []
    if local_signal:
        signals.append(local_signal)
    for item in remote:
        if isinstance(item, dict) and item:
            signals.append(item)

    if not signals:
        return base

    result = _merge(public_ip, signals)
    _store(public_ip, result)
    return result


def location_label(context: dict[str, str]) -> str:
    """Lieu affichable: uniquement les niveaux retenus par le consensus."""
    values: list[str] = []
    normalized: set[str] = set()
    for key in ("city", "region", "country"):
        value = (context.get(key) or "").strip()
        marker = _norm(value)
        if value and marker and marker not in normalized:
            values.append(value)
            normalized.add(marker)
    return ", ".join(values)


def network_label(context: dict[str, str]) -> str:
    """Réseau affichable: ASN vérifié + détenteur + préfixe routé."""
    if context.get("asn_verified") != "1":
        return ""
    values: list[str] = []
    for key in ("asn", "operator_name", "prefix"):
        value = (context.get(key) or "").strip()
        if value and value.casefold() not in {item.casefold() for item in values}:
            values.append(value)
    return " · ".join(values)[:260]


def privacy_label(context: dict[str, str]) -> str:
    """Résumé strict VPN/Proxy/Tor; vide quand la source ne permet pas de conclure."""

    if context.get("security_checked") != "1":
        return ""

    detected: list[str] = []
    if context.get("is_vpn") == "1":
        detected.append("VPN détecté")
    if context.get("is_proxy") == "1":
        detected.append("Proxy détecté")
    if context.get("is_tor") == "1":
        detected.append("Tor détecté")

    return " · ".join(detected) if detected else "Aucun VPN, proxy ou Tor détecté"
