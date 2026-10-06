import { http } from "./http";

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
  source: "baileys";
}

export interface WaConversationMessages {
  chat_id: string;
  messages: WaLiveMessage[];
  count: number;
  source: "baileys";
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

export function getWaLiveConversations(params?: {
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
  return http.get(`/whatsapp/conversations${suffix}`);
}

export function getWaConversationMessages(
  chatId: string,
  limit = 80,
  sinceMs = 0,
): Promise<WaConversationMessages> {
  const query = new URLSearchParams({
    chat_id: chatId,
    limit: String(limit),
    since_ms: String(sinceMs),
  });
  return http.get(`/whatsapp/conversation/messages?${query.toString()}`);
}

export function sendWaManualMessage(input: {
  to: string;
  message: string;
  chat_name?: string;
}): Promise<WaManualSendResult> {
  return http.post("/whatsapp/message/send", input);
}

export function getWaMessageStatus(
  msgId: string,
  chatId = "",
): Promise<WaMessageStatus> {
  const query = new URLSearchParams({ msg_id: msgId });
  if (chatId) query.set("chat_id", chatId);
  return http.get(`/whatsapp/message/status?${query.toString()}`);
}
