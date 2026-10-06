/**
 * Static contract gate for WhatsApp Overview realtime.
 * Runtime behavior is additionally covered by Control Center E2E + Visual Gate.
 */
import { readFileSync } from "node:fs";

const client = readFileSync("lib/whatsapp-realtime.ts", "utf8");
const hook = readFileSync("hooks/useWhatsAppRealtime.ts", "utf8");
const page = readFileSync("app/whatsapp/page.tsx", "utf8");

function requireContract(condition, message) {
  if (!condition) {
    console.error(`FAIL whatsapp-overview-realtime: ${message}`);
    process.exit(1);
  }
}

requireContract(
  client.includes('authFetch("/whatsapp/events"'),
  "the SSE stream must use the shared authenticated fetch path",
);
requireContract(
  client.includes('Accept: "text/event-stream"'),
  "the client must explicitly request text/event-stream",
);
requireContract(
  client.includes('contentType.includes("text/event-stream")'),
  "the client must reject non-SSE proxy responses",
);
requireContract(
  !client.includes("new EventSource(") && !hook.includes("new EventSource("),
  "native EventSource cannot be used because it cannot attach Authorization",
);
requireContract(
  client.includes("/\\r?\\n\\r?\\n/g"),
  "the SSE parser must accept LF and CRLF frame separators",
);
requireContract(
  hook.includes("BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 15_000]"),
  "bounded reconnect backoff must remain enabled",
);
requireContract(
  hook.includes("waitUntilOnline"),
  "reconnect attempts must not spin while the browser is offline",
);
requireContract(
  !hook.includes("event.version < lastVersion") &&
    !hook.includes("event.version <= lastVersion"),
  "unique invalidations must never be discarded by timestamp-derived version",
);
requireContract(
  hook.includes("seenEventIds.has(event.id)"),
  "duplicate realtime frames must be deduplicated by stable event id",
);
requireContract(
  hook.includes("STABLE_STREAM_MS = 10_000") && hook.includes("stableConnection"),
  "short-lived SSE connections must not reset reconnect backoff",
);
requireContract(
  hook.includes('schedule("overview", 1_000'),
  "Overview aggregate refreshes must remain debounced",
);
requireContract(
  hook.includes('schedule("conversations", 250'),
  "conversation invalidations must remain targeted",
);
requireContract(
  hook.includes('schedule("automations", 250'),
  "automation invalidations must remain targeted",
);
requireContract(
  hook.includes('schedule("connection", 250'),
  "connection invalidations must remain targeted",
);
requireContract(
  page.includes("useWhatsAppRealtimeInvalidation({"),
  "WhatsApp Overview must subscribe to realtime invalidations",
);
requireContract(
  page.includes("refreshIntervalMs: 30_000"),
  "polling fallback must remain active alongside SSE",
);

console.log("whatsapp-overview-realtime: PASS");
