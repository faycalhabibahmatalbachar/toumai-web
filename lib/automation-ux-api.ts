import { authFetch, http } from "./http";
import type { Automation, AutomationApproval } from "./automations-api";

const BASE = "/automations/v2";
const enc = encodeURIComponent;

export interface AutomationInbox {
  items: Automation[];
  approvals: AutomationApproval[];
  counts: Record<"attention" | "upcoming" | "paused" | "failed" | "done", number>;
  generated_at: string;
}

export interface AutomationPreviewStep {
  id: string;
  name: string;
  skill: string;
  depends_on: string[];
  risk: string;
  requires_confirmation: boolean;
  sensitive: boolean;
}

export interface AutomationPreview {
  automation_id: string;
  version: number;
  name: string;
  status: string;
  trigger: Record<string, unknown>;
  next_run_at?: string | null;
  occurrences?: string[];
  steps: AutomationPreviewStep[];
  confirmation_steps: string[];
  will_execute: false;
  side_effect_executed: false;
  mode: "dry_run";
}

export interface AutomationVersion {
  version: number;
  schema_version: number;
  name: string;
  status: string;
  trigger: Record<string, unknown>;
  step_count: number;
  created_at?: string | null;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_kind: string;
  example: string;
}

export const getAutomationInbox = () => http.get<AutomationInbox>(`${BASE}/inbox`);
export const getAutomationPreview = (id: string) => http.get<AutomationPreview>(`${BASE}/${enc(id)}/preview`);
export const getAutomationVersions = (id: string) =>
  http.get<{ versions: AutomationVersion[] }>(`${BASE}/${enc(id)}/versions`).then((r) => r.versions ?? []);
export const rollbackAutomation = (id: string, version: number) =>
  http.post<Automation & { restored_version: number; new_version: number }>(`${BASE}/${enc(id)}/rollback`, { version });
export const getAutomationTemplates = (locale = "fr-TD") =>
  http.get<{ locale: string; templates: AutomationTemplate[] }>(`${BASE}/templates?locale=${enc(locale)}`);
export const getAutomationCalendar = (start: string, end: string) =>
  http.get<{ start: string; end: string; events: Automation[] }>(`${BASE}/calendar?start=${enc(start)}&end=${enc(end)}`);

/** Authenticated SSE reader. EventSource cannot attach Toumaï's Bearer token. */
export async function streamAutomationInbox(
  onSnapshot: (snapshot: AutomationInbox) => void,
  onError?: (message: string) => void,
  signal?: AbortSignal,
) {
  const res = await authFetch(`${BASE}/stream`, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`automation stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "message";
  let data: string[] = [];

  const dispatch = () => {
    const payload = data.join("\n");
    if (event === "automation_snapshot" && payload) {
      try {
        onSnapshot(JSON.parse(payload) as AutomationInbox);
      } catch {
        onError?.("Synchronisation des automatisations illisible.");
      }
    } else if (event === "automation_error") {
      try {
        const parsed = JSON.parse(payload) as { message?: string };
        onError?.(parsed.message || "Synchronisation temporairement indisponible.");
      } catch {
        onError?.("Synchronisation temporairement indisponible.");
      }
    }
    event = "message";
    data = [];
  };

  while (!signal?.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n");
    while (cut >= 0) {
      const line = buffer.slice(0, cut).replace(/\r$/, "");
      buffer = buffer.slice(cut + 1);
      if (!line) dispatch();
      else if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      cut = buffer.indexOf("\n");
    }
  }
}
