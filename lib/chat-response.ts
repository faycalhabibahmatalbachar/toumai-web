import type { SearchImage, ToolConfirmation, WebSource } from "./chat-stream";

export type ActionState =
  | "preparing"
  | "awaiting_confirmation"
  | "queued"
  | "running"
  | "verifying"
  | "success"
  | "partial_success"
  | "failed"
  | "cancelled"
  | "expired"
  // États historiques conservés pendant la migration backend/frontend.
  | "done"
  | "warning"
  | "pending";

export type ResponseBlock =
  | { type: "sources"; id?: string; sources: WebSource[] }
  | { type: "web_images"; id?: string; images: SearchImage[] }
  | { type: "generated_images"; id?: string; urls: string[] }
  | { type: "tool_confirmation"; id?: string; confirmation: ToolConfirmation }
  | { type: "activity"; id?: string; activity: string; label?: string; detail?: string }
  | { type: "file"; id?: string; file: ResponseFile }
  | { type: "widget"; id?: string; widget: ResponseWidget }
  | { type: "actions"; id?: string; steps: ActionStep[]; title?: string };

/**
 * Une étape d'action attestée par le serveur.
 *
 * Important : l'UI ne déduit jamais un succès depuis le texte du modèle. Les
 * champs `state`, `status` et `verified` proviennent du journal/exécuteur du
 * backend. Les anciens états done/warning/pending restent acceptés afin que les
 * conversations déjà persistées continuent à se rendre correctement.
 */
export interface ActionStep {
  capability: string;
  label: string;
  state: ActionState;
  status?: string;
  verified?: boolean;
  action_id?: string | null;
  detail?: string;
  target?: string;
  error_code?: string | null;
  retryable?: boolean;
  started_at?: string;
  finished_at?: string;
}

export interface ResponseFile {
  id?: string;
  name: string;
  mime_type?: string;
  size_bytes?: number;
  url?: string;
  preview_url?: string;
  status?: "ready" | "processing" | "error";
  error?: string;
  pages?: number;
  rows?: number;
  sheets?: number;
  duration?: string;
}

/**
 * Un widget est une donnée structurée, jamais du HTML produit par le modèle.
 * `type` sélectionne un composant connu du registre frontend. Un type inconnu
 * reçoit un rendu de repli sûr : aucun HTML arbitraire n'est exécuté.
 */
export interface ResponseWidget {
  type: string;
  title?: string;
  data: unknown;
  source_ids?: string[];
  version?: number;
}

export interface LegacyRichMetadata {
  image_urls?: string[];
  sources?: WebSource[];
  search_images?: SearchImage[];
  tool_confirmation?: ToolConfirmation;
  activity?: string;
  activity_label?: string;
  action_steps?: ActionStep[];
  blocks?: ResponseBlock[];
  widgets?: ResponseWidget[];
}

/**
 * Pont de compatibilité : les anciens champs SSE restent acceptés, mais le
 * renderer consomme désormais une liste ordonnée de blocs.
 *
 * Les blocs envoyés explicitement par le backend sont prioritaires. Sinon on
 * traduit les métadonnées historiques sans rien inventer ni dupliquer.
 */
export function blocksFromMetadata(meta?: LegacyRichMetadata | null): ResponseBlock[] {
  if (!meta) return [];
  if (Array.isArray(meta.blocks) && meta.blocks.length) return meta.blocks;

  const blocks: ResponseBlock[] = [];
  if (meta.activity) {
    blocks.push({ type: "activity", activity: meta.activity, label: meta.activity_label });
  }

  const webImageUrls = new Set(
    (meta.search_images ?? []).map((image) => image.url).filter(Boolean),
  );
  const generatedUrls = (meta.image_urls ?? []).filter(
    (url) => url && !webImageUrls.has(url),
  );

  if (meta.search_images?.length) {
    blocks.push({ type: "web_images", images: meta.search_images });
  }
  if (generatedUrls.length) {
    blocks.push({ type: "generated_images", urls: generatedUrls });
  }
  if (meta.sources?.length) blocks.push({ type: "sources", sources: meta.sources });
  if (meta.action_steps?.length) blocks.push({ type: "actions", steps: meta.action_steps });
  if (meta.widgets?.length) {
    blocks.push(...meta.widgets.map((widget, index) => ({
      type: "widget" as const,
      id: `widget:${widget.type}:${index}`,
      widget,
    })));
  }
  if (meta.tool_confirmation) {
    blocks.push({ type: "tool_confirmation", confirmation: meta.tool_confirmation });
  }
  return blocks;
}

export function mergeResponseBlocks(
  current: ResponseBlock[] = [],
  incoming: ResponseBlock[] = [],
): ResponseBlock[] {
  if (!incoming.length) return current;
  const next = [...current];
  for (const block of incoming) {
    const key = block.id || stableBlockKey(block);
    const index = next.findIndex(
      (existing) => (existing.id || stableBlockKey(existing)) === key,
    );
    if (index >= 0) next[index] = block;
    else next.push(block);
  }
  return next;
}

function stableBlockKey(block: ResponseBlock): string {
  switch (block.type) {
    case "sources":
      return "sources";
    case "web_images":
      return "web_images";
    case "generated_images":
      return "generated_images";
    case "tool_confirmation":
      return `tool:${block.confirmation.pending_id || block.confirmation.tool}`;
    case "activity":
      return `activity:${block.activity}`;
    case "file":
      return `file:${block.file.id || block.file.name}`;
    case "widget":
      return `widget:${block.widget.type}:${block.widget.title || "default"}`;
    case "actions":
      return "actions";
  }
}
