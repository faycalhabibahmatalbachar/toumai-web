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
    picture_url: "https://pps.whatsapp.test/mahamat.png",
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
    picture_url: "https://pps.whatsapp.test/amina.png",
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
  {
    id: "255855597453404@lid",
    name: "255855597453404@lid",
    number: null,
    kind: "contact",
    unread_count: 1,
    pending: false,
    last_message: {
      id: "m-lid",
      chat_id: "255855597453404@lid",
      text: "Bonjour",
      from_me: false,
      sender: "255855597453404@lid",
      type: "text",
      timestamp_ms: now - 7_200_000,
      status: null,
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
    id: "t-old",
    chat_id: "23566111111@s.whatsapp.net",
    text: "Ancien message à corriger",
    from_me: true,
    sender: "",
    type: "text",
    timestamp_ms: now - 20 * 60_000,
    status: "delivered",
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
    id: "t-media",
    chat_id: "23566111111@s.whatsapp.net",
    text: "",
    from_me: true,
    sender: "",
    sender_jid: "23568663737@s.whatsapp.net",
    type: "image",
    mime_type: "image/jpeg",
    file_name: "photo.jpg",
    timestamp_ms: now - 90_000,
    status: "delivered",
  },
  {
    id: "t-poll",
    chat_id: "23566111111@s.whatsapp.net",
    text: "",
    from_me: true,
    sender: "",
    type: "poll",
    media_label: "Quelle heure vous convient ?",
    timestamp_ms: now - 75_000,
    status: "delivered",
  },
  {
    id: "t-contact-card",
    chat_id: "23566111111@s.whatsapp.net",
    text: "",
    from_me: true,
    sender: "",
    type: "contact",
    media_label: "Amina Saleh",
    timestamp_ms: now - 70_000,
    status: "delivered",
  },
  {
    id: "t-voice",
    chat_id: "23566111111@s.whatsapp.net",
    text: "",
    from_me: false,
    sender: "Mahamat Ali",
    sender_jid: "23566111111@s.whatsapp.net",
    sender_picture_url: "https://pps.whatsapp.test/mahamat.png",
    type: "voice",
    mime_type: "audio/ogg; codecs=opus",
    file_name: "vocal-1791544458618.ogg",
    duration_seconds: 13,
    waveform: [18, 40, 70, 95, 120, 83, 52, 35, 61, 108, 141, 101, 54, 33, 72, 126, 159, 114, 68, 44, 79, 132, 176, 121, 74, 47, 89, 143, 188, 137, 92, 55, 68, 112, 154, 119, 77, 45, 63, 104, 145, 110, 69, 39, 58, 91, 132, 96],
    played: false,
    timestamp_ms: now - 65_000,
    status: null,
  },
  {
    id: "t-voice-out",
    chat_id: "23566111111@s.whatsapp.net",
    text: "",
    from_me: true,
    sender: "",
    sender_jid: "23568663737@s.whatsapp.net",
    sender_picture_url: "https://pps.whatsapp.test/faycal.png",
    type: "voice",
    mime_type: "audio/ogg; codecs=opus",
    file_name: "vocal-1791544458618.ogg",
    duration_seconds: 13,
    waveform: [22, 43, 74, 108, 135, 98, 64, 39, 72, 118, 151, 103, 58, 31, 66, 120, 166, 123, 80, 45, 75, 129, 179, 128, 82, 50, 94, 148, 192, 142, 96, 59, 73, 117, 158, 122, 79, 48, 67, 109, 149, 114, 72, 42, 61, 96, 136, 101],
    played: true,
    timestamp_ms: now - 62_000,
    status: "played",
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
  {
    id: "t4",
    chat_id: "23566111111@s.whatsapp.net",
    text: "The user asks a question. We need to respond in the same language. We can respond briefly.",
    from_me: true,
    sender: "",
    type: "text",
    timestamp_ms: now - 30_000,
    status: "sent",
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

const overview = {
  range: {
    days: 30,
    from: new Date(now - 30 * 86_400_000).toISOString(),
    to: new Date(now).toISOString(),
    timezone: "Africa/Ndjamena",
    granularity: "day",
  },
  metrics: {
    conversations: {
      value: 2,
      format: "integer",
      comparison: { value: 0, unit: "percent", direction: "flat", sentiment: "neutral" },
      instrumented: true,
    },
    messages_sent: {
      value: 42,
      format: "integer",
      comparison: { value: 5, unit: "percent", direction: "up", sentiment: "neutral" },
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
      value: 82,
      format: "percentage",
      comparison: { value: 2, unit: "percentage_points", direction: "up", sentiment: "neutral" },
      instrumented: true,
    },
    delivery_success_rate: {
      value: 82,
      format: "percentage",
      comparison: { value: 2, unit: "percentage_points", direction: "up", sentiment: "neutral" },
      instrumented: true,
    },
  },
  activity: [
    {
      date: new Date(now).toISOString().slice(0, 10),
      timestamp: new Date(now).toISOString(),
      sent: 8,
      received: 10,
    },
  ],
  instrumentation: {
    coverage: "wa_autoreplies",
    raw_message_content_used: false,
    truncated: false,
    limitations: [
      "overall_response_rate_not_instrumented",
      "manual_outbound_messages_not_in_wa_autoreplies",
    ],
  },
  connection: {
    status: "connected",
    display_phone: "+235 68 66 37 37",
    phone_e164: "+23568663737",
    provider: "baileys",
    last_healthy_at: new Date(now).toISOString(),
    product_state: "connecte",
    ready: true,
    readable: true,
    label: "Connecté",
    contacts: 2,
    profile_name: "Fayçal A.",
    picture_url: "https://pps.whatsapp.test/faycal.png",
  },
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
      reply: "The user says hello. We need to respond politely. We can respond briefly.",
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
  replies: [],
  reactions: [],
  edits: [],
  uploads: [],
  mediaSends: [],
  mediaLoads: [],
  voicePlayed: [],
  deletedOwnMessages: [],
  chatActions: [],
  legacySends: [],
  legacyConversationReads: 0,
  modern404s: [],
  pauses: [],
  resumes: [],
  cancels: [],
  realtimeAuth: [],
  nextUploadMediaFamily: null,
  nextUploadContentType: null,
  nextUploadConverted: false,
  nextUploadFileName: null,
  nextUploadConversionNote: null,
};

let retiredFallbackMode = false;

await context.route("https://pps.whatsapp.test/**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "image/png",
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
      "base64",
    ),
  });
});

