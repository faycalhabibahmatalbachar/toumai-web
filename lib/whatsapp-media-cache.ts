/**
 * WhatsApp media is sensitive binary data: memory only, scoped to the active
 * session, never localStorage or the JSON SWR cache.
 * Single-flight + bounded failures prevent the conversation polling / React
 * remount lifecycle from repeatedly hitting the gateway.
 */
import { authFetch } from "./http";
import { cacheSessionOwner } from "./swr-cache";

const REQUEST_TIMEOUT_MS = 18_000;
const FAILURE_COOLDOWN_MS = 30_000;
const NOT_FOUND_COOLDOWN_MS = 120_000;
const CACHE_TTL_MS = 12 * 60_000;
const MAX_CACHED_BYTES = 48 * 1024 * 1024;
const MAX_BLOB_BYTES = 18 * 1024 * 1024;
const MAX_ITEMS = 100;

type Entry = {
  promise?: Promise<Blob>;
  controller?: AbortController;
  blob?: Blob;
  expiresAt: number;
  error?: Error;
};

const cache = new Map<string, Entry>();
let activeOwner = "";
let cachedBytes = 0;

export class WhatsAppMediaError extends Error {
  constructor(message: string, readonly code: "timeout" | "not_found" | "http" | "invalid" | "session") {
    super(message);
    this.name = "WhatsAppMediaError";
  }
}

function syncSession() {
  const owner = cacheSessionOwner();
  if (owner !== activeOwner) {
    for (const item of cache.values()) item.controller?.abort();
    cache.clear();
    cachedBytes = 0;
    activeOwner = owner;
  }
  return owner;
}

function discard(key: string) {
  const item = cache.get(key);
  if (item?.blob) cachedBytes -= item.blob.size;
  cache.delete(key);
}

function trimCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (!entry.promise && entry.expiresAt < now) discard(key);
  }
  // Map insertion order is LRU. Never evict a pending promise.
  for (const [key, entry] of cache) {
    if (cachedBytes <= MAX_CACHED_BYTES && cache.size <= MAX_ITEMS) break;
    if (!entry.promise) discard(key);
  }
}

function mediaError(status: number) {
  if (status === 404 || status === 410) {
    return new WhatsAppMediaError("Ce média n’est plus disponible sur WhatsApp.", "not_found");
  }
  return new WhatsAppMediaError(
    status === 401 || status === 403
      ? "Accès au média refusé. Vérifiez votre connexion WhatsApp."
      : "Impossible de récupérer ce média pour le moment.",
    "http",
  );
}

/** A manual retry is the ONLY way to bypass a cached failure; refresh/SSE never is. */
export function getWhatsAppMediaBlob(
  messageId: string,
  options: { force?: boolean } = {},
): Promise<Blob> {
  const owner = syncSession();
  if (!messageId || messageId.startsWith("local-")) {
    return Promise.reject(new WhatsAppMediaError("Identifiant de média invalide.", "invalid"));
  }
  const key = `${owner}:${messageId}`;
  let entry = cache.get(key);
  if (entry?.promise) return entry.promise;
  if (options.force && entry) {
    discard(key);
    entry = undefined;
  }
  if (entry && entry.expiresAt > Date.now()) {
    // Mark as recently used without retaining extra blobs.
    cache.delete(key);
    cache.set(key, entry);
    if (entry.blob) return Promise.resolve(entry.blob);
    if (entry.error) return Promise.reject(entry.error);
  }
  if (entry) discard(key);
  const current: Entry = { expiresAt: 0, controller: new AbortController() };
  cache.set(key, current);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const request = async () => {
    try {
      const response = await Promise.race([
        authFetch(`/whatsapp/media/${encodeURIComponent(messageId)}`, {
          signal: current.controller!.signal,
          cache: "no-store",
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            current.controller?.abort();
            reject(new WhatsAppMediaError("Le média met trop de temps à répondre. Réessayez.", "timeout"));
          }, REQUEST_TIMEOUT_MS);
        }),
      ]);
      if (!response.ok) throw mediaError(response.status);
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (type.includes("text/html") || type.includes("application/json")) {
        throw new WhatsAppMediaError("Le serveur n’a pas renvoyé un fichier média.", "invalid");
      }
      // Cap slow/unending binary streams with the same deadline.
      const blob = await Promise.race([
        response.blob(),
        new Promise<never>((_, reject) => {
          const deadline = setTimeout(() => {
            current.controller?.abort();
            reject(new WhatsAppMediaError("Le téléchargement du média a expiré.", "timeout"));
          }, REQUEST_TIMEOUT_MS);
          // response.blob() owns the timer; this watchdog is cleared on exit.
          bodyTimers.add(deadline);
        }),
      ]);
      if (!blob.size || blob.type.includes("text/html") || blob.type.includes("application/json")) {
        throw new WhatsAppMediaError("La pièce jointe est vide ou invalide.", "invalid");
      }
      if (syncSession() !== owner) {
        throw new WhatsAppMediaError("Votre session WhatsApp a changé.", "session");
      }
      if (cache.get(key) === current) {
        current.promise = undefined;
        current.controller = undefined;
        if (blob.size <= MAX_BLOB_BYTES) {
          current.blob = blob;
          current.expiresAt = Date.now() + CACHE_TTL_MS;
          cachedBytes += blob.size;
        } else {
          cache.delete(key);
        }
        trimCache();
      }
      return blob;
    } catch (cause) {
      const error = cause instanceof WhatsAppMediaError ? cause :
        new WhatsAppMediaError("Le média est indisponible. Réessayez.", "http");
      if (cache.get(key) === current && activeOwner === owner) {
        current.promise = undefined;
        current.controller = undefined;
        current.error = error;
        current.expiresAt = Date.now() + (error.code === "not_found" ? NOT_FOUND_COOLDOWN_MS : FAILURE_COOLDOWN_MS);
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      for (const t of bodyTimers) clearTimeout(t);
      bodyTimers.clear();
    }
  };
  const bodyTimers = new Set<ReturnType<typeof setTimeout>>();
  current.promise = request();
  return current.promise;
}

/** Introspection without exposing media bytes, useful for E2E diagnostics. */
export function whatsAppMediaCacheStats() {
  syncSession();
  return { entries: cache.size, bytes: cachedBytes, pending: [...cache.values()].filter((e) => !!e.promise).length };
}
