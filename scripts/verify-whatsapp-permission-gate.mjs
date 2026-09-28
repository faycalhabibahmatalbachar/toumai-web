#!/usr/bin/env node
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}
function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

const gate = read("components/whatsapp-experience/WhatsAppPermissionGate.tsx");
const center = read("components/whatsapp-experience/WhatsAppChatActionCenter.tsx");
const capabilities = read("lib/whatsapp-ui/capabilities.ts");

requireText(gate, "getWaSettings", "Permission gate must read canonical WhatsApp settings");
requireText(gate, "settings[permission] === false", "Only explicit backend permission=false may produce the denial UI");
requireText(gate, "wa-v2-permission-denied", "Permission denied state must remain testable and explicit");
requireText(gate, "Par sécurité, Toumaï ne continue pas cette action", "Permission read failure must fail closed");
requireText(center, "<WhatsAppPermissionGate", "Chat Action Center must route permissioned actions through the gate");
requireText(center, "if (action.permission)", "Only declared action permissions should trigger the contextual gate");
requireText(center, "onManagePermissions={() => window.location.assign(\"/settings/?tab=connectors\")}", "Denied gate must route to existing permission settings");
requireText(capabilities, "permission: \"send_text\"", "Action catalogue must preserve permission mappings");

if (gate.includes("updateWaSettings") || gate.includes("http.put") || gate.includes("http.post")) {
  throw new Error("Contextual permission gate must not mutate permissions or provider state");
}

console.log("WHATSAPP_PERMISSION_GATE_CONTRACT=PASS");
console.log("PERMISSION_SOURCE=BACKEND_SETTINGS");
console.log("EXPLICIT_FALSE_DENIAL=ENFORCED");
console.log("PERMISSION_READ_ERROR=FAIL_CLOSED");
console.log("PERMISSION_GATE_MUTATIONS=FORBIDDEN");
