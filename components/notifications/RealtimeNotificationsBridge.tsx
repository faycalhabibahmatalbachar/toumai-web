"use client";

import Link from "next/link";
import { BellRing, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/http";
import type { RealtimeNotification } from "@/lib/notifications-api";
import type { Preferences } from "@/lib/preferences-api";
import { cacheSeed } from "@/lib/swr-cache";
import {
  getToumaiVoiceSnapshot,
  isToumaiVoiceConversationActive,
  playToumaiVoice,
  stopToumaiVoice,
  waitForToumaiVoiceConversationIdle,
} from "@/lib/toumai-voice-player";
import { safeInternalPath } from "@/lib/widgets/core";

type ToastItem = {
  key: string;
  accountId: string;
  notification: RealtimeNotification;
};

const MAX_SEEN = 120;
const TOAST_MS = 8_000;
const VOICE_TIMEOUT_MS = 30_000;
const SEEN_STORAGE_PREFIX = "toumai_notification_seen_v1:";
const CURSOR_STORAGE_PREFIX = "toumai_notification_cursor_v1:";
const SPOKEN_STORAGE_PREFIX = "toumai_notification_spoken_v1:";

type NavigatorLocksLike = {
  request(
    name: string,
    callback: () => Promise<void>,
  ): Promise<void>;
};

function eventKey(n: RealtimeNotification): string {
  const id = String(n.id ?? "").trim();
  if (id) return id;
  return [n.event ?? "", n.created_at ?? "", n.title, n.body].join("|").slice(0, 500);
}

function destination(n: RealtimeNotification): string {
  return safeInternalPath(n.deep_link ?? "") || "/notifications";
}


function storageList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").slice(-MAX_SEEN)
      : [];
  } catch {
    return [];
  }
}

function saveStorageList(key: string, values: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(values.slice(-MAX_SEEN)));
  } catch {
    // sessionStorage peut être indisponible en navigation privée stricte.
  }
}

function persistentKey(prefix: string, accountId: string): string {
  return prefix + accountId;
}

function readCursor(accountId: string): string {
  if (typeof window === "undefined" || !accountId) return "";
  try {
    return window.sessionStorage.getItem(
      persistentKey(CURSOR_STORAGE_PREFIX, accountId),
    ) ?? "";
  } catch {
    return "";
  }
}

function writeCursor(accountId: string, eventId: string): void {
  if (typeof window === "undefined" || !accountId || !eventId) return;
  try {
    window.sessionStorage.setItem(
      persistentKey(CURSOR_STORAGE_PREFIX, accountId),
      eventId,
    );
  } catch {
    // La déduplication mémoire reste active.
  }
}

function eligibleForVoice(n: RealtimeNotification): boolean {
  if (
    !isVoiceReminder(n) ||
    n.voice_enabled !== true ||
    typeof window === "undefined" ||
    document.visibilityState !== "visible"
  ) {
    return false;
  }
  const body = String(n.body ?? "").trim();
  if (!body) return false;
  const locale = String(n.locale ?? "fr").trim().toLowerCase();
  return !locale || locale.startsWith("fr");
}

function claimSpokenNotification(accountId: string, notificationId: string): boolean {
  if (
    typeof window === "undefined" ||
    !accountId ||
    !notificationId
  ) {
    return true;
  }

  const key = persistentKey(SPOKEN_STORAGE_PREFIX, accountId);
  let ids: string[] = [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    ids = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(-MAX_SEEN)
      : [];
    if (ids.includes(notificationId)) return false;
    ids.push(notificationId);
    window.localStorage.setItem(key, JSON.stringify(ids.slice(-MAX_SEEN)));
    return true;
  } catch {
    return true;
  }
}

async function waitForSharedVoiceIdle(timeoutMs = 30_000): Promise<boolean> {
  const started = Date.now();
  while (getToumaiVoiceSnapshot().phase !== "idle") {
    if (Date.now() - started >= timeoutMs) return false;
    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }
  return true;
}


const REMINDER_EVENT_PREFIXES = [
  "personal.reminder",
  "alarm",
  "ai.proactive",
  "notes.reminder",
  "calendar.event.reminder",
  "traffic",
  "calendar_conflict",
];

function isVoiceReminder(n: RealtimeNotification): boolean {
  const event = String(n.event ?? "").trim();
  if (event === "notification.test") return true;
  if (String(n.category ?? "").trim() === "reminders") return true;
  return REMINDER_EVENT_PREFIXES.some((prefix) => event.startsWith(prefix));
}

