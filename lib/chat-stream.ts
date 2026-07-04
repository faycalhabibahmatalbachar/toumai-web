import { API_BASE } from "./config";
import { authHeaders } from "./api";
import { handleUnauthorized } from "./session-guard";

export interface StreamMetadata {
  image_urls?: string[];
  sources?: unknown[];
  [key: string]: unknown;
}

export interface StreamEvent {
  chunk?: string;
  metadata?: StreamMetadata;
  done?: boolean;
  session_id?: string;
  message_id?: string;
  user_message_id?: string;
  error?: string;
}

export interface ChatStreamParams {
  message: string;
  sessionId: string | null;
  modelPreference: string;
  webSearch?: boolean;
  documentId?: string;
}

/**
 * Ouvre le flux SSE `/chat/stream` et invoque `onEvent` pour chaque événement.
 * Utilise fetch + ReadableStream (EventSource ne supporte pas POST + headers
 * Authorization personnalisés) — même principe que le client mobile web.
 */
export async function streamChat(
  params: ChatStreamParams,
  onEvent: (evt: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify({
      message: params.message,
      session_id: params.sessionId,
      language: "auto",
      model_preference: params.modelPreference,
      web_search: Boolean(params.webSearch),
      document_id: params.documentId || undefined,
    }),
  });

  if (res.status === 429) {
    throw new Error("Trop de messages envoyés d'un coup. Patientez quelques secondes avant de réessayer.");
  }
  if (res.status === 401) handleUnauthorized();
  if (!res.ok || !res.body) {
    throw new Error(`Le serveur a répondu ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = pending.indexOf("\n\n")) >= 0) {
      const block = pending.slice(0, sep);
      pending = pending.slice(sep + 2);
      for (const line of block.split("\n")) {
        const t = line.trimEnd();
        if (!t.startsWith("data:")) continue;
        const jsonStr = t.slice(5).trim();
        if (!jsonStr) continue;
        try {
          onEvent(JSON.parse(jsonStr) as StreamEvent);
        } catch {
          // fragment JSON incomplet — ignoré
        }
      }
    }
  }
}
