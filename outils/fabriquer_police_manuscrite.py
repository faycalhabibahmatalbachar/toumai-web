# -*- coding: utf-8 -*-
"""Fabrique la police manuscrite des scènes : Caveat, figée, réduite, en woff2.

POURQUOI EMBARQUER UNE POLICE
------------------------------
Une main qui écrit doit écrire d'une écriture manuscrite. La pile générique
`cursive` ne donne pas la même chose sur Windows, sur macOS et sur Android —
et sur plusieurs Android elle ne donne rien de manuscrit du tout. Une police
sous-ensemble, servie depuis notre domaine, donne le même trait partout.

POURQUOI UN SOUS-ENSEMBLE
--------------------------
Caveat complète pèse 42 Ko en woff2. Seules les RÉPONSES manuscrites
l'utilisent — les objets et les questions restent en Inter —, donc une
cinquantaine de signes suffisent : 21 Ko. Si une future réponse a besoin d'un
caractère absent, il s'ajoute ici et le script se rejoue.

    python outils/fabriquer_police_manuscrite.py

Caveat est sous licence SIL Open Font License 1.1. La licence est recopiée à
côté du fichier produit (`animations/commun/polices/OFL.txt`), comme elle
l'exige.
"""

from __future__ import annotations

import os
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

sys.stdout.reconfigure(errors="replace")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AMONT = "https://github.com/google/fonts/raw/main/ofl/caveat/Caveat%5Bwght%5D.ttf"
SOURCE = os.path.join(RACINE, "outils", ".cache-caveat.ttf")
SORTIE = os.path.join(RACINE, "animations", "commun", "polices", "caveat-500.woff2")

#: Ce que le stylo peut avoir à tracer. Les majuscules sont limitées à celles
#: qui commencent une réponse existante : une majuscule coûte autant qu'une
#: minuscule, et vingt-six inutilisées coûtaient 4 Ko.
CARACTERES = (
    "abcdefghijklmnopqrstuvwxyz"
    "ÀDJR"
    "0123456789"
    " .,;:!?'’-"
    "àèéêîôûç"
    " "
)


def main() -> int:
    if not os.path.exists(SOURCE):
        print("téléchargement de Caveat…")
        urllib.request.urlretrieve(AMONT, SOURCE)

    police = TTFont(SOURCE)
    # Poids 500 : le 400 est trop maigre à la taille où la scène l'affiche,
    # le 600 empâte les boucles du « e » et du « o ».
    police = instantiateVariableFont(police, {"wght": 500}, inplace=True)

    options = subset.Options()
    options.layout_features = ["*"]
    options.notdef_outline = True
    options.drop_tables += ["DSIG"]
    options.flavor = "woff2"

    reducteur = subset.Subsetter(options=options)
    reducteur.populate(text=CARACTERES)
    reducteur.subset(police)
    police.flavor = "woff2"

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    police.save(SORTIE)

    print("woff2 : %.1f Ko  (%d signes)"
          % (os.path.getsize(SORTIE) / 1024, len(set(CARACTERES))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
