import fs from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.WA_CONTROL_URL || "http://127.0.0.1:3101";
const artifacts = process.env.WA_CONTROL_ARTIFACT_DIR || "artifacts/whatsapp-control-center";
await fs.mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  colorScheme: "dark",
  serviceWorkers: "block",
});

await context.addInitScript(() => {
  sessionStorage.setItem("toumai:signature-vue", "1");
  localStorage.setItem(
    "chadgpt_web_session_v1",
    JSON.stringify({
      access_token: "control-center-test",
      refresh_token: "control-center-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Date.now() + 3_600_000,
      user_id: "control-center-user",
    }),
  );
});

const now = Date.now();
const conversations = [
  {
    id: "23566111111@s.whatsapp.net",
    name: "Mahamat Ali",
    number: "23566111111",
    kind: "contact",
    unread_count: 2,
    pending: true,
    last_message: {
      id: "m2",
      chat_id: "23566111111@s.whatsapp.net",
      text: "Tu peux me rappeler ?",
      from_me: false,
      sender: "Mahamat Ali",
      type: "text",
      timestamp_ms: now - 60_000,
      status: null,
    },
  },
  {
    id: "23566222222@s.whatsapp.net",
    name: "Amina Saleh",
    number: "23566222222",
    kind: "contact",
    unread_count: 0,
    pending: false,
    last_message: {
      id: "m3",
      chat_id: "23566222222@s.whatsapp.net",
      text: "Merci",
      from_me: true,
      sender: "",
      type: "text",
      timestamp_ms: now - 3_600_000,
      status: "delivered",
    },
  },
];

const threadMessages = [
  {
    id: "t1",
    chat_id: "23566111111@s.whatsapp.net",
    text: "Bonjour Fayçal",
    from_me: false,
    sender: "Mahamat Ali",
    type: "text",
    timestamp_ms: now - 180_000,
    status: null,
  },
  {
    id: "t2",
    chat_id: "23566111111@s.whatsapp.net",
    text: "Bonjour Mahamat",
    from_me: true,
    sender: "",
    type: "text",
    timestamp_ms: now - 120_000,
    status: "read",
  },
  {
    id: "t3",
    chat_id: "23566111111@s.whatsapp.net",
    text: "Tu peux me rappeler ?",
    from_me: false,
    sender: "Mahamat Ali",
    type: "text",
    timestamp_ms: now - 60_000,
    status: null,
  },
];

const tasks = [
  {
    id: "task-1",
    title: "Relance Mahamat",
    recipient: "Mahamat Ali",
    action_type: "send_text",
    message_preview: "Je reviens vers toi demain.",
    send_at: new Date(now + 86_400_000).toISOString(),
    timezone: "Africa/Ndjamena",
    recurrence: "none",
    status: "pending",
    attempts: 0,
  },
  {
    id: "task-2",
    title: "Suivi quotidien",
    recipient: "Équipe",
    action_type: "send_text",
    message_preview: "Point quotidien",
    send_at: new Date(now + 7_200_000).toISOString(),
    timezone: "Africa/Ndjamena",
    recurrence: "daily",
    status: "paused",
    attempts: 0,
  },
];

const overviewAnalytics = {
  period_days: 30,
  responses_today: 8,
  responses_total: 42,
  active_conversations: 2,
  avg_response_time_ms: 900,
  total_tokens: 1000,
  safety_blocks: 0,
  kpis: {
    messages: { value: 42, delta: 5, delta_unit: "pct", previous: 40 },
    conversations: { value: 2, delta: 0, delta_unit: "pct", previous: 2 },
    success_rate: { value: 82, delta: 2, delta_unit: "pts", previous: 80 },
    avg_response_ms: { value: 900, delta: -3, delta_unit: "pct", previous: 930 },
    escalations: { value: 0, delta: 0, delta_unit: "pct", previous: 0 },
  },
  by_mode: { auto: 42 },
  by_type: [],
  by_language: [],
  daily_trend: [],
  not_instrumented: [],
};

const overviewConversations = {
  conversations: [
    {
      chat_id: "23566111111@s.whatsapp.net",
      name: "Mahamat Ali",
      number: "+235 66 11 11 11",
      kind: "contact",
      last_incoming: "Tu peux me rappeler ?",
      last_reply: "Bonjour Mahamat",
      last_mode: "auto",
      last_type: "text",
      lang: "fr",
      last_at: new Date(now - 60_000).toISOString(),
      exchanges: 3,
      pending: 1,
    },
  ],
  total: 2,
  period_days: 30,
};

