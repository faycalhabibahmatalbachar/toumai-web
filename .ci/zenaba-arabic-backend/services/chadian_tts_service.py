"""
Prononciation de l'arabe tchadien — translittération latine → écriture arabe.

PROBLÈME RÉSOLU
---------------
Tout le corpus d'arabe tchadien est écrit en translittération LATINE
(« Fi l-bidaaya, Allah khalag al-samaawaat »), et aucune voix de synthèse
n'existe pour le tchadien (`ar-TD`) ni pour le soudanais (`ar-SD`), qui en est
le plus proche. Donné tel quel à une voix arabe, ce texte latin est illisible :
la voix épelle ou échoue.

STRATÉGIE
---------
On convertit la translittération vers l'écriture arabe, en choisissant les
lettres NON PAS pour l'orthographe étymologique, mais pour le SON que la voix
cible va réellement produire. C'est une transcription phonétique déguisée en
orthographe.

Le levier principal est le /g/ : l'arabe tchadien réalise ق comme [g]
(« gaal » = il a dit, « gaaʼid » = en train de). Or :
  • une voix égyptienne prononce ج comme [g] — trait déterminant du caire ;
  • une voix saoudienne prononce ق comme [q], et ج comme [d͡ʒ].
Écrire ج pour un /g/ tchadien et lire avec une voix égyptienne restitue donc
le bon son, là où l'orthographe étymologique (ق) donnerait [ʔ] ou [q].

Le compromis est assumé et documenté : avec le profil égyptien, un /d͡ʒ/
tchadien (« jamaaʼa ») ressort aussi en [g]. Ce son est nettement plus rare que
le /g/ dans le corpus, et le mot reste reconnaissable.

Les profils sont interchangeables : un locuteur natif peut comparer à l'oreille
et changer de profil sans toucher au code.
"""

import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@dataclass
class VoiceProfile:
    """Association d'une voix de synthèse et de la graphie qui lui convient."""

    name: str
    voice_id: str
    description: str
    # Correspondances propres au profil, appliquées AVANT la table commune.
    overrides: Dict[str, str] = field(default_factory=dict)
    # Substitutions appliquées APRÈS coup sur la graphie arabe, y compris sur
    # les mots issus du dictionnaire appris. Le corpus écrit le /g/ tchadien
    # avec un qaf (قال) ; pour une voix égyptienne il faut un jim (جال), sans
    # quoi la voix prononce un coup de glotte.
    post: Dict[str, str] = field(default_factory=dict)


# ── Profils disponibles ──────────────────────────────────────────────────────
# Aucune voix tchadienne ni soudanaise n'existe : on emprunte la voix dont la
# phonologie se rapproche le plus, et on adapte la graphie en conséquence.
PROFILES: Dict[str, VoiceProfile] = {
    # Recommandé : le ج égyptien vaut [g], ce qui restitue le /g/ tchadien.
    "egyptien": VoiceProfile(
        name="egyptien",
        voice_id="ar-EG-SalmaNeural",
        description="Voix égyptienne — ج prononcé [g], restitue le /g/ tchadien. "
        "Dialecte le plus largement compris en Afrique et au Moyen-Orient.",
        overrides={"g": "ج", "j": "ج"},
        post={"ق": "ج"},
    ),
    "egyptien_h": VoiceProfile(
        name="egyptien_h",
        voice_id="ar-EG-ShakirNeural",
        description="Même profil, voix masculine.",
        overrides={"g": "ج", "j": "ج"},
        post={"ق": "ج"},
    ),
    # Le libyen réalise souvent ق comme [g] : graphie étymologique conservée,
    # et le /d͡ʒ/ reste distinct. À comparer à l'oreille avec le profil égyptien.
    "libyen": VoiceProfile(
        name="libyen",
        voice_id="ar-LY-ImanNeural",
        description="Voix libyenne — ق souvent réalisé [g], et ج reste [d͡ʒ] : "
        "conserve la distinction g / j, au prix d'un accent maghrébin.",
        overrides={"g": "ق", "j": "ج"},
    ),
    "saoudien": VoiceProfile(
        name="saoudien",
        voice_id="ar-SA-ZariyahNeural",
        description="Voix standard (arabe littéraire). Plus neutre mais éloignée "
        "du parler tchadien : ق donne [q].",
        overrides={"g": "ق", "j": "ج"},
    ),
}

