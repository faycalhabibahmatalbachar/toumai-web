import fs from "node:fs";

const page = fs.readFileSync("app/automations/page.tsx", "utf8");
const coreApi = fs.readFileSync("lib/automations-api.ts", "utf8");
const uxApi = fs.readFileSync("lib/automation-ux-api.ts", "utf8");
const sidebar = fs.readFileSync("components/Sidebar.tsx", "utf8");
const redirects = fs.readFileSync("public/_redirects", "utf8");

// Gate H moved the page from the legacy /whatsapp/automations implementation
// to the canonical Automation OS v2 contract. This verifier intentionally
// checks product guarantees, not old function names or obsolete copy.
const requiredPageContracts = [
  "getAutomationInbox",
  "getAutomationPreview",
  "getAutomationVersions",
  "getAutomationCalendar",
  "getAutomationTemplates",
  "streamAutomationInbox",
  "cancelAutomationWithConfirmation",
  "rollbackAutomation",
  "runAutomationNow",
  "Versions",
  "Restaurer",
  "Calendrier",
  "Recettes",
  "Simulation sans effet",
  "Réessayer",
];

for (const contract of requiredPageContracts) {
  if (!page.includes(contract)) throw new Error(`Contrat UI absent : ${contract}`);
}

for (const endpoint of [
  "/automations/v2",
  "/pause",
  "/activate",
  "/cancel",
  "/archive",
  "/duplicate",
  "/run",
]) {
  if (!coreApi.includes(endpoint)) throw new Error(`Endpoint Automation OS absent : ${endpoint}`);
}

for (const endpoint of [
  "/inbox",
  "/preview",
  "/versions",
  "/rollback",
  "/templates",
  "/calendar",
  "/stream",
]) {
  if (!uxApi.includes(endpoint)) throw new Error(`Endpoint UX Gate H absent : ${endpoint}`);
}

if (!uxApi.includes("authFetch")) {
  throw new Error("Le flux temps réel doit conserver l'authentification Bearer via fetch.");
}
if (!uxApi.includes("window.confirm")) {
  throw new Error("L'annulation destructive doit rester derrière une confirmation UX.");
}
if (!uxApi.includes("side_effect_executed: false") || !uxApi.includes('mode: "dry_run"')) {
  throw new Error("Le contrat preview doit déclarer explicitement zéro side effect.");
}

if (!sidebar.includes('href: "/automations"')) {
  throw new Error("La page Automatisations n'est pas accessible depuis la navigation.");
}

const redirectsAutomationsAway = redirects
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .some((line) => /^\/automations(?:\/\*)?\s+\/(?:\s+|$)/.test(line));

if (redirectsAutomationsAway) {
  throw new Error("La page Automatisations ne doit pas être redirigée vers l’accueil.");
}

for (const forbidden of ["to_jid", "provider_operation_id", "fencing_token", "lease_token", "action_payload"]) {
  if (page.includes(forbidden) || uxApi.includes(forbidden)) {
    throw new Error(`L'interface ne doit pas dépendre du champ privé : ${forbidden}`);
  }
}

console.log("WhatsApp / Automation OS Gate H UI contract: OK");
