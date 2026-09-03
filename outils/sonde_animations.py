# -*- coding: utf-8 -*-
"""Les animations de l'accueil bougent-elles VRAIMENT, dans un vrai navigateur ?

POURQUOI CE SCRIPT PLUTÔT QU'UN COUP D'ŒIL
-------------------------------------------
Le panneau d'aperçu intégré ne produit aucune image quand il est masqué : son
`requestAnimationFrame` ne bat pas — mesuré, zéro battement en une seconde, y
compris dans la page du dessus. Toute conclusion tirée de là sur « ça bouge ou
non » serait une mesure de l'outil, pas du site.

Ce script ouvre un Chromium réel, fait défiler jusqu'à chaque démonstration,
et compare l'état du SVG à deux instants. Il rend un verdict par animation.

    python outils/sonde_animations.py                       # production, bureau
    python outils/sonde_animations.py http://127.0.0.1:3403/
    python outils/sonde_animations.py https://toumaiai.com/ mobile

Prérequis : `python -m playwright install chromium`.

Un nom de fichier affiché « ? » n'est pas un défaut : c'est la preuve que le
cadre ne porte aucun `src` avant d'être visible — exactement ce qu'on veut.
"""

from __future__ import annotations

import sys
import time

sys.stdout.reconfigure(errors="replace")

from playwright.sync_api import sync_playwright

EMPREINTE = """
(sel) => {
  const f = document.querySelectorAll('.animation-shell iframe')[sel];
  if (!f || !f.contentDocument) return 'pas de cadre';
  const s = f.contentDocument.querySelector('svg');
  if (!s) return 'pas de svg';
  const t = [...s.querySelectorAll('[transform],[style],[opacity]')]
    .map(e => (e.getAttribute('transform')||'')+'|'+(e.getAttribute('style')||'')+'|'+(e.getAttribute('opacity')||''))
    .join('');
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h*31 + t.charCodeAt(i))|0;
  return String(h);
}
"""


def main(url: str, largeur: int = 1440, hauteur: int = 900) -> int:
    with sync_playwright() as p:
        nav = p.chromium.launch(headless=True)
        page = nav.new_page(viewport={"width": largeur, "height": hauteur})
        page.goto(url, wait_until="networkidle", timeout=60000)

        # Le bandeau de consentement recouvre le bas de l'écran : il ne bloque
        # pas le défilement, mais il masque une partie de ce qu'on regarde.
        try:
            page.get_by_role("button", name="Refuser").click(timeout=3000)
        except Exception:
            pass

        cadres = page.locator(".animation-shell iframe")
        total = cadres.count()
        print(f"{total} démonstration(s) trouvée(s) sur {url}\n")

        verdicts = []
        for i in range(total):
            src = cadres.nth(i).get_attribute("src") or "?"
            nom = src.rsplit("/", 1)[-1]
            cadres.nth(i).scroll_into_view_if_needed()
            page.wait_for_timeout(1500)

            visible = page.evaluate(
                "(i) => { const r = document.querySelectorAll('.animation-shell iframe')[i]"
                ".getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }",
                i,
            )
            a = page.evaluate(EMPREINTE, i)
            page.wait_for_timeout(3000)
            b = page.evaluate(EMPREINTE, i)

            bouge = a != b
            verdicts.append(bouge)
            print(
                f"  {nom:<34} visible={visible!s:<5} "
                f"{'BOUGE' if bouge else '*** FIGÉE ***'}"
            )

        nav.close()

    fige = verdicts.count(False)
    print(f"\n{len(verdicts) - fige}/{len(verdicts)} animations bougent.")
    return 1 if fige else 0


if __name__ == "__main__":
    cible = sys.argv[1] if len(sys.argv) > 1 else "https://toumaiai.com/"
    # Le format compte : c'est sur un téléphone que le navigateur bride le plus
    # les cadres hors écran, et c'est là que le défaut se voyait.
    if len(sys.argv) > 2 and sys.argv[2] == "mobile":
        raise SystemExit(main(cible, 390, 844))
    raise SystemExit(main(cible))
