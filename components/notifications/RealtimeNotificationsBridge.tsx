"use client";

import Link from "next/link";
import { BellRing, Volume2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/http";
import type { RealtimeNotification } from "@/lib/notifications-api";
import { safeInternalPath } from "@/lib/widgets/core";

type ToastItem = {
  key: string;
  notification: RealtimeNotification;
};

const MAX_SEEN = 120;
const TOAST_MS = 8_000;

function eventKey(n: RealtimeNotification): string {
  const id = String(n.id ?? "").trim();
  if (id) return id;
  return [n.event ?? "", n.created_at ?? "", n.title, n.body].join("|").slice(0, 500);
}

function destination(n: RealtimeNotification): string {
  return safeInternalPath(n.deep_link ?? "") || "/notifications";
}

function speakReminder(n: RealtimeNotification) {
  const speakable =
    n.event === "personal.reminder" || n.event === "notification.test";
  if (
    !speakable ||
    n.voice_enabled !== true ||
    typeof window === "undefined" ||
    document.visibilityState !== "visible" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const body = String(n.body ?? "").trim();
  if (!body) return;
  try {
    // Ne jamais empiler plusieurs rappels vocaux : le plus récent remplace la
    // lecture en cours, tandis que tous restent dans l'Inbox durable.
    window.speechSynthesis.cancel();
    const locale = String(n.locale ?? "").toLowerCase();
    const language = locale.startsWith("ar")
      ? "ar-SA"
      : locale.startsWith("en")
        ? "en-US"
        : "fr-FR";
    const prefix = language === "ar-SA" ? "تذكير. " : language === "en-US" ? "Reminder. " : "Rappel. ";
    const utterance = new SpeechSynthesisUtterance(prefix + body);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.onstart = () => {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-start", { detail: n }),
      );
    };
    utterance.onend = () => {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-complete", { detail: n }),
      );
    };
    utterance.onerror = () => {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-voice-error", { detail: n }),
      );
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    // Certains navigateurs exigent une interaction préalable pour parler.
    // Le rappel visuel et l'Inbox restent disponibles.
  }
}

function parseSseChunk(
  buffer: string,
  onNotification: (notification: RealtimeNotification) => void,
): string {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (!data) continue;
    try {
      const value = JSON.parse(data) as RealtimeNotification;
      if (value && typeof value.title === "string" && typeof value.body === "string") {
        onNotification(value);
      }
    } catch {
      // Une frame invalide ne doit pas tuer le flux suivant.
    }
  }
  return rest;
}

export function RealtimeNotificationsBridge() {
  const { session } = useAuth();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seen = useRef<string[]>([]);
  const seenSet = useRef(new Set<string>());

  const remember = useCallback((key: string) => {
    if (seenSet.current.has(key)) return false;
    seenSet.current.add(key);
    seen.current.push(key);
    if (seen.current.length > MAX_SEEN) {
      const oldest = seen.current.shift();
      if (oldest) seenSet.current.delete(oldest);
    }
    return true;
  }, []);

  const receive = useCallback(
    (notification: RealtimeNotification, source: "sse" | "web_push") => {
      window.dispatchEvent(
        new CustomEvent("toumai:notification-arrival", {
          detail: { notification, source },
        }),
      );

      const key = eventKey(notification);
      if (!remember(key)) return;

      speakReminder(notification);
      setItems((current) => [...current.slice(-2), { key, notification }]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.key !== key));
      }, TOAST_MS);
    },
    [remember],
  );

  useEffect(() => {
    if (!session) {
      setItems([]);
      seen.current = [];
      seenSet.current.clear();
      return;
    }

    let stopped = false;
    let controller: AbortController | null = null;
    let reconnectMs = 1_000;

    const connect = async () => {
      while (!stopped) {
        controller = new AbortController();
        try {
          const response = await authFetch("/notifications/stream", {
            headers: { Accept: "text/event-stream" },
            cache: "no-store",
            signal: controller.signal,
          });

          if (response.status === 409) {
            // Le temps réel est désactivé dans les préférences du compte.
            await new Promise((resolve) => window.setTimeout(resolve, 60_000));
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
            buffer = parseSseChunk(buffer, (notification) =>
              receive(notification, "sse"),
            );
          }
        } catch (error) {
          if (stopped || (error instanceof DOMException && error.name === "AbortError")) {
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
  }, [receive, session]);

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

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[120] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-5 sm:w-[min(390px,calc(100vw-40px))]"
      aria-live="polite"
      aria-label="Notifications Toumaï"
    >
      {items.map(({ key, notification }) => (
        <article
          key={key}
          className="pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]/96 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-start gap-3 p-3.5">
            <span
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              aria-hidden="true"
            >
              {notification.voice_enabled &&
              (notification.event === "personal.reminder" ||
                notification.event === "notification.test") ? (
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
