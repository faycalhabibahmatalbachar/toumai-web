# -*- coding: utf-8 -*-
"""Écrit la scène Sao 4 : des tessons de poterie qui se rassemblent.

POURQUOI UN GÉNÉRATEUR ET NON UN FICHIER ÉCRIT À LA MAIN
---------------------------------------------------------
Les tessons ne sont pas des formes inventées posées côte à côte : ce sont les
MORCEAUX d'une seule jarre, découpée par une grille. C'est ce qui fait que
l'assemblage tombe juste au pixel près, sans retouche, et que les joints
dessinent une vraie fracture plutôt qu'un motif.

Écrire ces douze découpes à la main, c'est douze occasions de se tromper d'un
pixel, et aucune façon de le voir avant le rendu. Ici la géométrie est
calculée : la jarre est définie une fois, la grille la découpe, et chaque
tesson reçoit une pose de départ tirée d'une graine FIXE — donc reproductible.

LE PARALLÈLE AVEC LA RÉVÉLATION AU VENT
----------------------------------------
Le vent DISPERSE pour révéler Toumaï 5. Sao ASSEMBLE pour se révéler. Même
palette, même durée, même cadre : les deux scènes se lisent comme un diptyque,
et le rapprochement dit ce qu'on ne veut pas écrire en toutes lettres, qu'un
modèle plus petit reconstruit à partir de fragments.

    python outils/fabriquer_scene_sao.py
"""

from __future__ import annotations

import math
import os
import random
import sys

sys.stdout.reconfigure(errors="replace")

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "animations", "scenes", "07-sao-tessons.html")

#: La graine est FIXE. Une scène dont la composition change à chaque
#: régénération est une scène qu'on ne peut ni relire ni corriger : la capture
#: d'écran d'hier ne correspond plus au fichier d'aujourd'hui.
random.seed(4)

LARGEUR, HAUTEUR = 1200, 720

#: La jarre, centrée. Un profil sao : col étroit, panse large, base ramassée.
CX, CY = 600, 372
JARRE = (
    f"M{CX-34} 128 "
    f"C{CX-40} 150 {CX-46} 166 {CX-40} 180 "
    f"C{CX-120} 204 {CX-166} 262 {CX-166} 344 "
    f"C{CX-166} 452 {CX-104} 536 {CX-2} 540 "
    f"C{CX+104} 540 {CX+166} 452 {CX+166} 344 "
    f"C{CX+166} 262 {CX+120} 204 {CX+40} 180 "
    f"C{CX+46} 166 {CX+40} 150 {CX+34} 128 Z"
)

#: La découpe. Quatre rangées de trois : douze tessons, assez pour que
#: l'assemblage se lise, assez peu pour qu'on suive chaque pièce des yeux.
COLONNES, RANGEES = 3, 4
X0, X1 = CX - 172, CX + 172
Y0, Y1 = 126, 546

#: Sept terres, du plus clair au plus sombre. L écart compte : à teintes
#: voisines les tessons se confondent et la jarre redevient un aplat.
TERRES = ["#d68f5c", "#a44e30", "#c67446", "#8f4128", "#cd8151",
          "#b0603a", "#e0a271"]


def cellules():
    """Les rectangles de découpe.

    LES COUPES VERTICALES SONT DÉCALÉES D'UNE RANGÉE À L'AUTRE, et c'est tout
    ce qui sépare une poterie brisée d'un damier. Une première version tirait
    les colonnes UNE fois pour les quatre rangées : les joints se superposaient
    d'un bout à l'autre de la jarre et l'oeil lisait un carrelage, pas une
    fracture. Ici chaque rangée retire ses colonnes.
    """
    ys = [Y0]
    for j in range(1, RANGEES):
        base = Y0 + (Y1 - Y0) * j / RANGEES
        ys.append(base + random.uniform(-24, 24))
    ys.append(Y1)

    for j in range(RANGEES):
        xs = [X0]
        for i in range(1, COLONNES):
            base = X0 + (X1 - X0) * i / COLONNES
            xs.append(base + random.uniform(-52, 52))
        xs.append(X1)
        for i in range(COLONNES):
            yield (xs[i], ys[j], xs[i + 1] - xs[i], ys[j + 1] - ys[j])


def pose_de_depart(cx_cell, cy_cell):
    """D'où le tesson arrive. Il part du BORD du cadre, dans la direction
    opposée à sa place finale : les pièces convergent visiblement vers le
    centre au lieu de s'agiter sur place."""
    angle = math.atan2(cy_cell - CY, cx_cell - CX)
    distance = random.uniform(430, 700)
    return (
        round(math.cos(angle) * distance, 1),
        round(math.sin(angle) * distance * 0.62, 1),
        round(random.uniform(-165, 165), 1),
    )


