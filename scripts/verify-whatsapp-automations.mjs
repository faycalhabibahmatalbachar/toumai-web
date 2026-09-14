import fs from "node:fs";

const page = fs.readFileSync("app/automations/page.tsx", "utf8");
const api = fs.readFileSync("lib/connectors-api.ts", "utf8");
const sidebar = fs.readFileSync("components/Sidebar.tsx", "utf8");

const requiredPageContracts = [
  'getWhatsAppAutomations',
  'pauseWhatsAppAutomation',
  'resumeWhatsAppAutomation',
  'cancelWhatsAppAutomation',
  'role="alertdialog"',
  'aria-modal="true"',
  'Africa/Ndjamena',
  'Toumaï Automations',
  'Une tâche déjà partie ne peut pas être rappelée.',
];

for (const contract of requiredPageContracts) {
  if (!page.includes(contract)) throw new Error(`Contrat UI absent : ${contract}`);
}

for (const endpoint of [
  "/whatsapp/automations",
  "/pause",
  "/resume",
  "/cancel",
  "/history",
]) {
  if (!api.includes(endpoint)) throw new Error(`Endpoint client absent : ${endpoint}`);
}

if (!sidebar.includes('href: "/automations"')) {
  throw new Error("La page Automatisations n'est pas accessible depuis la navigation.");
}

if (/to_jid|action_payload/.test(page)) {
  throw new Error("L'interface ne doit pas dépendre des identifiants ou payloads privés.");
}

console.log("WhatsApp automations UI contract: OK");
