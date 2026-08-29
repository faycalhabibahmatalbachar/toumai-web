import { API_BASE } from "./config";
import { authHeaders, ensureFreshSession, refreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

/** Action sensible (WhatsApp, mail…) en attente de confirmation explicite —
 * émise par le backend dans les métadonnées du flux. Le frontend affiche une
 * carte Confirmer/Annuler puis appelle POST /chat/tool/confirm. */
export interface ToolConfirmation {
  type?: string;
  tool: string;
  args: Record<string, unknown>;
  text?: string;
}

/** Source web citée par une réponse ayant fait une recherche. */
export interface WebSource {
  title?: string;
  url: string;
}

/** Image réelle trouvée pendant une recherche web — jamais générée. */
export interface SearchImage {
  url: string;
  title?: string;
  source_url?: string;
}

export interface StreamMetadata {
  image_urls?: string[];
  sources?: WebSource[];
  search_images?: SearchImage[];
  tool_confirmation?: ToolConfirmation;
  /** Modèle qui a RÉELLEMENT produit la réponse. */
  actual_model?: string;
  /** Trace de raisonnement réellement produite par le modèle — absente si le
   * modèle ne raisonne pas. Jamais fabriquée côté client. */
  reasoning?: string;
  reasoning_effort?: string;
  /** Durée mesurée du raisonnement, en millisecondes. */
  reasoning_ms?: number;
  /** Présent uniquement si le modèle demandé n'était pas disponible et que la
   * cascade a rétrogradé. On le dit à l'utilisateur au lieu de le masquer. */
  model_notice?: string;
  /** Ce que Toumaï est en train de FAIRE avant de répondre — pour l'instant
   * `"web_search"`. Émis AVANT l'action, parce qu'une recherche prend plusieurs
   * secondes et qu'un écran muet pendant ce temps ressemble à une panne. */
  activity?: string;
  [key: string]: unknown;
}

export interface StreamEvent {
  chunk?: string;
  metadata?: StreamMetadata;
  done?: boolean;
  session_id?: string;
  message_id?: string;
  user_message_id?: string;
  error?: string;
}

/** Un tour passé, tel qu'il voyage dans la requête en discussion éphémère. */
export interface HistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatStreamParams {
  message: string;
  sessionId: string | null;
  modelPreference: string;
  /** Langue de réponse imposée par les préférences utilisateur ("fr", "en",
   * "ar"…) — "auto" laisse le backend détecter depuis le message. */
  language?: string;
  webSearch?: boolean;
  documentId?: string;
  /** DISCUSSION ÉPHÉMÈRE — le drapeau part à CHAQUE tour (il n'y a pas d'état
   * de session côté serveur). Le backend saute alors la création de
   * conversation, l'enregistrement des messages, le titre et l'extraction
   * mémoire ; `session_id` revient vide. */
  ephemeral?: boolean;
  /** Contexte d'un fil éphémère : sans identifiant de conversation, le serveur
   * n'a rien à relire et chaque message serait le premier. Borné à 20 tours
   * côté serveur. Ignoré hors mode éphémère. */
  history?: HistoryTurn[];
  /** Dernière image produite dans le fil éphémère, pour « retouche-la » — elle
   * n'est retrouvable nulle part côté serveur, justement. */
  lastImageUrl?: string;
}

/**
 * Ouvre le flux SSE `/chat/stream` et invoque `onEvent` pour chaque événement.
 * Utilise fetch + ReadableStream (EventSource ne supporte pas POST + headers
 * Authorization personnalisés) — même principe que le client mobile web.
 */
export async function streamChat(
  params: ChatStreamParams,
  onEvent: (evt: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const doFetch = () =>
    fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...authHeaders(),
      },
      body: JSON.stringify({
        message: params.message,
        session_id: params.sessionId,
        language: params.language || "auto",
        model_preference: params.modelPreference,
        web_search: Boolean(params.webSearch),
        document_id: params.documentId || undefined,
        ephemeral: Boolean(params.ephemeral),
        history: params.ephemeral ? (params.history ?? []) : undefined,
        last_image_url: params.ephemeral ? params.lastImageUrl : undefined,
      }),
    });

  // Renouvellement EN AVANCE : une réponse peut durer une minute, on ne veut
  // pas qu'elle parte avec un jeton qui expire pendant le streaming.
  await ensureFreshSession();
  let res = await doFetch();

  if (res.status === 401) {
    const outcome = await refreshSession();
    if (outcome.status === "ok") res = await doFetch();
    if (res.status === 401) {
      // Serveur injoignable pendant le renouvellement : on ne déconnecte pas
      // pour une panne passagère, on remonte une erreur que l'écran affiche.
      if (outcome.status === "unavailable") throw new HttpError(503);
      handleUnauthorized();
    }
  }
  if (!res.ok || !res.body) {
    // Le statut porte le cas ; la phrase montrée est choisie par `describeError`.
    const detail = await res
      .clone()
      .json()
      .then((b) => (b as { message?: string }).message)
      .catch(() => undefined);
    throw new HttpError(res.ok ? 502 : res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = pending.indexOf("\n\n")) >= 0) {
      const block = pending.slice(0, sep);
      pending = pending.slice(sep + 2);
      for (const line of block.split("\n")) {
        const t = line.trimEnd();
        if (!t.startsWith("data:")) continue;
        const jsonStr = t.slice(5).trim();
        if (!jsonStr) continue;
        try {
          onEvent(JSON.parse(jsonStr) as StreamEvent);
        } catch {
          // fragment JSON incomplet — ignoré
        }
      }
    }
  }
}
