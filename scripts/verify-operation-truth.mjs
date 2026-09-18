/**
 * LA CARTE D'ACTION NE DOIT PAS PEINDRE EN VERT CE QUI N'EST PAS PROUVÉ.
 *
 * Le défaut réel : `_action.status` valait « success » dès que l'outil n'avait
 * pas levé d'erreur. Un message accepté par WhatsApp mais jamais remis tombait
 * donc dans la même case qu'un message lu, et la carte annonçait un résultat
 * vérifié que personne n'avait constaté.
 *
 * Ce contrôle lit le code réel et vérifie quatre choses :
 *   1. l'état canonique du serveur est consommé ;
 *   2. une issue inconnue n'est pas rendue comme un succès ;
 *   3. « vérifié » est réservé à remis / lu / relu ;
 *   4. la phrase du serveur est affichée telle quelle.
 *
 * Lancement : node scripts/verify-operation-truth.mjs
 */

import fs from "node:fs";

const SOURCE = "components/chat/widgets/ActionExecutionCard.tsx";
const code = fs.readFileSync(new URL(`../${SOURCE}`, import.meta.url), "utf8");

const CONTROLES = [
  ["l'état canonique est lu", /operation_state\?: string;/],
  ["il l'emporte sur le statut d'exécution", /const canonique = action\?\.operation_state/],
  ["une issue inconnue n'est pas un succès", /\["unknown", "partial_success", "reconciling"\][\s\S]{0,80}partial_success/],
  ["un échec canonique est un échec", /\["failed", "blocked", "expired", "needs_relink"\]/],
  ["« vérifié » exige une remise constatée", /\["delivered", "read", "completed"\]\.includes\(etatCanonique\)/],
  ["la phrase du serveur est affichée", /action\?\.statement \? <p/],
];

let echecs = 0;
for (const [intitule, motif] of CONTROLES) {
  const ok = motif.test(code);
  if (!ok) echecs++;
  console.log(`${ok ? "  ok  " : "ECHEC "} ${intitule}`);
}

// Le mot « vérifié » ne doit plus dépendre du seul drapeau `verified` du
// serveur : c'est ce drapeau qui mentait.
if (/const verified = action\?\.verified === true;\s*$/m.test(code)) {
  console.log("ECHEC  « vérifié » dépend encore du seul drapeau du serveur");
  echecs++;
}

console.log(echecs === 0 ? "\nTout est vert.\n" : `\n${echecs} échec(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
