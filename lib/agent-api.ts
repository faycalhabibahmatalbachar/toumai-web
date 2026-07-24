import { http } from "./http";

export interface BrowserStep {
  index: number;
  thought: string;
  action: string;
  detail: string;
  result: string;
}

export type BrowserTaskStatus =
  | "pending"
  | "running"
  | "needs_confirmation"
  | "done"
  | "error"
  | "cancelled";

export interface BrowserPendingAction {
  type: "question" | "action";
  question?: string;
  [key: string]: unknown;
}

export interface BrowserSource {
  url: string;
  title: string;
}

export interface BrowserTask {
  id: string;
  goal: string;
  status: BrowserTaskStatus;
  steps: BrowserStep[];
  answer: string;
  error: string;
  current_url: string;
  pending_action: BrowserPendingAction | null;
  sources?: BrowserSource[];
  images?: string[];
}

export function getAgentAvailability(): Promise<{ available: boolean }> {
  return http.get("/browser/status");
}

export function startTask(goal: string, startUrl?: string): Promise<BrowserTask> {
  return http.post("/browser/tasks", { goal, start_url: startUrl });
}

export function getTask(taskId: string): Promise<BrowserTask> {
  return http.get(`/browser/tasks/${taskId}`);
}

export function confirmTask(taskId: string, approve: boolean): Promise<void> {
  return http.post(`/browser/tasks/${taskId}/confirm`, { approve });
}

export function cancelTask(taskId: string): Promise<void> {
  return http.post(`/browser/tasks/${taskId}/cancel`);
}
