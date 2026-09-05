/**
 * LE GARDE-FOU QUI EMPÊCHE D'EXÉCUTER UN APPEL D'OUTIL.
 *
 * L'INCIDENT
 * ==========
 * Le modèle, privé d'outils, a écrit dans sa réponse :
 *
 *     use_skill(skill_name="whatsapp_etat")
 *
 * L'interface y a vu du Python, a proposé « Exécuter », et la personne a
 * récolté `NameError: name 'use_skill' is not defined` dans Pyodide — à la
 * place de ses messages WhatsApp.
 *
 * La cause est traitée côté serveur : le prompt ne montre plus de syntaxe
 * d'appel. Ceci est la seconde barrière, celle qui tient quand la première
 * cède.
 *
 * CE QUE CE FICHIER PROTÈGE
 * ==========================
 * Le motif doit attraper l'appel nu, et ne PAS attraper un vrai programme qui
 * contiendrait un nom voisin. Un garde-fou trop large retirerait le bouton
 * « Exécuter » à du code légitime, et personne ne comprendrait pourquoi.
 *
 * Le projet web n'a pas de lanceur de tests : ce fichier se lance à la main,
 * `node scripts/verifier-garde-outil.mjs`, et vaut mieux qu'aucune garantie.
 */

import fs from "fs";

const source = fs.readFileSync(new URL("../lib/code-run.ts", import.meta.url), "utf8");

// On extrait le motif du fichier réel : recopier l'expression ici testerait la
// copie, et les deux divergeraient au premier ajustement.
// Le dépôt normalise en CRLF sous Windows : s'ancrer sur « ;\n » seul échoue.
const bloc = source.match(/const APPEL_D_OUTIL =\s*(\/[\s\S]*?\/);/);
if (!bloc) {
  console.error("APPEL_D_OUTIL introuvable dans lib/code-run.ts");
  process.exit(1);
}
const APPEL_D_OUTIL = eval(bloc[1]);

function estUnAppelDOutil(code) {
  const lignes = (code || "").trim().split("\n").filter((l) => l.trim());
  return (
    lignes.length > 0 &&
    lignes.length <= 3 &&
    lignes.every((l) => APPEL_D_OUTIL.test(l) || !l.trim())
  );
}

const cas = [
  // ── Ce qu'il faut écarter : l'appel d'outil nu ──────────────────────────
  ['use_skill(skill_name="whatsapp_etat")', true, "l'incident exact"],
  ["whatsapp_etat()", true, "un outil sans argument"],
  ['send_whatsapp(to="Mahamat", message="salut")', true, "un envoi halluciné"],
  ["mon_compte()", true, "l'état du compte"],
  ['use_skill_reference(name="x")', true, "la variante"],

  // ── Ce qu'il faut LAISSER exécuter : du vrai code ───────────────────────
  ['print("bonjour")', false, "un programme trivial"],
  ["import requests\nr = requests.get(url)\nprint(r.text)", false, "un vrai script"],
  ["def web_search(q):\n    return q", false, "une définition de fonction"],
  ["for i in range(3):\n    print(i)", false, "une boucle"],
  [
    "resultats = []\nfor x in donnees:\n    resultats.append(x)\nprint(resultats)",
    false,
    "quatre lignes : trop long pour un appel",
  ],
];

let echecs = 0;
for (const [code, attendu, pourquoi] of cas) {
  const obtenu = estUnAppelDOutil(code);
  const ok = obtenu === attendu;
  if (!ok) echecs++;
  const apercu = JSON.stringify(code).slice(0, 46);
  console.log(
    `${ok ? "  ok  " : "ECHEC "} ${apercu.padEnd(48)} ${String(obtenu).padEnd(6)} ${pourquoi}`,
  );
}

console.log(`\n${echecs === 0 ? "TOUT PASSE" : echecs + " ECHEC(S)"}\n`);
process.exit(echecs === 0 ? 0 : 1);
