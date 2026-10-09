import { chromium } from "playwright-core";
import crypto from "node:crypto";

const API = (process.env.TOUMAI_API || "https://api.toumaiai.com/api/v1").replace(/\/$/, "");
const WEB = (process.env.TOUMAI_WEB || "https://toumaiai.com").replace(/\/$/, "");
const RUN = process.env.GITHUB_RUN_ID || String(Date.now());

let token = "";
let userId = "";
let email = "";
let context = null;

async function api(method, path, body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
      "User-Agent": "Toumai-Notification-Center-E2E/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw: raw.slice(0, 600) }; }
  if (!response.ok || payload?.success === false) {
    throw new Error(method + " " + path + " -> " + response.status + " " + JSON.stringify(payload));
  }
  return payload;
}

async function registerAccount() {
  email = "e2e-channel-center-" + RUN + "@example.com";
  const password = "ToumaiCenter-" + RUN + "-" + crypto.randomUUID().slice(0, 10) + "-Aa9!";
  const payload = await api("POST", "/auth/register", {
    email,
    password,
    name: "Toumaï Notification Center E2E",
  });
  const session = payload.data || {};
  token = session.access_token || "";
  userId = session.user_id || "";
  if (!token || !userId) throw new Error("Temporary registration did not return session");
  console.log("::add-mask::" + token);
  console.log("TEMP_USER_ID=" + userId);
  console.log("TEMP_USER_EMAIL=" + email);
  return session;
}

async function waitForUi(page) {
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    await page.goto(WEB + "/settings/?tab=security", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const button = page.getByRole("button", { name: "Tester tous les canaux" });
    if (await button.count()) return button;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error("New Security notification center was not deployed within 5 minutes");
}

async function rowText(page, label) {
  const labelNode = page.getByText(label, { exact: true }).first();
  await labelNode.waitFor({ state: "visible", timeout: 30_000 });
  const row = labelNode.locator("xpath=../..");
  return ((await row.textContent()) || "").replace(/\s+/g, " ").trim();
}

async function main() {
  const session = await registerAccount();

  context = await chromium.launchPersistentContext(
    "/tmp/toumai-channel-center-" + RUN,
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
  await context.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: "chadgpt_web_session_v1", value: session });

  const page = context.pages()[0] || await context.newPage();
  const button = await waitForUi(page);

  await page.evaluate(async () => {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (!existing) {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    await navigator.serviceWorker.ready;
  });

  await button.click();
  console.log("BUTTON_CLICK=PASS");

  await page.getByText("Push mobile Toumaï", { exact: true }).waitFor({ timeout: 30_000 });

  const deadline = Date.now() + 45_000;
  const labels = [
    "Push mobile Toumaï",
    "Notification Web / navigateur",
    "Inbox Toumaï",
    "Temps réel dans Toumaï",
    "Voix Toumaï",
    "E-mail",
  ];

  let rows = {};
  while (Date.now() < deadline) {
    rows = Object.fromEntries(
      await Promise.all(labels.map(async (label) => [label, await rowText(page, label)])),
    );
    if (Object.values(rows).every((text) => !String(text).includes("En cours…"))) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  for (const [label, text] of Object.entries(rows)) {
    console.log(label + " => " + text);
  }

  const requiredConfirmed = [
    "Notification Web / navigateur",
    "Inbox Toumaï",
    "Temps réel dans Toumaï",
  ];
  for (const label of requiredConfirmed) {
    if (!String(rows[label] || "").includes("Confirmé")) {
      throw new Error(label + " was not end-to-end confirmed: " + rows[label]);
    }
  }

  for (const label of labels) {
    if (String(rows[label] || "").includes("En cours…")) {
      throw new Error(label + " remained pending after diagnostic timeout");
    }
  }

  const voice = String(rows["Voix Toumaï"] || "");
  if (!/(Confirmé|Non confirmé|Indisponible)/.test(voice)) {
    throw new Error("Voice diagnostic did not reach a terminal state: " + voice);
  }

  const mobile = String(rows["Push mobile Toumaï"] || "");
  if (!/(Confirmé|Non confirmé|Indisponible|Échec)/.test(mobile)) {
    throw new Error("Mobile diagnostic did not reach a terminal state: " + mobile);
  }

  console.log("=== SETTINGS NOTIFICATION CENTER E2E: PASS ===");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (context) await context.close().catch(() => {});
    if (userId) console.log("CLEANUP_USER_ID=" + userId);
  });
