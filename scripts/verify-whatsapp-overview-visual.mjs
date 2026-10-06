import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.WA_OVERVIEW_URL || "http://127.0.0.1:3100/whatsapp/";
const artifactDir = process.env.WA_OVERVIEW_ARTIFACT_DIR || "artifacts/whatsapp-overview";
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1672, height: 941 },
  deviceScaleFactor: 1,
  serviceWorkers: "block",
  colorScheme: "dark",
});

await context.addInitScript(() => {
  sessionStorage.setItem("toumai:signature-vue", "1");
  localStorage.setItem(
    "chadgpt_web_session_v1",
    JSON.stringify({
      access_token: "visual-test-access",
      refresh_token: "visual-test-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Date.now() + 3_600_000,
      user_id: "visual-test-user",
    }),
  );
});

const today = new Date();
function isoDay(offset) {
  const d = new Date(today);
  d.setDate(today.getDate() - offset);
  d.setHours(10 + (offset % 8), (offset * 7) % 60, 0, 0);
  return d.toISOString();
}

const logs = Array.from({ length: 30 }, (_, index) => {
  const wave = Math.max(1, Math.round(7 + Math.sin(index / 2.4) * 5 + (index % 5)));
  return Array.from({ length: wave }, (_, inner) => ({
    id: `log-${index}-${inner}`,
    chat_id: `22177${String(index).padStart(6, "0")}`,
    chat_name: index % 2 ? "Mamadou Diallo" : "Awa Ndiaye",
    incoming: "Bonjour, j'aimerais avoir plus d'informations.",
    reply: inner % 4 === 0 ? "" : "Bonjour, bien sûr. Comment puis-je vous aider ?",
    mode: "auto",
    msg_type: "text",
    lang: "fr",
    latency_ms: 920,
    tokens: 38,
    delivered: true,
    created_at: isoDay(index),
  }));
}).flat();

const analytics = {
  period_days: 30,
  responses_today: 132,
  responses_total: 3842,
  active_conversations: 1248,
  avg_response_time_ms: 1120,
  total_tokens: 243000,
  safety_blocks: 2,
  kpis: {
    messages: { value: 3842, delta: 25, delta_unit: "pct", previous: 3074 },
    conversations: { value: 1248, delta: 12, delta_unit: "pct", previous: 1114 },
    success_rate: { value: 78, delta: 6, delta_unit: "pts", previous: 72 },
    avg_response_ms: { value: 1120, delta: -7, delta_unit: "pct", previous: 1204 },
    escalations: { value: 17, delta: -3, delta_unit: "pct", previous: 18 },
  },
  by_mode: { auto: 3600, suggest: 242 },
  by_type: [{ type: "text", count: 3842, pct: 100 }],
  by_language: [{ code: "fr", label: "Français", count: 3842, pct: 100 }],
  daily_trend: [],
  not_instrumented: [],
};

const conversations = {
  count: 1248,
  source: "baileys",
  conversations: [
    {
      id: "221771234567@s.whatsapp.net",
      name: "Mamadou Diallo",
      number: "221771234567",
      kind: "contact",
      unread_count: 0,
      pending: false,
      last_message: {
        id: "m1",
        chat_id: "221771234567@s.whatsapp.net",
        text: "Bonjour, j'aimerais avoir plus d'informations.",
        from_me: true,
        sender: "",
        type: "text",
        timestamp_ms: Date.now() - 16 * 60_000,
        status: "read",
      },
    },
    {
      id: "221762345678@s.whatsapp.net",
      name: "Awa Ndiaye",
      number: "221762345678",
      kind: "contact",
      unread_count: 0,
      pending: false,
      last_message: {
        id: "m2",
        chat_id: "221762345678@s.whatsapp.net",
        text: "Merci beaucoup !",
        from_me: true,
        sender: "",
        type: "text",
        timestamp_ms: Date.now() - 82 * 60_000,
        status: "delivered",
      },
    },
    {
      id: "221703456789@s.whatsapp.net",
      name: "Cheikh Sarr",
      number: "221703456789",
      kind: "contact",
      unread_count: 1,
      pending: true,
      last_message: {
        id: "m3",
        chat_id: "221703456789@s.whatsapp.net",
        text: "Est-ce que vous livrez à Dakar ?",
        from_me: false,
        sender: "Cheikh Sarr",
        type: "text",
        timestamp_ms: Date.now() - 25 * 60 * 60_000,
        status: null,
      },
    },
    {
      id: "221755678901@s.whatsapp.net",
      name: "Ibrahima Ba",
      number: "221755678901",
      kind: "contact",
      unread_count: 0,
      pending: false,
      last_message: {
        id: "m4",
        chat_id: "221755678901@s.whatsapp.net",
        text: "D’accord, merci.",
        from_me: true,
        sender: "",
        type: "text",
        timestamp_ms: Date.now() - 5 * 86_400_000,
        status: "read",
      },
    },
  ],
};

