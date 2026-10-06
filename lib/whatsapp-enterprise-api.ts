import { HttpError } from "./errors";
import { http } from "./http";
import { safeWhatsAppVisibleText } from "./whatsapp-display";

export type WaAutopilotMode = "off" | "suggest" | "auto";

export interface WaAutopilotSettings {
  enabled: boolean;
  mode: WaAutopilotMode;
  scope?: "all" | "whitelist";
  whitelist?: string[];
  blacklist?: string[];
  allow_groups?: boolean;
  persona?: string;
  signature?: string;
  voice_reply?: boolean;
  voice?: string;
  story_policy?: "all" | "whitelist" | "blacklist" | "none";
  story_whitelist?: string[];
  story_blacklist?: string[];
  away_mode?: boolean;
  away_message?: string;
  reply_language?: string;
}

export interface WaAutopilotKpi {
  value: number | null;
  delta: number | null;
  delta_unit: "pct" | "pts";
  previous: number | null;
}

export interface WaAutopilotAnalytics {
  period_days: number;
  responses_today: number;
  responses_total: number;
  active_conversations: number;
  avg_response_time_ms: number | null;
  total_tokens: number;
  safety_blocks: number;
  kpis: {
    messages: WaAutopilotKpi;
    conversations: WaAutopilotKpi;
    success_rate: WaAutopilotKpi;
    avg_response_ms: WaAutopilotKpi;
    escalations: WaAutopilotKpi;
  };
  by_mode: Record<string, number>;
  by_type: Array<{ type: string; count: number; pct: number }>;
  by_language: Array<{ code: string; label: string; count: number; pct: number }>;
  daily_trend: Array<{ date: string; count: number }>;
  not_instrumented: string[];
}

export interface WaAutopilotLog {
  id: string;
  chat_id: string;
  chat_name?: string | null;
  incoming: string;
  reply: string;
  mode: string;
  msg_type?: string | null;
  lang?: string | null;
  latency_ms?: number | null;
  tokens?: number | null;
  delivered?: boolean | null;
  created_at: string;
}

export interface WaAutopilotLogsPage {
  logs: WaAutopilotLog[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
  };
}

export interface WaAutopilotConversation {
  chat_id: string;
  name: string | null;
  number: string | null;
  kind: string;
  last_incoming: string;
  last_reply: string;
  last_mode: string;
  last_type: string;
  lang: string;
  last_at: string;
  exchanges: number;
  pending: number;
}

export interface WaAutopilotConversations {
  conversations: WaAutopilotConversation[];
  total: number;
  period_days: number;
}

export function getWaAutopilot(): Promise<WaAutopilotSettings> {
  return http.get("/whatsapp/autopilot");
}

export function updateWaAutopilot(
  patch: Partial<WaAutopilotSettings>,
): Promise<WaAutopilotSettings & { ok?: boolean }> {
  return http.post("/whatsapp/autopilot", patch);
}

export function getWaAutopilotAnalytics(days = 7): Promise<WaAutopilotAnalytics> {
  return http.get(`/whatsapp/autopilot/analytics?days=${encodeURIComponent(days)}`);
}

export function getWaAutopilotLogs(
  page = 1,
  pageSize = 100,
): Promise<WaAutopilotLogsPage> {
  return http.get(
    `/whatsapp/autopilot/logs?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`,
  );
}

export function getWaAutopilotConversations(
  days = 30,
  limit = 4,
): Promise<WaAutopilotConversations> {
  return http.get(
    `/whatsapp/autopilot/conversations?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`,
  );
}


export interface WaLiveMessage {
  id: string;
  chat_id: string;
  text: string;
  from_me: boolean;
  sender: string;
  type: string;
  timestamp_ms: number;
  status?: string | null;
}

export interface WaLiveConversation {
  id: string;
  name: string;
  number: string | null;
  kind: "contact" | "group";
  unread_count: number;
  pending: boolean;
  last_message: WaLiveMessage;
}

export interface WaLiveConversations {
  conversations: WaLiveConversation[];
  count: number;
  offset: number;
  limit: number;
  has_more: boolean;
  next_offset: number | null;
  source: "baileys" | "autopilot-log";
}

export interface WaConversationMessages {
  chat_id: string;
  messages: WaLiveMessage[];
  count: number;
  source: "baileys" | "autopilot-log";
}

export interface WaManualSendResult {
  chat_id: string;
  msg_id: string | null;
  status: "accepted" | "unknown";
  accepted_by_gateway: boolean;
  delivery_confirmed: boolean;
  read_confirmed: boolean;
}

export interface WaMessageStatus {
  msg_id: string;
  chat_id?: string | null;
  known: boolean;
  status: "unknown" | "sent" | "delivered" | "read" | "played" | "failed" | string;
  server_ack_confirmed: boolean;
  delivery_confirmed: boolean;
  read_confirmed: boolean;
  failed: boolean;
}

