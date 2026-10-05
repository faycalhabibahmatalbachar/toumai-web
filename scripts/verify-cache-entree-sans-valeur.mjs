/**
 * Une entrée de cache sans valeur ne doit pas faire tomber la page.
 *
 * CE QUI S'EST PASSÉ (20/09/2026, production)
 * --------------------------------------------
 * `toumai:cache:anon:user:profile` existait en localStorage sans champ `v`.
 * Le cache la trouvait, la rendait telle quelle, et `useCacheSeed` appelait
 * son callback avec `undefined`. Le consommateur lisait `p.full_name`, levait
 * une TypeError pendant le rendu, et TOUTE la page /chat tombait.
 *
 * CACHE-008 a déplacé la lecture réelle dans `cacheReadFor(scope, key)` pour
 * garantir le cloisonnement de session. Ce contrôle vérifie donc le chemin de
 * lecture interne qui parse localStorage, sans dépendre du nom local de la
 * variable (`e`, `entry`, etc.).
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

const debut = source.indexOf("function cacheReadFor");
const fin = source.indexOf("\n}\n\nexport function cacheRead", debut);
exiger(debut >= 0 && fin > debut, "le chemin de lecture interne cacheReadFor est introuvable");
const corps = source.slice(debut, fin);

// Capture le même identifiant dans les deux gardes afin d'éviter qu'un simple
// commentaire ou une vérification sans rapport fasse passer le test.
const presence = corps.match(/hasOwnProperty\.call\(([$A-Z_a-z][$\w]*),\s*["']v["']\)/);
exiger(
  Boolean(presence),
  "cacheReadFor doit vérifier la présence du champ `v` avant de rendre l'entrée",
);
const variable = presence?.[1] ?? "";
const undefinedGuard = new RegExp(`\\b${variable.replace(/[$]/g, "\\$")}\\.v\\s*===\\s*undefined`);
exiger(
  Boolean(variable) && undefinedGuard.test(corps),
  "cacheReadFor doit traiter une valeur `undefined` comme un défaut de cache",
);

const guardPosition = presence?.index ?? -1;
const nullAfterGuard = corps.indexOf("return null", guardPosition);
const finalReturn = Math.max(corps.lastIndexOf(`return ${variable}`), corps.lastIndexOf("return entry"));
exiger(
  guardPosition >= 0 && nullAfterGuard > guardPosition && finalReturn > nullAfterGuard,
  "la garde doit produire un MISS avant que l'entrée valide puisse être rendue",
);

// L'API publique doit toujours déléguer à ce chemin sécurisé.
exiger(
  /export function cacheRead<[^>]+>\(key: string\)[\s\S]*?cacheReadFor<[^>]+>\(owner\(\), key\)/.test(source),
  "cacheRead public doit déléguer au chemin sécurisé cacheReadFor",
);

console.log("cache-entree-sans-valeur: PASS");
