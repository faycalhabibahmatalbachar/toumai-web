import { authFetch, http, postForm } from "./http";

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


export interface WaQuotedMessage {
  id: string;
  text: string;
  sender: string;
}

export interface WaLiveMessage {
  id: string;
  chat_id: string;
  text: string;
  from_me: boolean;
  sender: string;
  sender_jid?: string;
  type: string;
  timestamp_ms: number;
  status?: string | null;
  mime_type?: string | null;
  file_name?: string | null;
  media_label?: string | null;
  duration_seconds?: number | null;
  quoted?: WaQuotedMessage | null;
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

export interface WaConversationSearchResult {
  chat_id: string;
  query: string;
  messages: WaLiveMessage[];
  count: number;
}

export interface WaContactInfo {
  chat_id: string;
  name: string;
  phone: string | null;
  about: string | null;
  picture_url: string | null;
  on_whatsapp: boolean | null;
  is_business: boolean;
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
  | "delete";

export interface WaConversationActionResult {
  chat_id: string;
  action: WaConversationAction;
  applied: boolean;
}

export type WaMediaType =
  | "image"
  | "video"
  | "gif"
  | "audio"
  | "voice"
  | "sticker"
  | "document";

export interface WaUploadedFile {
  url: string;
  file_name: string;
  size: number;
}

export interface WaMediaSendResult {
  chat_id: string;
  msg_id: string | null;
  type: WaMediaType | "poll" | "contact";
  status: "accepted" | "unknown";
  accepted_by_gateway: boolean;
  reply_to?: string | null;
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
  status: "unknown" | "queued" | "sent" | "delivered" | "read" | "played" | "failed" | string;
  server_ack_confirmed: boolean;
  delivery_confirmed: boolean;
  read_confirmed: boolean;
  failed: boolean;
  sent_at?: number | null;
  edited_at?: number | null;
  timeline?: Partial<Record<"queued" | "sent" | "delivered" | "read" | "played" | "failed", number>>;
}

export function getWaLiveConversations(params?: {
  search?: string;
  pending?: boolean;
  unread?: boolean;
  kind?: "contact" | "group";
  offset?: number;
  limit?: number;
}): Promise<WaLiveConversations> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.pending) query.set("pending", "true");
  if (params?.unread) query.set("unread", "true");
  if (params?.kind) query.set("kind", params.kind);
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

export function searchWaConversation(
  chatId: string,
  queryText: string,
  limit = 40,
): Promise<WaConversationSearchResult> {
  const query = new URLSearchParams({
    chat_id: chatId,
    q: queryText,
    limit: String(limit),
  });
  return http.get<WaConversationSearchResult>(
    `/whatsapp/conversation/search?${query.toString()}`,
  );
}

export function getWaContactInfo(chatId: string): Promise<WaContactInfo> {
  const query = new URLSearchParams({ chat_id: chatId });
  return http.get<WaContactInfo>(`/whatsapp/contact/info?${query.toString()}`);
}

export async function uploadWaAttachment(file: File): Promise<WaUploadedFile> {
  const form = new FormData();
  form.append("file", file);
  return postForm<WaUploadedFile>("/files/upload", form);
}

export function inferWaMediaType(file: File): WaMediaType {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (mime === "image/gif" || name.endsWith(".gif")) return "gif";
  if (mime === "image/webp" || name.endsWith(".webp")) return "sticker";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export function sendWaMedia(input: {
  to: string;
  type: WaMediaType;
  url: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
  reply_to_msg_id?: string;
  reply_to_text?: string;
  reply_to_type?: string;
  reply_to_sender?: string;
  confirmed: true;
}): Promise<WaMediaSendResult> {
  return http.post<WaMediaSendResult>("/whatsapp/media/send", input);
}

export function sendWaPoll(input: {
  to: string;
  question: string;
  options: string[];
  selectable_count?: number;
  confirmed: true;
}): Promise<WaMediaSendResult> {
  return http.post<WaMediaSendResult>("/whatsapp/media/send", {
    to: input.to,
    type: "poll",
    poll_name: input.question,
    poll_options: input.options,
    selectable_count: input.selectable_count ?? 1,
    confirmed: input.confirmed,
  });
}

export function sendWaContactCard(input: {
  to: string;
  contact_to_share: string;
  display_name?: string;
  confirmed: true;
}): Promise<WaMediaSendResult> {
  return http.post<WaMediaSendResult>("/whatsapp/media/send", {
    to: input.to,
    type: "contact",
    contact_to_share: input.contact_to_share,
    display_name: input.display_name,
    confirmed: input.confirmed,
  });
}

export function applyWaConversationAction(input: {
  chat_id: string;
  action: WaConversationAction;
  duration?: "8h" | "1j" | "7j" | "always";
  confirmed: true;
}): Promise<WaConversationActionResult> {
  return http.post<WaConversationActionResult>("/whatsapp/conversation/action", input);
}

export function sendWaManualMessage(input: {
  to: string;
  message: string;
  chat_name?: string;
}): Promise<WaManualSendResult> {
  return http.post<WaManualSendResult>("/whatsapp/message/send", input);
}

export function sendWaReply(input: {
  chat_id: string;
  msg_id: string;
  message: string;
  original_text?: string;
  original_sender?: string;
}): Promise<{ chat_id: string; msg_id: string | null; reply_to: string; status: string }> {
  return http.post("/whatsapp/message/reply", input);
}

export function reactWaMessage(input: {
  chat_id: string;
  msg_id: string;
  emoji: string;
}): Promise<{ chat_id: string; msg_id: string; emoji: string; reacted: boolean }> {
  return http.post("/whatsapp/message/react", input);
}

export function editWaMessage(input: {
  chat_id: string;
  msg_id: string;
  new_text: string;
}): Promise<{ chat_id: string; msg_id: string; edited: boolean; new_msg_id?: string | null }> {
  return http.post("/whatsapp/message/edit", input);
}

export type WaMediaEditResearchMode =
  | "E0_TEXT_CONTROL"
  | "E1_MEDIA_TO_TEXT"
  | "E2_SAME_MEDIA_CAPTION"
  | "E3_REUPLOAD_SAME_MEDIA_CAPTION"
  | "E4_REPLACE_MEDIA"
  | "E5_SAME_ID_IMAGE_RESEND"
  | "E6_SAME_ID_EDIT_ENVELOPE"
  | "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA"
  | "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH";

export interface WaMediaEditResearchResult {
  experiment_id: string;
  mode: WaMediaEditResearchMode;
  chat_id: string;
  msg_id: string;
  original_type: string;
  age_ms: number | null;
  transport_accepted: boolean;
  generated_message_id?: string | null;
  gateway_update_observed_at?: number | null;
  gateway_update_has_edited_message: boolean;
  gateway_update_type?: string | null;
  gateway_update_descriptor?: Record<string, unknown> | null;
  gateway_update_matches_replacement?: boolean;
  protocol_upserts?: Array<{
    at?: number;
    eventType?: string;
    envelopeMessageId?: string | null;
    fromMe?: boolean;
    editedType?: string | null;
    descriptor?: Record<string, unknown> | null;
    matchesReplacement?: boolean;
  }>;
  cache_mutation: boolean;
  evidence?: {
    strategy?: string;
    descriptorIdentical?: boolean;
    sourceByteLength?: number;
    sourcePlainSha256?: string | null;
    sourceProtoFileSha256?: string | null;
    sourceHashMatchesOriginalProto?: boolean;
    originalByteLength?: number;
    replacementByteLength?: number;
    originalPlainSha256?: string | null;
    replacementPlainSha256?: string | null;
    replacementDiffersFromOriginal?: boolean;
    outputFileSha256?: string | null;
    samePlainBytesAfterReupload?: boolean;
    outputMatchesReplacement?: boolean;
    descriptorChanged?: boolean;
    requestedMessageId?: string;
    returnedMessageId?: string | null;
    returnedSameMessageId?: boolean;
    submittedCaption?: string;
    originalDescriptor?: Record<string, unknown> | null;
    editedDescriptor?: Record<string, unknown> | null;
    outputDescriptor?: Record<string, unknown> | null;
    copiedFields?: string[];
    originalThumbnailFingerprint?: string | null;
    hybridThumbnailFingerprint?: string | null;
    originalDimensions?: { width: number | null; height: number | null };
    hybridDimensions?: { width: number | null; height: number | null };
    freshDescriptor?: Record<string, unknown> | null;
    hybridDescriptor?: Record<string, unknown> | null;
    uploadedFileSha256?: string | null;
    submittedFileSha256?: string | null;
    submittedHashMatchesOriginal?: boolean;
    submittedHashMatchesReplacement?: boolean;
  };
  verdict:
    | "SUBMITTED_NOT_PROVEN"
    | "GATEWAY_EDIT_EVENT_OBSERVED"
    | "NOT_SUBMITTED"
    | string;
}

export function runWaMediaEditResearch(input: {
  chat_id: string;
  msg_id: string;
  mode: WaMediaEditResearchMode;
  text?: string;
  caption?: string;
  url?: string;
  filename?: string;
  mimetype?: string;
  confirmed: true;
}): Promise<WaMediaEditResearchResult> {
  return http.post<WaMediaEditResearchResult>("/whatsapp/research/media-edit", input);
}

export function getWaMediaEditResearchResult(
  experimentId: string,
): Promise<WaMediaEditResearchResult> {
  const query = new URLSearchParams({ experiment_id: experimentId });
  return http.get<WaMediaEditResearchResult>(
    `/whatsapp/research/media-edit/result?${query.toString()}`,
  );
}

export function getWaMessageStatus(
  msgId: string,
  chatId = "",
): Promise<WaMessageStatus> {
  const query = new URLSearchParams({ msg_id: msgId });
  if (chatId) query.set("chat_id", chatId);
  return http.get<WaMessageStatus>(`/whatsapp/message/status?${query.toString()}`);
}


export async function getWaMessageMediaBlob(msgId: string): Promise<Blob> {
  const response = await authFetch(`/whatsapp/media/${encodeURIComponent(msgId)}`);
  if (!response.ok) {
    throw new Error(response.status === 404 ? "Pièce jointe indisponible." : "Impossible de charger la pièce jointe.");
  }
  return await response.blob();
}