const logs = {
  logs: [
    {
      id: "l1",
      chat_id: "23566111111@s.whatsapp.net",
      chat_name: "Mahamat Ali",
      incoming: "Salut",
      reply: "Bonjour",
      mode: "auto",
      msg_type: "text",
      lang: "fr",
      delivered: true,
      created_at: new Date(now - 60_000).toISOString(),
    },
  ],
  pagination: { page: 1, page_size: 100, total: 1 },
};

const state = {
  sends: [],
  legacySends: [],
  pauses: [],
  resumes: [],
  cancels: [],
};

let legacyMode = false;

await context.route("https://api.toumaiai.com/api/v1/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace("/api/v1", "");
  const method = request.method();
  let data = {};

  if (
    legacyMode &&
    (
      path === "/whatsapp/conversations" ||
      path === "/whatsapp/conversation/messages" ||
      path === "/whatsapp/message/send" ||
      path === "/whatsapp/message/status"
    )
  ) {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "Not Found" }),
    });
    return;
  }

  if (path === "/whatsapp/etat") {
    data = {
      code: "connecte",
      pret: true,
      lecture_possible: true,
      libelle: "Connecté",
      action: "attendre",
      numero: "+235 68 66 37 37",
      nom_profil: "Fayçal A.",
      plateforme: "Baileys",
      connecte_depuis_ms: now - 3_600_000,
      derniere_activite_ms: now,
      contacts: 2,
      capacites: { messages: true, contacts: true },
      capacites_source: "passerelle",
    };
  } else if (path === "/whatsapp/autopilot/analytics") data = overviewAnalytics;
  else if (path === "/whatsapp/autopilot/conversations") data = overviewConversations;
  else if (path === "/whatsapp/autopilot/logs") data = logs;
  else if (path === "/whatsapp/contacts") {
    data = {
      contacts: [
        { jid: "23566111111@s.whatsapp.net", number: "23566111111", name: "Mahamat Ali" },
        { jid: "23566222222@s.whatsapp.net", number: "23566222222", name: "Amina Saleh" },
      ],
      count: 2,
      source: "passerelle",
      derniere_synchronisation: new Date(now).toISOString(),
      total_en_base: 2,
    };
  } else if (path === "/whatsapp/conversations") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const pending = url.searchParams.get("pending") === "true";
    let rows = conversations;
    if (pending) rows = rows.filter((item) => item.pending);
    if (q) rows = rows.filter((item) => item.name.toLowerCase().includes(q));
    data = { conversations: rows, count: rows.length, source: "baileys" };
  } else if (path === "/whatsapp/conversation/messages") {
    data = { chat_id: url.searchParams.get("chat_id"), messages: threadMessages, count: threadMessages.length, source: "baileys" };
  } else if (path === "/whatsapp/message/send" && method === "POST") {
    const body = request.postDataJSON();
    state.sends.push(body);
    data = {
      chat_id: body.to.includes("@") ? body.to : `${body.to}@s.whatsapp.net`,
      msg_id: "MSG-UI-1",
      status: "accepted",
      accepted_by_gateway: true,
      delivery_confirmed: false,
      read_confirmed: false,
    };
  } else if (path === "/whatsapp/message/status") {
    data = {
      msg_id: "MSG-UI-1",
      chat_id: url.searchParams.get("chat_id"),
      known: true,
      status: "delivered",
      server_ack_confirmed: true,
      delivery_confirmed: true,
      read_confirmed: false,
      failed: false,
    };
  } else if (path === "/whatsapp/send-watched" && method === "POST") {
    const body = request.postDataJSON();
    state.legacySends.push(body);
    data = {
      ok: true,
      to: body.to,
      msgId: "MSG-LEGACY-1",
    };
  } else if (path === "/whatsapp/automations" && method === "GET") {
    data = { tasks, count: tasks.length };
  } else if (/\/whatsapp\/automations\/[^/]+\/pause$/.test(path)) {
    state.pauses.push(path);
    data = { ...tasks[0], status: "paused" };
  } else if (/\/whatsapp\/automations\/[^/]+\/resume$/.test(path)) {
    state.resumes.push(path);
    data = { ...tasks[1], status: "pending" };
  } else if (/\/whatsapp\/automations\/[^/]+\/cancel$/.test(path)) {
    state.cancels.push(path);
    data = { ...tasks[0], status: "cancelled" };
  } else if (/\/whatsapp\/automations\/[^/]+\/history$/.test(path)) {
    data = {
      entries: [{ action: "scheduled", success: true, error: "", source: "user", result: {}, created_at: new Date(now).toISOString() }],
      count: 1,
    };
  } else if (/\/whatsapp\/automations\/[^/]+$/.test(path) && method === "PATCH") {
    data = { ...tasks[0], ...request.postDataJSON() };
  } else {
    data = {};
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function noHorizontalOverflow(page, name) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${name}: débordement horizontal ${overflow}px`);
}

async function certifyOverviewComposer() {
  const page = await context.newPage();
  await page.goto(`${BASE}/whatsapp/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "WhatsApp Overview" }).waitFor();

  await page.getByRole("button", { name: /Nouveau message/ }).click();
  await page.getByRole("heading", { name: "Nouveau message" }).waitFor();
  const recipient = page.getByPlaceholder("Nom du contact ou numéro international");
  await recipient.fill("Mahamat");
  const composeDialog = page.getByRole("dialog");
  await composeDialog.getByText("Mahamat Ali", { exact: true }).waitFor();
  await composeDialog.getByText("Mahamat Ali", { exact: true }).click();
  await page.getByPlaceholder("Écrivez votre message…").fill("Bonjour depuis le centre de pilotage.");
  await page.getByRole("button", { name: "Vérifier l’envoi" }).click();
  await page.getByRole("heading", { name: "Confirmer l’envoi" }).waitFor();
  await page.getByRole("button", { name: "Envoyer maintenant" }).click();
  await page.getByRole("heading", { name: "Message livré" }).waitFor({ timeout: 5000 });

  assert(state.sends.length === 1, `Un clic doit produire exactement un envoi, obtenu ${state.sends.length}`);
  assert(state.sends[0].to === "23566111111@s.whatsapp.net", "Le JID du carnet doit être conservé sans reconstruction.");
  assert(state.sends[0].message === "Bonjour depuis le centre de pilotage.", "Le message envoyé ne correspond pas au brouillon confirmé.");
  await noHorizontalOverflow(page, "overview");
  await page.screenshot({ path: `${artifacts}/overview-compose.png`, fullPage: false });
  await page.close();
}

