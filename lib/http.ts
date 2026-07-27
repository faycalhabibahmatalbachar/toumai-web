import { API_BASE } from "./config";
import { authHeaders, tryRefreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) {
    // Token expiré : on tente un refresh silencieux puis on rejoue la
    // requête une fois. Seul un refresh impossible déconnecte réellement.
    const renewed = await tryRefreshSession();
    if (renewed) {
      res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...(init?.headers ?? {}),
        },
      });
    }
    if (res.status === 401) handleUnauthorized();
  }
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
    // On remonte le statut : c'est `describeError` qui choisit la phrase vue
    // par l'utilisateur, pas cette couche.
    throw new HttpError(res.ok ? 400 : res.status, body.message);
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
