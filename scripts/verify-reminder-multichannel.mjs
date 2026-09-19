import fs from "node:fs";

const layout = fs.readFileSync("app/layout.tsx", "utf8");
const bridge = fs.readFileSync("components/notifications/RealtimeNotificationsBridge.tsx", "utf8");
const sw = fs.readFileSync("public/sw.js", "utf8");
const settings = fs.readFileSync("components/settings/NotificationsSection.tsx", "utf8");
const api = fs.readFileSync("lib/notifications-api.ts", "utf8");
const webPush = fs.readFileSync("lib/web-push.ts", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(layout.includes("<RealtimeNotificationsBridge />"), "realtime bridge must be mounted globally");
expect(bridge.includes('authFetch("/notifications/stream"'), "realtime must use authenticated SSE");
expect(bridge.includes('"personal.reminder"') && bridge.includes('"notification.test"'), "voice must cover reminders and explicit diagnostics only");
expect(bridge.includes('n.voice_enabled !== true'), "voice must require server opt-in");
expect(bridge.includes('document.visibilityState !== "visible"'), "voice must never speak in background");
expect(bridge.includes("playToumaiVoice"), "reminder voice must use the shared Toumai voice player");
expect(!bridge.includes("speechSynthesis"), "browser speechSynthesis must not be the primary reminder voice");
expect(bridge.includes("seenSet"), "realtime/web-push notifications must be deduplicated");
expect(bridge.includes('"TOUMAI_NOTIFICATION"'), "service worker messages must feed the same realtime bridge");

expect(sw.includes('visibilityState === "visible"'), "service worker must detect visible Toumai clients");
expect(sw.includes('type: "TOUMAI_NOTIFICATION"'), "visible clients must receive in-app event");
expect(sw.includes("showNotification"), "background Web Push must remain available");
expect(sw.indexOf('if (visible.length)') < sw.indexOf("showNotification"), "visible client suppression must happen before OS notification");

for (const label of [
  "Push mobile",
  "Web Push",
  "Inbox Toumaï",
  "Temps réel dans Toumaï",
  "Voix Toumaï",
]) {
  expect(settings.includes(label), "missing notification channel: " + label);
}
expect(settings.includes("checked") && settings.includes("disabled"), "Inbox must be visibly durable/locked");
expect(settings.includes("voice_enabled"), "voice preference must be server-backed");
expect(settings.includes("realtime_enabled"), "realtime preference must be server-backed");

expect(api.includes("voice_enabled: boolean"), "notification preference must type voice channel");
expect(api.includes("realtime_enabled: boolean"), "notification preference must type realtime channel");
expect(webPush.includes("/notifications/web-push/subscribe"), "Web Push must use authenticated server registration");
expect(webPush.includes("Notification.requestPermission()"), "Web Push permission must remain user initiated");

console.log("reminder-multichannel-web: PASS");
