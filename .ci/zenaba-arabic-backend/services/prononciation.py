# -*- coding: utf-8 -*-
"""Réécrire, pour la VOIX seulement, les noms qui se lisent mal.

LE DÉFAUT
----------
« L'AI lit toujours : Faycal — elle prononce le c en k, elle le lit Faykal.
C'est plutôt Faysal. »

Le nom vient de l'arabe فيصل. Écrit à la française, « Faycal » place un `c`
devant un `a` : toute synthèse vocale française, et tout modèle audio entraîné
sur du français, le lit /k/. C'est la règle de la langue, pas une erreur du
modèle — « cabane », « carte », « Faycal ».

CE QUI A DÉJÀ ÉTÉ ESSAYÉ, ET QUI NE SUFFIT PAS
----------------------------------------------
L'instruction système porte depuis longtemps :

    PRONONCIATION — « Faycal » s'écrit avec un c mais se prononce FAY-SAL…

Elle est toujours là, et le défaut persiste. C'était prévisible : une consigne
de prononciation demande au modèle de contredire, à chaque occurrence, ce que
l'orthographe lui dicte. Cela marche parfois, jamais toujours. Et surtout, le
nom n'arrive PAS que par le modèle : il vient de la mémoire longue et de
l'historique de conversation, injectés tels quels au démarrage de la session.
Le modèle lit alors « Faycal » écrit noir sur blanc dans son contexte.

CE QUI MARCHE
--------------
Ne pas demander — écrire ce qu'on veut entendre. `ç` se lit /s/ en français
sans aucune ambiguïté : « façade », « garçon », « Fayçal ». La graphie porte
la prononciation, il n'y a plus rien à respecter.

OÙ CE MODULE S'APPLIQUE, ET OÙ IL NE DOIT PAS
----------------------------------------------
UNIQUEMENT sur du texte destiné à être PRONONCÉ :
  • le contexte injecté dans la session vocale (`memoire_vocale`) ;
  • le texte remis à la synthèse (`tts_service`).

Jamais sur ce qui s'affiche. Faycal écrit son nom « Faycal » — le corriger à
l'écran serait le corriger, lui.
"""

from __future__ import annotations

import re
from typing import Dict, List, Tuple

#: Graphie écrite → graphie qui SE LIT correctement en français.
#:
#: On ne met ici que ce qu'on a réellement entendu se tromper. Une table de
#: prononciation qui grossit « au cas où » finit par corriger des mots que
#: personne ne prononçait mal, et introduit ses propres fautes.
TABLE: Dict[str, str] = {
    # Le nom de l'auteur du produit, et celui qui revient le plus souvent dans
    # la mémoire longue comme dans l'historique.
    "Faycal": "Fayçal",
    "Faysal": "Fayçal",
    # Mesuré à l'oreille : sans l'accent, la synthèse dit « Ndjamena » avec un
    # e muet, ce qui ne ressemble à rien pour quelqu'un qui y habite.
    "N'Djamena": "N'Djaména",
    "Ndjamena": "N'Djaména",
    # « Abéché » sans accents devient « Abèche ».
    "Abeche": "Abéché",
}

#: Compilé une fois. Les frontières `\b` évitent d'abîmer un mot plus long qui
#: contiendrait la séquence — et il en existe : « Faycalou » est un prénom.
_MOTIFS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"\b" + re.escape(source) + r"\b", re.IGNORECASE), cible)
    for source, cible in TABLE.items()
]


def pour_la_voix(texte: str) -> str:
    """Le même texte, écrit comme il doit s'entendre.

    Insensible à la casse en ENTRÉE — on croise « FAYCAL » dans un titre de
    conversation comme « faycal » dans un message tapé vite — mais la sortie
    porte toujours la graphie de la table. Reproduire la casse d'origine
    obligerait à décider ce que vaut « FAYÇAL » crié, pour un gain nul : le
    texte n'est jamais affiché, il est prononcé.
    """
    if not texte:
        return texte
    for motif, cible in _MOTIFS:
        texte = motif.sub(cible, texte)
    return texte
