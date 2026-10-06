import { http, postForm } from "./http";

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

export type WaOverviewComparisonUnit = "percent" | "percentage_points" | "absolute";

export interface WaOverviewComparison {
  value: number;
  unit: WaOverviewComparisonUnit;
  direction: "up" | "down" | "flat";
  sentiment: "positive" | "negative" | "neutral";
}

export interface WaOverviewMetric {
  value: number | null;
  format: "integer" | "percentage";
  comparison: WaOverviewComparison | null;
  instrumented: boolean;
  reason?: string;
}

export interface WaOverviewActivityPoint {
  date: string;
  timestamp: string;
  sent: number;
  received: number;
}

export interface WhatsAppOverview {
  range: {
    days: number;
    from: string;
    to: string;
    timezone: string;
    granularity: "day";
  };
  metrics: {
    conversations: WaOverviewMetric;
    messages_sent: WaOverviewMetric;
    response_rate: WaOverviewMetric;
    automated_response_rate: WaOverviewMetric;
    delivery_success_rate: WaOverviewMetric;
  };
  activity: WaOverviewActivityPoint[];
  instrumentation: {
    coverage: string;
    raw_message_content_used: boolean;
    truncated: boolean;
    limitations: string[];
  };
  generated_at?: string;
  connection: {
    status: "connected" | "connecting" | "disconnected" | "degraded";
    display_phone: string | null;
    phone_e164: string | null;
    provider: string;
    last_healthy_at: string | null;
    product_state: string;
    ready: boolean;
    readable: boolean;
    label: string;
    contacts?: number;
    profile_name?: string;
  };
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

export function getWhatsAppOverview(
  days = 30,
  timezone = "Africa/Ndjamena",
): Promise<WhatsAppOverview> {
  const query = new URLSearchParams({
    days: String(days),
    timezone,
  });
  return http.get<WhatsAppOverview>(`/whatsapp/overview?${query.toString()}`);
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
  return http.get<WaLiveConversations>(`/whatsapp/conversations${suffix}`);
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
  return http.get<WaConversationMessages>(`/whatsapp/conversation/messages?${query.toString()}`);
}

export function sendWaManualMessage(input: {
  to: string;
  message: string;
  chat_name?: string;
}): Promise<WaManualSendResult> {
  return http.post<WaManualSendResult>("/whatsapp/message/send", input);
}

export function getWaMessageStatus(
  msgId: string,
  chatId = "",
): Promise<WaMessageStatus> {
  const query = new URLSearchParams({ msg_id: msgId });
  if (chatId) query.set("chat_id", chatId);
  return http.get<WaMessageStatus>(`/whatsapp/message/status?${query.toString()}`);
}


export interface WaConversationSearchResult {
  chat_id: string;
  query: string;
  results: WaLiveMessage[];
  count: number;
}

export interface WaContactInfo {
  jid: string;
  number: string | null;
  name: string;
  push_name: string;
  about: string | null;
  picture_url: string | null;
  business: Record<string, unknown> | null;
  on_whatsapp: boolean | null;
}

export type WaConversationAction =
  | "archive"
  | "unarchive"
  | "pin"
  | "unpin"
  | "mute"
  | "unmute"
  | "mark_read"
  | "mark_unread"
  | "clear"
  | "delete"
  | "star"
  | "unstar";

export interface WaMediaDraft {
  pending_confirmation: boolean;
  draft?: Record<string, unknown>;
  message?: string;
  sent?: boolean;
  chat_id?: string;
  msg_id?: string | null;
  type?: string;
}

export interface WaAssistantResult {
  action: "suggest_reply" | "summarize" | "translate";
  chat_id: string;
  result: string;
}

export interface WaAutomationCreateResult {
  id: string | null;
  scheduled: boolean;
  send_at: string | null;
  message: string | null;
}

export interface UploadedFile {
  url: string;
  file_name: string;
  size: number;
}

export function searchWaConversation(
  chatId: string,
  q: string,
  limit = 40,
): Promise<WaConversationSearchResult> {
  const query = new URLSearchParams({
    chat_id: chatId,
    q,
    limit: String(limit),
  });
  return http.get<WaConversationSearchResult>(
    `/whatsapp/conversation/search?${query.toString()}`,
  );
}

export function getWaContactInfo(jid: string): Promise<WaContactInfo> {
  return http.get<WaContactInfo>(
    `/whatsapp/contact-info?jid=${encodeURIComponent(jid)}`,
  );
}

export function runWaConversationAction(input: {
  chat_id: string;
  action: WaConversationAction;
  duration_ms?: number;
  msg_id?: string;
  from_me?: boolean;
  confirmed?: boolean;
}): Promise<{ chat_id: string; action: WaConversationAction; ok: boolean }> {
  return http.post("/whatsapp/conversation/action", input);
}

export function reactToWaMessage(input: {
  chat_id: string;
  msg_id: string;
  emoji: string;
}): Promise<{ chat_id: string; msg_id: string; emoji: string; reacted: boolean }> {
  return http.post("/whatsapp/message/react", input);
}

export function replyToWaMessage(input: {
  chat_id: string;
  text: string;
  original_msg_id: string;
  original_text?: string;
  original_sender?: string;
}): Promise<{ chat_id: string; msg_id: string | null; status: string }> {
  return http.post("/whatsapp/message/reply", input);
}

export function sendWaMedia(input: {
  chat_id: string;
  type: "image" | "video" | "gif" | "audio" | "voice" | "sticker" | "document";
  url: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
  confirmed: boolean;
  viewOnce?: boolean;
}): Promise<WaMediaDraft> {
  return http.post<WaMediaDraft>("/whatsapp/media/send", input);
}

export function setWaPresence(
  chatId: string,
  status: "composing" | "recording" | "paused",
): Promise<{ chat_id: string; status: string }> {
  return http.post("/whatsapp/presence", { chat_id: chatId, status });
}

export function runWaAssistant(input: {
  chat_id: string;
  action: "suggest_reply" | "summarize" | "translate";
  target_language?: string;
  text?: string;
}): Promise<WaAssistantResult> {
  return http.post<WaAssistantResult>("/whatsapp/assistant", input);
}

export function createWaAutomation(input: {
  chat_id: string;
  message: string;
  send_at: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "cron";
  cron_expr?: string;
  confirmed: boolean;
}): Promise<WaAutomationCreateResult> {
  return http.post<WaAutomationCreateResult>("/whatsapp/automation/create", input);
}

export function uploadWaAttachment(file: File): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file, file.name);
  return postForm<UploadedFile>("/files/upload", form);
}
