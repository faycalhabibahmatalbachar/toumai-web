#!/usr/bin/env node
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}
function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

const activity = read("components/whatsapp-experience/WhatsAppRecentActivity.tsx");
const center = read("components/whatsapp-experience/WhatsAppChatActionCenter.tsx");
const actionCenter = read("components/whatsapp-experience/WhatsAppActionCenter.tsx");
const api = read("lib/connectors-api.ts");

requireText(activity, "getWaActivity({ days: 7, limit: 5 })", "Recent activity must remain bounded to 7 days / 5 events");
requireText(activity, "item.recipient_masked", "Recent activity must render the server-masked recipient contract");
requireText(activity, "Aucune donnée n’est inventée", "Activity read failure must not fabricate data");
requireText(center, "recentActivityOpen", "Chat Action Center must isolate the recent activity view");
requireText(center, "<WhatsAppRecentActivity", "Recent activity must be integrated into the V2 chat sheet");
requireText(actionCenter, "wa-v2-open-activity", "Activity must require an explicit user gesture");
requireText(api, "getWaActivity", "Recent activity must use the existing connector API");
requireText(api, "recipient_masked", "Connector contract must expose only the masked recipient field");

if (activity.includes("http.post") || activity.includes("http.put") || activity.includes("http.delete") || activity.includes("updateWa")) {
  throw new Error("Recent activity must remain read-only");
}

console.log("WHATSAPP_RECENT_ACTIVITY_CONTRACT=PASS");
console.log("ACTIVITY_TRIGGER=EXPLICIT_ONLY");
console.log("ACTIVITY_WINDOW=7_DAYS_LIMIT_5");
console.log("ACTIVITY_RECIPIENT_SOURCE=SERVER_MASKED_ONLY");
console.log("ACTIVITY_MUTATIONS=FORBIDDEN");
