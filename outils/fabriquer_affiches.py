# -*- coding: utf-8 -*-
"""Photographie chaque scène dans son état final, pour servir d'affiche.

LE PROBLÈME QU'ELLES RÉSOLVENT
-------------------------------
Une scène est une `<iframe>`. Si ce document-là n'arrive pas — réseau coupé,
connexion qui lâche au mauvais moment, onglet ouvert depuis un cache partiel —
le cadre reste VIDE. Sur la page d'accueil, ça fait un rectangle de 900 × 540
sans rien dedans, à côté d'un texte qui promet une démonstration. C'est ce que
Faycal a vu le 4 septembre 2026 : une animation affichée, quatre trous.

Une affiche est posée en fond du cadre, derrière l'iframe. Si l'iframe arrive,
elle la recouvre et personne ne la voit. Si elle n'arrive pas, on voit la scène
à son dernier instant — la boîte vidée, le livre écrit, le labyrinthe résolu.
Pas une animation, mais pas un trou : l'image de ce que la scène raconte.

POURQUOI L'ÉTAT FINAL, ET PAS LA PREMIÈRE IMAGE
------------------------------------------------
La première image d'une scène, c'est une pièce noire ou un bac plein : elle ne
dit rien. Chaque scène sait déjà produire son état final complet — c'est ce
qu'elle affiche à qui a demandé moins de mouvement (`prefers-reduced-motion`).
On émule donc cette préférence, et on photographie. L'affiche est par
construction la même image que celle servie aux personnes qui coupent les
animations : une seule vérité, pas deux à maintenir.

    python outils/fabriquer_affiches.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(errors="replace")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = os.path.join(RACINE, "animations", "scenes")
AFFICHES = os.path.join(RACINE, "animations", "commun", "affiches")

#: La taille d'affichage réelle sur un grand écran est 904 × 542 ; on
#: photographie un peu plus large pour ne pas servir une image floue sur les
#: écrans à forte densité, et pas beaucoup plus pour ne pas payer des pixels
#: que personne ne verra.
LARGEUR, HAUTEUR = 1100, 660

#: WebP, qualité 72 : à cette taille, la différence avec 90 ne se voit pas et
#: le fichier est deux fois plus léger. Budget : 40 Ko par affiche.
QUALITE = 72
BUDGET_KO = 40


def servir(dossier: str, port: int):
    """Un serveur local jetable : les scènes chargent des ressources en
    chemin relatif (`../commun/…`), donc `file://` ne suffit pas."""

    class Muet(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=dossier, **kw)

        def log_message(self, *a):
            pass

    serveur = ThreadingHTTPServer(("127.0.0.1", port), Muet)
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    return serveur


def main() -> int:
    os.makedirs(AFFICHES, exist_ok=True)
    fichiers = sorted(f for f in os.listdir(SCENES) if f.endswith(".html"))
    if not fichiers:
        print("aucune scène")
        return 1

    port = 8497
    serveur = servir(os.path.join(RACINE, "animations"), port)
    time.sleep(0.4)

    total = 0
    depassements = []
    try:
        with sync_playwright() as pw:
            nav = pw.chromium.launch()
            # `reduced_motion` fait afficher à chaque scène son état final
            # complet, sans jouer la chorégraphie : exactement l'image
            # voulue, et sans avoir à deviner un instant.
            page = nav.new_page(
                viewport={"width": LARGEUR, "height": HAUTEUR},
                device_scale_factor=1,
                reduced_motion="reduce",
            )
            for nom in fichiers:
                page.goto(f"http://127.0.0.1:{port}/scenes/{nom}",
                          wait_until="networkidle")
                # Les polices manuscrites arrivent après le premier rendu ;
                # sans cette attente, l'affiche montre la police de repli.
                page.evaluate("document.fonts.ready")
                page.wait_for_timeout(600)

                sortie = os.path.join(AFFICHES, nom.replace(".html", ".webp"))
                # Les scènes de jeu, écrites avant le socle commun, appellent
                # leur cadre `.stage` ; les suivantes `.scene`. On prend celui
                # qui est là plutôt que d'uniformiser quatre fichiers qui
                # tournent.
                cadre = page.locator(".scene")
                if cadre.count() == 0:
                    cadre = page.locator(".stage")
                cadre.screenshot(path=sortie)
                # Playwright n'écrit pas le WebP : on repasse par Pillow, qui
                # sait aussi vérifier que l'image n'est pas vide.
                from PIL import Image

                image = Image.open(sortie).convert("RGB")
                image.save(sortie, "WEBP", quality=QUALITE, method=6)

                ko = os.path.getsize(sortie) / 1024
                total += ko
                marque = "  " if ko <= BUDGET_KO else "!!"
                if ko > BUDGET_KO:
                    depassements.append((nom, ko))
                print(f" {marque} {nom:<32} {image.width}×{image.height}"
                      f"  {ko:6.1f} Ko")
            nav.close()
    finally:
        serveur.shutdown()

    print(f"\n  {len(fichiers)} affiche(s) : {total:.1f} Ko")
    if depassements:
        print(f"\nHORS BUDGET ({BUDGET_KO} Ko l'affiche) :")
        for nom, ko in depassements:
            print(f"  - {nom} : {ko:.1f} Ko")
        return 1

    print("\n  `python outils/publier_animations.py` pour les mettre en ligne.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
