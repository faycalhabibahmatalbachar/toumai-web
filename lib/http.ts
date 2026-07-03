import { API_BASE } from "./config";
import { authHeaders } from "./api";
import { handleUnauthorized } from "./session-guard";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) handleUnauthorized();
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return body.data as T;
}

export const http = {
  get: <T>(path: string) => call<T>(path),
  put: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  post: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => call<T>(path, { method: "DELETE" }),
};
