import { HttpError } from "./errors";
import { authFetch } from "./http";

export type WhatsAppRealtimeScope =
  | "overview"
  | "conversations"
  | "automations"
  | "connection";

export type WhatsAppRealtimeType =
  | "stream.ready"
  | "message.received"
  | "message.sent"
  | "conversation.updated"
  | "automation.updated"
  | "connection.updated";

export interface WhatsAppRealtimeEvent {
  id: string;
  type: WhatsAppRealtimeType;
  scopes: WhatsAppRealtimeScope[];
  occurredAt: string;
  version: number;
}

const EVENT_TYPES = new Set<WhatsAppRealtimeType>([
  "stream.ready",
  "message.received",
  "message.sent",
  "conversation.updated",
  "automation.updated",
  "connection.updated",
]);

const SCOPES = new Set<WhatsAppRealtimeScope>([
  "overview",
  "conversations",
  "automations",
  "connection",
]);

function isRealtimeEvent(value: unknown): value is WhatsAppRealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WhatsAppRealtimeEvent>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.type !== "string" ||
    !EVENT_TYPES.has(candidate.type as WhatsAppRealtimeType) ||
    typeof candidate.occurredAt !== "string" ||
    typeof candidate.version !== "number" ||
    !Number.isFinite(candidate.version) ||
    !Array.isArray(candidate.scopes)
  ) {
    return false;
  }
  return candidate.scopes.every(
    (scope) => typeof scope === "string" && SCOPES.has(scope as WhatsAppRealtimeScope),
  );
}

/** Parse one complete SSE block. Heartbeat comments intentionally return null. */
export function parseWhatsAppSseBlock(block: string): WhatsAppRealtimeEvent | null {
  const dataLines: string[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine.startsWith("data:")) continue;
    const value = rawLine.slice(5);
    dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
  }
  if (!dataLines.length) return null;

  try {
    const parsed = JSON.parse(dataLines.join("\n")) as unknown;
    return isRealtimeEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Opens the authenticated WhatsApp invalidation stream until it closes or is aborted. */
export async function streamWhatsAppEvents(
  onEvent: (event: WhatsAppRealtimeEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await authFetch("/whatsapp/events", {
    method: "GET",
    signal,
    headers: {
      Accept: "text/event-stream",
    },
  });

  if (!response.ok || !response.body) {
    throw new HttpError(response.ok ? 502 : response.status);
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("text/event-stream")) {
    throw new HttpError(502, "Le flux temps réel WhatsApp est invalide.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });

      let match: RegExpExecArray | null;
      const separator = /\r?\n\r?\n/g;
      while ((match = separator.exec(pending)) !== null) {
        const block = pending.slice(0, match.index);
        pending = pending.slice(match.index + match[0].length);
        separator.lastIndex = 0;
        const event = parseWhatsAppSseBlock(block);
        if (event) onEvent(event);
      }
    }

    pending += decoder.decode();
    if (pending.trim()) {
      const event = parseWhatsAppSseBlock(pending);
      if (event) onEvent(event);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Network may already be closed.
    }
  }
}