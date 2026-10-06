/**
 * Certification statique du filet de fraîcheur WhatsApp Overview.
 *
 * Le SSE donnera l'instantanéité. Ce test protège son fallback obligatoire :
 * polling 30 s, uniquement onglet visible + réseau en ligne, avec cleanup.
 */
import { readFileSync } from "node:fs";

const cache = readFileSync("lib/swr-cache.ts", "utf8");
const page = readFileSync("app/whatsapp/page.tsx", "utf8");

function exiger(condition, message) {
  if (!condition) {
    console.error(`FAIL whatsapp-overview-polling: ${message}`);
    process.exit(1);
  }
}

exiger(
  cache.includes("refreshIntervalMs?: number"),
  "useCached doit exposer refreshIntervalMs",
);
exiger(
  cache.includes('document.visibilityState !== "visible"'),
  "le polling doit être suspendu quand l’onglet est caché",
);
exiger(
  cache.includes("!navigator.onLine"),
  "le polling doit être suspendu hors ligne",
);
exiger(
  cache.includes("window.setInterval(tick, refreshIntervalMs)"),
  "le polling doit utiliser l’intervalle configuré",
);
exiger(
  cache.includes("window.clearInterval(timer)"),
  "le timer doit être nettoyé au démontage",
);

const surfaces = [
  '"wa:etat"',
  "`wa:overview:v1:${days}`",
  "`wa:overview:analytics:${days}`",
  '"wa:overview:live-conversations"',
  '"wa:overview:automations"',
  "`wa:overview:logs:${days}`",
];

for (const marker of surfaces) {
  const index = page.indexOf(marker);
  exiger(index >= 0, `surface absente: ${marker}`);
  const local = page.slice(index, index + 650);
  exiger(
    local.includes("refreshIntervalMs: 30_000"),
    `fallback 30 s absent autour de ${marker}`,
  );
}

console.log("whatsapp-overview-polling: PASS");
