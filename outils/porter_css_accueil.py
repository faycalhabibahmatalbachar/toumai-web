# -*- coding: utf-8 -*-
"""Porte la feuille de style de la page d'accueil sous une racine `.tmh`.

POURQUOI NE PAS LA COPIER TELLE QUELLE
---------------------------------------
Elle porte des noms très génériques — `.shell`, `.hero`, `.brand`, `.button` —
et Next assemble les feuilles de plusieurs routes dans le même document. Copiée
sans portée, elle repeindrait le chat, les pages légales et la version arabe.

Elle définit aussi `:root`, `html` et `body`. Ces trois-là ne s'arrêtent à
aucune page : `color-scheme: light` sur `:root` forcerait le clair partout, y
compris chez quelqu'un qui a choisi le sombre.

CE QUE FAIT LA TRANSFORMATION
------------------------------
Chaque sélecteur reçoit `.tmh ` devant. `:root` et `body` deviennent `.tmh`
lui-même (c'est lui qui porte désormais le fond, la police et les variables),
`html` devient `html:has(.tmh)` — la seule façon de garder le défilement doux
sans l'imposer au reste du site. Les déclarations ne sont jamais touchées.
"""

from __future__ import annotations

import io
import re
import sys

RACINE = ".tmh"


def porter_selecteur(selecteur: str) -> str:
    parties = [p.strip() for p in selecteur.split(",") if p.strip()]
    portees = []
    for p in parties:
        if p == ":root" or p == "body":
            portees.append(RACINE)
        elif p == "html":
            # `scroll-behavior` et `scroll-padding-top` agissent sur l'élément
            # qui défile : les déplacer sur le conteneur ne ferait rien.
            portees.append(f"html:has({RACINE})")
        elif p == "*":
            portees.append(RACINE)
            portees.append(f"{RACINE} *")
        elif p.startswith(RACINE):
            portees.append(p)
        else:
            portees.append(f"{RACINE} {p}")
    # Doublons possibles quand deux sélecteurs d'une même liste se replient sur
    # la racine (`:root` et `body`) : les garder produirait une règle valide
    # mais illisible.
    vus = []
    for p in portees:
        if p not in vus:
            vus.append(p)
    return ",\n".join(vus)


def porter(css: str) -> str:
    sortie = []
    i = 0
    n = len(css)
    while i < n:
        # Commentaires : recopiés tels quels.
        if css.startswith("/*", i):
            fin = css.find("*/", i + 2)
            fin = n if fin == -1 else fin + 2
            sortie.append(css[i:fin])
            i = fin
            continue

        accolade = css.find("{", i)
        if accolade == -1:
            sortie.append(css[i:])
            break

        entete = css[i:accolade]
        entete_nette = entete.strip()

        if entete_nette.startswith("@media") or entete_nette.startswith("@supports"):
            # Bloc imbriqué : on porte les règles à l'intérieur.
            profondeur = 1
            j = accolade + 1
            while j < n and profondeur:
                if css[j] == "{":
                    profondeur += 1
                elif css[j] == "}":
                    profondeur -= 1
                j += 1
            interieur = css[accolade + 1 : j - 1]
            sortie.append(entete + "{" + porter(interieur) + "}")
            i = j
            continue

        if entete_nette.startswith("@"):
            # @keyframes, @font-face… : jamais portés, un nom d'animation n'est
            # pas un sélecteur.
            profondeur = 1
            j = accolade + 1
            while j < n and profondeur:
                if css[j] == "{":
                    profondeur += 1
                elif css[j] == "}":
                    profondeur -= 1
                j += 1
            sortie.append(css[i:j])
            i = j
            continue

        fin_bloc = css.find("}", accolade)
        fin_bloc = n if fin_bloc == -1 else fin_bloc
        corps = css[accolade + 1 : fin_bloc]
        espaces = re.match(r"\s*", entete).group(0)
        sortie.append(espaces + porter_selecteur(entete) + " {" + corps + "}")
        i = fin_bloc + 1

    return "".join(sortie)


if __name__ == "__main__":
    source, cible = sys.argv[1], sys.argv[2]
    css = io.open(source, encoding="utf-8").read()
    entete = (
        "/* PAGE D'ACCUEIL TOUMAÏ — feuille d'origine, portée sous `.tmh`.\n"
        " *\n"
        " * Ne pas modifier à la main : ce fichier est produit à partir de la\n"
        " * feuille livrée avec la maquette (`styles.css`), par le script\n"
        " * `outils/porter_css_accueil.py`. Toute retouche ici serait perdue à\n"
        " * la prochaine reprise de la maquette — et surtout, la divergence ne\n"
        " * se verrait nulle part.\n"
        " *\n"
        " * La portée `.tmh` n'est pas décorative : les noms de classes de la\n"
        " * maquette (`.shell`, `.hero`, `.brand`, `.button`) sont assez\n"
        " * génériques pour repeindre le chat et les pages légales, que Next\n"
        " * sert depuis le même document.\n"
        " */\n\n"
    )
    io.open(cible, "w", encoding="utf-8").write(entete + porter(css))
    print(f"{source} -> {cible}")
