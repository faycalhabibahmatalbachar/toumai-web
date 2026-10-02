import { API_BASE } from "./config";
import { authHeaders, ensureFreshSession, refreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  detail?: unknown;
}

function enrollmentCode(body: ApiEnvelope<unknown>): string | null {
  const detail = body.detail;
  if (typeof detail === "object" && detail !== null) {
    const code = (detail as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  if (typeof body.data === "object" && body.data !== null) {
    const code = (body.data as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

function safeCurrentPath(): string {
  if (typeof window === "undefined") return "/chat";
  const current = `${window.location.pathname}${window.location.search}`;
  if (!current.startsWith("/") || current.startsWith("//")) return "/chat";
  if (current.startsWith("/verify-whatsapp")) return "/chat";
  return current;
}

/**
 * Un 428 WA-AUTH n'est pas une panne : le mot de passe est valide, mais le
 * compte doit terminer son enrôlement WhatsApp. Le serveur reste la source de
 * vérité ; ce redirect ne remplace jamais le gate backend.
 */
async function redirectEnrollmentIfRequired(res: Response): Promise<boolean> {
  if (res.status !== 428 || typeof window === "undefined") return false;
  let body: ApiEnvelope<unknown> = { success: false };
  try {
    body = (await res.clone().json()) as ApiEnvelope<unknown>;
  } catch {
    return false;
  }
  if (enrollmentCode(body) !== "WHATSAPP_ENROLLMENT_REQUIRED") return false;
  if (window.location.pathname.startsWith("/verify-whatsapp")) return true;
  const next = safeCurrentPath();
  window.location.assign(`/verify-whatsapp?next=${encodeURIComponent(next)}`);
  return true;
}

/**
 * LE SEUL CHEMIN VERS UNE ROUTE AUTHENTIFIÉE.
 *
 * Dans l'ordre :
 *   1. renouvellement anticipé du jeton ;
 *   2. une seule reprise après 401 ;
 *   3. redirection vers l'enrôlement sur le 428 WA-AUTH explicite ;
 *   4. déconnexion uniquement quand le serveur refuse vraiment le refresh.
 */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureFreshSession();

  const send = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    });

  let res = await send();
  if (res.status !== 401) {
    await redirectEnrollmentIfRequired(res);
    return res;
  }

  const outcome = await refreshSession();
  if (outcome.status === "ok") {
    res = await send();
    if (res.status !== 401) {
      await redirectEnrollmentIfRequired(res);
      return res;
    }
  }
  if (outcome.status === "unavailable") {
    throw new HttpError(503);
  }
  handleUnauthorized();
  return res;
}

/** Variante JSON : ajoute l'en-tête et déballe l'enveloppe applicative. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
    const message =
      body.message ??
      (typeof body.detail === "object" && body.detail !== null
        ? (body.detail as { message?: string }).message
        : undefined);
    throw new HttpError(res.ok ? 400 : res.status, message, body.detail);
  }
  return body.data as T;
}

/** Même chose, mais le corps part tel quel (FormData) : pas de Content-Type
 * imposé, sinon la limite multipart générée par le navigateur est perdue. */
export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await authFetch(path, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
    throw new HttpError(res.ok ? 400 : res.status, body.message, body.detail);
  }
  return body.data as T;
}

export const http = {
  get: <T>(path: string) => call<T>(path),
  put: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  post: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    call<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => call<T>(path, { method: "DELETE" }),
};
