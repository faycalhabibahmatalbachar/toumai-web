import { chromium } from "playwright-core";
import crypto from "node:crypto";

const API = (process.env.TOUMAI_API || "https://api.toumaiai.com/api/v1").replace(/\/$/, "");
const WEB = (process.env.TOUMAI_WEB || "https://toumaiai.com").replace(/\/$/, "");
const RUN = process.env.GITHUB_RUN_ID || String(Date.now());

let token = "";
let userId = "";
let email = "";
let subscriptionJson = null;
let context = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(method, path, body, bearer = token) {
  const response = await fetch(API + path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}),
      "User-Agent": "Toumai-WebPush-E2E/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { raw: raw.slice(0, 600) };
  }
  if (!response.ok || payload?.success === false) {
    throw new Error(method + " " + path + " -> " + response.status + " " + JSON.stringify(payload));
  }
  return payload;
}

async function registerAccount() {
  email = "e2e-webpush-" + RUN + "@example.com";
  const password = "ToumaiWebPush-" + RUN + "-" + crypto.randomUUID().slice(0, 12) + "-Aa9!";
  const payload = await request("POST", "/auth/register", {
    email,
    password,
    name: "Toumaï Web Push E2E",
  }, "");
  const data = payload.data || {};
  token = data.access_token || "";
  userId = data.user_id || "";
  if (!token || !userId) throw new Error("Registration did not return app token/user id");
  console.log("::add-mask::" + token);
  console.log("TEMP_USER_ID=" + userId);
  console.log("TEMP_USER_EMAIL=" + email);
}

async function waitBackend() {
  const deadline = Date.now() + 300_000;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const caps = await request("GET", "/notifications/capabilities");
      last = caps.data || {};
      if (last.web_push_provider === true && last.web_push_schema === true) {
        const key = await request("GET", "/notifications/web-push/vapid-public-key");
        const publicKey = String(key.public_key || "");
        const decoded = Buffer.from(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "==", "base64");
        if (key.configured === true && decoded.length === 65 && decoded[0] === 4) {
          console.log("WEB_PUSH_PROVIDER=PASS");
          return publicKey;
        }
      }
    } catch (error) {
      last = String(error);
    }
    await sleep(10_000);
  }
  throw new Error("Backend Web Push never became cryptographically ready: " + JSON.stringify(last));
}

async function subscribeBrowser(publicKey) {
  context = await chromium.launchPersistentContext(
    "/tmp/toumai-webpush-" + RUN,
    {
      headless: false,
      executablePath: "/usr/bin/google-chrome",
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
      ],
    },
  );
  await context.grantPermissions(["notifications"], { origin: WEB });
  const pages = context.pages();
  const page = pages[0] || await context.newPage();
  await page.goto(WEB, { waitUntil: "domcontentloaded", timeout: 60_000 });

  subscriptionJson = await page.evaluate(async (vapidPublicKey) => {
    function decodeBase64Url(value) {
      const pad = "=".repeat((4 - (value.length % 4)) % 4);
      const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
      const raw = atob(base64);
      return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
    }

    window.__toumaiPushEvents = [];
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "TOUMAI_NOTIFICATION") {
        window.__toumaiPushEvents.push(event.data.notification || {});
      }
    });

    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(vapidPublicKey),
    });
    return subscription.toJSON();
  }, publicKey);

  if (!subscriptionJson?.endpoint || !subscriptionJson?.keys?.p256dh || !subscriptionJson?.keys?.auth) {
    throw new Error("Chrome did not return a usable PushSubscription: " + JSON.stringify(subscriptionJson));
  }

  console.log("BROWSER_PUSH_SUBSCRIPTION=PASS");
  return page;
}

async function registerSubscription() {
  const payload = await request("POST", "/notifications/web-push/subscribe", {
    endpoint: subscriptionJson.endpoint,
    keys: {
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth,
    },
  });
  if (payload.data?.subscribed !== true) throw new Error("Server did not persist PushSubscription");
  console.log("SERVER_PUSH_SUBSCRIPTION=PASS");
}