# Profil par defaut : SAOUDIEN. La theorie privilegiait l'egyptien (le ج
# egyptien vaut [g], ce qui restitue le /g/ tchadien), mais l'ecoute par un
# locuteur natif a tranche en faveur du saoudien — l'accent cairote global
# s'entend trop, et le registre standard est celui auquel les Tchadiens sont
# habitues par les medias. L'oreille prime sur le raisonnement phonologique.
DEFAULT_PROFILE = "saoudien"


# Diacritiques et regles de finale.
_FATHA, _KASRA, _DAMMA = "َ", "ِ", "ُ"
_SHADDA = "ّ"
_ALIF, _YA, _WAW, _TA_MARBUTA = "ا", "ي", "و", "ة"
# Une voyelle breve finale est muette a la synthese : on la porte par une lettre.
_FINAL_VOWEL = {_FATHA: _ALIF, _KASRA: _YA, _DAMMA: _WAW}
# Deux consonnes identiques consecutives (sans diacritique entre elles).
# Le motif portait un caractere de controle invisible (U+0001) a la place
# de la reference arriere : il ne pouvait donc jamais correspondre, et
# AUCUNE gemination n'etait marquee. Or elle est phonemique en arabe
# (« rabbina », notre Seigneur, se distingue de « rabina ») et la source
# vocalisee la note toujours.
_SHADDA_RE = re.compile(r"([ء-ي])\1")

# Lettres solaires : apres l'article, le lam ne se prononce pas et la
# consonne suivante est geminee — « al-salaam » se dit *as-salaam*. Sans
# la shadda, la voix articule le lam et l'arabe sonne scolaire.
_SUN_LETTERS = frozenset("تثدذرزسشصضطظلن")

# ── Table de translittération ────────────────────────────────────────────────
# Ordre CRUCIAL : les digrammes doivent être testés avant les lettres simples,
# sinon « kh » serait lu « k » + « h ».
_DIGRAPHS: List[Tuple[str, str]] = [
    ("kh", "خ"),
    ("gh", "غ"),
    ("ch", "ش"),   # convention française du corpus : « ch » = ش
    ("sh", "ش"),
    ("th", "ث"),
    ("dh", "ذ"),
    # Voyelles longues. L'arabe tchadien possède ee/oo, absents de l'arabe
    # littéraire : rendus par ي et و, que la voix allonge naturellement.
    ("aa", "ا"),
    ("ii", "ي"),
    ("uu", "و"),
    ("ee", "ي"),
    ("oo", "و"),
]

_SINGLES: Dict[str, str] = {
    "a": "َ", "i": "ِ", "u": "ُ", "e": "ِ", "o": "ُ",
    "b": "ب", "t": "ت", "s": "س", "d": "د", "r": "ر", "z": "ز",
    "f": "ف", "k": "ك", "l": "ل", "m": "م", "n": "ن", "h": "ه",
    "w": "و", "y": "ي", "c": "ك", "q": "ق",
    # L'apostrophe note le AYN, pas la hamza. Le corpus écrit « ma’a » (مع),
    # « gaa’id » (قاعد), « jamaa’a » (جماعة) : mesuré sur le jeu hold-out, la
    # rendre par ع plutôt que par ء corrige 135 caractères et fait tomber le
    # CER de 0,1929 à 0,1831 (WER 0,5017 → 0,4796). Voir
    # corpus-arabe-tchadien/scripts/eval_translit.py.
    "ʼ": "ع", "'": "ع", "’": "ع", "ʻ": "ع", "`": "ع",
}

