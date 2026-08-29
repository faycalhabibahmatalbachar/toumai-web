import { API_BASE } from "./config";

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  is_guest?: boolean;
  /** Instant d'expiration absolu, posé à l'enregistrement. Sans lui, on ne
   * peut que RÉAGIR à un 401 ; avec lui, on renouvelle AVANT de tomber. */
  expires_at?: number;
}

/** Clé de la session en localStorage — exportée pour que les autres onglets
 * puissent la surveiller (`storage` event) et adopter une session renouvelée. */
export const SESSION_STORAGE_KEY = "chadgpt_web_session_v1";
const STORAGE_KEY = SESSION_STORAGE_KEY;

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
  const withExpiry: TokenPayload = {
    ...payload,
    expires_at:
      payload.expires_at ??
      (payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withExpiry));
}

/** Marge avant expiration : on renouvelle le jeton pendant qu'il est ENCORE
 * valide. Renouveler après coup, c'est laisser passer une requête en 401 —
 * et un 401 de trop déconnecte l'utilisateur. */
const RENEW_MARGIN_MS = 120_000;

/** Le jeton d'accès est-il encore bon pour au moins deux minutes ? */
export function sessionIsFresh(s: TokenPayload | null = loadSession()): boolean {
  if (!s?.access_token) return false;
  // Sessions d'avant l'ajout de `expires_at` : on les considère fraîches et
  // c'est le 401 qui déclenchera le renouvellement, comme avant.
  if (!s.expires_at) return true;
  return s.expires_at - Date.now() > RENEW_MARGIN_MS;
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

export async function login(
  email: string,
  password: string,
  turnstileToken?: string | null,
): Promise<TokenPayload> {
  const res = await request<TokenPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, turnstile_token: turnstileToken }),
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
  turnstileToken?: string | null,
): Promise<TokenPayload | null> {
  const res = await request<TokenPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, turnstile_token: turnstileToken }),
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

// ═══════════════════════════════════════════════════════════════════════════
// RENOUVELLEMENT DE SESSION — la connexion doit tenir, point.
//
// Trois choses cassaient la session, et il fallait les traiter toutes les
// trois : (1) plusieurs modules déconnectaient au premier 401 sans jamais
// tenter le renouvellement ; (2) le refresh token TOURNE à chaque usage côté
// serveur, donc deux onglets qui renouvellent en même temps s'invalident
// mutuellement ; (3) un renouvellement raté pour cause de réseau ou de
// serveur qui redémarre était traité comme un jeton révoqué, et déconnectait.
// ═══════════════════════════════════════════════════════════════════════════

/** Issue d'un renouvellement. La distinction porte tout : « invalide » se
 * déconnecte, « indisponible » ne se déconnecte JAMAIS. */
export type RefreshOutcome =
  | { status: "ok"; session: TokenPayload }
  | { status: "invalid" }
  | { status: "unavailable" };

const LOCK_KEY = "chadgpt_web_refresh_lock";
/** Un renouvellement dure au plus quelques secondes ; au-delà, le verrou d'un
 * onglet fermé en plein vol ne doit pas bloquer les autres indéfiniment. */
const LOCK_TTL_MS = 12_000;

let refreshInFlight: Promise<RefreshOutcome> | null = null;

function acquireLock(): boolean {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw && Date.now() - Number(raw) < LOCK_TTL_MS) return false;
    localStorage.setItem(LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    return true; // pas de localStorage : on avance sans coordination
  }
}

function releaseLock(): void {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Attend qu'un autre onglet publie une session renouvelée. Le jeton tournant,
 * relancer un renouvellement pendant qu'un autre onglet le fait garantit
 * qu'un des deux se retrouve avec un jeton déjà supprimé côté serveur. */
async function waitForOtherTab(previousRefreshToken: string): Promise<TokenPayload | null> {
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    const s = loadSession();
    if (!s) return null;
    if (s.refresh_token !== previousRefreshToken) return s;
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw || Date.now() - Number(raw) >= LOCK_TTL_MS) return null; // verrou périmé
    } catch {
      return null;
    }
  }
  return null;
}

/** Un seul appel réseau, avec réessais sur les pannes passagères.
 *
 * Seule une réponse d'authentification explicite (401/403) signifie que le
 * jeton est mort. Un 5xx, un 429 ou une coupure réseau — Northflank qui
 * redémarre, un tunnel qui saute — laissent la session intacte. */
async function refreshOverNetwork(refreshToken: string): Promise<RefreshOutcome> {
  let lastWasNetwork = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(400 * 2 ** (attempt - 1));
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      lastWasNetwork = true;
      continue;
    }
    if (res.status === 401 || res.status === 403) return { status: "invalid" };
    if (!res.ok) {
      lastWasNetwork = true;
      continue;
    }
    const body = (await res.json().catch(() => ({}))) as ApiEnvelope<TokenPayload>;
    if (body.success === false || !body.data) {
      // L'enveloppe applicative porte parfois le refus avec un HTTP 200.
      return { status: "invalid" };
    }
    return { status: "ok", session: body.data };
  }
  return lastWasNetwork ? { status: "unavailable" } : { status: "invalid" };
}

async function doRefresh(): Promise<RefreshOutcome> {
  const before = loadSession();
  if (!before?.refresh_token) return { status: "invalid" };

  // Un autre onglet a pu renouveler pendant qu'on attendait notre tour.
  if (sessionIsFresh(before)) return { status: "ok", session: before };

  if (!acquireLock()) {
    const fromOtherTab = await waitForOtherTab(before.refresh_token);
    if (fromOtherTab) return { status: "ok", session: fromOtherTab };
    if (!acquireLock()) return { status: "unavailable" };
  }
  try {
    // Relecture après acquisition du verrou : la session a pu changer entre
    // la première lecture et maintenant.
    const current = loadSession();
    if (!current?.refresh_token) return { status: "invalid" };
    if (current.refresh_token !== before.refresh_token && sessionIsFresh(current)) {
      return { status: "ok", session: current };
    }
    const outcome = await refreshOverNetwork(current.refresh_token);
    if (outcome.status === "ok") {
      // /auth/refresh ne renvoie pas is_guest — on préserve le drapeau de la
      // session courante pour ne pas « changer d'identité » à chaque renouveau.
      const payload: TokenPayload = {
        ...outcome.session,
        is_guest: current.is_guest ?? false,
      };
      saveSession(payload);
      return { status: "ok", session: payload };
    }
    return outcome;
  } finally {
    releaseLock();
  }
}

/** Renouvelle la session. Mutualisé dans l'onglet ET coordonné entre onglets :
 * plusieurs requêtes en 401 ne déclenchent qu'une seule rotation de jeton. */
export function refreshSession(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Ancien contrat, conservé pour les appelants qui ne veulent que la session.
 * `null` couvre AUSSI l'indisponibilité passagère : ne jamais déconnecter sur
 * ce seul retour — passer par `refreshSession()` pour trancher. */
export async function tryRefreshSession(): Promise<TokenPayload | null> {
  const outcome = await refreshSession();
  return outcome.status === "ok" ? outcome.session : null;
}

/** Renouvelle en avance si le jeton arrive à expiration. Appelé avant chaque
 * requête authentifiée : la requête part alors avec un jeton valide, au lieu
 * de partir, échouer en 401, et dépendre du rattrapage. */
export async function ensureFreshSession(): Promise<void> {
  const s = loadSession();
  if (!s?.refresh_token || sessionIsFresh(s)) return;
  await refreshSession();
}
