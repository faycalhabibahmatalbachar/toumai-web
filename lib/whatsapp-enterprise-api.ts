import { http } from "./http";

export type WaAutopilotMode = "off" | "suggest" | "auto";

export interface WaAutopilotSettings {
  enabled: boolean;
  mode: WaAutopilotMode;
  scope?: "all" | "whitelist";
  whitelist?: string[];
  blacklist?: string[];
  allow_groups?: boolean;
  persona?: string;
  signature?: string;
  voice_reply?: boolean;
  voice?: string;
  story_policy?: "all" | "whitelist" | "blacklist" | "none";
  story_whitelist?: string[];
  story_blacklist?: string[];
  away_mode?: boolean;
  away_message?: string;
  reply_language?: string;
}

export interface WaAutopilotKpi {
  value: number | null;
  delta: number | null;
  delta_unit: "pct" | "pts";
  previous: number | null;
}

export interface WaAutopilotAnalytics {
  period_days: number;
  responses_today: number;
  responses_total: number;
  active_conversations: number;
  avg_response_time_ms: number | null;
  total_tokens: number;
  safety_blocks: number;
  kpis: {
    messages: WaAutopilotKpi;
    conversations: WaAutopilotKpi;
    success_rate: WaAutopilotKpi;
    avg_response_ms: WaAutopilotKpi;
    escalations: WaAutopilotKpi;
  };
  by_mode: Record<string, number>;
  by_type: Array<{ type: string; count: number; pct: number }>;
  by_language: Array<{ code: string; label: string; count: number; pct: number }>;
  daily_trend: Array<{ date: string; count: number }>;
  not_instrumented: string[];
}

export function getWaAutopilot(): Promise<WaAutopilotSettings> {
  return http.get("/whatsapp/autopilot");
}

export function updateWaAutopilot(
  patch: Partial<WaAutopilotSettings>,
): Promise<WaAutopilotSettings & { ok?: boolean }> {
  return http.post("/whatsapp/autopilot", patch);
}

export function getWaAutopilotAnalytics(days = 7): Promise<WaAutopilotAnalytics> {
  return http.get(`/whatsapp/autopilot/analytics?days=${encodeURIComponent(days)}`);
}
