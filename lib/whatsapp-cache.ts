import { cachePurge, cacheSeed, cacheSessionOwner, cacheWrite } from "./swr-cache";

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

/** Reads already launched must not repopulate an invalidated cache namespace.
 * Track only outstanding requests, not every key ever visited. */
interface PendingRead { invalidated: boolean }
const pendingReads = new Map<string, Set<PendingRead>>();

function registerRead(owner: string, key: string, ticket: PendingRead): () => void {
  const identity = `${owner}:${key}`;
  let group = pendingReads.get(identity);
  if (!group) {
    group = new Set<PendingRead>();
    pendingReads.set(identity, group);
  }
  group.add(ticket);
  return () => {
    group!.delete(ticket);
    if (group!.size === 0) pendingReads.delete(identity);
  };
}

export interface WhatsAppReadOptions {
  /** Ignore la fraîcheur locale et consulte réellement le serveur. */
  revalidate?: boolean;
}

export async function waCachedRead<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    freshMs?: number;
    staleIfError?: boolean;
    revalidate?: boolean;
  } = {},
): Promise<T> {
  const freshMs = Math.max(0, options.freshMs ?? 0);
  const revalidate = options.revalidate ?? false;
  // Une revalidation explicite ne doit jamais transformer une vieille valeur
  // en "nouvelle" si le réseau échoue. Le hook UI garde déjà son snapshot.
  const staleIfError = options.staleIfError ?? !revalidate;

  if (!revalidate && freshMs > 0) {
    const fresh = cacheSeed<T>(key, freshMs);
    if (fresh !== null) return fresh;
  }

  const requestOwner = cacheSessionOwner();
  const stale = staleIfError ? cacheSeed<T>(key) : null;
  const ticket: PendingRead = { invalidated: false };
  const unregister = registerRead(requestOwner, key, ticket);
  try {
    const value = await fetcher();
    // A late response from account A, or from before a successful mutation,
    // must never poison the active account or resurrect invalidated data.
    if (requestOwner !== cacheSessionOwner()) {
      throw new Error("La session WhatsApp a changé pendant le chargement.");
    }
    if (ticket.invalidated) {
      throw new Error("Les données WhatsApp ont changé pendant le chargement.");
    }
    cacheWrite(key, value);
    return value;
  } catch (error) {
    if (!ticket.invalidated && requestOwner === cacheSessionOwner() && stale !== null) {
      return stale;
    }
    throw error;
  } finally {
    unregister();
  }
}

export async function waMutation<T>(
  request: Promise<T>,
  prefixes: string[] = ["wa:"],
): Promise<T> {
  const requestOwner = cacheSessionOwner();
  const result = await request;
  // Never purge B's cache when A's mutation resolves after an account switch.
  if (requestOwner === cacheSessionOwner()) invalidateWhatsAppCache(...prefixes);
  return result;
}

export function invalidateWhatsAppCache(...prefixes: string[]): void {
  const targets = prefixes.length ? prefixes : ["wa:"];
  const ownerPrefix = `${cacheSessionOwner()}:`;
  for (const [identity, group] of pendingReads) {
    if (targets.some((prefix) => identity.startsWith(ownerPrefix + prefix))) {
      for (const ticket of group) ticket.invalidated = true;
    }
  }
  for (const prefix of targets) cachePurge(prefix);
}

export function readWhatsAppCache<T>(
  key: string,
  maxAgeMs = Infinity,
): T | null {
  return cacheSeed<T>(key, maxAgeMs);
}

export function writeWhatsAppCache<T>(key: string, value: T): void {
  cacheWrite(key, value);
}
