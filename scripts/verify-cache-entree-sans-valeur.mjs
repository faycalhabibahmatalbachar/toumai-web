/**
 * Une entrée de cache sans valeur ne doit pas faire tomber la page.
 *
 * CE QUI S'EST PASSÉ (20/09/2026, production)
 * --------------------------------------------
 * `toumai:cache:anon:user:profile` existait en localStorage sans champ `v`.
 * `cacheRead` la trouvait, la rendait telle quelle, et `useCacheSeed`
 * appelait son callback avec `undefined`. Le consommateur lisait
 * `p.full_name`, levait une TypeError pendant le rendu, et TOUTE la page
 * /chat affichait « This page couldn't load ».
 *
 * Un cache est censé accélérer une page, jamais l'empêcher de s'afficher.
 *
 * Ce contrôle relit la source plutôt que d'exécuter le module : `swr-cache`
 * est du TypeScript lié au DOM, et le faire tourner ici demanderait une
 * chaîne de compilation pour une garantie plus faible que la lecture directe
 * de la garde.
 *
 * Lancer : `node scripts/verify-cache-entree-sans-valeur.mjs`
 */
import { readFileSync } from "node:fs";

const source = readFileSync("lib/swr-cache.ts", "utf8");

function exiger(condition, message) {
  if (!condition) {
    console.error(`FAIL cache-entree-sans-valeur: ${message}`);
    process.exit(1);
  }
}

exiger(
  source.includes('hasOwnProperty.call(e, "v")'),
  "cacheRead doit vérifier la présence du champ `v` avant de rendre l'entrée",
);
exiger(
  source.includes("e.v === undefined"),
  "cacheRead doit traiter une valeur `undefined` comme un défaut de cache",
);

// La garde doit se trouver AVANT le `return e`, sinon elle ne protège rien.
const debut = source.indexOf("export function cacheRead");
const corps = source.slice(debut, source.indexOf("\n}", debut));
exiger(
  corps.indexOf('hasOwnProperty.call(e, "v")') < corps.lastIndexOf("return e;"),
  "la garde doit précéder le `return e` de cacheRead",
);

console.log("cache-entree-sans-valeur: PASS");