const automations = {
  count: 3,
  tasks: [
    {
      id: "welcome",
      title: "Message de bienvenue",
      recipient: "*",
      action_type: "send_text",
      message_preview: "Envoyer un message automatique aux nouveaux contacts",
      send_at: isoDay(0),
      timezone: "Africa/Ndjamena",
      recurrence: "daily",
      status: "pending",
      attempts: 0,
    },
    {
      id: "faq",
      title: "Réponses aux questions fréquentes",
      recipient: "*",
      action_type: "send_text",
      message_preview: "Foire aux questions (FAQ)",
      send_at: isoDay(0),
      timezone: "Africa/Ndjamena",
      recurrence: "daily",
      status: "pending",
      attempts: 0,
    },
    {
      id: "followup",
      title: "Suivi après 24h",
      recipient: "*",
      action_type: "send_text",
      message_preview: "Relancer les conversations inactives",
      send_at: isoDay(0),
      timezone: "Africa/Ndjamena",
      recurrence: "daily",
      status: "processing",
      attempts: 0,
    },
  ],
};

const etat = {
  code: "connecte",
  pret: true,
  lecture_possible: true,
  libelle: "Connecté",
  action: "attendre",
  numero: "+235 68 66 37 37",
  nom_profil: "Fayçal A.",
  plateforme: "Baileys",
  connecte_depuis_ms: Date.now() - 72 * 3_600_000,
  derniere_activite_ms: Date.now() - 90_000,
  contacts: 2481,
  capacites: { messages: true, contacts: true },
  capacites_source: "passerelle",
};

await context.route("https://api.toumaiai.com/api/v1/**", async (route) => {
  const url = new URL(route.request().url());
  const path = url.pathname.replace("/api/v1", "");
  let data = {};
  if (path === "/whatsapp/etat") data = etat;
  else if (path === "/whatsapp/autopilot/analytics") data = analytics;
  else if (path === "/whatsapp/conversations") data = conversations;
  else if (path === "/whatsapp/autopilot/logs") {
    data = { logs, pagination: { page: 1, page_size: 100, total: logs.length } };
  } else if (path === "/whatsapp/automations") data = automations;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
});

