import { API_BASE } from "./config";
import { authHeaders, ensureFreshSession, refreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * LE SEUL CHEMIN VERS UNE ROUTE AUTHENTIFIÉE.
 *
 * Avant, chaque module refaisait son `fetch` — et trois d'entre eux
 * (chat-api, documents-api, voice-api) déconnectaient au PREMIER 401 sans
 * jamais tenter le renouvellement. Le jeton d'accès durant trente minutes,
 * il suffisait de laisser un onglet ouvert une demi-heure : le premier
 * chargement de l'historique renvoyait la personne sur « votre session a
 * expiré ».
 *
 * Ici, dans l'ordre :
 *   1. on renouvelle EN AVANCE si le jeton est sur le point d'expirer ;
 *   2. sur 401, on renouvelle puis on REJOUE la requête une fois ;
 *   3. on ne déconnecte que si le serveur a explicitement refusé le
 *      renouvellement. Une panne réseau ou un serveur qui redémarre laissent
 *      la session en place — elle repartira toute seule.
 */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureFreshSession();

  const send = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    });

  let res = await send();
  if (res.status !== 401) return res;

  const outcome = await refreshSession();
  if (outcome.status === "ok") {
    res = await send();
    if (res.status !== 401) return res;
  }
  if (outcome.status === "unavailable") {
    // Le serveur n'a rien refusé : il n'a pas répondu. On garde la session et
    // on remonte une erreur passagère, que l'appelant affichera comme telle.
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
    // On remonte le statut : c'est `describeError` qui choisit la phrase vue
    // par l'utilisateur, pas cette couche.
    throw new HttpError(res.ok ? 400 : res.status, body.message);
  }
  return body.data as T;
}

/** Même chose, mais le corps part tel quel (FormData) : pas de Content-Type
 * imposé, sinon la limite multipart générée par le navigateur est perdue. */
export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await authFetch(path, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || body.success === false) {
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