await context.route("https://api.toumaiai.com/api/v1/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace("/api/v1", "");
  const method = request.method();
  let data = {};

  if (path.startsWith("/whatsapp/media/") && method === "GET") {
    state.mediaLoads.push(path);
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    return;
  }

  if (path === "/whatsapp/events") {
    state.realtimeAuth.push(request.headers()["authorization"] || "");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        "id: waevt-ready",
        "event: stream.ready",
        'data: {"id":"waevt-ready","type":"stream.ready","scopes":[],"occurredAt":"2026-10-06T16:00:00+00:00","version":1}',
        "",
        "",
      ].join("\n"),
    });
    return;
  }

  if (
    retiredFallbackMode &&
    (
      path === "/whatsapp/conversations" ||
      path === "/whatsapp/message/send"
    )
  ) {
    state.modern404s.push({ path, method });
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
      photo_profil: "https://pps.whatsapp.test/faycal.png",
      plateforme: "Baileys",
      connecte_depuis_ms: now - 3_600_000,
      derniere_activite_ms: now,
      contacts: 2,
      capacites: { messages: true, contacts: true },
      capacites_source: "passerelle",
    };
  } else if (path === "/whatsapp/overview") data = overview;
  else if (path === "/whatsapp/autopilot/analytics") data = overviewAnalytics;
  else if (path === "/whatsapp/autopilot/conversations") {
    state.legacyConversationReads += 1;
    data = overviewConversations;
  }
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
  } else if (path === "/whatsapp/profile-pictures" && method === "POST") {
    const body = request.postDataJSON();
    const pictures = {};
    for (const jid of body.jids || []) {
      if (jid === "23566111111@s.whatsapp.net") pictures[jid] = "https://pps.whatsapp.test/mahamat.png";
      else if (jid === "23566222222@s.whatsapp.net") pictures[jid] = "https://pps.whatsapp.test/amina.png";
      else if (jid === "23568663737@s.whatsapp.net") pictures[jid] = "https://pps.whatsapp.test/faycal.png";
      else pictures[jid] = null;
    }
    data = { pictures, count: Object.keys(pictures).length };
  } else if (path === "/whatsapp/conversations") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const pending = url.searchParams.get("pending") === "true";
    const kind = url.searchParams.get("kind") || "all";
    let rows = conversations;
    if (pending) rows = rows.filter((item) => item.pending);
    if (kind !== "all") rows = rows.filter((item) => item.kind === kind);
    if (q) rows = rows.filter((item) => item.name.toLowerCase().includes(q));
    data = {
      conversations: rows,
      count: rows.length,
      offset: 0,
      limit: 80,
      has_more: false,
      next_offset: null,
      source: "baileys",
    };
  } else if (path === "/whatsapp/conversation/messages") {
    data = { chat_id: url.searchParams.get("chat_id"), messages: threadMessages, count: threadMessages.length, source: "baileys" };
  } else if (path === "/whatsapp/conversation/search") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const chatId = url.searchParams.get("chat_id");
    const messages = threadMessages.filter((message) =>
      message.chat_id === chatId && String(message.text || "").toLowerCase().includes(q)
    );
    data = { chat_id: chatId, query: q, messages, count: messages.length };
  } else if (path === "/whatsapp/contact/info") {
    data = {
      chat_id: url.searchParams.get("chat_id"),
      name: "Mahamat Ali",
      phone: "+23566111111",
      about: "Disponible pour un rappel",
      picture_url: "https://pps.whatsapp.test/mahamat.png",
      on_whatsapp: true,
      is_business: false,
    };
  } else if (path === "/files/upload" && method === "POST") {
    state.uploads.push({
      contentType: request.headers()["content-type"] || "",
      size: request.postDataBuffer()?.byteLength || 0,
      purpose: url.searchParams.get("purpose"),
      requestedType: url.searchParams.get("requested_type"),
    });
    const detectedFamily = state.nextUploadMediaFamily || "image";
    const canonicalType = state.nextUploadContentType || (detectedFamily === "video" ? "video/mp4" : "image/jpeg");
    const converted = state.nextUploadConverted;
    const normalizedName = state.nextUploadFileName || (detectedFamily === "video" ? "normalise.mp4" : "photo-c2.jpg");
    const conversionNote = state.nextUploadConversionNote;
    state.nextUploadMediaFamily = null;
    state.nextUploadContentType = null;
    state.nextUploadConverted = false;
    state.nextUploadFileName = null;
    state.nextUploadConversionNote = null;
    data = {
      url: "https://storage.toumai.test/user_files/control-center-user/" + normalizedName,
      file_name: normalizedName,
      size: converted ? 7 : 9,
      content_type: canonicalType,
      media_family: detectedFamily,
      converted,
      conversion_note: conversionNote,
      original_file_name: converted ? "fichier-mal-etiquete.jpg" : normalizedName,
      original_content_type: converted ? "image/jpeg" : canonicalType,
      original_size: converted ? 24 : 9,
    };
  } else if (path === "/whatsapp/media/send" && method === "POST") {
    const body = request.postDataJSON();
    state.mediaSends.push(body);
    data = {
      chat_id: body.to,
      msg_id: "MEDIA-UI-1",
      type: body.type,
      status: "accepted",
      accepted_by_gateway: true,
    };
  } else if (path === "/whatsapp/message/played" && method === "POST") {
    const body = request.postDataJSON();
    state.voicePlayed.push(body);
    data = {
      chat_id: body.chat_id,
      msg_id: body.msg_id,
      played: true,
      receipt_sent: true,
    };
  } else if (path === "/whatsapp/message/delete-own" && method === "POST") {
    const body = request.postDataJSON();
    state.deletedOwnMessages.push(body);
    data = {
      chat_id: body.chat_id,
      msg_id: body.msg_id,
      delete_submitted: true,
      accepted_by_gateway: true,
    };
  } else if (path === "/whatsapp/conversation/action" && method === "POST") {
    const body = request.postDataJSON();
    state.chatActions.push(body);
    if (body.action === "mark_read") {
      const target = conversations.find((item) => item.id === body.chat_id);
      if (target) target.unread_count = 0;
    }
    data = {
      chat_id: body.chat_id,
      action: body.action,
      applied: true,
    };
  } else if (path === "/whatsapp/message/reply" && method === "POST") {
    const body = request.postDataJSON();
    state.replies.push(body);
    data = {
      chat_id: body.chat_id,
      msg_id: "REPLY-UI-1",
      reply_to: body.msg_id,
      status: "accepted",
    };
  } else if (path === "/whatsapp/message/react" && method === "POST") {
    const body = request.postDataJSON();
    state.reactions.push(body);
    data = {
      chat_id: body.chat_id,
      msg_id: body.msg_id,
      emoji: body.emoji,
      reacted: true,
    };
  } else if (path === "/whatsapp/message/edit" && method === "POST") {
    const body = request.postDataJSON();
    state.edits.push(body);
    data = {
      chat_id: body.chat_id,
      msg_id: body.msg_id,
      edited: true,
      new_msg_id: "EDIT-UI-1",
    };
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
    const statusMsgId = url.searchParams.get("msg_id") || "MSG-UI-1";
    const isInfoTarget = statusMsgId === "t2";
    const isVoiceTarget = statusMsgId === "t-voice-out";
    data = {
      msg_id: statusMsgId,
      chat_id: url.searchParams.get("chat_id"),
      known: true,
      status: isVoiceTarget ? "played" : isInfoTarget ? "read" : "delivered",
      server_ack_confirmed: true,
      delivery_confirmed: true,
      read_confirmed: isInfoTarget || isVoiceTarget,
      failed: false,
      sent_at: now - 120_000,
      edited_at: isInfoTarget ? now - 30_000 : null,
      timeline: isVoiceTarget
        ? { sent: now - 120_000, delivered: now - 110_000, read: now - 92_000, played: now - 90_000 }
        : isInfoTarget
          ? { sent: now - 120_000, delivered: now - 110_000, read: now - 90_000 }
          : { sent: now - 120_000, delivered: now - 110_000 },
    };
  } else if (path === "/whatsapp/suggestion/send" && method === "POST") {
    const body = request.postDataJSON();
    state.legacySends.push(body);
    data = {
      chat_id: body.chat_id,
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
  await page.getByAltText("Photo de profil WhatsApp de Fayçal A.").waitFor();
  await page.getByText("Données en cours de collecte", { exact: true }).waitFor();
  for (let attempt = 0; attempt < 20 && state.realtimeAuth.length === 0; attempt++) {
    await page.waitForTimeout(50);
  }
  assert(state.realtimeAuth.length >= 1, "L’Overview doit ouvrir le flux SSE temps réel.");
  assert(
    state.realtimeAuth[0] === "Bearer control-center-test",
    "Le flux SSE doit utiliser le Bearer de la session courante.",
  );

  await page.getByRole("button", { name: /Nouveau message/ }).click();
  await page.getByRole("heading", { name: "Nouveau message" }).waitFor();
  const recipient = page.getByPlaceholder("Nom du contact ou numéro international");
  await recipient.fill("Mahamat");
  const composeDialog = page.getByRole("dialog");
  await composeDialog.getByText("Mahamat Ali", { exact: true }).waitFor();
  await composeDialog.getByAltText("Photo de profil WhatsApp de Mahamat Ali").waitFor();
  await composeDialog.getByText("Mahamat Ali", { exact: true }).click();
  await page.getByPlaceholder("Écrivez votre message…").fill("Bonjour depuis le centre de pilotage.");
  assert(
    (await page.getByRole("button", { name: "Vérifier l’envoi" }).count()) === 0,
    "Le second écran de vérification ne doit plus exister pour un message texte.",
  );
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
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
  await page.getByRole("heading", { name: "Conversations", exact: true }).waitFor();
  await page.getByText("Mahamat Ali", { exact: true }).first().waitFor();
  const activeConversationRowForPhoto = page.locator('[data-conversation-id="23566111111@s.whatsapp.net"]');
  await activeConversationRowForPhoto.getByAltText("Photo de profil WhatsApp de Mahamat Ali").waitFor();
  assert(
    (await page.getByAltText("Photo de profil WhatsApp de Mahamat Ali").count()) >= 2,
    "La photo réelle de Mahamat doit apparaître dans la liste et le header.",
  );
  await page.getByText("Tu peux me rappeler ?", { exact: true }).last().waitFor();
  await page.getByText("Bonjour Mahamat", { exact: true }).waitFor();
  const mediaMessage = page.locator('[data-message-id="t-media"]');
  await mediaMessage.getByRole("button", { name: "Agrandir l’image" }).click();
  await page.getByRole("dialog", { name: "Aperçu de l’image" }).waitFor();
  await page.getByRole("button", { name: "Fermer l’aperçu" }).last().click();
  await page.getByRole("dialog", { name: "Aperçu de l’image" }).waitFor({ state: "hidden" });

  const voiceMessage = page.locator('[data-message-id="t-voice"]');
  const voicePlayer = voiceMessage.getByLabel("Message vocal WhatsApp");
  await voicePlayer.waitFor();
  await voiceMessage.getByAltText("Photo de profil WhatsApp de Mahamat Ali").waitFor();
  await voiceMessage.getByRole("button", { name: "Lire le message vocal" }).waitFor();
  await voiceMessage.getByRole("slider", { name: "Position dans le message vocal" }).waitFor();
  assert(
    (await voiceMessage.getByRole("button", { name: "Vitesse de lecture 1×" }).count()) === 0,
    "La vitesse ne doit pas polluer le vocal au repos : WhatsApp la révèle pendant la lecture.",
  );
  assert(
    (await voiceMessage.getByText("vocal-1791544458618.ogg", { exact: true }).count()) === 0,
    "Un message vocal ne doit jamais exposer son nom de fichier technique.",
  );
  assert(
    (await voiceMessage.locator("audio[controls]").count()) === 0,
    "Une note vocale ne doit pas retomber sur le lecteur audio HTML générique.",
  );
  assert(
    (await voiceMessage.getByRole("button", { name: "Corriger", exact: true }).count()) === 0,
    "L'action Corriger ne doit pas être proposée sur un message vocal.",
  );

  const voicePlayerBox = await voicePlayer.boundingBox();
  const voiceAvatarBox = await voiceMessage.locator('[data-testid="voice-avatar"]').boundingBox();
  const voiceBubbleBox = await voiceMessage.locator('[data-voice-bubble="true"]').boundingBox();
  assert(Boolean(voicePlayerBox && voiceAvatarBox && voiceBubbleBox), "Géométrie du vocal introuvable.");
  assert(
    voicePlayerBox.height >= 72 && voicePlayerBox.height <= 76,
    `Le lecteur vocal doit rester compact (~74px), obtenu ${voicePlayerBox.height}px.`,
  );
  assert(
    voiceAvatarBox.width >= 72 && voiceAvatarBox.width <= 76 &&
      voiceAvatarBox.height >= 72 && voiceAvatarBox.height <= 76,
    `Avatar vocal attendu ~74px, obtenu ${voiceAvatarBox.width}x${voiceAvatarBox.height}px.`,
  );
  const voiceTrackBox = await voiceMessage.locator('[data-testid="voice-progress-track"]').boundingBox();
  assert(Boolean(voiceTrackBox), "Rail de progression vocal introuvable.");
  assert(
    voiceTrackBox.width >= 255 && voiceTrackBox.width <= 285,
    `Rail vocal attendu ~270px, obtenu ${voiceTrackBox.width}px.`,
  );
  assert(
    voiceBubbleBox.height >= 88 && voiceBubbleBox.height <= 92,
    `Bulle vocale attendue ~90px comme WhatsApp, obtenue ${voiceBubbleBox.height}px.`,
  );
  assert(
    voiceBubbleBox.width >= 455 && voiceBubbleBox.width <= 467,
    `Largeur vocale attendue ~461px comme la référence, obtenue ${voiceBubbleBox.width}px.`,
  );

  const playedBefore = state.voicePlayed.length;
  await voiceMessage.getByRole("button", { name: "Lire le message vocal" }).click();
  await page.waitForTimeout(120);
  assert(
    state.voicePlayed.length === playedBefore + 1,
    "Lire un vocal reçu dans Toumaï doit envoyer un seul accusé played.",
  );
  assert(
    state.voicePlayed.at(-1).chat_id === "23566111111@s.whatsapp.net" &&
      state.voicePlayed.at(-1).msg_id === "t-voice",
    "L'accusé played doit viser le vrai chat et le vrai msg_id du vocal.",
  );

  // Le mock audio n'est pas toujours décodable par Chromium CI. Cet événement
  // natif certifie uniquement l'état visuel qui révèle la vitesse en lecture.
  await voiceMessage.locator("audio").evaluate((audio) => {
    audio.dispatchEvent(new Event("play"));
  });
  const voiceSpeed = voiceMessage.getByRole("button", { name: "Vitesse de lecture 1×" });
  await voiceSpeed.waitFor();
  await voiceSpeed.click();
  await voiceMessage.getByRole("button", { name: "Vitesse de lecture 1.5×" }).waitFor();
  await voiceMessage.getByRole("button", { name: "Vitesse de lecture 1.5×" }).click();
  await voiceMessage.getByRole("button", { name: "Vitesse de lecture 2×" }).waitFor();

  const outboundVoice = page.locator('[data-message-id="t-voice-out"]');
  await outboundVoice.getByLabel("Message vocal WhatsApp").waitFor();
  await outboundVoice.getByAltText("Photo de profil WhatsApp").waitFor();
  await outboundVoice.getByLabel("Écouté").waitFor();
  await outboundVoice.getByRole("button", { name: "Infos", exact: true }).click();
  const voiceInfo = page.getByRole("dialog", { name: "Infos du message" });
  await voiceInfo.getByText("Écouté", { exact: true }).waitFor();
  await voiceInfo.getByText("Lu", { exact: true }).waitFor();
  await voiceInfo.getByRole("button", { name: "Fermer", exact: true }).click();
  assert(
    (await outboundVoice.getByRole("button", { name: "Corriger", exact: true }).count()) === 0,
    "Un vocal envoyé doit garder Infos mais ne jamais proposer Corriger.",
  );
  assert(
    (await outboundVoice.getByText("vocal-1791544458618.ogg", { exact: true }).count()) === 0,
    "Le vocal envoyé ne doit pas exposer son nom technique.",
  );

  assert(
    (await page.getByText(/We need to respond/i).count()) === 0,
    "Le workspace ne doit jamais exposer un raisonnement interne du modèle.",
  );

  const desktopSidebar = await page.locator("body > div aside").first().boundingBox();
  assert(Boolean(desktopSidebar), "Sidebar desktop WhatsApp absente.");
  assert(
    Math.abs(desktopSidebar.width - 76) <= 3,
    `Sidebar WhatsApp compacte inattendue: ${desktopSidebar.width}px`,
  );

  const conversationColumn = await page.locator("main > aside").boundingBox();
  assert(Boolean(conversationColumn), "Colonne Conversations absente.");
  assert(
    conversationColumn.width >= 470 && conversationColumn.width <= 490,
    `Colonne Conversations attendue ~480px à 1440px, obtenue ${conversationColumn.width}px`,
  );

  assert(
    (await page.getByText("Assistant IA", { exact: true }).count()) === 0,
    "Le badge Assistant IA doit être retiré du composeur WhatsApp.",
  );
  await page.waitForTimeout(120);
  assert(
    state.chatActions.some(
      (action) =>
        action.chat_id === "23566111111@s.whatsapp.net" &&
        action.action === "mark_read" &&
        action.confirmed === true,
    ),
    "Ouvrir une conversation non lue doit la marquer réellement comme lue.",
  );
  const activeConversationRow = page.locator('[data-conversation-id="23566111111@s.whatsapp.net"]');
  await activeConversationRow.waitFor();
  assert(
    (await activeConversationRow.getAttribute("data-unread-count")) === "0",
    "Le compteur non lu visible doit tomber à zéro après ouverture de la conversation.",
  );
  await page.getByText("Aujourd’hui", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Filtres avancés" }).click();
  await page.getByRole("button", { name: "Contacts", exact: true }).waitFor();
  await page.getByRole("button", { name: "Toutes", exact: true }).click();

  await page.getByRole("button", { name: "Rechercher dans la conversation" }).click();
  const threadSearch = page.getByPlaceholder("Rechercher dans cette conversation…");
  await threadSearch.fill("rappeler");
  await page.getByText("1 résultat", { exact: true }).waitFor();
  await page.getByText("Tu peux me rappeler ?", { exact: true }).last().waitFor();

  await page.getByRole("button", { name: "Informations du contact" }).click();
  await page.getByText("Disponible pour un rappel", { exact: true }).waitFor();
  await page.getByAltText("Photo de profil WhatsApp de Mahamat Ali").last().waitFor();
  await page.getByText("+23566111111", { exact: true }).last().waitFor();
  await page.getByRole("button", { name: "Fermer les informations" }).click();

  await page.getByRole("button", { name: "Joindre", exact: true }).click();
  await page.getByRole("menu", { name: "Pièces jointes WhatsApp" }).waitFor();
  for (const label of ["Document", "Photos et vidéos", "Caméra", "Audio", "Contact", "Sondage", "Nouveau sticker"]) {
    await page.getByRole("menuitem", { name: label, exact: true }).waitFor();
  }

  const mediaBeforePoll = state.mediaSends.length;
  await page.getByRole("menuitem", { name: "Sondage", exact: true }).click();
  await page.getByRole("heading", { name: "Créer un sondage" }).waitFor();
  await page.getByPlaceholder("Posez votre question").fill("Quelle heure vous convient ?");
  await page.getByPlaceholder("Option 1").fill("10 h");
  await page.getByPlaceholder("Option 2").fill("14 h");
  await page.getByRole("button", { name: "Envoyer le sondage", exact: true }).click();
  await page.getByRole("heading", { name: "Créer un sondage" }).waitFor({ state: "hidden" });
  assert(state.mediaSends.length === mediaBeforePoll + 1, "Le sondage doit produire un seul envoi réel.");
  assert(state.mediaSends.at(-1).type === "poll", "Le sondage doit utiliser le type poll.");
  assert(state.mediaSends.at(-1).poll_name === "Quelle heure vous convient ?", "La question du sondage doit être transmise.");
  assert(state.mediaSends.at(-1).poll_options.length === 2, "Les options du sondage doivent être transmises.");

  await page.getByRole("button", { name: "Joindre", exact: true }).click();
  const mediaBeforeContact = state.mediaSends.length;
  await page.getByRole("menuitem", { name: "Contact", exact: true }).click();
  await page.getByRole("heading", { name: "Partager un contact" }).waitFor();
  const contactDialog = page.getByRole("dialog", { name: "Partager un contact" });
  const aminaContact = contactDialog.getByRole("button", { name: /Amina Saleh/ });
  await aminaContact.waitFor();
  await aminaContact.getByAltText("Photo de profil WhatsApp de Amina Saleh").waitFor();
  await aminaContact.click();
  await contactDialog.getByRole("button", { name: "Partager", exact: true }).click();
  await page.getByRole("heading", { name: "Partager un contact" }).waitFor({ state: "hidden" });
  assert(state.mediaSends.length === mediaBeforeContact + 1, "Le partage de contact doit produire un seul envoi réel.");
  assert(state.mediaSends.at(-1).type === "contact", "Le partage doit utiliser le type contact.");
  assert(state.mediaSends.at(-1).contact_to_share === "23566222222", "Le numéro du contact sélectionné doit être transmis.");

  await page.getByRole("button", { name: "Fermer la recherche" }).click();
  await page.getByRole("button", { name: "Emoji" }).click();
  await page.getByPlaceholder("Rechercher un emoji").waitFor();
  await page.getByRole("button", { name: "Emoji" }).click();
  await page.getByRole("button", { name: "Enregistrer un message vocal" }).waitFor();
  assert(
    (await page.getByText("Contact WhatsApp", { exact: true }).count()) === 0,
    "Le nom réel ou le numéro du contact doit remplacer le libellé générique Contact WhatsApp.",
  );
  assert(
    (await page.getByRole("button", { name: "Réponse suggérée" }).count()) === 0,
    "Un raccourci IA non branché ne doit pas réapparaître.",
  );

  const mediaBeforeAttachment = state.mediaSends.length;
  const attachmentInput = page.getByLabel("Sélectionner une pièce jointe");
  await attachmentInput.setInputFiles({
    name: "photo-c2.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await page.getByRole("heading", { name: "Pièce jointe" }).waitFor();
  await page.getByText("photo-c2.jpg", { exact: true }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Envoyer", exact: true }).click();
  await page.getByRole("heading", { name: "Pièce jointe" }).waitFor({ state: "hidden" });

  assert(state.uploads.length === 1, `Une pièce jointe doit produire un seul upload, obtenu ${state.uploads.length}.`);
  assert(
    state.uploads[0].contentType.includes("multipart/form-data"),
    "L'upload de pièce jointe doit rester multipart.",
  );
  assert(
    state.uploads[0].purpose === "whatsapp",
    "Une pièce jointe utilisateur doit demander explicitement la normalisation WhatsApp.",
  );
  assert(
    state.uploads[0].requestedType === null,
    "Un média galerie non forcé doit laisser le serveur détecter sa famille réelle.",
  );
  assert(
    state.mediaSends.length === mediaBeforeAttachment + 1,
    `Une pièce jointe confirmée doit produire un seul nouvel envoi, obtenu ${state.mediaSends.length - mediaBeforeAttachment}.`,
  );
  const attachmentSend = state.mediaSends.at(-1);
  assert(attachmentSend.to === "23566111111@s.whatsapp.net", "Le média doit conserver le JID exact sélectionné.");
  assert(attachmentSend.type === "image", "Une image JPEG doit suivre le flux image même si l'URL de stockage a un suffixe technique.");
  assert(attachmentSend.mimetype === "image/jpeg", "Le MIME réel du fichier choisi doit être transmis au backend.");
  assert(attachmentSend.confirmed === true, "L'envoi média doit porter une confirmation explicite.");

  const mediaBeforeReclassified = state.mediaSends.length;
  state.nextUploadMediaFamily = "video";
  state.nextUploadContentType = "video/mp4";
  state.nextUploadConverted = true;
  state.nextUploadFileName = "fichier-mal-etiquete.mp4";
  state.nextUploadConversionNote = "Vidéo convertie en MP4 H.264/AAC pour WhatsApp.";
  await attachmentInput.setInputFiles({
    name: "fichier-mal-etiquete.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
      0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
      0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
    ]),
  });
  await page.getByRole("heading", { name: "Pièce jointe" }).waitFor();
  await page.getByText("Optimisé pour WhatsApp", { exact: true }).waitFor();
  await page.getByText(/Vidéo convertie en MP4 H\.264\/AAC/).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Envoyer", exact: true }).click();
  await page.getByRole("heading", { name: "Pièce jointe" }).waitFor({ state: "hidden" });

  assert(
    state.mediaSends.length === mediaBeforeReclassified + 1,
    "Un upload reclassé par les octets doit toujours produire un seul envoi.",
  );
  const reclassifiedSend = state.mediaSends.at(-1);
  assert(
    reclassifiedSend.type === "video",
    "La famille détectée par les octets doit gagner sur le faux type image du navigateur.",
  );
  assert(
    reclassifiedSend.mimetype === "video/mp4",
    "Après conversion, seul le MIME canonique produit par le serveur doit être envoyé.",
  );
  assert(
    state.uploads.at(-1).purpose === "whatsapp",
    "La reclassification doit rester dans le pipeline de normalisation WhatsApp.",
  );

  const chatActionsBeforeManualRead = state.chatActions.length;
  await page.getByRole("button", { name: "Plus d’options" }).click();
  await page.getByRole("button", { name: "Marquer comme lue", exact: true }).click();
  await page.getByRole("heading", { name: "Marquer comme lue" }).waitFor();
  await page.getByRole("button", { name: "Appliquer", exact: true }).click();
  await page.getByRole("heading", { name: "Marquer comme lue" }).waitFor({ state: "hidden" });

  assert(
    state.chatActions.length === chatActionsBeforeManualRead + 1,
    "Le clic manuel Marquer comme lue doit produire exactement un appel supplémentaire.",
  );
  const manualRead = state.chatActions.at(-1);
  assert(manualRead.chat_id === "23566111111@s.whatsapp.net", "L'action doit viser le JID exact sélectionné.");
  assert(manualRead.action === "mark_read", "Le menu doit transmettre l'action canonique mark_read.");
  assert(manualRead.confirmed === true, "L'action de conversation doit porter une confirmation explicite.");
  assert(
    (await page.getByText(/@lid/i).count()) === 0,
    "Un identifiant technique @lid ne doit jamais être visible dans l’interface.",
  );
  assert(
    (await page.getByText("Baileys live", { exact: true }).count()) === 0,
    "Le fournisseur technique ne doit pas être exposé dans le workspace.",
  );

  await noHorizontalOverflow(page, "conversations-workspace");
  await page.screenshot({ path: `${artifacts}/conversations-enterprise.png`, fullPage: false });

  const sendsBeforeDirect = state.sends.length;
  const replyBox = page.getByPlaceholder("Écrire un message…");
  await replyBox.waitFor();
  await replyBox.fill("Je vous rappelle dans quelques minutes.");
  await replyBox.press("Enter");
  await page.waitForTimeout(200);
  assert(
    state.sends.length === sendsBeforeDirect + 1,
    "Entrée dans le composeur doit envoyer exactement un message.",
  );
  assert(
    state.sends.at(-1).to === "23566111111@s.whatsapp.net",
    "L'envoi direct doit conserver le JID exact de la conversation.",
  );
  assert(
    state.sends.at(-1).message === "Je vous rappelle dans quelques minutes.",
    "L'envoi direct doit transmettre le brouillon exact.",
  );
  assert(
    (await page.getByText(/Confirmation avant envoi|Confirmation requise avant chaque envoi/i).count()) === 0,
    "Aucun texte de double confirmation ne doit rester dans le chat.",
  );

  const inboundT3 = page.locator('[data-message-id="t3"]');
  await inboundT3.getByRole("button", { name: "Répondre" }).click();
  const nativeReply = page.getByPlaceholder("Écrire votre réponse…");
  await nativeReply.fill("Oui, je te rappelle.");
  await nativeReply.press("Enter");
  await page.waitForTimeout(150);
  assert(state.replies.length === 1, "Une réponse native doit appeler une fois /message/reply.");
  assert(state.replies[0].msg_id === "t3", "La réponse doit citer le vrai msg_id sélectionné.");
  assert(state.replies[0].chat_id === "23566111111@s.whatsapp.net", "La réponse doit conserver le JID exact.");

  await inboundT3.getByRole("button", { name: "Réagir" }).click();
  await inboundT3.getByRole("button", { name: "Réagir avec ❤️" }).click();
  await page.waitForTimeout(120);
  assert(state.reactions.length === 1, "Une réaction doit appeler une fois /message/react.");
  assert(state.reactions[0].msg_id === "t3", "La réaction doit viser le vrai message sélectionné.");
  assert(state.reactions[0].emoji === "❤️", "La réaction doit transmettre l'emoji choisi.");

  const outboundT2 = page.locator('[data-message-id="t2"]');
  await outboundT2.getByRole("button", { name: "Modifier" }).click();
  const editBox = page.getByPlaceholder("Modifier le message…");
  await editBox.fill("Bonjour Mahamat !");
  await editBox.press("Enter");
  await page.waitForTimeout(120);
  assert(state.edits.length === 1, "Modifier doit appeler une fois /message/edit.");
  assert(state.edits[0].msg_id === "t2", "La modification doit viser le message envoyé sélectionné.");
  assert(state.edits[0].new_text === "Bonjour Mahamat !", "La modification doit transmettre le nouveau texte.");

  const oldOutbound = page.locator('[data-message-id="t-old"]');
  await oldOutbound.getByRole("button", { name: "Corriger" }).click();
  await page.getByText("Corriger un ancien message", { exact: true }).waitFor();
  const correctionBox = page.getByPlaceholder("Écrire votre réponse…");
  await correctionBox.fill("Ancien message corrigé");
  await correctionBox.press("Enter");
  await page.waitForTimeout(120);
  assert(state.edits.length === 1, "Un ancien message ne doit pas produire une fausse édition native.");
  assert(state.replies.length === 2, "La correction hors fenêtre doit partir comme réponse réelle.");
  assert(state.replies.at(-1).msg_id === "t-old", "La correction doit rester liée au message original.");
  assert(state.replies.at(-1).message === "Ancien message corrigé", "La correction doit envoyer le texte exact.");

  const pollBubble = page.locator('[data-message-id="t-poll"]');
  await pollBubble.getByText("Quelle heure vous convient ?", { exact: true }).waitFor();
  const contactCardBubble = page.locator('[data-message-id="t-contact-card"]');
  await contactCardBubble.getByText("Amina Saleh", { exact: true }).waitFor();
  assert(
    !state.mediaLoads.some((path) => path.endsWith("/whatsapp/media/t-poll") || path.endsWith("/whatsapp/media/t-contact-card")),
    "Sondages et contacts ne doivent pas déclencher de faux téléchargement binaire.",
  );

  const mediaOutbound = page.locator('[data-message-id="t-media"]');
  await mediaOutbound.locator("img").waitFor();
  assert(
    state.mediaLoads.some((path) => path.endsWith("/whatsapp/media/t-media")),
    "Une image du fil doit charger ses octets réels via l'endpoint média authentifié.",
  );

  await outboundT2.getByRole("button", { name: "Infos" }).click();
  await page.getByRole("heading", { name: "Infos du message" }).waitFor();
  await page.getByText("Lu", { exact: true }).waitFor();
  await page.getByText("Distribué", { exact: true }).waitFor();
  await page.getByText("Envoyé", { exact: true }).waitFor();
  await page.getByText("Modifié", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();

  await mediaOutbound.getByRole("button", { name: "Corriger" }).click();
  await page.getByText("Envoyer une correction média", { exact: true }).waitFor();
  const mediaTextCorrection = page.getByPlaceholder("Joindre le média corrigé ou écrire une précision…");
  await mediaTextCorrection.fill("Correction : voici la bonne information.");
  await mediaTextCorrection.press("Enter");
  await page.waitForTimeout(120);
  assert(state.edits.length === 1, "Un média ne doit jamais appeler /message/edit.");
  assert(state.replies.length === 3, "Une correction texte d'un média doit partir comme réponse liée.");
  assert(state.replies.at(-1).msg_id === "t-media", "La correction texte doit citer le média original.");

  await mediaOutbound.getByRole("button", { name: "Corriger" }).click();
  const mediaSendsBeforeCorrection = state.mediaSends.length;
  const deletedBeforeCorrection = state.deletedOwnMessages.length;
  await page.getByLabel("Sélectionner une pièce jointe").setInputFiles({
    name: "photo-corrigee.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await page.getByRole("heading", { name: "Envoyer une correction" }).waitFor();
  await page.getByRole("dialog").getByRole("button", { name: "Envoyer la correction", exact: true }).click();
  await page.getByRole("heading", { name: "Correction envoyée" }).waitFor();
  assert(
    state.mediaSends.length === mediaSendsBeforeCorrection + 1,
    "Une correction média doit produire un seul nouvel envoi média.",
  );
  assert(state.mediaSends.at(-1).type === "image", "La correction doit conserver la nature image.");
  assert(state.mediaSends.at(-1).reply_to_msg_id === "t-media", "La nouvelle image doit être liée au média original.");
  assert(state.mediaSends.at(-1).reply_to_type === "image", "Le contexte doit conserver le type du média original.");
  assert(state.edits.length === 1, "La correction média ne doit jamais simuler une édition native.");
  assert(
    state.deletedOwnMessages.length === deletedBeforeCorrection,
    "L'ancien média doit rester intact immédiatement après l'envoi de la correction.",
  );

  await page.getByRole("dialog").getByRole("button", { name: "Vérifier le nouveau message", exact: true }).click();
  await page.getByText(/confirmé par le serveur WhatsApp/i).waitFor();
  assert(
    state.deletedOwnMessages.length === deletedBeforeCorrection,
    "Vérifier le nouveau message ne doit pas supprimer l'ancien.",
  );

  await page.getByRole("dialog").getByRole("button", { name: "Supprimer l’ancien message", exact: true }).click();
  await page.getByText(/suppression de l’ancien message a été soumise/i).waitFor();
  assert(
    state.deletedOwnMessages.length === deletedBeforeCorrection + 1,
    "La suppression de l'ancien doit être une seconde action explicite.",
  );
  assert(
    state.deletedOwnMessages.at(-1).msg_id === "t-media",
    "La suppression doit viser uniquement le média original.",
  );
  assert(
    state.deletedOwnMessages.at(-1).confirmed === true,
    "La suppression de l'ancien doit porter une confirmation explicite.",
  );
  await page.getByRole("dialog").getByRole("button", { name: "Terminer", exact: true }).click();
  await page.getByRole("heading", { name: "Correction envoyée" }).waitFor({ state: "hidden" });

  await page.screenshot({ path: `${artifacts}/conversations-workspace.png`, fullPage: false });
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
  await conversationsPage.getByRole("heading", { name: "Conversations", exact: true }).waitFor();
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

async function certifyRetired404Fallbacks() {
  retiredFallbackMode = true;
  const legacyReadsBefore = state.legacyConversationReads;
  const legacySendsBefore = state.legacySends.length;

  const page = await context.newPage();
  await page.goto(`${BASE}/whatsapp/conversations/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Conversations", exact: true }).waitFor();
  await page.waitForTimeout(500);

  assert(
    state.modern404s.some((request) => request.path === "/whatsapp/conversations" && request.method === "GET"),
    "Le scénario doit réellement exercer le 404 de la route moderne conversations.",
  );
  assert(
    state.legacyConversationReads === legacyReadsBefore,
    "Un 404 moderne ne doit jamais relire /whatsapp/autopilot/conversations.",
  );
  assert(
    (await page.getByText("Journal partiel", { exact: true }).count()) === 0,
    "Le mode Journal partiel doit rester retiré après un 404 moderne.",
  );
  assert(
    (await page.getByText(/Mode compatibilité/i).count()) === 0,
    "Le mode compatibilité ne doit pas réapparaître après un 404 moderne.",
  );

  await page.getByRole("button", { name: "Nouveau message" }).first().click();
  await page.getByRole("heading", { name: "Nouveau message" }).waitFor();
  const recipient = page.getByPlaceholder("Nom du contact ou numéro international");
  await recipient.fill("+91912191");
  await page.getByPlaceholder("Écrivez votre message…").fill("salut");
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await page.waitForTimeout(500);

  assert(
    state.modern404s.some((request) => request.path === "/whatsapp/message/send" && request.method === "POST"),
    "Le scénario doit réellement exercer le 404 de la route moderne d’envoi.",
  );
  assert(
    state.legacySends.length === legacySendsBefore,
    "Un 404 sur /whatsapp/message/send ne doit jamais appeler /whatsapp/suggestion/send.",
  );
  assert(
    (await page.getByRole("heading", { name: "Message accepté" }).count()) === 0,
    "Un envoi moderne en 404 ne doit jamais être présenté comme accepté.",
  );
  assert(
    (await page.getByText(/We need to respond/i).count()) === 0,
    "Aucun raisonnement interne ne doit être exposé dans le scénario d’échec.",
  );

  await noHorizontalOverflow(page, "retired-fallbacks-404");
  await page.screenshot({ path: `${artifacts}/retired-fallbacks-404.png`, fullPage: false });
  await page.close();
  retiredFallbackMode = false;
}

await certifyOverviewComposer();
await certifyConversations();
await certifyAutomations();
await certifyMobile();
await certifyRetired404Fallbacks();

await fs.writeFile(
  `${artifacts}/control-center-report.json`,
  JSON.stringify({
    pass: true,
    sends: state.sends.length,
    pauseCalls: state.pauses.length,
    pages: ["overview-compose", "conversations-strict-mockup", "automations", "mobile-overview", "mobile-conversations", "mobile-automations", "retired-fallbacks-404"],
  }, null, 2),
);

console.log("WHATSAPP_CONTROL_CENTER_GATE=PASS");
await browser.close();
