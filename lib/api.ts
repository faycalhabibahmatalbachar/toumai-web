import { API_BASE } from "./config";

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  is_guest?: boolean;
}

const STORAGE_KEY = "chadgpt_web_session_v1";

export function loadSession(): TokenPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TokenPayload) : null;
  } catch {
    return null;
  }
}

export function saveSession(payload: TokenPayload): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiEnvelope<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return body;
}

export async function guestLogin(): Promise<TokenPayload> {
  const res = await request<TokenPayload>("/auth/guest", { method: "POST" });
  if (!res.data) throw new Error("Réponse invalide du serveur");
  // Le backend n'inclut pas toujours is_guest dans sa réponse — sans ce flag,
  // toute l'UI traitait l'invité comme un compte réel (nom « guest-<uuid> »
  // affiché, redirection /login?expired au lieu d'une reconnexion invitée…).
  const payload: TokenPayload = { ...res.data, is_guest: true };
  saveSession(payload);
  return payload;
}

export async function login(email: string, password: string): Promise<TokenPayload> {
  const res = await request<TokenPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.data) throw new Error("Réponse invalide du serveur");
  const payload: TokenPayload = { ...res.data, is_guest: false };
  saveSession(payload);
  return payload;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await request<null>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(supabaseAccessToken: string, newPassword: string): Promise<void> {
  await request<null>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ supabase_access_token: supabaseAccessToken, new_password: newPassword }),
  });
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<TokenPayload | null> {
  const res = await request<TokenPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  if (res.data) {
    const payload: TokenPayload = { ...res.data, is_guest: false };
    saveSession(payload);
    return payload;
  }
  // Confirmation e-mail requise : pas de session immédiate.
  return null;
}

export async function loginWithGoogle(idToken: string): Promise<TokenPayload> {
  const res = await request<TokenPayload>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!res.data) throw new Error("Réponse invalide du serveur");
  const payload: TokenPayload = { ...res.data, is_guest: false };
  saveSession(payload);
  return payload;
}

/** Client fetch authentifié — ajoute le Bearer token de la session courante. */
export function authHeaders(): HeadersInit {
  const session = loadSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Rafraîchissement du JWT ──────────────────────────────────────────────
// Le token d'accès expire (expires_in) mais le backend expose /auth/refresh.
// Sans ce flux, tout 401 effaçait la session et l'utilisateur connecté
// retombait en "Session invité" à la première navigation après expiration.
let refreshInFlight: Promise<TokenPayload | null> | null = null;

/** Tente d'échanger le refresh token contre une nouvelle session.
 * Mutualisé : plusieurs requêtes 401 simultanées ne déclenchent qu'un seul
 * appel réseau. Renvoie la nouvelle session, ou null si le refresh échoue
 * (token révoqué/expiré) — auquel cas l'appelant peut déconnecter. */
export function tryRefreshSession(): Promise<TokenPayload | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = loadSession();
  if (!current?.refresh_token) return Promise.resolve(null);

  refreshInFlight = request<TokenPayload>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: current.refresh_token }),
  })
    .then((res) => {
      if (!res.data) return null;
      // /auth/refresh ne renvoie pas is_guest — on préserve le flag de la
      // session courante pour ne pas « changer d'identité » à chaque refresh.
      const payload: TokenPayload = { ...res.data, is_guest: current.is_guest ?? false };
      saveSession(payload);
      return payload;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