# Mots outils très fréquents : graphie fixée pour éviter toute dérive.
_LEXICAL_OVERRIDES: Dict[str, str] = {
    "wa": "وَ",
    "fi": "في",
    "min": "مِن",
    "ma": "ما",
    "le": "لِ",
    "be": "بِ",
    "da": "دا",
    "di": "دي",
    "hu": "هو",
    "hi": "هي",
    "allah": "الله",
    "kan": "كان",
    "kula": "كُلَّ",
    "kulla": "كُلَّ",
    "hana": "حَنا",
    "kadar": "كَدَر",
    "leel": "ليل",
    "yoom": "يوم",
    # La translitteration latine ne note pas les consonnes emphatiques : « ard »
    # (terre) s'ecrit avec un dal simple alors que le mot porte un dad. Ces
    # graphies fixees evitent une prononciation fautive sur les mots courants.
    "ard": "أرض",
    "sadiig": "صديق",
    "sadiik": "صديق",
    "ya": "يا",
    "rabb": "ربّ",
    "khalli": "خلّي",
    "bidaaya": "بداية",
    "nuur": "نور",
    "insaan": "إنسان",
    "naas": "ناس",
    "beet": "بيت",
    "salaam": "سلام",
    "chukran": "شكرا",
    "halak": "حالك",
    "kef": "كيف",
    "awwal": "أول",
    "samaawaat": "سماوات",
    "khalag": "خلق",
    "gaal": "قال",
    "yukuun": "يكون",
    # Le nom du produit revient dans presque toutes les réponses : la
    # conversion lettre à lettre en faisait « تُُماي ».
    "toumai": "تُومَاي",
    "toumaï": "تُومَاي",
}

# Hyphens/tirets employés par le corpus, dont l'insécable U+2011.
_HYPHENS = dict.fromkeys(map(ord, "‐‑‒–—-"), "-")

# Les lettres accentuées font partie du mot. Sans elles, « Toumaï » se coupait
# en « Touma » + « ï », le second morceau restant en caractères latins au
# milieu de l'arabe — que la voix épelle. `_strip_accents` s'en charge ensuite.
_LATIN_WORD_RE = re.compile(r"[A-Za-zÀ-ÿʼ'’ʻ`\-]+")
_ARABIC_RE = re.compile(r"[؀-ۿ]")


