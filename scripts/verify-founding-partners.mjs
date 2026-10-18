import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (path) => readFileSync(join(process.cwd(), path), "utf8");
const page = lire("app/partenaires-fondateurs/page.tsx");
const demo = lire("app/partenaires-fondateurs/DemoPilotes.tsx");
const formulaire = lire("app/entreprises/DemandePartenariat.tsx");
const entreprise = lire("app/entreprises/page.tsx");
const accueil = lire("components/accueil/PageAccueil.tsx");
const seo = lire("app/seo.ts");
const playbook = lire("docs/marketing/founding-partners-playbook-2026-10.md");
const pipeline = lire("docs/marketing/founding-partners-pipeline-template.csv");

assert.match(page, /export const metadata: Metadata/, "La page doit avoir des métadonnées.");
assert.match(page, /partenaires-fondateurs/, "La page doit avoir son canonical.");
assert.match(page, /DemandePartenariat programme="fondateurs"/, "Le formulaire pilote doit être monté.");
assert.match(page, /href="#candidature"/, "Le CTA doit mener au formulaire.");
assert.match(page, /3 à 5/, "L'objectif de recrutement doit être présenté comme intention.");
assert.match(page, /fictif|fictives/i, "Le démonstrateur doit être identifié comme fictif.");
assert.match(demo, /useState/, "Le démonstrateur doit être interactif.");
assert.match(demo, /aria-live="polite"/, "Les changements doivent être annoncés.");
assert.match(demo, /Simulation — sans appel IA/, "Aucune promesse de véritable IA dans la démo.");
assert.doesNotMatch(demo, /fetch\(|API_BASE|localStorage|sessionStorage|document\.cookie/, "La démo ne doit pas transmettre de données.");
assert.match(formulaire, /programme\?: "general" \| "fondateurs"/, "Le mode pilote doit être typé.");
assert.match(formulaire, /FOUNDING PARTNERS/, "Les candidatures doivent être identifiables dans les courriels.");
assert.match(formulaire, /API_BASE \+ "\/contact"/, "Réutiliser le canal existant.");
assert.match(formulaire, /reponse\.ok/, "Pas de confirmation sans succès HTTP.");
assert.match(formulaire, /type="checkbox" required/, "Le consentement reste requis.");
assert.match(formulaire, /site_web: siteWeb \|\| null/, "Conserver le honeypot.");
assert.match(entreprise, /href="\/partenaires-fondateurs"/, "La page entreprise doit lier le programme.");
assert.match(accueil, /href="\/partenaires-fondateurs"/, "L'accueil doit lier le programme.");
assert.match(seo, /path: "\/partenaires-fondateurs"/, "Le sitemap doit référencer le programme.");
assert.match(playbook, /aucun partenaire, revenu ou pilote signé/i, "Pas de chiffres commerciaux inventés.");
assert.match(playbook, /130 000/, "Le budget simulé doit être documenté.");
assert.equal(pipeline.trim().split("\n").length, 21, "20 cibles fictives à vérifier + en-tête.");
assert.doesNotMatch(pipeline, /@|https?:\/\//, "Ne pas publier de données de prospection personnelles.");
for (const source of [page, demo, formulaire]) {
  assert.doesNotMatch(source, /adsbygoogle|googletag|gtag\(|pixel\./i, "Aucune régie ni pixel.");
}
console.log("FOUNDING_PARTNERS_MVP_CHECK_PASS");
