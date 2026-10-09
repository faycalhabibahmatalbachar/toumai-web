import { cachePurge, cacheSeed, cacheWrite } from "./swr-cache";

export const WA_CACHE = {
  etat: "wa:etat",
  capacites: "wa:capacites",
  status: "wa:status",
  settings: "wa:settings",
  activity: (category = "", days = 0, limit = 0) =>
    `wa:activity:${encodeURIComponent(category || "_")}:${days || 0}:${limit || 0}`,
  carnet: (search = "") =>
    `wa:carnet:${encodeURIComponent(search.trim().toLowerCase() || "_")}`,
  profilePicture: (jid: string) =>
    `wa:profile-picture:${encodeURIComponent(jid.trim())}`,
  automations: (status = "", limit = 0) =>
    `wa:automations:${status || "all"}:${limit || 0}`,
  automationHistory: (id: string, limit = 30) =>
    `wa:automation-history:${encodeURIComponent(id)}:${limit}`,
  autopilot: "wa:autopilot",
  autopilotAnalytics: (days = 7) => `wa:autopilot:analytics:${days}`,
  autopilotLogs: (page = 1, pageSize = 100) =>
    `wa:autopilot:logs:${page}:${pageSize}`,
  autopilotConversations: (days = 30, limit = 4) =>
    `wa:autopilot:conversations:${days}:${limit}`,
  overview: (days = 30, timezone = "Africa/Ndjamena") =>
    `wa:overview:v1:${days}:${encodeURIComponent(timezone)}`,
  conversations: (params: {
    search?: string;
    pending?: boolean;
    unread?: boolean;
    kind?: "contact" | "group";
    offset?: number;
    limit?: number;
  } = {}) =>
    [
      "wa:conversations:api:v1",
      encodeURIComponent((params.search || "").trim().toLowerCase() || "_"),
      params.pending ? "pending" : "all-pending",
      params.unread ? "unread" : "all-unread",
      params.kind || "all-kind",
      params.offset || 0,
      params.limit || 0,
    ].join(":"),
  thread: (chatId: string, limit = 80, sinceMs = 0) =>
    `wa:conversations:thread-api:v1:${encodeURIComponent(chatId)}:${limit}:${sinceMs}`,
  conversationSearch: (chatId: string, query: string, limit = 40) =>
    `wa:conversation-search:${encodeURIComponent(chatId)}:${encodeURIComponent(
      query.trim().toLowerCase(),
    )}:${limit}`,
  contactInfo: (chatId: string) =>
    `wa:contact-info:${encodeURIComponent(chatId)}`,
  messageStatus: (msgId: string, chatId = "") =>
    `wa:message-status:${encodeURIComponent(chatId || "_")}:${encodeURIComponent(msgId)}`,
  mediaResearch: (experimentId: string) =>
    `wa:media-research:${encodeURIComponent(experimentId)}`,
} as const;

export async function waCachedRead<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    freshMs?: number;
    staleIfError?: boolean;
  } = {},
): Promise<T> {
  const freshMs = Math.max(0, options.freshMs ?? 0);
  const staleIfError = options.staleIfError ?? true;

  if (freshMs > 0) {
    const fresh = cacheSeed<T>(key, freshMs);
    if (fresh !== null) return fresh;
  }

  const stale = staleIfError ? cacheSeed<T>(key) : null;
  try {
    const value = await fetcher();
    cacheWrite(key, value);
    return value;
  } catch (error) {
    if (stale !== null) return stale;
    throw error;
  }
}

export async function waMutation<T>(
  request: Promise<T>,
  prefixes: string[] = ["wa:"],
): Promise<T> {
  const result = await request;
  for (const prefix of prefixes) cachePurge(prefix);
  return result;
}

export function invalidateWhatsAppCache(...prefixes: string[]): void {
  const targets = prefixes.length ? prefixes : ["wa:"];
  for (const prefix of targets) cachePurge(prefix);
}

export function writeWhatsAppCache<T>(key: string, value: T): void {
  cacheWrite(key, value);
}
