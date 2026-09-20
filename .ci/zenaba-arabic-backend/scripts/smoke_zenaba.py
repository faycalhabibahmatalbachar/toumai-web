# -*- coding: utf-8 -*-
"""Fait parler Zenaba pour de vrai, et dit ce qui est sorti.

POURQUOI CE SCRIPT EXISTE
--------------------------
Une synthèse réelle coûte un passage ZeroGPU. Elle ne peut donc pas vivre
sur un contrôle de santé public : n'importe qui viderait le quota du Space
en boucle. Elle vit ici, à lancer à la main ou depuis le conteneur, et sur
`/voice/health?synthese=1`, derrière l'authentification.

CE QU'IL VÉRIFIE
-----------------
Que l'audio sort, qu'il est bien un WAV (`RIFF`/`WAVE`), qu'il n'est pas
vide, et combien de temps il a fallu. Le premier appel paie le démarrage à
froid du GPU ; le second le mesure à chaud. C'est l'écart entre les deux
qui dit ce qu'un utilisateur ressentira vraiment.

USAGE
------
    python scripts/smoke_zenaba.py

Il lit la configuration du serveur (CHATTERBOX_TTS_URL, CHATTERBOX_TTS_TOKEN)
et n'affiche jamais la clé.
"""
import asyncio
import os
import struct
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import tts_service  # noqa: E402

PHRASE = (
    "Bonjour Fayçal. Aujourd'hui à N'Djamena, votre rendez-vous est prévu "
    "à quatorze heures trente pour neuf mille francs CFA."
)


def _duree_wav(audio: bytes) -> float:
    """Durée en secondes, lue dans l'en-tête plutôt que devinée."""
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return 0.0
    canaux, taux = struct.unpack_from("<HI", audio, 22)
    bits = struct.unpack_from("<H", audio, 34)[0]
    octets_par_seconde = taux * canaux * (bits // 8)
    return round((len(audio) - 44) / octets_par_seconde, 2) if octets_par_seconde else 0.0


async def _un_passage(nom: str) -> bool:
    debut = time.monotonic()
    try:
        audio = await tts_service.synthesize_chatterbox(PHRASE)
    except Exception as exc:  # noqa: BLE001
        # Le nom et le message de notre propre erreur, jamais celui d'en face :
        # un texte amont peut porter une URL signée.
        detail = str(exc) if isinstance(exc, tts_service.TtsProviderError) else type(exc).__name__
        print(f"{nom} : ECHEC — {detail}")
        return False
    ms = int((time.monotonic() - debut) * 1000)
    valide = audio[:4] == b"RIFF" and audio[8:12] == b"WAVE"
    print(
        f"{nom} : {'OK' if valide else 'WAV INVALIDE'} — {len(audio)} octets, "
        f"{_duree_wav(audio)} s d'audio, {ms} ms de génération"
    )
    return valide


async def principal() -> int:
    reglages = tts_service.get_settings()
    if not (reglages.chatterbox_tts_url or "").strip():
        print("CHATTERBOX_TTS_URL absent : rien à éprouver.")
        return 2
    froid = await _un_passage("démarrage à froid")
    chaud = await _un_passage("appel à chaud     ")
    return 0 if (froid and chaud) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(principal()))
