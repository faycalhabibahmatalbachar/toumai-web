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
`html` devient `html:has(.tmh)` — la seule façon d'agir sur l'élément qui
défile sans l'imposer au reste du site.

DEUX DÉCLARATIONS SONT RÉÉCRITES, ET DEUX SEULEMENT
----------------------------------------------------
Le portage ne se contente pas de déplacer des sélecteurs : il change la NATURE
de deux d'entre eux. `body` devient un `div` ordinaire, `html` devient
conditionnel. Des déclarations qui étaient justes à leur place d'origine
deviennent fausses à la nouvelle.

Les deux cas sont documentés au-dessus de leur motif, et ils ont la même
origine : l'incident du 09/09/2026, où neuf liens de navigation sur onze ne
faisaient rien. Voir `porter_declarations`, et le contrôle
`scripts/verifier-defilement-accueil.mjs` qui empêche la panne de revenir.
"""

from __future__ import annotations

import io
import re
import sys

RACINE = ".tmh"


#: `overflow-x: hidden` ne veut pas dire la même chose sur `body` et sur un div.
#:
#: L'INCIDENT DU 09/09/2026. Neuf liens sur onze de la navigation ne faisaient
#: rien. Un clic sur « Tarifs » posait `#tarifs` dans l'URL, et la page restait
#: sur le hero : `scrollY` à 0, la section à 8 533 px.
#:
#: La maquette déclarait `overflow-x: hidden` sur `body`. Là, c'est inoffensif :
#: le navigateur propage le débordement de `body` à la zone d'affichage, et
#: aucun conteneur de défilement n'est créé. Ce portage déplace la déclaration
#: sur `.tmh`, qui est un `div` ordinaire — et sur un élément ordinaire, la
#: règle CSS veut que fixer un axe à autre chose que `visible` fasse passer
#: l'autre axe de `visible` à `auto`. `.tmh` devenait donc un second conteneur
#: de défilement, haut de 11 849 px dans un `html` de 537 px, dont le contenu
#: fait exactement sa propre hauteur : il ne peut pas défiler d'un pixel.
#:
#: La molette pilotait la fenêtre ; l'ancre visait `.tmh`, qui ne bougeait pas.
#: `scroll-behavior: smooth` et `scroll-padding-top`, correctement posés sur
#: `html:has(.tmh)`, s'appliquaient à un élément que la navigation n'utilisait
#: plus.
#:
#: `clip` coupe le débordement comme `hidden`, mais NE CRÉE PAS de conteneur de
#: défilement — c'est la seule valeur qui accepte de cohabiter avec un
#: `visible` sur l'autre axe. Le rendu ne change pas d'un pixel ; la navigation
#: revient.
_DEBORDEMENT_SUR_LA_RACINE = re.compile(
    r"(overflow-x\s*:\s*)hidden", re.IGNORECASE
)


#: Le défilement doux empêche le saut d'ancre de se produire.
#:
#: Mesuré le 09/09/2026, seconde moitié du même incident. Une fois
#: `overflow-x` corrigé, les ancres restaient inertes : la page ne bougeait pas
#: d'un pixel, même vingt secondes après un vrai clic. La même page avec
#: `scroll-behavior: auto` amène les six sections à 112 px du haut, soit
#: exactement le `scroll-padding-top: 7rem` demandé.
#:
#: Et même là où il fonctionne, un défilement doux de treize mille pixels n'est
#: pas un confort : c'est plusieurs secondes pendant lesquelles l'écran défile
#: seul et la personne attend. Les pages longues sautent.
#:
#: `scroll-padding-top` est CONSERVÉ : c'est lui qui empêche l'en-tête fixe de
#: recouvrir le titre de la section où l'on arrive.
_DEFILEMENT_DOUX = re.compile(
    r"\s*scroll-behavior\s*:\s*smooth\s*;?", re.IGNORECASE
)


def porter_declarations(selecteur_porte: str, corps: str) -> str:
    """Corrige ce que le déplacement d'un sélecteur rend faux.

    On ne réécrit JAMAIS une déclaration sur un sélecteur ordinaire. Un
    `overflow-x: hidden` sur une carte ou une vignette est voulu par la
    maquette et le reste : c'est seulement sur les deux sélecteurs qui ont
    changé de nature — `body` devenu un div, `html` devenu conditionnel — que
    des valeurs changent de sens.
    """
    porte = selecteur_porte.strip()
    if porte == RACINE:
        return _DEBORDEMENT_SUR_LA_RACINE.sub(r"\1clip", corps)
    if porte == "html:has(" + RACINE + ")":
        return _DEFILEMENT_DOUX.sub("", corps)
    return corps


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
        porte = porter_selecteur(entete)
        sortie.append(
            espaces + porte + " {" + porter_declarations(porte, corps) + "}"
        )
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
