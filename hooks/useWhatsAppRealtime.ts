"use client";

import { useEffect, useRef } from "react";

import {
  streamWhatsAppEvents,
  type WhatsAppRealtimeEvent,
} from "@/lib/whatsapp-realtime";

type Refresh = () => Promise<void> | void;

interface UseWhatsAppRealtimeInvalidationOptions {
  enabled: boolean;
  refreshOverview: Refresh;
  refreshConversations: Refresh;
  refreshAutomations: Refresh;
  refreshConnection: Refresh;
}

const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 15_000] as const;
const STABLE_STREAM_MS = 10_000;
const SEEN_EVENT_LIMIT = 256;

function waitForDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = window.setTimeout(done, ms);
    function done() {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

function waitUntilOnline(signal: AbortSignal): Promise<void> {
  if (typeof navigator === "undefined" || navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      signal.removeEventListener("abort", done);
      resolve();
    };
    window.addEventListener("online", done, { once: true });
    signal.addEventListener("abort", done, { once: true });
  });
}

/**
 * Turns PII-free server invalidations into targeted REST revalidation.
 * SSE is an acceleration layer only; the independent 30-second polling
 * fallback remains active for missed events, restarts and proxy failures.
 */
export function useWhatsAppRealtimeInvalidation({
  enabled,
  refreshOverview,
  refreshConversations,
  refreshAutomations,
  refreshConnection,
}: UseWhatsAppRealtimeInvalidationOptions): void {
  const refreshersRef = useRef({
    refreshOverview,
    refreshConversations,
    refreshAutomations,
    refreshConnection,
  });

  useEffect(() => {
    refreshersRef.current = {
      refreshOverview,
      refreshConversations,
      refreshAutomations,
      refreshConnection,
    };
  }, [
    refreshOverview,
    refreshConversations,
    refreshAutomations,
    refreshConnection,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const timers: Partial<Record<"overview" | "conversations" | "automations" | "connection", number>> = {};
    let lastVersion = 0;
    const seenEventIds = new Set<string>();

    const rememberEvent = (id: string) => {
      seenEventIds.add(id);
      if (seenEventIds.size <= SEEN_EVENT_LIMIT) return;
      const oldest = seenEventIds.values().next().value;
      if (typeof oldest === "string") seenEventIds.delete(oldest);
    };

    const schedule = (
      scope: "overview" | "conversations" | "automations" | "connection",
      delayMs: number,
      refresh: Refresh,
    ) => {
      const existing = timers[scope];
      if (existing !== undefined) window.clearTimeout(existing);
      timers[scope] = window.setTimeout(() => {
        delete timers[scope];
        void Promise.resolve(refresh()).catch(() => {
          // Polling/focus revalidation remains the recovery path.
        });
      }, delayMs);
    };

    const handleEvent = (event: WhatsAppRealtimeEvent) => {
      if (event.type === "stream.ready") return;
      if (seenEventIds.has(event.id)) return;
      if (event.version < lastVersion) return;

      rememberEvent(event.id);
      lastVersion = Math.max(lastVersion, event.version);

      const scopes = new Set(event.scopes);
      const current = refreshersRef.current;

      if (scopes.has("conversations")) {
        schedule("conversations", 250, current.refreshConversations);
      }
      if (scopes.has("automations")) {
        schedule("automations", 250, current.refreshAutomations);
      }
      if (scopes.has("connection")) {
        schedule("connection", 250, current.refreshConnection);
      }
      if (scopes.has("overview") || scopes.has("connection")) {
        schedule("overview", 1_000, current.refreshOverview);
      }
    };

    const run = async () => {
      let failureCount = 0;
      while (!controller.signal.aborted) {
        await waitUntilOnline(controller.signal);
        if (controller.signal.aborted) break;

        let readyAt = 0;
        try {
          await streamWhatsAppEvents((event) => {
            if (event.type === "stream.ready" && readyAt === 0) readyAt = Date.now();
            handleEvent(event);
          }, controller.signal);
        } catch {
          if (controller.signal.aborted) break;
        }

        const stableConnection = readyAt > 0 && Date.now() - readyAt >= STABLE_STREAM_MS;
        if (stableConnection) failureCount = 0;
        const delay = BACKOFF_MS[Math.min(failureCount, BACKOFF_MS.length - 1)];
        failureCount = Math.min(failureCount + 1, BACKOFF_MS.length - 1);
        await waitForDelay(delay, controller.signal);
      }
    };

    void run();

    return () => {
      controller.abort();
      for (const timer of Object.values(timers)) {
        if (timer !== undefined) window.clearTimeout(timer);
      }
    };
  }, [enabled]);
}