def main() -> int:
    tessons = []
    for indice, (x, y, w, h) in enumerate(cellules()):
        dx, dy, rot = pose_de_depart(x + w / 2, y + h / 2)
        tessons.append({
            "i": indice,
            "x": round(x, 1), "y": round(y, 1),
            "w": round(w, 1), "h": round(h, 1),
            "dx": dx, "dy": dy, "rot": rot,
            "teinte": TERRES[indice % len(TERRES)],
            "retard": round(indice * 0.055 + random.uniform(0, 0.09), 3),
        })

    decoupes = "\n".join(
        f'        <clipPath id="cell-{t["i"]}">'
        f'<rect x="{t["x"]}" y="{t["y"]}" width="{t["w"]}" height="{t["h"]}" />'
        f'</clipPath>'
        for t in tessons
    )

    morceaux = "\n".join(
        f'      <g class="tesson" id="tesson-{t["i"]}" data-dx="{t["dx"]}" '
        f'data-dy="{t["dy"]}" data-rot="{t["rot"]}" data-retard="{t["retard"]}">\n'
        f'        <g clip-path="url(#jarre)">\n'
        f'          <g clip-path="url(#cell-{t["i"]})">\n'
        f'            <rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" '
        f'fill="{t["teinte"]}" />\n'
        f'            <rect x="{t["x"]}" y="{t["y"]}" width="{t["w"]}" '
        f'height="{t["h"]}" fill="none" stroke="#8d4327" stroke-width="2.4" '
        f'stroke-opacity=".55" />\n'
        f'          </g>\n'
        f'        </g>\n'
        f'      </g>'
        for t in tessons
    )

    html = GABARIT.replace("__DECOUPES__", decoupes) \
                  .replace("__TESSONS__", morceaux) \
                  .replace("__JARRE__", JARRE)

    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write(html)

    ko = os.path.getsize(SORTIE) / 1024
    print(f"  {len(tessons)} tessons, {ko:.1f} Ko")
    print("  `python outils/fabriquer_affiches.py` puis `publier_animations.py`")
    return 0


