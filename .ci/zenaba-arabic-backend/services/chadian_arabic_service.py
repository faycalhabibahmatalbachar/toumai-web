"""
Arabe tchadien (shuwa) — compréhension et expression immédiates par glossaire.

Charge le glossaire construit depuis les lexiques Tala al Nuur/SIL (2 532
entrées, autorisation écrite) et l'injecte dans le prompt système quand :
  - l'utilisateur emploie des mots d'arabe tchadien (détection par tokens), ou
  - l'utilisateur parle DE l'arabe tchadien (« comment on dit X en arabe
    tchadien ? ») → correspondances inversées français → tchadien.

Zéro coût réseau : dictionnaire en mémoire, chargé une fois au démarrage.
C'est la première brique « langue tchadienne » de Toumaï AI, en attendant les
modèles entraînés sur le corpus audio (ASR/TTS).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)

_GLOSSARY_PATH = Path(__file__).resolve().parents[1] / "data" / "arabe_tchadien" / "glossaire.json"
_PROVERBES_PATH = Path(__file__).resolve().parents[1] / "data" / "arabe_tchadien" / "proverbes.json"

# Mots tchadiens qui sont AUSSI des mots français courants : jamais utilisés
# seuls comme signal (trop de faux positifs).
_AMBIGUOUS = {
    "mata", "mara", "kan", "min", "gal", "bas", "tour", "sana", "asa",
    "dama", "aile", "abba", "mari", "sale", "male", "gare", "col",
}

_TOKEN_RE = re.compile(r"[a-zʼ’'`]+", re.IGNORECASE)
_META_RE = re.compile(r"arabe\s+tchadien|tchadien|shuwa|choua", re.IGNORECASE)

_by_shu: Dict[str, dict] = {}
_by_fr_word: Dict[str, List[dict]] = {}
_proverbes: List[dict] = []

_PROVERB_RE = re.compile(r"proverbe|dicton|sagesse|masal|amsaal|culture\s+tchad", re.IGNORECASE)


def _load() -> None:
    global _by_shu, _by_fr_word
    try:
        data = json.loads(_GLOSSARY_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning("Glossaire arabe tchadien introuvable (%s) — service inactif", e)
        return
    for entry in data:
        shu = entry["shu"].lower()
        _by_shu[shu] = entry
        # Index inversé : chaque mot significatif de la définition française.
        for word in _TOKEN_RE.findall(entry["fr"].lower()):
            if len(word) >= 3:
                _by_fr_word.setdefault(word, []).append(entry)
    global _proverbes
    try:
        _proverbes = json.loads(_PROVERBES_PATH.read_text(encoding="utf-8"))
    except Exception:
        _proverbes = []
    logger.info(
        "Arabe tchadien chargé : %d entrées de glossaire, %d proverbes",
        len(_by_shu), len(_proverbes),
    )


_load()


def glossary_context(message: str, max_entries: int = 15) -> str:
    """Bloc à ajouter au prompt système, ou chaîne vide si non pertinent."""
    if not _by_shu or not message:
        return ""

    tokens = [t.lower() for t in _TOKEN_RE.findall(message)]
    token_set = set(tokens)

    # 1. Mots d'arabe tchadien présents dans le message.
    direct = []
    seen = set()
    for t in tokens:
        e = _by_shu.get(t)
        if e and t not in seen and not (t in _AMBIGUOUS and len(direct) == 0):
            direct.append(e)
            seen.add(t)

    # Signal exigé : ≥2 mots tchadiens, ou 1 seul mais long/noyau non ambigu,
    # ou l'utilisateur parle explicitement de la langue.
    meta = bool(_META_RE.search(message))
    strong = [e for e in direct if e["shu"] not in _AMBIGUOUS]
    triggered = len(strong) >= 2 or (len(strong) == 1 and len(strong[0]["shu"]) >= 5) or meta
    if not triggered:
        return ""

    lines: List[str] = []
    for e in direct[:max_entries]:
        en = (e.get("en") or "").strip()
        # L'anglais n'existe que pour 58 % des entrees : on ne l'affiche que
        # s'il est reellement present, jamais un champ vide.
        lines.append(
            f"{e['shu']} = {e['fr']} ({e['pos']})" + (f" | en: {en}" if en else "")
        )

    # 2. Si on parle DE l'arabe tchadien : offrir le sens inverse fr → tchadien
    #    pour les mots français du message (« comment dit-on “eau” ? »).
    if meta:
        reverse_seen = {e["shu"] for e in direct}
        added = 0
        for t in token_set:
            # CLASSEMENT : la traduction EXACTE d'abord. Sans ce tri, une
            # recherche de « terre » remontait « se rouler par terre » et
            # « tomber face contre terre », tandis que « ard = terre » — la
            # bonne reponse — arrivait quatrieme et n'etait jamais affichee.
            candidats = sorted(
                _by_fr_word.get(t, []),
                key=lambda x: (
                    (x["fr"] or "").strip().lower() != t,   # exact en tete
                    len((x["fr"] or "")),                   # puis le plus court
                ),
            )
            for e in candidats[:2]:
                if e["shu"] not in reverse_seen:
                    en2 = (e.get("en") or "").strip()
                    lines.append(
                        f"{e['fr']} = {e['shu']} ({e['pos']})"
                        + (f" | en: {en2}" if en2 else "")
                    )
                    reverse_seen.add(e["shu"])
                    added += 1
                if added >= 10:
                    break
            if added >= 10:
                break

    if not lines:
        return _proverb_block(message)

    block = (
        "\n\n[LEXIQUE ARABE TCHADIEN — Toumaï AI apprend l'arabe tchadien "
        "(dialecte arabe du Tchad, translittération latine). Le message de "
        "l'utilisateur contient ou concerne cette langue. Correspondances "
        "vérifiées (source : lexiques SIL/Tala al Nuur) :\n"
        + "\n".join(lines)
        + "\nUtilise-les pour comprendre. Si l'utilisateur écrit en arabe "
        "tchadien, réponds en arabe tchadien (translittération latine) suivi "
        "de la traduction française entre parenthèses. Ne jamais inventer de "
        "mots tchadiens absents de ce lexique.]"
    )
    return block + _proverb_block(message)


def _proverb_block(message: str) -> str:
    """3 proverbes tchadiens authentiques quand on parle proverbes/culture.
    Sélection stable par hachage du message (pas de dépendance à l'horloge)."""
    if not _proverbes or not _PROVERB_RE.search(message):
        return ""
    start = sum(ord(c) for c in message) % max(1, len(_proverbes) - 3)
    picked = _proverbes[start : start + 3]
    lines = [f"« {p['shu']} » — {p['fr']}" for p in picked]
    return (
        "\n\n[PROVERBES TCHADIENS AUTHENTIQUES (recueils SIL/Tala al Nuur) — "
        "tu peux les citer tels quels, jamais en inventer :\n"
        + "\n".join(lines) + "]"
    )


def stats() -> Dict[str, int]:
    return {"entries": len(_by_shu), "fr_index": len(_by_fr_word)}