const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "WhatsApp Overview" }).waitFor({ state: "visible", timeout: 15_000 });
await page.getByText("Mamadou Diallo", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(700);

const box = async (locator, label) => {
  const value = await locator.boundingBox();
  if (!value) throw new Error(`${label}: bounding box indisponible`);
  return value;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;

const brandLogo = page.locator('aside img[src="/logo.png"]').first();
await brandLogo.waitFor({ state: "visible", timeout: 15_000 });
const logoMetrics = await brandLogo.evaluate((node) => ({
  naturalWidth: node.naturalWidth,
  naturalHeight: node.naturalHeight,
  complete: node.complete,
}));
assert(logoMetrics.complete, "Le logo Toumaï officiel n'a pas fini de charger.");
assert(
  logoMetrics.naturalWidth === 512 && logoMetrics.naturalHeight === 512,
  `Logo Toumaï inattendu: ${logoMetrics.naturalWidth}×${logoMetrics.naturalHeight}`,
);

const sidebar = await box(page.locator("aside").first(), "sidebar");
const header = await box(page.locator("header").first(), "header");
const kpiLabels = ["Conversations", "Messages envoyés", "Taux de réponse", "WhatsApp connecté"];
const kpiBoxes = [];
for (const label of kpiLabels) {
  const textLocator = page.getByText(label, { exact: true }).first();
  kpiBoxes.push(await box(textLocator.locator("xpath=ancestor::section[1]"), `KPI ${label}`));
}
const chartCard = await box(
  page.getByText("Activité des messages", { exact: true }).locator("xpath=ancestor::section[1]"),
  "activité",
);
const actionsCard = await box(
  page.getByText("Actions rapides", { exact: true }).locator("xpath=ancestor::section[1]"),
  "actions rapides",
);
const conversationsCard = await box(
  page.getByText("Conversations récentes", { exact: true }).locator("xpath=ancestor::section[1]"),
  "conversations récentes",
);
const automationsCard = await box(
  page.getByText(/Automatisations actives/).locator("xpath=ancestor::section[1]"),
  "automatisations",
);

assert(sidebar.width >= 250 && sidebar.width <= 256, `Sidebar attendue ~253px, obtenue ${sidebar.width}`);
assert(near(header.x, sidebar.width, 4), `Header doit commencer après la sidebar: x=${header.x}, sidebar=${sidebar.width}`);
assert(header.height >= 68 && header.height <= 72, `Header attendu ~70px, obtenu ${header.height}`);
assert(kpiBoxes.every((item) => near(item.y, kpiBoxes[0].y, 3)), "Les quatre KPI ne sont pas alignés horizontalement.");
assert(Math.max(...kpiBoxes.map((item) => item.width)) - Math.min(...kpiBoxes.map((item) => item.width)) < 10, "Les quatre KPI n'ont pas des largeurs cohérentes.");
assert(chartCard.width > actionsCard.width * 1.8, "La proportion activité/actions ne respecte pas la maquette.");
assert(near(chartCard.y, actionsCard.y, 3), "Activité et actions rapides doivent démarrer sur la même ligne.");
assert(conversationsCard.y > chartCard.y + 220, "La ligne Conversations/Automatisations doit suivre la zone activité.");
assert(near(conversationsCard.y, automationsCard.y, 3), "Conversations récentes et automatisations doivent être alignées.");
assert(conversationsCard.y + conversationsCard.height <= 936, `La carte Conversations sort du viewport de référence: bas=${conversationsCard.y + conversationsCard.height}`);
assert(automationsCard.y + automationsCard.height <= 936, `La carte Automatisations sort du viewport de référence: bas=${automationsCard.y + automationsCard.height}`);
const ibrahima = await box(page.getByText("Ibrahima Ba", { exact: true }), "quatrième conversation");
assert(ibrahima.y + ibrahima.height <= 936, "La quatrième conversation doit être visible dans le viewport 1672x941.");
assert((await page.getByText("3 842", { exact: true }).count()) === 1, "Le KPI Messages envoyés n'affiche pas les données attendues.");
assert((await page.getByText("78%", { exact: true }).count()) === 1, "Le KPI Taux de réponse n'affiche pas les données attendues.");
assert((await page.getByText("+235 68 66 37 37", { exact: true }).count()) === 1, "Le numéro Baileys réel/mocqué n'est pas rendu.");
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
assert(overflow <= 1, `Débordement horizontal détecté: ${overflow}px`);

const screenshot = await page.screenshot({
  path: `${artifactDir}/overview-1672x941.png`,
  fullPage: false,
});
assert(
  screenshot.byteLength > 20_000,
  `Capture visuelle anormalement uniforme ou masquée (${screenshot.byteLength} octets).`,
);

const report = {
  viewport: { width: 1672, height: 941 },
  sidebar,
  header,
  kpis: Object.fromEntries(kpiLabels.map((label, index) => [label, kpiBoxes[index]])),
  chartCard,
  actionsCard,
  conversationsCard,
  automationsCard,
  horizontalOverflowPx: overflow,
  logoMetrics,
  consoleErrors,
};
await fs.writeFile(`${artifactDir}/layout-report.json`, JSON.stringify(report, null, 2));

if (consoleErrors.length) {
  console.warn("Console/page errors captured during visual certification:");
  for (const error of consoleErrors) console.warn(`- ${error}`);
}

console.log("WHATSAPP_OVERVIEW_VISUAL_GATE=PASS");
console.log(JSON.stringify(report, null, 2));
await browser.close();
