import { API_BASE } from "./config";
import { authHeaders } from "./api";
import { handleUnauthorized } from "./session-guard";

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  model_used?: string;
  pinned?: boolean;
}

export interface HistoryMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: { image_urls?: string[]; sources?: unknown[] } | null;
  created_at: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { ...authHeaders() } });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return body.data as T;
}

export async function listSessions(): Promise<ChatSession[]> {
  return get<ChatSession[]>("/chat/sessions");
}

export async function getHistory(sessionId: string): Promise<HistoryMessage[]> {
  const data = await get<{ messages: HistoryMessage[] }>(
    `/chat/history/${sessionId}?page=1&page_size=100`,
  );
  return data.messages;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}

async function updateSession(
  sessionId: string,
  patch: { title?: string; pinned?: boolean },
): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/session/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Erreur ${res.status}`);
  }
}

export function renameSession(sessionId: string, title: string): Promise<void> {
  return updateSession(sessionId, { title });
}

export function setSessionPinned(sessionId: string, pinned: boolean): Promise<void> {
  return updateSession(sessionId, { pinned });
}

/** Supprime un message et tout ce qui le suit dans sa session — utilisé
 * avant de renvoyer un message utilisateur édité, pour que le modèle ne
 * voie pas l'ancienne branche de la conversation. */
export async function deleteMessageAndAfter(messageId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/message/${messageId}/after`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}

export async function sendFeedback(messageId: string, rating: "up" | "down"): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ message_id: messageId, rating }),
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}

/** Exécute réellement une action sensible (WhatsApp, mail…) après que
 * l'utilisateur a cliqué « Confirmer » sur la carte de confirmation.
 * Le backend renvoie toujours HTTP 200 — succès/échec est dans le body. */
export async function confirmToolAction(
  tool: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/chat/tool/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ tool, args }),
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Erreur ${res.status}`);
  return { ok: body.success !== false, message: body.message || "" };
}

// ── Partage de conversation ─────────────────────────────────────────────────

export interface ShareResult {
  token: string;
  visibility: "unlisted" | "public";
  anonymous: boolean;
}

export interface SharedConversation {
  title: string;
  created_at?: string;
  owner_name?: string | null;
  messages: { role: "user" | "assistant"; content: string; image_urls?: string[] }[];
}

/** Active le partage d'une conversation — renvoie le token du lien public. */
export async function shareSession(
  sessionId: string,
  opts: { visibility: "unlisted" | "public"; anonymous: boolean },
): Promise<ShareResult> {
  const res = await fetch(`${API_BASE}/chat/session/${sessionId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(opts),
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) throw new Error(body.message || `Erreur ${res.status}`);
  return body.data as ShareResult;
}

/** Révoque le partage — le lien cesse immédiatement de fonctionner. */
export async function unshareSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chat/session/${sessionId}/share`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 401) handleUnauthorized();
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
}

/** Lecture publique d'une conversation partagée (aucune authentification). */
export async function getSharedConversation(token: string): Promise<SharedConversation> {
  const res = await fetch(`${API_BASE}/chat/shared/${encodeURIComponent(token)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || "Conversation introuvable ou partage révoqué.");
  }
  return body.data as SharedConversation;
}

/** Regroupe les sessions par période, comme ChatGPT/Claude.ai — les
 * conversations épinglées forment leur propre groupe en tête de liste. */
export function groupSessionsByDate(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const now = Date.now();
  const day = 86_400_000;
  const groups: Record<string, ChatSession[]> = {
    "Épinglées": [],
    "Aujourd'hui": [],
    "7 derniers jours": [],
    "30 derniers jours": [],
    "Plus ancien": [],
  };
  for (const s of sessions) {
    if (s.pinned) {
      groups["Épinglées"].push(s);
      continue;
    }
    const t = new Date(s.created_at).getTime();
    const diff = now - t;
    if (diff < day) groups["Aujourd'hui"].push(s);
    else if (diff < 7 * day) groups["7 derniers jours"].push(s);
    else if (diff < 30 * day) groups["30 derniers jours"].push(s);
    else groups["Plus ancien"].push(s);
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
