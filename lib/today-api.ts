import { http } from "./http";

export type TodayPriority = "critical" | "urgent" | "normal" | "information";
export type TodayCategory = "problem" | "todo" | "waiting" | "scheduled" | "information";

export interface TodayItem {
  id: string;
  dedupe_key?: string | null;
  source_type: string;
  source_id: string;
  category: TodayCategory | string;
  priority: TodayPriority | string;
  priority_reasons?: string[];
  title: string;
  summary?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  due_at?: string | null;
  action_required?: boolean;
  available_actions?: string[];
  deep_link?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface TodayTimeline {
  overdue?: TodayItem[];
  now?: TodayItem[];
  later_today?: TodayItem[];
  evening?: TodayItem[];
  unscheduled?: TodayItem[];
  [key: string]: TodayItem[] | undefined;
}

export interface TodayBrief {
  text: string;
  fact_ids: string[];
  generated_by: string;
  provider?: string | null;
  model?: string | null;
  grounding_valid: boolean;
  total_attention_items: number;
}

export interface TodayResponse {
  items: TodayItem[];
  counts?: Record<string, number>;
  stats?: Record<string, unknown>;
  timeline?: TodayTimeline;
  tomorrow_preview?: TodayItem[] | Record<string, unknown> | null;
  integrations?: Record<string, unknown>;
  sections?: Record<string, unknown>;
}

export function getToday(): Promise<TodayResponse> {
  return http.get<TodayResponse>("/today");
}

export function getTodayBrief(): Promise<TodayBrief> {
  return http.get<TodayBrief>("/today/brief");
}