let reminderSpeechQueue: Promise<void> = Promise.resolve();

async function speakReminderNow(n: RealtimeNotification) {
  if (!eligibleForVoice(n)) return;

  const body = String(n.body ?? "").trim();

  // Une notification ne coupe jamais une conversation vocale.
  if (isToumaiVoiceConversationActive()) {
    const released = await waitForToumaiVoiceConversationIdle(VOICE_TIMEOUT_MS);
    if (!released || !eligibleForVoice(n)) {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-error", { detail: n }),
      );
      return;
    }
  }

  // Elle ne coupe pas non plus une lecture manuelle déjà lancée dans le chat
  // ou les réglages. On attend une fenêtre libre, puis on abandonne proprement.
  if (getToumaiVoiceSnapshot().phase !== "idle") {
    const idle = await waitForSharedVoiceIdle(VOICE_TIMEOUT_MS);
    if (!idle || !eligibleForVoice(n)) {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-error", { detail: n }),
      );
      return;
    }
  }

  const owner = "notification:" + eventKey(n);
  window.dispatchEvent(
    new CustomEvent("toumai:notification-voice-start", { detail: n }),
  );

  const speed = cacheSeed<Preferences>("user:prefs")?.tts_speed ?? 1;
  let timeoutId: number | null = null;
  try {
    const timeout = new Promise<"error">((resolve) => {
      timeoutId = window.setTimeout(() => {
        stopToumaiVoice(owner);
        resolve("error");
      }, VOICE_TIMEOUT_MS);
    });

    const outcome = await Promise.race([
      playToumaiVoice(body, owner, speed),
      timeout,
    ]);

    if (outcome === "ended") {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-complete", { detail: n }),
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-error", { detail: n }),
      );
    }
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  }
}

async function speakReminderCrossTab(
  n: RealtimeNotification,
  accountId: string,
): Promise<void> {
  // Un onglet caché ne réserve jamais le rappel au détriment d'un onglet visible.
  if (!eligibleForVoice(n)) return;

  const notificationId = String(n.id ?? "").trim();
  const run = async () => {
    if (!eligibleForVoice(n)) return;
    if (
      notificationId &&
      !claimSpokenNotification(accountId, notificationId)
    ) {
      return;
    }
    await speakReminderNow(n);
  };

  const locks = (
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { locks?: NavigatorLocksLike }).locks
      : undefined
  );
  if (locks && accountId) {
    // Web Locks sérialise aussi plusieurs onglets du même compte : une seule
    // fenêtre peut réclamer/parler un rappel à la fois.
    await locks.request(
      "toumai-notification-voice:" + accountId,
      run,
    );
    return;
  }

  await run();
}

function speakReminder(
  n: RealtimeNotification,
  accountId: string,
): Promise<void> {
  // Plusieurs rappels arrivant au même instant doivent parler l'un APRÈS
  // l'autre. La file locale complète la serrure inter-onglets ci-dessus.
  reminderSpeechQueue = reminderSpeechQueue
    .catch(() => {})
    .then(() => speakReminderCrossTab(n, accountId));
  return reminderSpeechQueue;
}

function parseSseChunk(
  buffer: string,
  onNotification: (notification: RealtimeNotification) => void,
  onEventId: (eventId: string) => void,
): string {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  for (const frame of frames) {
    const lines = frame.split("\n");
    const eventId =
      lines
        .find((line) => line.startsWith("id:"))
        ?.slice(3)
        .trim() ?? "";
    if (eventId) onEventId(eventId);

    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) continue;
    try {
      const value = JSON.parse(data) as RealtimeNotification;
      if (
        value &&
        typeof value.title === "string" &&
        typeof value.body === "string"
      ) {
        onNotification(value);
      }
    } catch {
      // Une frame cursor ou invalide ne doit pas tuer le flux suivant.
    }
  }
  return rest;
}

