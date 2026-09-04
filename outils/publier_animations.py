# -*- coding: utf-8 -*-
"""Publie les scènes animées, et refuse de publier ce qui dépasse le budget.

CE QUE FAIT CETTE ÉTAPE
------------------------
`animations/` est la source ; `public/accueil-medias/animations/` est ce qui
part chez les visiteurs. Le script recopie la première dans la seconde en
gardant la même arborescence — `scenes/` et `commun/` — pour qu'un chemin
relatif écrit dans une scène (`../commun/scene.js`) marche des deux côtés. Une
scène qu'on ne peut pas ouvrir directement depuis son dossier source est une
scène qu'on ne peut pas déboguer.

POURQUOI UN GARDE-FOU DE POIDS
-------------------------------
Le budget publié pour une animation de section héro est de 80 Ko. Les cinq
scènes livrées portaient 1 090 Ko de `data:image/png;base64` pour deux images
distinctes — la même main recopiée six fois, jamais mise en cache puisqu'elle
vivait dans le HTML. Personne ne l'avait vu, parce que rien ne le mesurait.

Le script mesure, affiche, et **échoue** au-delà du budget. Une limite qu'on
peut dépasser sans s'en apercevoir n'est pas une limite.

    python outils/publier_animations.py
    python outils/publier_animations.py --verifier   (ne copie rien, mesure seulement)
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys

sys.stdout.reconfigure(errors="replace")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(RACINE, "animations")
CIBLE = os.path.join(RACINE, "public", "accueil-medias", "animations")

#: Par scène, HTML seul — les ressources communes sont partagées et mises en
#: cache une fois pour toutes, elles ne se comptent pas par scène.
BUDGET_SCENE_KO = 80

#: Tout ce qui est commun réuni : socle, feuille de style, mains, police
#: manuscrite. Relevé de 60 à 72 Ko le 4 septembre 2026 pour la police : la
#: pile générique `cursive` donnait trois écritures différentes sur trois
#: systèmes et rien de manuscrit sur plusieurs Android. 21 Ko sous-ensemble,
#: chargés une fois, et seulement par qui fait défiler jusqu'à la scène —
#: chaque scène est une iframe qui ne se charge qu'à l'écran.
BUDGET_COMMUN_KO = 72


def poids(chemin: str) -> int:
    return os.path.getsize(chemin)


def lister(dossier: str) -> list[str]:
    fichiers = []
    for racine, _, noms in os.walk(dossier):
        for nom in sorted(noms):
            if nom == ".gitkeep":
                continue
            fichiers.append(os.path.join(racine, nom))
    return fichiers


def main() -> int:
    ap = argparse.ArgumentParser(description="Publie les scènes animées")
    ap.add_argument("--verifier", action="store_true", help="mesure sans copier")
    args = ap.parse_args()

    scenes = [f for f in lister(os.path.join(SOURCE, "scenes")) if f.endswith(".html")]
    communs = lister(os.path.join(SOURCE, "commun"))

    print("SCÈNES")
    depassements = []
    total_scenes = 0
    for f in scenes:
        ko = poids(f) / 1024
        total_scenes += ko
        marque = "  " if ko <= BUDGET_SCENE_KO else "!!"
        if ko > BUDGET_SCENE_KO:
            depassements.append((os.path.basename(f), ko))
        print(f" {marque} {os.path.basename(f):<34} {ko:6.1f} Ko")

    print("\nCOMMUN (chargé une fois, partagé par toutes les scènes)")
    total_commun = 0
    for f in communs:
        if f.endswith(".md"):
            continue
        ko = poids(f) / 1024
        total_commun += ko
        print(f"    {os.path.relpath(f, SOURCE):<34} {ko:6.1f} Ko")

    print(f"\n  {len(scenes)} scène(s) : {total_scenes:.1f} Ko"
          f"  |  commun : {total_commun:.1f} Ko"
          f"  |  budget : {BUDGET_SCENE_KO} Ko par scène")

    if depassements:
        print("\nHORS BUDGET — publication refusée :")
        for nom, ko in depassements:
            print(f"  - {nom} : {ko:.1f} Ko (> {BUDGET_SCENE_KO} Ko)")
        print("\n  La cause est presque toujours une image encodée dans le HTML.")
        print("  `python outils/extraire_mains.py` la sort du fichier.")
        return 1

    if total_commun > BUDGET_COMMUN_KO:
        print(f"\nLe commun dépasse {BUDGET_COMMUN_KO} Ko — publication refusée.")
        return 1

    if args.verifier:
        print("\nVérification seule : rien n'a été copié.")
        return 0

    if os.path.isdir(CIBLE):
        shutil.rmtree(CIBLE)
    shutil.copytree(
        SOURCE, CIBLE, ignore=shutil.ignore_patterns("*.md", ".gitkeep")
    )
    publies = [f for f in lister(CIBLE)]
    print(f"\nPublié : {len(publies)} fichier(s) dans public/accueil-medias/animations/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
