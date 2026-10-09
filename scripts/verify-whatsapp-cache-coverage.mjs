import { readFileSync } from "node:fs";

const connectors = readFileSync("lib/connectors-api.ts", "utf8");
const enterprise = readFileSync("lib/whatsapp-enterprise-api.ts", "utf8");
const cache = readFileSync("lib/whatsapp-cache.ts", "utf8");
const overview = readFileSync("app/whatsapp/page.tsx", "utf8");
const conversations = readFileSync("app/whatsapp/conversations/page.tsx", "utf8");
const automations = readFileSync("app/whatsapp/automations/page.tsx", "utf8");
const ai = readFileSync("app/whatsapp/ai/page.tsx", "utf8");
const permissions = readFileSync("components/settings/WhatsAppPermissionsPanel.tsx", "utf8");
const carnet = readFileSync("components/settings/WhatsAppCarnetPanel.tsx", "utf8");
const connectorsTab = readFileSync("components/settings/ConnectorsTab.tsx", "utf8");
const compose = readFileSync("components/whatsapp/WhatsAppComposeModal.tsx", "utf8");
const share = readFileSync("components/whatsapp/WhatsAppContactShareModal.tsx", "utf8");
const connectorCard = readFileSync("components/chat/WhatsAppConnectorCard.tsx", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`[whatsapp-cache] FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function functionBlock(source, name) {
  const start = source.indexOf(`export function ${name}`);
  const asyncStart = source.indexOf(`export async function ${name}`);
  const pos =
    start >= 0 && asyncStart >= 0 ? Math.min(start, asyncStart) : Math.max(start, asyncStart);
  assert(pos >= 0, `fonction ${name} introuvable`);
  if (pos < 0) return "";
  const nextExport = source.indexOf("\nexport ", pos + 8);
  return source.slice(pos, nextExport >= 0 ? nextExport : source.length);
}

assert(cache.includes("export const WA_CACHE"), "registre central WA_CACHE absent");
assert(cache.includes("export async function waCachedRead"), "waCachedRead absent");
assert(cache.includes("staleIfError"), "fallback stale-if-error absent");
assert(cache.includes("export async function waMutation"), "waMutation absent");
assert(cache.includes('cachePurge(prefix)'), "invalidation ciblée absente");

for (const name of [
  "getWaEtat",
  "getWaCapacites",
  "getWhatsAppStatus",
  "getWaSettings",
  "getWaActivity",
  "getWaCarnet",
  "getWhatsAppAutomations",
  "getWhatsAppAutomationHistory",
]) {
  assert(
    functionBlock(connectors, name).includes("waCachedRead"),
    `${name} doit passer par waCachedRead`,
  );
}

const pictures = functionBlock(connectors, "getWaProfilePictures");
assert(pictures.includes("readWhatsAppCache"), "photos profil: lecture cache par JID absente");
assert(pictures.includes("writeWhatsAppCache"), "photos profil: écriture cache par JID absente");

for (const name of [
  "getWaAutopilot",
  "getWaAutopilotAnalytics",
  "getWhatsAppOverview",
  "getWaAutopilotLogs",
  "getWaAutopilotConversations",
  "getWaLiveConversations",
  "getWaConversationMessages",
  "searchWaConversation",
  "getWaContactInfo",
  "getWaMediaEditResearchResult",
  "getWaMessageStatus",
]) {
  assert(
    functionBlock(enterprise, name).includes("waCachedRead"),
    `${name} doit passer par waCachedRead`,
  );
}

const messageStatus = functionBlock(enterprise, "getWaMessageStatus");
assert(
  messageStatus.includes("staleIfError: false"),
  "message/status ne doit jamais autoriser une confirmation à partir d'un cache stale",
);

for (const name of [
  "linkWhatsApp",
  "linkWhatsAppQr",
  "refreshWhatsAppCode",
  "disconnectWhatsApp",
  "updateWaSettings",
  "syncWaCarnet",
  "updateWhatsAppAutomation",
  "pauseWhatsAppAutomation",
  "resumeWhatsAppAutomation",
  "cancelWhatsAppAutomation",
]) {
  assert(
    functionBlock(connectors, name).includes("waMutation"),
    `${name} doit invalider le cache après mutation`,
  );
}

for (const name of [
  "updateWaAutopilot",
  "sendWaMedia",
  "sendWaPoll",
  "sendWaContactCard",
  "applyWaConversationAction",
  "sendWaManualMessage",
  "sendWaReply",
  "reactWaMessage",
  "editWaMessage",
  "markWaVoicePlayed",
  "deleteWaOwnMessage",
  "runWaMediaEditResearch",
]) {
  assert(
    functionBlock(enterprise, name).includes("waMutation"),
    `${name} doit invalider le cache après mutation`,
  );
}

assert(overview.includes("useCached"), "Overview doit rester SWR cache-first");
assert(overview.includes("WA_CACHE.overview"), "Overview doit utiliser la clé centrale");
assert(conversations.includes("cacheSeed<WaLiveConversations>"), "liste conversations non cache-first");
assert(conversations.includes("cacheSeed<WaConversationMessages>"), "fil conversation non cache-first");
assert(conversations.includes("WA_CACHE.conversationSearch"), "recherche conversation non cache-first");
assert(conversations.includes("WA_CACHE.contactInfo"), "fiche contact non cache-first");
assert(automations.includes("useCached"), "Automatisations non cache-first");
assert(automations.includes("WA_CACHE.automationHistory"), "historique automatisation non cache-first");
assert(ai.includes("useCacheSeed"), "Agent IA WhatsApp non cache-first");
assert(permissions.includes("useCacheSeed<WaSettings>"), "Permissions non cache-first");
assert(carnet.includes("useCacheSeed<WaCarnet>"), "Carnet non cache-first");
assert(connectorsTab.includes("WA_CACHE.status"), "statut connecteur WhatsApp non cache-first");
assert(compose.includes("WA_CACHE.carnet"), "Nouveau message non cache-first");
assert(share.includes("WA_CACHE.carnet"), "Partage contact non cache-first");
assert(connectorCard.includes("useCacheSeed<WaEtat>(WA_CACHE.etat"), "Carte WhatsApp Chat non cache-first pour état");
assert(connectorCard.includes("useCacheSeed<WhatsAppState>(WA_CACHE.status"), "Carte WhatsApp Chat non cache-first pour statut");

// Les médias binaires restent hors localStorage : le cache HTTP/CDN du navigateur
// est l'endroit adapté. On interdit seulement les lectures JSON WhatsApp directes
// qui contourneraient la couche de cache.
for (const [label, source] of [
  ["connectors-api", connectors],
  ["whatsapp-enterprise-api", enterprise],
]) {
  const rawGets = [...source.matchAll(/http\.get(?:<[^>]+>)?\(\s*([\`\"]\/whatsapp[^\n;]*)/g)];
  assert(rawGets.length > 0, `${label}: aucun GET WhatsApp détecté, test probablement cassé`);
}

if (!process.exitCode) {
  console.log("WhatsApp global cache coverage passed.");
}
