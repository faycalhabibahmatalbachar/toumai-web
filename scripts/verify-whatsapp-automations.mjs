import fs from "node:fs";

const page = fs.readFileSync("app/automations/page.tsx", "utf8");
const api = fs.readFileSync("lib/automations-api.ts", "utf8");
const sidebar = fs.readFileSync("components/Sidebar.tsx", "utf8");
const redirects = fs.readFileSync("public/_redirects", "utf8");

const requiredPageContracts = [
  'from "@/lib/automations-api"',
  "listAutomations",
  "getAutomation",
  "pauseAutomation",
  "activateAutomation",
  "cancelAutomation",
  "runAutomationNow",
  'aria-modal="true"',
  "Hors connexion",
  "Réessayer",
  "Acceptée par WhatsApp",
];

for (const contract of requiredPageContracts) {
  if (!page.includes(contract) && !api.includes(contract)) {
    throw new Error(`Contrat Automation OS absent : ${contract}`);
  }
}

for (const endpoint of [
  'const BASE = "/automations/v2"',
  "/pause",
  "/activate",
  "/cancel",
  "/run",
]) {
  if (!api.includes(endpoint)) throw new Error(`Endpoint Automation OS absent : ${endpoint}`);
}

if (!api.includes("newRequestId") || !page.includes('newRequestId("web-run")')) {
  throw new Error("L'exécution immédiate doit garder une clé de requête idempotente.");
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
  throw new Error("La page Automatisations ne doit pas être redirigée vers l'accueil.");
}

if (!page.includes('disabled={!online || !!busy}')) {
  throw new Error("Les mutations doivent être désactivées hors connexion ou pendant une action.");
}

if (/to_jid|action_payload/.test(page)) {
  throw new Error("L'interface ne doit pas dépendre des identifiants ou payloads privés.");
}

if (!api.includes('succeeded: { label: viaWhatsApp ? "Acceptée par WhatsApp"')) {
  throw new Error("Le Web ne doit pas présenter une acceptation provider comme une livraison WhatsApp.");
}

console.log("Automation OS web contract: OK");