export async function getWaLiveConversations(params?: {
  search?: string;
  pending?: boolean;
  unread?: boolean;
  offset?: number;
  limit?: number;
}): Promise<WaLiveConversations> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.pending) query.set("pending", "true");
  if (params?.unread) query.set("unread", "true");
  if (typeof params?.offset === "number") query.set("offset", String(params.offset));
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.size ? `?${query.toString()}` : "";

  try {
    return await http.get<WaLiveConversations>(`/whatsapp/conversations${suffix}`);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;

    // Compatibilité avec le backend actuellement servi en production.
    // Cette route existait déjà avant le Control Center et expose les
    // conversations réellement vues par l'auto-pilote. On l'utilise
    // uniquement quand la nouvelle route n'est pas encore déployée.
    const offset = Math.max(0, params?.offset ?? 0);
    const limit = Math.max(1, Math.min(80, params?.limit ?? 80));
    const requested = Math.min(100, offset + limit);
    const legacy = await getWaAutopilotConversations(30, requested);
    const term = (params?.search || "").trim().toLowerCase();

    let mapped: WaLiveConversation[] = legacy.conversations.map((item, index) => {
      const timestamp = Date.parse(item.last_at || "");
      const safeReply = safeWhatsAppVisibleText(item.last_reply);
      const safeIncoming = safeWhatsAppVisibleText(item.last_incoming);
      const lastFromMe = Boolean(safeReply);
      const text = safeReply || safeIncoming || "";
      return {
        id: item.chat_id,
        name: item.name || item.number || item.chat_id || "Contact WhatsApp",
        number: item.number,
        kind: item.kind === "group" ? "group" : "contact",
        unread_count: 0,
        pending: item.pending > 0,
        last_message: {
          id: `legacy-${item.chat_id}-${index}`,
          chat_id: item.chat_id,
          text,
          from_me: lastFromMe,
          sender: lastFromMe ? "" : item.name || "",
          type: item.last_type || "text",
          timestamp_ms: Number.isNaN(timestamp) ? 0 : timestamp,
          status: lastFromMe ? "sent" : null,
        },
      };
    });

    if (term) {
      mapped = mapped.filter((item) =>
        item.name.toLowerCase().includes(term) ||
        (item.number || "").includes(term) ||
        item.last_message.text.toLowerCase().includes(term),
      );
    }
    if (params?.pending) mapped = mapped.filter((item) => item.pending);
    if (params?.unread) mapped = [];

    const total = Math.min(legacy.total, 100);
    const page = mapped.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    return {
      conversations: page,
      count: total,
      offset,
      limit,
      has_more: nextOffset < total && nextOffset < 100,
      next_offset: nextOffset < total && nextOffset < 100 ? nextOffset : null,
      source: "autopilot-log",
    };
  }
}

export async function getWaConversationMessages(
  chatId: string,
  limit = 80,
  sinceMs = 0,
): Promise<WaConversationMessages> {
  const query = new URLSearchParams({
    chat_id: chatId,
    limit: String(limit),
    since_ms: String(sinceMs),
  });

  try {
    return await http.get<WaConversationMessages>(`/whatsapp/conversation/messages?${query.toString()}`);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;

    // L'ancien backend ne propose pas encore l'historique brut Baileys.
    // On reconstruit donc uniquement les échanges réellement journalisés par
    // Toumaï, sans prétendre qu'il s'agit de l'intégralité du fil WhatsApp.
    const rows: WaAutopilotLog[] = [];
    for (let page = 1; page <= 6 && rows.length < 600; page += 1) {
      const batch = await getWaAutopilotLogs(page, 100);
      rows.push(...batch.logs.filter((item) => item.chat_id === chatId));
      if (page * batch.pagination.page_size >= batch.pagination.total) break;
    }

    const messages: WaLiveMessage[] = [];
    for (const row of rows) {
      const ts = Date.parse(row.created_at || "");
      const baseTs = Number.isNaN(ts) ? 0 : ts;
      const safeIncoming = safeWhatsAppVisibleText(row.incoming);
      if (safeIncoming) {
        messages.push({
          id: `${row.id}-in`,
          chat_id: chatId,
          text: safeIncoming,
          from_me: false,
          sender: row.chat_name || "",
          type: row.msg_type || "text",
          timestamp_ms: baseTs,
          status: null,
        });
      }
      const safeReply = safeWhatsAppVisibleText(row.reply);
      if (safeReply) {
        messages.push({
          id: `${row.id}-out`,
          chat_id: chatId,
          text: safeReply,
          from_me: true,
          sender: "",
          type: "text",
          timestamp_ms: baseTs ? baseTs + 1 : 0,
          status: row.delivered ? "delivered" : "sent",
        });
      }
    }

    messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
    const filtered = sinceMs ? messages.filter((item) => item.timestamp_ms >= sinceMs) : messages;
    const sliced = filtered.slice(-Math.max(1, limit));
    return {
      chat_id: chatId,
      messages: sliced,
      count: sliced.length,
      source: "autopilot-log",
    };
  }
}

export async function sendWaManualMessage(input: {
  to: string;
  message: string;
  chat_name?: string;
}): Promise<WaManualSendResult> {
  try {
    return await http.post<WaManualSendResult>("/whatsapp/message/send", input);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;

    // Compatibilité temporaire : cette route historique réutilise la
    // protection de cadence du backend puis la session Baileys existante.
    const legacy = await http.post<{ chat_id?: string }>("/whatsapp/suggestion/send", {
      chat_id: input.to,
      text: input.message,
      chat_name: input.chat_name || "",
      incoming: "",
    });
    return {
      chat_id: legacy?.chat_id || input.to,
      msg_id: null,
      status: "accepted",
      accepted_by_gateway: true,
      delivery_confirmed: false,
      read_confirmed: false,
    };
  }
}

export async function getWaMessageStatus(
  msgId: string,
  chatId = "",
): Promise<WaMessageStatus> {
  const query = new URLSearchParams({ msg_id: msgId });
  if (chatId) query.set("chat_id", chatId);
  try {
    return await http.get<WaMessageStatus>(`/whatsapp/message/status?${query.toString()}`);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 404) throw error;
    // L'ancien backend n'expose pas encore cette lecture. Conserver l'état
    // "accepted" est plus exact que d'inventer "livré" ou "lu".
    return {
      msg_id: msgId,
      chat_id: chatId || null,
      known: Boolean(msgId),
      status: "accepted",
      server_ack_confirmed: false,
      delivery_confirmed: false,
      read_confirmed: false,
      failed: false,
    };
  }
}
