import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../components/chat/WhatsAppConnectorCard.tsx", import.meta.url),
  "utf8",
);

const checks = [
  ['role="status"', "statut vocal concis"],
  ['aria-live="polite"', "annonce polie du statut"],
  ['aria-atomic="true"', "annonce atomique du statut"],
  ['role="alert"', "annonce immediate des erreurs"],
  ['aria-hidden="true">{icon}</span>', "icones decoratives masquees"],
];

for (const [needle, label] of checks) {
  if (!source.includes(needle)) {
    throw new Error(`Accessibilite WhatsApp: ${label} manquant.`);
  }
}

const sectionStart = source.indexOf("<section");
const sectionEnd = source.indexOf(">", sectionStart);
const sectionOpening = source.slice(sectionStart, sectionEnd + 1);
if (sectionOpening.includes('aria-live=')) {
  throw new Error(
    "Accessibilite WhatsApp: la carte entiere ne doit pas etre une region aria-live.",
  );
}

console.log("WhatsApp connector accessibility: OK");