def _strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def _lexicon_words() -> set:
    """Vocabulaire tchadien connu, tiré du glossaire réel (5 577 entrées).

    Bien plus fiable qu'une liste de marqueurs écrite à la main : c'est le
    corpus lui-même qui dit ce qui est de l'arabe tchadien.
    """
    global _LEXICON_CACHE
    if _LEXICON_CACHE is None:
        try:
            from services import chadian_arabic_service as cas
            _LEXICON_CACHE = {
                w for w in cas._by_shu  # noqa: SLF001 — même paquet applicatif
                if len(w) >= 2 and w.isascii()
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("glossaire indisponible pour la détection : %s", exc)
            _LEXICON_CACHE = set()
    return _LEXICON_CACHE


_LEXICON_CACHE = None

# Mots-outils très courants, absents ou ambigus dans le glossaire.
_FUNCTION_WORDS = {
    "wa", "fi", "min", "ma", "le", "be", "da", "di", "hu", "hi", "kan",
    "kula", "kulla", "hana", "kadar", "inta", "ana", "kef", "keef", "ya",
    "al", "gaal", "gaaid", "khalli", "yukuun", "shunu", "sunu",
}


def looks_like_chadian_latin(text: str) -> bool:
    """Le texte ressemble-t-il à de l'arabe tchadien translittéré ?

    Deux signaux combinés : la part de mots reconnus dans le glossaire réel, et
    des marqueurs orthographiques caractéristiques (article « al- », voyelles
    longues doublées, digrammes kh/ch/gh, hamza translittérée).
    """
    if not text or _ARABIC_RE.search(text):
        return False
    t = _strip_accents(text.lower().translate(_HYPHENS))
    words = [w for w in re.findall(r"[a-z']+", t) if len(w) >= 2]
    if not words:
        return False

    known = _lexicon_words() | _FUNCTION_WORDS
    hits = sum(1 for w in words if w in known)
    ratio = hits / len(words)

    score = 0.0
    # Signal principal : proportion de mots réellement attestés en tchadien.
    if ratio >= 0.6:
        score += 4
    elif ratio >= 0.4:
        score += 3
    elif ratio >= 0.25:
        score += 2

    # Signaux orthographiques.
    if re.search(r"\bal-|\bl-", t):
        score += 2
    if re.search(r"(aa|ii|uu|oo|ee)", t):
        score += 1.5
    if re.search(r"(kh|ch|gh)", t):
        score += 1
    if re.search(r"[ʼ'’]", text):
        score += 1

    # Un texte manifestement français/anglais ne doit jamais passer.
    latin_common = {
        "bonjour", "comment", "vous", "merci", "hello", "the", "and", "you",
        "please", "with", "pour", "dans", "avec", "cette", "nous", "êtes",
        "etes", "allez", "how", "are", "what", "this", "that",
    }
    if any(w in latin_common for w in words):
        score -= 4

    return score >= 4


# ── Dictionnaire APPRIS du corpus parallèle ──────────────────────────────────
# Produit par corpus-arabe-tchadien/scripts/build_translit_lexicon.py en
# alignant la Genèse latine et la Genèse arabe vocalisée, verset par verset.
# Ces graphies sont OBSERVÉES, pas devinées : elles restituent ce que la
# translittération latine ne note pas — emphatiques (ard → أَرْض et non أرد),
# distinction h/ḥ, finales en ة. La conversion lettre à lettre ne sert plus
# que de repli pour les mots absents du corpus.
_LEARNED_PATH = (
    Path(__file__).resolve().parent.parent
    / "corpus-arabe-tchadien" / "lexicons" / "structured" / "translit_map.json"
)
_LEARNED: Optional[Dict[str, str]] = None


def _learned_map() -> Dict[str, str]:
    global _LEARNED
    if _LEARNED is None:
        try:
            _LEARNED = json.loads(_LEARNED_PATH.read_text(encoding="utf-8"))
            logger.info("arabe tchadien : %d graphies apprises du corpus", len(_LEARNED))
        except Exception as exc:  # noqa: BLE001
            logger.warning("dictionnaire appris indisponible (%s)", exc)
            _LEARNED = {}
    return _LEARNED


def _translit_word(word: str, overrides: Dict[str, str]) -> str:
    """Convertit UN mot latin en écriture arabe selon le profil de voix."""
    w = _strip_accents(word.lower())
    # 1. Graphie fixee a la main (mots-outils, cas particuliers).
    if w in _LEXICAL_OVERRIDES:
        return _LEXICAL_OVERRIDES[w]
    # 2. Graphie APPRISE du corpus parallele — prioritaire sur la conversion
    #    lettre a lettre, qui ne peut pas deviner les emphatiques.
    learned = _learned_map().get(w)
    if learned:
        return learned

    out: List[str] = []
    i = 0
    n = len(w)
    while i < n:
        # 1. digrammes (les plus longs d'abord)
        matched = False
        for src, dst in _DIGRAPHS:
            if w.startswith(src, i):
                out.append(dst)
                i += len(src)
                matched = True
                break
        if matched:
            continue
        ch = w[i]
        # 2. correspondances propres au profil (g / j)
        if ch in overrides:
            out.append(overrides[ch])
        elif ch in _SINGLES:
            out.append(_SINGLES[ch])
        # 3. tout autre caractère est ignoré silencieusement
        i += 1

    res = "".join(out)

    # Consonne geminee -> shadda. Ecrire la lettre deux fois (« al-Rabb » rendu
    # par deux ba) fait marquer une coupure nette a la voix ; la shadda produit
    # la gemination reellement attendue.
    res = _SHADDA_RE.sub(lambda m: m.group(1) + _SHADDA, res)

    # Voyelle breve finale : un diacritique en fin de mot n'est pas prononce par
    # la synthese. On le porte par une lettre longue pour qu'il s'entende.
    if res and res[-1] in _FINAL_VOWEL:
        res = res[:-1] + _FINAL_VOWEL[res[-1]]
    # Un mot arabe ne commence pas par une voyelle brève (diacritique seul) :
    # on ajoute une alif de support pour que la voix attaque correctement.
    if res and res[0] in "َُِ":
        res = "ا" + res
    return res


def _with_article(body: str) -> str:
    """Soude l'article défini et marque l'assimilation solaire.

    Devant une lettre solaire, le ل de l'article ne se prononce pas et la
    consonne suivante est géminée : « al-salaam » se dit *as-salaam*. La
    shadda est ce qui déclenche cette lecture ; sans elle la voix articule le
    ل, ce qu'aucun locuteur ne fait.
    """
    if body and body[0] in _SUN_LETTERS:
        body = body[0] + _SHADDA + body[1:]
    return "ال" + body


def to_arabic_script(text: str, profile: str = DEFAULT_PROFILE) -> str:
    """Translittère un texte latin d'arabe tchadien vers l'écriture arabe.

    Le texte non latin (ponctuation, chiffres, arabe déjà écrit) est conservé.
    """
    prof = PROFILES.get(profile) or PROFILES[DEFAULT_PROFILE]
    normalized = text.translate(_HYPHENS)

    def repl(m: re.Match) -> str:
        word = m.group(0)
        # Article défini « al- » / « l- » : soudé au mot suivant comme en arabe.
        if word.lower().startswith("al-"):
            return _with_article(_translit_word(word[3:], prof.overrides))
        if word.lower().startswith("l-"):
            return _with_article(_translit_word(word[2:], prof.overrides))
        if word == "-":
            return ""
        return _translit_word(word, prof.overrides)

    result = _LATIN_WORD_RE.sub(repl, normalized)
    # Adaptation finale a la phonologie de la voix, appliquee aussi aux
    # graphies apprises du corpus.
    for src, dst in (prof.post or {}).items():
        result = result.replace(src, dst)
    return result


def prepare_for_tts(text: str, profile: str = DEFAULT_PROFILE) -> Tuple[str, str, bool]:
    """Prépare un texte pour la synthèse vocale en arabe tchadien.

    Renvoie (texte_à_synthétiser, voix_à_utiliser, converti).
    `converti` vaut False quand le texte n'est pas de l'arabe tchadien latin —
    l'appelant garde alors son comportement habituel, sans conversion hasardeuse.
    """
    prof = PROFILES.get(profile) or PROFILES[DEFAULT_PROFILE]
    if not looks_like_chadian_latin(text):
        return text, prof.voice_id, False
    converted = to_arabic_script(text, profile)
    logger.info(
        "arabe tchadien : translittéré pour la voix %s (%d → %d caractères)",
        prof.voice_id, len(text), len(converted),
    )
    return converted, prof.voice_id, True


# ── Clonage vocal — voix tchadienne authentique ──────────────────────────────
# Extrait réel du corpus (7,4 s, Deutéronome 8:12), utilisé comme référence de
# timbre. Le clonage zéro-shot reproduit CETTE voix — celle d'un locuteur
# tchadien — au lieu d'emprunter un accent saoudien ou égyptien.
#
# C'est la voie rapide : elle donne la vraie voix sans attendre l'entraînement.
# Le modèle affiné la remplacera quand il sera prêt.
_REFERENCE_PATH = (
    Path(__file__).resolve().parent.parent / "assets" / "voix" / "reference_tchadien.wav"
)

# Consigne de style transmise au moteur de clonage.
CLONE_CONTROL = "locuteur tchadien, arabe dialectal, ton posé et clair"


def reference_clip() -> Optional[str]:
    """Chemin du clip de référence, ou None s'il est absent.

    L'appelant doit gérer l'absence : le déploiement peut ne pas embarquer les
    assets, et mieux vaut retomber sur une voix empruntée que ne rien dire.
    """
    return str(_REFERENCE_PATH) if _REFERENCE_PATH.is_file() else None


# Préfixe des identifiants de voix exposés à l'application. L'utilisateur ne
# choisit pas « une voix saoudienne » mais « l'arabe tchadien » : le profil
# n'est qu'un moyen, et il doit rester interchangeable sans que le réglage
# enregistré côté client devienne invalide.
VOICE_PREFIX = "shu:"


def profile_from_voice(voice: Optional[str]) -> Optional[str]:
    """Extrait le profil tchadien d'un identifiant de voix, sinon None.

    « shu:egyptien » → « egyptien ». Un identifiant inconnu retombe sur le
    profil par défaut plutôt que d'échouer : mieux vaut une voix approchante
    qu'une erreur pour un réglage périmé.
    """
    if not voice or not voice.startswith(VOICE_PREFIX):
        return None
    name = voice[len(VOICE_PREFIX):].strip()
    return name if name in PROFILES else DEFAULT_PROFILE


def list_profiles() -> List[Dict[str, str]]:
    """Profils disponibles, pour l'interface de réglages."""
    return [
        {"id": p.name, "voice_id": p.voice_id, "description": p.description}
        for p in PROFILES.values()
    ]