async function certifyConversations() {
  const page = await context.newPage();
  await page.goto(`${BASE}/whatsapp/conversations/?chat=23566111111%40s.whatsapp.net`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Conversations WhatsApp" }).waitFor();
  await page.getByText("Mahamat Ali", { exact: true }).first().waitFor();
  await page.getByText("Tu peux me rappeler ?", { exact: true }).last().waitFor();
  await page.getByText("Bonjour Mahamat", { exact: true }).waitFor();
  await noHorizontalOverflow(page, "conversations-workspace");
  await page.screenshot({ path: `${artifacts}/conversations-workspace.png`, fullPage: false });
  await page.getByRole("button", { name: "Répondre", exact: true }).click();
  await page.getByRole("heading", { name: "Nouveau message" }).waitFor();
  await page.getByRole("dialog").getByText("Mahamat Ali", { exact: true }).waitFor();
  await noHorizontalOverflow(page, "conversations");
  await page.screenshot({ path: `${artifacts}/conversations.png`, fullPage: false });
  await page.close();
}

async function certifyAutomations() {
  const page = await context.newPage();
  await page.goto(`${BASE}/whatsapp/automations/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Automatisations WhatsApp" }).waitFor();
  await page.getByText("Relance Mahamat", { exact: true }).waitFor();
  await noHorizontalOverflow(page, "automations-workspace");
  await page.screenshot({ path: `${artifacts}/automations-workspace.png`, fullPage: false });
  await page.getByRole("button", { name: "Mettre en pause" }).first().click();
  await page.waitForTimeout(250);
  assert(state.pauses.length === 1, "Le bouton pause doit appeler l'endpoint de pause exactement une fois.");
  await page.getByRole("button", { name: "Historique" }).first().click();
  await page.getByText("scheduled", { exact: true }).waitFor();
  await noHorizontalOverflow(page, "automations");
  await page.screenshot({ path: `${artifacts}/automations.png`, fullPage: false });
  await page.close();
}

async function certifyMobile() {
  const overview = await context.newPage();
  await overview.setViewportSize({ width: 390, height: 844 });
  await overview.goto(`${BASE}/whatsapp/`, { waitUntil: "domcontentloaded" });
  await overview.getByRole("heading", { name: "WhatsApp Overview" }).waitFor();
  await noHorizontalOverflow(overview, "mobile-overview");
  await overview.getByRole("button", { name: /Nouveau message/ }).click();
  await overview.getByRole("heading", { name: "Nouveau message" }).waitFor();
  const modalBox = await overview.getByRole("dialog", { name: "Nouveau message" }).boundingBox();
  assert(Boolean(modalBox), "mobile-overview: composeur absent");
  assert(modalBox.width <= 382, `mobile-overview: composeur trop large (${modalBox.width}px)`);
  await overview.screenshot({ path: `${artifacts}/mobile-overview-compose.png`, fullPage: false });
  await overview.close();

  const conversationsPage = await context.newPage();
  await conversationsPage.setViewportSize({ width: 390, height: 844 });
  await conversationsPage.goto(`${BASE}/whatsapp/conversations/`, { waitUntil: "domcontentloaded" });
  await conversationsPage.getByRole("heading", { name: "Conversations WhatsApp" }).waitFor();
  await conversationsPage.getByText("Mahamat Ali", { exact: true }).first().waitFor();
  await noHorizontalOverflow(conversationsPage, "mobile-conversation-list");
  await conversationsPage.getByText("Mahamat Ali", { exact: true }).first().click();
  await conversationsPage.getByRole("button", { name: "Retour aux conversations" }).waitFor();
  await conversationsPage.getByText("Bonjour Mahamat", { exact: true }).waitFor();
  await noHorizontalOverflow(conversationsPage, "mobile-conversation-thread");
  await conversationsPage.screenshot({ path: `${artifacts}/mobile-conversation-thread.png`, fullPage: false });
  await conversationsPage.close();

  const automationsPage = await context.newPage();
  await automationsPage.setViewportSize({ width: 390, height: 844 });
  await automationsPage.goto(`${BASE}/whatsapp/automations/`, { waitUntil: "domcontentloaded" });
  await automationsPage.getByRole("heading", { name: "Automatisations WhatsApp" }).waitFor();
  await automationsPage.getByText("Relance Mahamat", { exact: true }).waitFor();
  await noHorizontalOverflow(automationsPage, "mobile-automations");
  await automationsPage.screenshot({ path: `${artifacts}/mobile-automations.png`, fullPage: false });
  await automationsPage.close();
}

async function certifyProduction404Fallback() {
  legacyMode = true;

  const page = await context.newPage();
  await page.goto(`${BASE}/whatsapp/conversations/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Conversations WhatsApp" }).waitFor();
  await page.getByText("Journal Toumaï · compatibilité production", { exact: true }).waitFor();
  await page.getByText("Mahamat Ali", { exact: true }).first().waitFor();
  assert((await page.getByText("Passerelle indisponible", { exact: true }).count()) === 0, "Le fallback ne doit pas afficher Passerelle indisponible.");
  assert((await page.getByText("HTTP 404", { exact: true }).count()) === 0, "Le fallback ne doit jamais exposer HTTP 404.");

  await page.getByRole("button", { name: /Nouveau message/ }).click();
  await page.getByRole("heading", { name: "Nouveau message" }).waitFor();
  const recipient = page.getByPlaceholder("Nom du contact ou numéro international");
  await recipient.fill("+91912191");
  await page.getByText("Envoyer à +91912191", { exact: true }).click();
  await page.getByPlaceholder("Écrivez votre message…").fill("salut");
  await page.getByRole("button", { name: "Vérifier l’envoi" }).click();
  await page.getByRole("heading", { name: "Confirmer l’envoi" }).waitFor();
  await page.getByRole("button", { name: "Envoyer maintenant" }).click();
  await page.getByRole("heading", { name: "Message accepté" }).waitFor({ timeout: 5000 });

  assert(state.legacySends.length === 1, `Le fallback doit effectuer un seul envoi legacy, obtenu ${state.legacySends.length}`);
  assert(state.legacySends[0].to === "91912191", "Le numéro confirmé doit être transmis intact au fallback send-watched.");
  assert(state.legacySends[0].message === "salut", "Le texte confirmé doit être transmis intact au fallback send-watched.");

  await noHorizontalOverflow(page, "legacy-production-fallback");
  await page.screenshot({ path: `${artifacts}/legacy-production-fallback.png`, fullPage: false });
  await page.close();
}

await certifyOverviewComposer();
await certifyConversations();
await certifyAutomations();
await certifyMobile();
await certifyProduction404Fallback();

await fs.writeFile(
  `${artifacts}/control-center-report.json`,
  JSON.stringify({
    pass: true,
    sends: state.sends.length,
    pauseCalls: state.pauses.length,
    pages: ["overview-compose", "conversations", "automations", "mobile-overview", "mobile-conversations", "mobile-automations", "legacy-production-fallback"],
  }, null, 2),
);

console.log("WHATSAPP_CONTROL_CENTER_GATE=PASS");
await browser.close();