async function setPreferences() {
  const payload = await request("PATCH", "/notifications/preferences?category=%2A", {
    push_enabled: false,
    web_push_enabled: true,
    realtime_enabled: false,
    voice_enabled: false,
    quiet_hours_enabled: false,
    timezone: "Africa/Ndjamena",
    locale: "fr",
  });
  const data = payload.data || {};
  if (data.web_push_enabled !== true || data.realtime_enabled !== false) {
    throw new Error("Web Push preferences were not persisted: " + JSON.stringify(data));
  }
}

async function createReminder(marker) {
  const response = await fetch(API + "/chat/stream", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "User-Agent": "Toumai-WebPush-E2E/1.0",
    },
    body: JSON.stringify({
      message: "Rappelle-moi dans 1 minute de vérifier " + marker,
      session_id: null,
      language: "fr",
      model_preference: "auto",
      web_search: false,
      ephemeral: false,
    }),
  });
  if (!response.ok || !response.body) {
    throw new Error("Chat stream failed with HTTP " + response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  const deadline = Date.now() + 120_000;
  while (!done && Date.now() < deadline) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!data) continue;
      try {
        const event = JSON.parse(data);
        if (event.error) throw new Error("Chat error: " + JSON.stringify(event.error));
        if (event.done === true) done = true;
      } catch (error) {
        if (String(error).startsWith("Error: Chat error:")) throw error;
      }
    }
  }
  if (!done) throw new Error("Reminder chat stream did not complete");
  console.log("REMINDER_CREATED=PASS");
}

async function waitInbox(marker) {
  const deadline = Date.now() + 170_000;
  while (Date.now() < deadline) {
    const payload = await request("GET", "/notifications?limit=100&offset=0&include_archived=true");
    const rows = payload.data || [];
    const row = rows.find((item) =>
      item.event === "personal.reminder" &&
      (String(item.title || "") + " " + String(item.body || "")).includes(marker)
    );
    if (row) {
      console.log("INBOX_REMINDER=PASS");
      return row;
    }
    await sleep(5_000);
  }
  throw new Error("Reminder did not reach Inbox");
}

async function waitBrowserPush(page, marker) {
  await page.waitForFunction(
    (value) => Array.isArray(window.__toumaiPushEvents) &&
      window.__toumaiPushEvents.some((event) =>
        (String(event.title || "") + " " + String(event.body || "")).includes(value)
      ),
    marker,
    { timeout: 170_000, polling: 500 },
  );

  const events = await page.evaluate(() => window.__toumaiPushEvents);
  const matching = events.filter((event) =>
    (String(event.title || "") + " " + String(event.body || "")).includes(marker)
  );
  if (matching.length !== 1) {
    throw new Error("Expected exactly one browser push event, got " + matching.length);
  }
  console.log("REAL_BROWSER_WEB_PUSH=PASS");
}

async function unregisterSubscription() {
  try {
    if (subscriptionJson?.endpoint && token) {
      await request("DELETE", "/notifications/web-push/subscription", {
        endpoint: subscriptionJson.endpoint,
      });
    }
  } catch (error) {
    console.warn("Subscription cleanup warning:", String(error));
  }

  try {
    if (context) {
      const page = context.pages()[0];
      if (page) {
        await page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration("/");
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) await subscription.unsubscribe();
        });
      }
    }
  } catch (error) {
    console.warn("Browser unsubscribe warning:", String(error));
  }
}

async function main() {
  try {
    await registerAccount();
    const publicKey = await waitBackend();
    const page = await subscribeBrowser(publicKey);
    await registerSubscription();
    await setPreferences();

    const marker = "WEBPUSH-E2E-" + RUN;
    await createReminder(marker);
    await Promise.all([
      waitInbox(marker),
      waitBrowserPush(page, marker),
    ]);

    console.log("=== WEB PUSH PRODUCTION E2E: PASS ===");
  } finally {
    await unregisterSubscription();
    if (context) await context.close().catch(() => {});
    if (userId) console.log("CLEANUP_USER_ID=" + userId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
