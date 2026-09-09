/**
 * LA REPRODUCTION DOIT RESSEMBLER AU PRODUIT.
 *
 * `components/accueil/demo/primitives.tsx` recopie l'allure du chat sans en
 * importer la logique : c'est ce qui garde la page d'accueil légère et
 * indépendante. Le prix, c'est que les deux peuvent diverger en silence. Le
 * jour où quelqu'un redessine la bulle de l'utilisateur dans le chat, l'accueil
 * continuera d'afficher l'ancienne — et montrera une interface qui n'existe
 * plus, sous une phrase qui promet le contraire.
 *
 * Ce contrôle compare les valeurs qui comptent. Il ne prétend pas vérifier que
 * les deux rendus sont identiques : il signale quand une valeur citée d'un côté
 * a disparu de l'autre, ce qui est le seul moment où il faut regarder.
 *
 * ET UNE VÉRIFICATION DE VÉRACITÉ
 * --------------------------------
 * Le 09/09/2026, la page annonçait « ce que vous voyez ici est l'interface
 * réelle » sous une reproduction, et la carte de confirmation reprenait mot
 * pour mot « cette action sera réellement exécutée » — vrai dans le produit, où
 * le bouton envoie ; faux sur une page publique, où il ne peut rien envoyer.
 * Ces deux phrases ne doivent pas revenir.
 */

import { readFileSync } from "node:fs";

const CHAT = "components/ChatMessage.tsx";
const DEMO = "components/accueil/demo/primitives.tsx";
const PREUVE = "components/accueil/demo/PreuveProduit.tsx";

const chat = readFileSync(CHAT, "utf8");
const demo = readFileSync(DEMO, "utf8");
const preuve = readFileSync(PREUVE, "utf8");

const echecs = [];

/* ── 1. Les valeurs partagées ──────────────────────────────────────────────
 *
 * Chacune a été relevée dans le chat et recopiée dans la démonstration. Si
 * elle disparaît du chat, la démonstration montre un produit périmé. */
const COMMUNES = [
  ["la bulle de l'utilisateur", "rounded-[20px] rounded-br-[8px]"],
  ["le coin arrondi du logo dans la signature", 'rounded-[5px]'],
  ["la pastille de source", "rounded-full border border-[var(--border)] px-3 py-1.5"],
  ["l'intitulé de la carte de confirmation", "uppercase tracking-[0.06em]"],
  ["la carte de confirmation", "rounded-2xl border border-[var(--border)] bg-[var(--surface)]"],
];

for (const [quoi, valeur] of COMMUNES) {
  const dansChat = chat.includes(valeur);
  const dansDemo = demo.includes(valeur);
  if (dansChat && !dansDemo) {
    echecs.push(
      `${DEMO} : ${quoi} — « ${valeur} » existe dans le chat mais plus dans la ` +
        `démonstration. L'accueil montrerait autre chose que le produit.`,
    );
  }
  if (!dansChat && dansDemo) {
    echecs.push(
      `${CHAT} : ${quoi} — « ${valeur} » a changé dans le chat. La ` +
        `démonstration de l'accueil montre encore l'ancienne version.`,
    );
  }
}

/* ── 2. Les phrases du produit ─────────────────────────────────────────────
 *
 * Reprises telles quelles, parce que ce sont elles qu'on lit à l'écran. */
const PHRASES = ["Web consulté —", "Toumaï AI"];
for (const p of PHRASES) {
  if (chat.includes(p) && !demo.includes(p)) {
    echecs.push(`${DEMO} : la phrase « ${p} » du chat n'apparaît plus dans la démonstration.`);
  }
}

/* ── 3. Ce qu'une page publique ne doit pas prétendre ──────────────────── */
const INTERDITS = [
  [
    preuve,
    PREUVE,
    /l['’]interface réelle/i,
    "la page annonce « l'interface réelle » alors qu'elle montre une " +
      "reproduction. Décrire, ne pas promettre.",
  ],
  [
    demo,
    DEMO,
    /sera réellement exécutée/i,
    "la carte de confirmation reprend la phrase du produit — vraie là où le " +
      "bouton envoie, fausse ici où il ne peut rien envoyer.",
  ],
];

for (const [contenu, fichier, motif, pourquoi] of INTERDITS) {
  // On ignore les commentaires : ils CITENT ces phrases pour expliquer
  // pourquoi elles ont été retirées.
  const sansCommentaires = contenu
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  if (motif.test(sansCommentaires)) {
    echecs.push(`${fichier} : ${pourquoi}`);
  }
}

if (echecs.length) {
  console.error("\nDÉMONSTRATION DE L'ACCUEIL — contrôle en échec\n");
  for (const e of echecs) console.error("  • " + e);
  console.error("");
  process.exit(1);
}

console.log("Démonstration de l'accueil : fidèle au chat, et sans promesse de trop.");
