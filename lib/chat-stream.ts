import { API_BASE } from "./config";
import { authHeaders, ensureFreshSession, refreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";
import type { ResponseBlock } from "./chat-response";

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
  id?: string;
  title?: string;
  url: string;
  /** Extrait réellement renvoyé par le moteur/retriever. Jamais synthétisé côté client. */
  snippet?: string;
  score?: number | null;
  domain?: string;
  published_at?: string;
  favicon_url?: string;
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
  /** Contrat extensible de réponse enrichie. Les anciens champs ci-dessus restent supportés. */
  blocks?: ResponseBlock[];
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
  documentIds?: string[];
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

function emitSseBlock(block: string, onEvent: (evt: StreamEvent) => void): void {
  const dataLines: string[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine.startsWith("data:")) continue;
    // La spécification SSE autorise plusieurs lignes data: dans un même
    // événement. On les recompose au lieu d'essayer de parser chaque ligne
    // indépendamment, ce qui cassait les payloads multi-lignes.
    const value = rawLine.slice(5);
    dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
  }
  if (!dataLines.length) return;
  const jsonStr = dataLines.join("\n").trim();
  if (!jsonStr) return;

  let event: StreamEvent;
  try {
    event = JSON.parse(jsonStr) as StreamEvent;
  } catch {
    // Un événement SSE invalide ne doit pas faire tomber tout le tour. Le
    // prochain événement reste consommable. Les fragments réseau, eux, sont
    // conservés dans `pending` jusqu'au séparateur complet.
    return;
  }

  // IMPORTANT : ne jamais mettre l'appel applicatif dans le try/catch du
  // JSON.parse. `page.tsx` lève volontairement une erreur lorsque le backend
  // émet { error: ... }; l'ancien code avalait cette exception et transformait
  // une vraie panne en fin de réponse silencieuse.
  onEvent(event);
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
        document_id: params.documentId || params.documentIds?.[0] || undefined,
        document_ids: params.documentIds?.length ? params.documentIds.slice(0, 5) : undefined,
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

  const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType && !contentType.includes("text/event-stream")) {
    // Un proxy/CDN qui renvoie une page HTML 200 ne doit jamais être traité
    // comme une réponse IA vide : on remonte une panne explicite.
    throw new HttpError(502, "Le serveur de chat a renvoyé un flux invalide.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let receivedDone = false;
  const dispatch = (event: StreamEvent) => {
    if (event.done) receivedDone = true;
    onEvent(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });

    // SSE accepte LF et CRLF. Le précédent parseur ne reconnaissait que \n\n,
    // donc un proxy normalisant en CRLF pouvait laisser le chat bloqué jusqu'à
    // la fermeture du flux.
    let match: RegExpExecArray | null;
    const separator = /\r?\n\r?\n/g;
    while ((match = separator.exec(pending)) !== null) {
      const block = pending.slice(0, match.index);
      pending = pending.slice(match.index + match[0].length);
      separator.lastIndex = 0;
      emitSseBlock(block, dispatch);
    }
  }

  // TextDecoder peut conserver un dernier octet partiel ; on le vide puis on
  // traite le dernier événement même si le serveur ferme sans séparateur vide.
  pending += decoder.decode();
  if (pending.trim()) emitSseBlock(pending, dispatch);

  // Le contrat du backend se termine par { done: true }. Une fermeture réseau
  // avant cet événement est une réponse tronquée, même si quelques tokens sont
  // déjà affichés. On conserve ces tokens à l'écran, mais on signale la panne
  // afin que l'utilisateur sache qu'il doit régénérer. Une interruption via le
  // bouton Arrêter reste volontaire et ne doit pas devenir une erreur serveur.
  if (!receivedDone && !signal?.aborted) {
    throw new HttpError(502, "La réponse a été interrompue avant sa fin.");
  }
}