GABARIT = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Toumaï — Sao 4</title>
  <link rel="stylesheet" href="../commun/scene.css" />
  <style>
    /* La jumelle de la révélation au vent : même sable, même terre cuite. Le
     * vent DISPERSE pour révéler ; celle-ci ASSEMBLE pour se révéler.
     *
     * LE CADRE SOMBRE DU SOCLE COMMUN EST NEUTRALISÉ ICI. `commun/scene.css`
     * pose un fond noir, une bordure claire et une ombre portée : c'est le
     * boîtier qui convient aux scènes de démonstration, posées seules dans une
     * carte. Celle-ci vit à côté du volet Toumaï 5, qui n'a pas de boîtier :
     * un liseré noir sur un seul des deux volets se lit comme une erreur de
     * montage. */
    html, body { background: #eadac7; }
    .scene {
      background: linear-gradient(158deg, #f2e7da 0%, #eadac7 55%, #e2cfba 100%);
      border: 0;
      border-radius: 0;
      box-shadow: none;
      width: 100%;
      max-height: none;
    }
    body { padding: 0; }

    .nom {
      font: 400 76px/1 Georgia, "Times New Roman", serif;
      letter-spacing: .04em;
      fill: #fdf3e6;
      text-anchor: middle;
    }

    .tesson { will-change: transform; }

    @media (prefers-reduced-motion: reduce) {
      .poussiere { animation: none; }
    }
  </style>
</head>
<body>
  <main class="scene" id="scene">
    <svg viewBox="0 0 1200 720" role="img" aria-labelledby="titre-scene desc-scene">
      <title id="titre-scene">Des tessons de poterie se rassemblent et forment Sao 4</title>
      <desc id="desc-scene">
        Douze fragments de terre cuite reposent sur un sol sable. Ils se
        soulèvent, convergent vers le centre et s'emboîtent : ils étaient les
        morceaux d'une même jarre. Le nom Sao 4 s'inscrit alors sur la panse.
      </desc>

      <defs>
        <clipPath id="jarre"><path d="__JARRE__" /></clipPath>
__DECOUPES__

        <filter id="ombre-jarre" x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="20"
                        flood-color="#7a4423" flood-opacity=".22" />
        </filter>
      </defs>

      <!-- L'ombre au sol. Elle grandit avec l'assemblage : une ombre de jarre
           entière sous trois tessons épars se lit comme une tache. -->
      <ellipse id="ombre" cx="600" cy="556" rx="60" ry="16"
               fill="#7a4423" opacity="0" />

      <g id="tessons" filter="url(#ombre-jarre)">
__TESSONS__
      </g>

      <!-- Les cannelures. Une jarre sao porte des bandes incisées ; deux
           suffisent à dire de quoi il s agit, et elles traversent les joints,
           ce qui achève de casser la lecture en carreaux. -->
      <g id="cannelures" clip-path="url(#jarre)" opacity="0">
        <path d="M420 292 H780" stroke="#7d3a22" stroke-width="3" opacity=".38" />
        <path d="M420 302 H780" stroke="#e3a878" stroke-width="2" opacity=".30" />
        <path d="M420 452 H780" stroke="#7d3a22" stroke-width="3" opacity=".38" />
        <path d="M420 462 H780" stroke="#e3a878" stroke-width="2" opacity=".30" />
      </g>

      <!-- Le nom, inscrit une fois la jarre refermée. -->
      <text id="nom" class="nom" x="600" y="392" opacity="0">SAO 4</text>
    </svg>
  </main>

  <script src="../commun/scene.js"></script>
  <script>
    (() => {
      "use strict";
      const S = window.Scene;

      const tessons = Array.from(document.querySelectorAll(".tesson")).map((n) => ({
        noeud: n,
        dx: parseFloat(n.dataset.dx),
        dy: parseFloat(n.dataset.dy),
        rot: parseFloat(n.dataset.rot),
        retard: parseFloat(n.dataset.retard),
      }));
      const nom = S.el("nom");
      const ombre = S.el("ombre");
      const cannelures = S.el("cannelures");

      /** Pose un tesson entre sa position d'arrivée (t = 1) et son point de
       *  départ (t = 0). La rotation se fait autour du CENTRE du cadre : les
       *  pièces tournent avec la jarre, pas chacune sur elle-même, ce qui
       *  donne un mouvement de rassemblement plutôt qu'un tourbillon. */
      function poser(t, avancement) {
        const reste = 1 - avancement;
        t.noeud.setAttribute(
          "transform",
          `translate(${(t.dx * reste).toFixed(1)} ${(t.dy * reste).toFixed(1)}) ` +
            `rotate(${(t.rot * reste).toFixed(1)} 600 372)`
        );
        S.opacite(t.noeud, Math.min(1, 0.25 + avancement * 1.4));
      }

      function preparer() {
        tessons.forEach((t) => poser(t, 0));
        nom.textContent = "SAO 4";
        S.opacite(nom, 0);
        S.opacite(cannelures, 0);
        S.opacite(ombre, 0);
        ombre.setAttribute("rx", "60");
      }

      function finFixe() {
        tessons.forEach((t) => poser(t, 1));
        S.opacite(nom, 1);
        S.opacite(cannelures, 1);
        S.opacite(ombre, 0.28);
        ombre.setAttribute("rx", "150");
      }

      /** Chaque tesson part à son heure, mais tous arrivent presque ensemble :
       *  le décalage est sur le DÉPART, pas sur la durée. Douze pièces qui
       *  finissent l'une après l'autre donnent une file d'attente ; douze
       *  pièces qui convergent donnent un assemblage. */
      async function assembler() {
        const duree = 2600;
        await S.tween(duree, (t) => {
          for (const tesson of tessons) {
            const avance = Math.max(0, Math.min(1, (t - tesson.retard) / (1 - tesson.retard)));
            // Une courbe qui freine à l'arrivée : un morceau de terre cuite
            // qui se pose ne décélère pas linéairement.
            poser(tesson, 1 - Math.pow(1 - avance, 3));
          }
          S.opacite(ombre, t * 0.28);
          ombre.setAttribute("rx", String(60 + t * 90));
        }, S.courbes.lineaire);
      }

      /** Le petit tassement final : la jarre se pose. Sans lui, l'assemblage
       *  s'arrête net et on voit qu'il était calculé. */
      async function tasser() {
        const groupe = S.el("tessons");
        await S.tween(320, (t) => {
          const e = 1 - 0.012 * Math.sin(Math.PI * t);
          groupe.setAttribute(
            "transform",
            `translate(600 372) scale(${e.toFixed(4)}) translate(-600 -372)`
          );
        });
        groupe.removeAttribute("transform");
      }

      const scene = S.jouer({
        preparer,
        finFixe,
        pause: 2200,
        async sequence(annulee) {
          await S.attendre(620);
          await assembler();
          if (annulee()) return;
          await tasser();
          if (annulee()) return;

          await S.attendre(220);
          await S.tween(520, (t) => {
            S.opacite(nom, t);
            S.opacite(cannelures, t);
          });
          if (annulee()) return;

          await S.attendre(2000);

          // On se disperse à nouveau : la boucle reprend là où elle a commencé.
          await S.tween(760, (t) => {
            tessons.forEach((tesson) => poser(tesson, 1 - t));
            S.opacite(nom, 1 - t);
            S.opacite(cannelures, 1 - t);
            S.opacite(ombre, 0.28 * (1 - t));
            ombre.setAttribute("rx", String(150 - t * 90));
          });
        },
      });

      S.el("scene").addEventListener("click", () => scene.relancer());
      scene.tour();
    })();
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
