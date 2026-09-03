# -*- coding: utf-8 -*-
"""Sort les mains des scènes animées et les met à la bonne taille, une fois.

CE QU'ON A MESURÉ, ET POURQUOI ÇA A DÉCLENCHÉ CE SCRIPT
---------------------------------------------------------
Les cinq scènes livrées portent 1 090 Ko de `data:image/png;base64` — pour
DEUX images distinctes. La main principale, 178 Ko une fois encodée, est
recopiée à six endroits : 1 068 Ko de la même main, téléchargés autant de fois
qu'il y a de scènes, sans jamais pouvoir être mis en cache.

Elle est en plus surdimensionnée : le PNG fait 952 × 1100 pixels alors que la
scène l'affiche dans un carré de 238 × 275 unités SVG, soit environ 233 px à
l'écran. On envoie donc quatre fois la résolution utile, six fois.

Remise à la taille utile (2,5×, pour les écrans à forte densité) et encodée en
WebP, la même main pèse **29 Ko**. C'est 36 fois moins que ce qui est servi
aujourd'hui, et une seule fois pour toutes les scènes.

Le budget publié pour une animation de section héro est de 80 Ko. Aucune des
scènes actuelles ne le tient ; toutes le tiendront une fois la main sortie du
fichier.

    python outils/extraire_mains.py

Le script est idempotent : relancé, il réécrit les mêmes fichiers.
"""

from __future__ import annotations

import base64
import io
import os
import re
import sys

sys.stdout.reconfigure(errors="replace")

from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, "public", "accueil-medias", "animations")
CIBLE = os.path.join(RACINE, "animations", "commun", "mains")

#: 2,5 fois la taille d'affichage (238 × 275 unités SVG). Au-delà, on paie des
#: pixels que même un écran à 3× ne montre pas ; en deçà, la main se voit
#: crénelée sur un téléphone récent.
FACTEUR = 2.5

_BASE64 = re.compile(r"data:image/png;base64,([A-Za-z0-9+/=]+)")


def main() -> int:
    os.makedirs(CIBLE, exist_ok=True)

    # On collecte les images de toutes les scènes et on les dédoublonne par
    # leur contenu : c'est la dédup qui fait tout le gain, pas la conversion.
    distinctes: dict[bytes, list[str]] = {}
    total_base64 = 0
    for nom in sorted(os.listdir(SOURCE)):
        if not nom.endswith(".html"):
            continue
        texte = io.open(os.path.join(SOURCE, nom), encoding="utf-8").read()
        for charge in _BASE64.findall(texte):
            total_base64 += len(charge)
            distinctes.setdefault(base64.b64decode(charge), []).append(nom)

    print(f"{total_base64 // 1024} Ko de base64 dans les scènes, "
          f"pour {len(distinctes)} image(s) distincte(s).\n")

    for index, (octets, scenes) in enumerate(
        sorted(distinctes.items(), key=lambda kv: -len(kv[1])), start=1
    ):
        image = Image.open(io.BytesIO(octets))
        # ON NE GROSSIT JAMAIS UNE IMAGE. Mesuré au premier essai : la main du
        # code secret est nativement à 238 × 275 et pèse 8 Ko ; la porter à
        # 595 × 687 « pour uniformiser » l'a fait passer à 28 Ko sans ajouter
        # un seul détail — trois fois plus lourde pour la même image floue.
        largeur = min(image.width, int(238 * FACTEUR))
        hauteur = int(image.height * largeur / image.width)
        reduite = (
            image if largeur == image.width
            else image.resize((largeur, hauteur), Image.LANCZOS)
        )

        chemin = os.path.join(CIBLE, f"main-{index}.webp")
        reduite.save(chemin, "WEBP", quality=90, method=6)

        print(
            f"main-{index}.webp : {image.width}×{image.height} PNG "
            f"({len(octets) // 1024} Ko) → {largeur}×{hauteur} WebP "
            f"({os.path.getsize(chemin) // 1024} Ko), "
            f"utilisée {len(scenes)} fois dans {len(set(scenes))} scène(s)."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
