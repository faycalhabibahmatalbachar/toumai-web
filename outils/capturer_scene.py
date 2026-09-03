# -*- coding: utf-8 -*-
"""Photographie une scène animée à des instants précis, dans un vrai navigateur.

POURQUOI PAS SIMPLEMENT REGARDER
---------------------------------
Le panneau d'aperçu intégré n'accorde pas d'images quand il est masqué : son
`requestAnimationFrame` bat à une fraction de sa cadence, parfois pas du tout.
Les interpolations, elles, sont pilotées par l'horloge — une scène y paraît donc
cinq fois plus lente qu'elle ne l'est, et on corrige un défaut qui n'existe pas.

Ce script ouvre un Chromium réel à la taille de la scène et déclenche une photo
aux instants demandés. On regarde des images qui correspondent à ce que verra
quelqu'un, pas à ce que veut bien afficher un outil.

    python outils/capturer_scene.py http://127.0.0.1:3405/animations/scenes/00-lampe-introduction.html
    python outils/capturer_scene.py <url> --instants 0.4 2 4 6 9 12 --sortie /tmp/scene

Sans `--instants`, il prend une photo par seconde pendant douze secondes.
Prérequis : `python -m playwright install chromium`.
"""

from __future__ import annotations

import argparse
import os
import sys

sys.stdout.reconfigure(errors="replace")

from playwright.sync_api import sync_playwright

#: La scène est dessinée dans un viewBox 5:3 ; on photographie à sa taille
#: native pour qu'un défaut d'un pixel dans le fichier soit un défaut d'un pixel
#: sur l'image.
LARGEUR, HAUTEUR = 1200, 720


def capturer(url: str, instants: list[float], sortie: str, reduit: bool) -> int:
    os.makedirs(sortie, exist_ok=True)
    with sync_playwright() as p:
        nav = p.chromium.launch(headless=True)
        page = nav.new_page(
            viewport={"width": LARGEUR, "height": HAUTEUR},
            reduced_motion="reduce" if reduit else "no-preference",
        )
        erreurs: list[str] = []
        page.on("pageerror", lambda e: erreurs.append(str(e)))
        page.on("console", lambda m: erreurs.append(m.text) if m.type == "error" else None)

        page.goto(url, wait_until="load", timeout=30000)

        precedent = 0.0
        fichiers = []
        for instant in instants:
            page.wait_for_timeout(max(0, int((instant - precedent) * 1000)))
            precedent = instant
            nom = os.path.join(sortie, f"t{instant:05.1f}.png".replace(".", "_", 1))
            page.screenshot(path=nom)
            fichiers.append(nom)
            print(f"  {instant:5.1f} s  ->  {os.path.basename(nom)}")

        nav.close()

    if erreurs:
        print("\nERREURS DE PAGE (elles expliquent toujours une scène figée) :")
        for e in dict.fromkeys(erreurs):
            print("  -", e[:200])
        return 1

    print(f"\n{len(fichiers)} image(s) dans {sortie}. Aucune erreur de page.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Photographie une scène animée")
    ap.add_argument("url")
    ap.add_argument("--instants", type=float, nargs="+", default=[float(i) for i in range(1, 13)])
    ap.add_argument("--sortie", default="captures")
    ap.add_argument(
        "--reduit",
        action="store_true",
        help="émule prefers-reduced-motion : la scène doit alors montrer son état FINAL, "
             "pas un écran vide",
    )
    args = ap.parse_args()
    return capturer(args.url, args.instants, args.sortie, args.reduit)


if __name__ == "__main__":
    raise SystemExit(main())
