import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const lire = (fichier) => readFileSync(join(root, fichier), "utf8");

const page = lire("app/entreprises/page.tsx");
const formulaire = lire("app/entreprises/DemandePartenariat.tsx");
const accueil = lire("components/accueil/PageAccueil.tsx");
const seo = lire("app/seo.ts");
const contact = lire("app/contact/page.tsx");

assert.match(page, /export const metadata: Metadata/, "La page B2B doit avoir ses metadonnees.");
assert.match(page, /DemandePartenariat/, "Le formulaire doit etre affiche.");
assert.match(page, /href="#demande"/, "Les CTA doivent mener au formulaire.");
assert.match(page, /Sponsor/, "Le sponsoring doit etre identifie comme offre explicite.");
assert.match(formulaire, /API_BASE \+ "\/contact"/, "Le formulaire doit reutiliser l'API existante.");
assert.match(formulaire, /reponse\.ok/, "L'API doit confirmer une reussite reelle.");
assert.match(formulaire, /setEtat\("erreur"\)/, "Un echec doit etre affiche.");
assert.match(formulaire, /type="checkbox" required/, "Le consentement de contact doit etre demande.");
assert.match(formulaire, /site_web: siteWeb \|\| null/, "Le honeypot de l'API doit etre conserve.");
assert.match(formulaire, /maxLength=\{3000\}/, "La demande doit rester sous le plafond backend.");
assert.match(formulaire, /role="alert"/, "Les erreurs doivent etre annoncées.");
assert.match(accueil, /href="\/entreprises"/, "L'accueil doit rendre l'offre B2B accessible.");
assert.match(contact, /href="\/entreprises"/, "La page contact doit orienter les partenaires.");
assert.match(seo, /path: "\/entreprises"/, "La route doit apparaitre dans le sitemap.");

for (const source of [page, formulaire]) {
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie/, "Aucun suivi prive n'est autorise.");
  assert.doesNotMatch(source, /adsbygoogle|googletag|pixel\.|gtag\(/i, "Aucune regie publicitaire ne doit etre chargee.");
}

console.log("B2B_MONETISATION_MVP_CHECK_PASS");
