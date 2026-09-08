/**
 * LA NAVIGATION PAR ANCRES DOIT RESTER POSSIBLE.
 *
 * CE QUI EST ARRIVÉ LE 09/09/2026
 * --------------------------------
 * Neuf liens sur onze de l'en-tête ne faisaient rien. Cliquer sur « Tarifs »
 * posait `#tarifs` dans l'URL et laissait la page sur le hero : `scrollY` à 0,
 * la section à 8 533 px. Vingt secondes plus tard, rien n'avait bougé.
 *
 * La maquette déclarait `overflow-x: hidden` sur `body`, où c'est inoffensif —
 * le navigateur propage le débordement de `body` à la zone d'affichage. Le
 * portage sous `.tmh` déplace la déclaration sur un `div` ordinaire, et là, la
 * règle CSS veut que fixer un axe à autre chose que `visible` fasse passer
 * l'autre axe de `visible` à `auto`. `.tmh` devenait un second conteneur de
 * défilement dont le contenu fait exactement sa propre hauteur : incapable de
 * défiler, et pourtant seul visé par les ancres.
 *
 * POURQUOI UN SCRIPT ET NON UNE RELECTURE
 * ----------------------------------------
 * `app/toumai-accueil.css` est REGÉNÉRÉ par `outils/porter_css_accueil.py`, et
 * la feuille d'origine de la maquette n'est pas versionnée. La correction vit
 * donc à deux endroits, et le jour où quelqu'un reprendra la maquette avec un
 * script plus ancien, la panne reviendra sans que rien ne la signale — c'est
 * exactement ce qui s'est produit la première fois.
 *
 * Ce contrôle lit le vrai fichier livré. Il ne raisonne pas sur une copie.
 */

import { readFileSync } from "node:fs";

const CSS = "app/toumai-accueil.css";
const SCRIPT = "outils/porter_css_accueil.py";

const echecs = [];

const css = readFileSync(CSS, "utf8");

// ── 1. La racine ne doit pas devenir un conteneur de défilement ────────────
//
// On isole le bloc `.tmh { … }` qui porte la police et le fond — celui qui a
// hérité du rôle de `body`. Les `.tmh .quelque-chose { overflow-x: hidden }`
// des cartes et vignettes sont légitimes et ne sont pas concernés.
const blocRacine = css.match(/\n\.tmh\s*\{([\s\S]*?)\n\}/g) ?? [];
for (const bloc of blocRacine) {
  const declarations = bloc.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const propriete of ["overflow", "overflow-x", "overflow-y"]) {
    const trouve = declarations.match(
      new RegExp(`(^|[;{\\s])${propriete}\\s*:\\s*([^;}]+)`, "i"),
    );
    if (!trouve) continue;
    const valeur = trouve[2].trim().toLowerCase();
    // `clip` et `visible` ne créent pas de conteneur de défilement.
    if (/hidden|auto|scroll|overlay/.test(valeur)) {
      echecs.push(
        `${CSS} : \`${propriete}: ${valeur}\` sur la racine .tmh en fait un ` +
          `conteneur de défilement. Toute la navigation par ancres cesserait ` +
          `de fonctionner. Utiliser \`clip\`.`,
      );
    }
  }
}

// ── 2. Le défilement doux empêche le saut d'ancre ─────────────────────────
//
// Seconde moitié du même incident. `overflow-x` corrigé, les ancres restaient
// inertes : la page ne bougeait pas d'un pixel, même vingt secondes après un
// vrai clic. Avec `auto`, les six sections arrivent à 112 px du haut.
//
// `scroll-padding-top` doit RESTER : c'est lui qui empêche l'en-tête fixe de
// recouvrir le titre de la section où l'on arrive.
const racineDefilante = css.match(/html:has\(\.tmh\)\s*\{([\s\S]*?)\n?\}/);
if (racineDefilante) {
  const corps = racineDefilante[1].replace(/\/\*[\s\S]*?\*\//g, "");
  if (/scroll-behavior\s*:\s*smooth/i.test(corps)) {
    echecs.push(
      `${CSS} : \`scroll-behavior: smooth\` sur html:has(.tmh) empêche le ` +
        `saut d'ancre de se produire sur cette page. Retirer la déclaration.`,
    );
  }
  if (!/scroll-padding-top/i.test(corps)) {
    echecs.push(
      `${CSS} : \`scroll-padding-top\` a disparu. Sans lui, l'en-tête fixe ` +
        `recouvre le titre de la section où l'ancre dépose le lecteur.`,
    );
  }
}

// ── 3. Le générateur doit produire la même chose ───────────────────────────
//
// Sans ce contrôle, corriger le CSS livré suffirait à faire passer le test —
// et la prochaine régénération réintroduirait la panne en silence. La feuille
// d'origine de la maquette n'étant pas versionnée, on vérifie que les deux
// réécritures existent toujours dans le script.
const script = readFileSync(SCRIPT, "utf8");
for (const [nom, present] of [
  ["porter_declarations", script.includes("def porter_declarations")],
  ["_DEBORDEMENT_SUR_LA_RACINE", script.includes("_DEBORDEMENT_SUR_LA_RACINE")],
  ["_DEFILEMENT_DOUX", script.includes("_DEFILEMENT_DOUX")],
]) {
  if (!present) {
    echecs.push(
      `${SCRIPT} : \`${nom}\` a disparu. La prochaine reprise de la maquette ` +
        `rapporterait la navigation morte du 09/09/2026.`,
    );
  }
}

if (echecs.length) {
  console.error("\nDÉFILEMENT DE L'ACCUEIL — contrôle en échec\n");
  for (const e of echecs) console.error("  • " + e);
  console.error("");
  process.exit(1);
}

console.log("Défilement de l'accueil : la racine ne capture pas le défilement.");
