import fs from "node:fs";

const security = fs.readFileSync("components/settings/SecuritySection.tsx", "utf8");
const bridge = fs.readFileSync("components/notifications/RealtimeNotificationsBridge.tsx", "utf8");
const api = fs.readFileSync("lib/notifications-api.ts", "utf8");
const sw = fs.readFileSync("public/sw.js", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

for (const label of [
  "Push mobile Toumaï",
  "Notification Web / navigateur",
  "Inbox Toumaï",
  "Temps réel dans Toumaï",
  "Voix Toumaï",
  "E-mail",
]) {
  expect(security.includes(label), "missing diagnostic channel: " + label);
}

expect(security.includes("Tester tous les canaux"), "all-channel button missing");
expect(security.includes("enableWebPush()"), "browser permission/subscription must be prepared from the click");
expect(security.includes("testNotificationChannels(testId)"), "backend channel diagnostic must be called");
expect(security.includes("testerAlertesSecurite()"), "mobile push/email test must remain real");
expect(security.includes('detail?.source === "sse"'), "realtime must be confirmed by SSE source");
expect(security.includes('detail?.source === "web_push"'), "web push must be confirmed by service worker source");
expect(security.includes("toumai:notification-voice-complete"), "voice must wait for speech completion");

expect(api.includes("/notifications/test-channels"), "diagnostic API contract missing");
expect(api.includes("test_id?: string | null"), "realtime payload must expose test correlation id");

expect(bridge.includes('"notification.test"'), "voice bridge must support explicit notification test");
expect(bridge.includes('"toumai:notification-arrival"'), "bridge must expose arrival source");
expect(bridge.includes('"toumai:notification-voice-complete"'), "bridge must expose voice completion");
expect(bridge.includes('source: "sse" | "web_push"'), "arrival source must distinguish SSE and Web Push");

expect(sw.includes("test_id:"), "service worker must preserve test correlation id");
expect(sw.includes('type: "TOUMAI_NOTIFICATION"'), "visible browser must receive Web Push through service worker");

console.log("notification-channel-test-center: PASS");
