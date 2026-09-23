import { authFetch, http } from "./http";

export type ToumaiCodeRole =
  | "research"
  | "repo_explorer"
  | "architecture"
  | "database"
  | "backend"
  | "frontend"
  | "test"
  | "debug"
  | "security"
  | "review"
  | "release";

export type ToumaiCodeRunStatus =
  | "queued"
  | "waiting"
  | "running"
  | "waiting_for_approval"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "skipped"
  | "ambiguous"
  | "timed_out";

export interface ToumaiCodeRepositoryTarget {
  full_name: string;
  base_ref?: string;
}

export interface ToumaiCodeBudget {
  max_input_tokens?: number;
  max_output_tokens?: number;
  max_cost_usd?: number;
  max_seconds?: number;
  max_parallel_tasks?: number;
  max_attempts?: number;
}

export interface ToumaiCodeProjectRequest {
  specification: string;
  repositories: ToumaiCodeRepositoryTarget[];
  client_request_id: string;
  budget?: ToumaiCodeBudget;
  locale?: string;
  /** A release may prepare deployment, but a real deployment still requires backend approval. */
  deploy_requested?: boolean;
}

export interface ToumaiCodeProjectCreated {
  project_id: string;
  run_id: string;
  status: ToumaiCodeRunStatus;
  client_request_id: string;
  durable: true;
  stream: string;
}

export interface ToumaiCodeUsage {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

export interface ToumaiCodeRun {
  run_id: string;
  project_id: string;
  status: ToumaiCodeRunStatus;
  attempt?: number | null;
  usage: ToumaiCodeUsage;
  deadline_at?: string | null;
  error?: string | null;
  error_category?: string | null;
  output?: Record<string, unknown> | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  updated_at?: string | null;
}

export interface ToumaiCodeEvent {
  seq: number;
  run_id: string;
  event_type: string;
  task_id?: ToumaiCodeRole | string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ToumaiCodeControlResult {
  run_id: string;
  status: ToumaiCodeRunStatus;
  control_requested?: "pause" | "cancel" | null;
}

const BASE = "/toumai-code";
const enc = encodeURIComponent;

export const createToumaiCodeProject = (body: ToumaiCodeProjectRequest) =>
  http.post<ToumaiCodeProjectCreated>(`${BASE}/projects`, body);

export const getToumaiCodeRun = (runId: string) =>
  http.get<ToumaiCodeRun>(`${BASE}/runs/${enc(runId)}`);

export const pauseToumaiCodeRun = (runId: string) =>
  http.post<ToumaiCodeControlResult>(`${BASE}/runs/${enc(runId)}/pause`);

export const resumeToumaiCodeRun = (runId: string) =>
  http.post<ToumaiCodeControlResult>(`${BASE}/runs/${enc(runId)}/resume`);

export const cancelToumaiCodeRun = (runId: string) =>
  http.post<ToumaiCodeControlResult>(`${BASE}/runs/${enc(runId)}/cancel`);

export const listToumaiCodeEvents = (runId: string, afterSeq = 0) =>
  http
    .get<{ events: ToumaiCodeEvent[] }>(
      `${BASE}/runs/${enc(runId)}/events?after_seq=${Math.max(0, afterSeq)}`,
    )
    .then((data) => data.events ?? []);

export interface ToumaiCodeStreamHandlers {
  onEvent: (event: ToumaiCodeEvent) => void;
  onOpen?: () => void;
}

/**
 * Authenticated SSE reader.
 *
 * We intentionally do not use EventSource: authenticated Toumaï requests use
 * bearer headers. Closing this reader only closes the projection; the durable
 * backend worker continues from database state.
 */
export async function streamToumaiCodeEvents(
  runId: string,
  handlers: ToumaiCodeStreamHandlers,
  options: { afterSeq?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const after = Math.max(0, options.afterSeq ?? 0);
  const res = await authFetch(`${BASE}/runs/${enc(runId)}/events/stream`, {
    method: "GET",
    signal: options.signal,
    headers: after > 0 ? { "Last-Event-ID": String(after) } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Toumaï Code SSE HTTP ${res.status}`);
  }
  if (!res.body) {
    throw new Error("Toumaï Code SSE sans flux de réponse");
  }
  handlers.onOpen?.();

  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        if (!frame || frame.startsWith(":")) continue;
        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;

        const parsed = JSON.parse(data) as ToumaiCodeEvent;
        if (typeof parsed.seq !== "number" || typeof parsed.event_type !== "string") {
          throw new Error("Événement Toumaï Code SSE invalide");
        }
        handlers.onEvent(parsed);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
