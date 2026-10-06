import { chromium } from "playwright";

const BASE = process.env.WA_CONTROL_URL || "http://127.0.0.1:3101";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  serviceWorkers: "block",
});

await context.addInitScript(() => {
  sessionStorage.setItem("toumai:signature-vue", "1");
  localStorage.setItem(
    "chadgpt_web_session_v1",
    JSON.stringify({
      access_token: "sse-runtime-test",
      refresh_token: "sse-runtime-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Date.now() + 3_600_000,
      user_id: "sse-runtime-user",
    }),
  );
});

const now = new Date().toISOString();
const state = {
  sseConnections: 0,
  authHeaders: [],
  overviewReads: 0,
  conversationReads: 0,
};

const overview = {
  range: {
    days: 30,
    from: now,
    to: now,
    timezone: "Africa/Ndjamena",
    granularity: "day",
  },
  metrics: {
    conversations: {
      value: 1,
      format: "integer",
      comparison: null,
      instrumented: true,
    },
    messages_sent: {
      value: 1,
      format: "integer",
      comparison: null,
      instrumented: true,
    },
    response_rate: {
      value: null,
      format: "percentage",
      comparison: null,
      instrumented: false,
      reason: "overall_response_rate_requires_manual_outbound_events",
    },
    automated_response_rate: {
      value: 100,
      format: "percentage",
      comparison: null,
      instrumented: true,
    },
    delivery_success_rate: {
      value: 100,
      format: "percentage",
      comparison: null,
      instrumented: true,
    },
  },
  activity: [],
  instrumentation: {
    coverage: "wa_autoreplies",
    raw_message_content_used: false,
    truncated: false,
    limitations: ["overall_response_rate_not_instrumented"],
  },
  generated_at: now,
  connection: {
    status: "connected",
    display_phone: "+235 68 66 37 37",
    phone_e164: "+23568663737",
    provider: "baileys",
    last_healthy_at: now,
    product_state: "connecte",
    ready: true,
    readable: true,
    label: "Connecté",
    contacts: 1,
    profile_name: "Toumaï Test",
  },
};

const conversationPayload = {
  conversations: [
    {
      id: "23566111111@s.whatsapp.net",
      name: "Mahamat Ali",
      number: "23566111111",
      kind: "contact",
      unread_count: 1,
      pending: true,
      last_message: {
        id: "m1",
        chat_id: "23566111111@s.whatsapp.net",
        text: "Bonjour",
        from_me: false,
        sender: "Mahamat Ali",
        type: "text",
        timestamp_ms: Date.now(),
        status: null,
      },
    },
  ],
  count: 1,
  offset: 0,
  limit: 4,
  has_more: false,
  next_offset: null,
  source: "baileys",
};

await context.route("https://api.toumaiai.com/api/v1/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace("/api/v1", "");

  if (path === "/whatsapp/events") {
    state.sseConnections += 1;
    state.authHeaders.push(request.headers()["authorization"] || "");

    const first = state.sseConnections === 1;
    if (first) await new Promise((resolve) => setTimeout(resolve, 500));

    const frames = [
      "id: waevt-ready",
      "event: stream.ready",
      'data: {"id":"waevt-ready","type":"stream.ready","scopes":[],"occurredAt":"2026-10-06T16:00:00+00:00","version":1}',
      "",
    ];
    if (first) {
      frames.push(
        "id: waevt-runtime-1",
        "event: conversation.updated",
        'data: {"id":"waevt-runtime-1","type":"conversation.updated","scopes":["overview","conversations"],"occurredAt":"2026-10-06T16:00:01+00:00","version":2}',
        "",
      );
    }
    frames.push("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: frames.join("\n"),
    });
    return;
  }

  let data = {};
  if (path === "/whatsapp/overview") {
    state.overviewReads += 1;
    data = overview;
  } else if (path === "/whatsapp/conversations") {
    state.conversationReads += 1;
    data = conversationPayload;
  } else if (path === "/whatsapp/automations") {
    data = { tasks: [], count: 0 };
  } else if (path === "/whatsapp/etat") {
    data = {
      code: "connecte",
      pret: true,
      lecture_possible: true,
      libelle: "Connecté",
      action: "attendre",
      numero: "+235 68 66 37 37",
      nom_profil: "Toumaï Test",
      plateforme: "Baileys",
      connecte_depuis_ms: Date.now() - 60_000,
      derniere_activite_ms: Date.now(),
      contacts: 1,
      capacites: { messages: true, contacts: true },
      capacites_source: "passerelle",
    };
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

const page = await context.newPage();
await page.goto(`${BASE}/whatsapp/`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "WhatsApp Overview" }).waitFor();

for (
  let attempt = 0;
  attempt < 50 &&
  (state.authHeaders.length === 0 ||
    state.overviewReads < 2 ||
    state.conversationReads < 2);
  attempt++
) {
  await page.waitForTimeout(100);
}

assert(state.authHeaders.length >= 1, "Le client doit ouvrir le flux SSE.");
assert(
  state.authHeaders[0] === "Bearer sse-runtime-test",
  "Le flux SSE doit conserver l’Authorization de la session.",
);
assert(
  state.overviewReads >= 2,
  `L’événement SSE doit revalider Overview (reads=${state.overviewReads}).`,
);
assert(
  state.conversationReads >= 2,
  `L’événement SSE doit revalider Conversations (reads=${state.conversationReads}).`,
);

console.log(
  `WHATSAPP_OVERVIEW_SSE_RUNTIME=PASS overview=${state.overviewReads} conversations=${state.conversationReads}`,
);

await browser.close();