export function RealtimeNotificationsBridge() {
  const { session } = useAuth();
  const accountId = String(session?.user_id ?? "");
  const [items, setItems] = useState<ToastItem[]>([]);
  const seen = useRef<string[]>([]);
  const seenSet = useRef(new Set<string>());
  const persistedSeen = useRef<string[]>([]);
  const lastEventId = useRef("");
  const hydratedAccount = useRef("");

  const remember = useCallback(
    (key: string, persistentId = "") => {
      if (seenSet.current.has(key)) return false;
      seenSet.current.add(key);
      seen.current.push(key);
      if (seen.current.length > MAX_SEEN) {
        const oldest = seen.current.shift();
        if (oldest) seenSet.current.delete(oldest);
      }

      // On ne persiste que les IDs opaques du serveur, jamais le fallback
      // contenant titre/corps : aucun contenu de rappel en sessionStorage.
      if (
        accountId &&
        persistentId &&
        !persistedSeen.current.includes(persistentId)
      ) {
        persistedSeen.current.push(persistentId);
        if (persistedSeen.current.length > MAX_SEEN) {
          persistedSeen.current.shift();
        }
        saveStorageList(
          persistentKey(SEEN_STORAGE_PREFIX, accountId),
          persistedSeen.current,
        );
      }
      return true;
    },
    [accountId],
  );

  const receive = useCallback(
    (notification: RealtimeNotification, source: "sse" | "web_push") => {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-arrival", {
          detail: { notification, source },
        }),
      );

      const key = eventKey(notification);
      const persistentId = String(notification.id ?? "").trim();
      if (!remember(key, persistentId)) return;

      void speakReminder(notification, accountId);
      setItems((current) => [
        ...current.slice(-2),
        { key, accountId, notification },
      ]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.key !== key));
      }, TOAST_MS);
    },
    [accountId, remember],
  );

  useEffect(() => {
    if (!session || !accountId) {
      seen.current = [];
      seenSet.current.clear();
      persistedSeen.current = [];
      lastEventId.current = "";
      hydratedAccount.current = "";
      return;
    }

    if (hydratedAccount.current !== accountId) {
      const restored = storageList(
        persistentKey(SEEN_STORAGE_PREFIX, accountId),
      );
      seen.current = [...restored];
      seenSet.current = new Set(restored);
      persistedSeen.current = [...restored];
      lastEventId.current = readCursor(accountId);
      hydratedAccount.current = accountId;
    }

    let stopped = false;
    let controller: AbortController | null = null;
    let reconnectMs = 1_000;

    const connect = async () => {
      while (!stopped) {
        controller = new AbortController();
        try {
          const headers: Record<string, string> = {
            Accept: "text/event-stream",
          };
          if (lastEventId.current) {
            headers["Last-Event-ID"] = lastEventId.current;
          }

          const response = await authFetch("/notifications/stream", {
            headers,
            cache: "no-store",
            signal: controller.signal,
          });

          if (response.status === 409) {
            // Même temps réel désactivé, le serveur donne le dernier curseur :
            // on ne rejouera donc pas ce backlog si la personne réactive le canal.
            const cursor =
              response.headers.get("X-Toumai-Notification-Cursor") ?? "";
            if (cursor) {
              lastEventId.current = cursor;
              writeCursor(accountId, cursor);
            }
            await new Promise((resolve) => window.setTimeout(resolve, 15_000));
            continue;
          }
          if (!response.ok || !response.body) {
            throw new Error("notification stream unavailable");
          }

          reconnectMs = 1_000;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            buffer = parseSseChunk(
              buffer,
              (notification) => receive(notification, "sse"),
              (cursor) => {
                lastEventId.current = cursor;
                writeCursor(accountId, cursor);
              },
            );
          }
        } catch (error) {
          if (
            stopped ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return;
          }
        }

        if (stopped) return;
        await new Promise((resolve) => window.setTimeout(resolve, reconnectMs));
        reconnectMs = Math.min(30_000, reconnectMs * 2);
      }
    };

    void connect();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, [accountId, receive, session]);

  useEffect(() => {
    if (!session || typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; notification?: RealtimeNotification } | null;
      if (data?.type === "TOUMAI_NOTIFICATION" && data.notification) {
        receive(data.notification, "web_push");
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [receive, session]);

  const visibleItems = items.filter((item) => item.accountId === accountId);
  if (!session || !visibleItems.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[120] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[min(390px,calc(100vw-40px))]"
      aria-live="polite"
      aria-label="Notifications Toumaï"
    >
      {visibleItems.map(({ key, notification }) => (
        <article
          key={key}
          className="pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]/96 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3 p-3.5">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              aria-hidden="true"
            >
              {notification.voice_enabled && isVoiceReminder(notification) ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <BellRing className="h-4 w-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {notification.title || "Toumaï AI"}
              </p>
              {notification.body ? (
                <p className="mt-1 line-clamp-3 text-sm leading-5 text-[var(--text-secondary)]">
                  {notification.body}
                </p>
              ) : null}
              <Link
                href={destination(notification)}
                className="mt-2 inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Voir
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setItems((current) => current.filter((item) => item.key !== key))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
