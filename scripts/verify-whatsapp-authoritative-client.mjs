import fs from "node:fs/promises";

const source = await fs.readFile("lib/whatsapp-enterprise-api.ts", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`WHATSAPP_AUTHORITATIVE_CLIENT_GATE=FAIL: ${message}`);
    process.exit(1);
  }
}

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert(start >= 0, `missing ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  assert(end > start, `missing boundary after ${startMarker}`);
  return source.slice(start, end);
}

const overview = section(
  "export function getWhatsAppOverview",
  "export function getWaLiveConversations",
);
assert(overview.includes("/whatsapp/overview?"), "Overview must use /whatsapp/overview");
assert(!overview.includes("catch ("), "Overview must not silently fall back");
assert(!overview.includes("WA_OVERVIEW_V1_NOT_DEPLOYED"), "Overview rollout sentinel must be retired");

const conversations = section(
  "export function getWaLiveConversations",
  "export function getWaConversationMessages",
);
assert(conversations.includes("/whatsapp/conversations"), "conversation list must use /whatsapp/conversations");
assert(!conversations.includes("/whatsapp/autopilot/conversations"), "conversation list must not fall back to autopilot");
assert(!conversations.includes("catch ("), "conversation list must not silently fall back");

const messages = section(
  "export function getWaConversationMessages",
  "export function sendWaManualMessage",
);
assert(messages.includes("/whatsapp/conversation/messages?"), "thread history must use /whatsapp/conversation/messages");
assert(!messages.includes("getWaAutopilotLogs"), "thread history must not reconstruct from autopilot logs");
assert(!messages.includes("autopilot-log"), "thread history must not claim a legacy source");
assert(!messages.includes("catch ("), "thread history must not silently fall back");

const send = section(
  "export function sendWaManualMessage",
  "export function getWaMessageStatus",
);
assert(send.includes("/whatsapp/message/send"), "manual send must use /whatsapp/message/send");
assert(!send.includes("/whatsapp/suggestion/send"), "manual send must not fall back to suggestion/send");
assert(!send.includes("catch ("), "manual send must not silently fall back");

const status = section("export function getWaMessageStatus", null);
assert(status.includes("/whatsapp/message/status?"), "delivery status must use /whatsapp/message/status");
assert(!status.includes('status: "accepted"'), "delivery status must not synthesize accepted on 404");
assert(!status.includes("HttpError"), "delivery status must not special-case 404");
assert(!status.includes("catch ("), "delivery status must not silently fall back");

console.log("WHATSAPP_AUTHORITATIVE_CLIENT_GATE=PASS");
