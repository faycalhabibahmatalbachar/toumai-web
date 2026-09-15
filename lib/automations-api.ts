import { http } from "./http";

/**
 * Client Web d'Automation OS (`/automations/v2`).
 *
 * Mêmes routes, même lecture et mêmes libellés que l'application mobile
 * (`sayibi-ai/lib/features/automations`). Le serveur reste la seule source de
 * vérité : aucun statut n'est inventé ici, aucune transition n'est décidée
 * côté client.
 */

export type AutomationStatus =
  | "draft"
  | "awaiting_confirmation"
  | "active"
  | "paused"
  | "archived"
  | "cancelled";

export type RunStatus =
  | "queued"
  | "waiting"
  | "running"
  | "waiting_for_approval"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "skipped"
  | "ambiguous"
  | "timed_out";

export interface AutomationTrigger {
  kind?: string;
  at?: string;
  cron?: string;
  timezone?: string;
  [key: string]: unknown;
}

export interface LastRun {
  status: RunStatus;
  error?: string | null;
  error_category?: string | null;
  finished_at?: string | null;
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  enabled: boolean;
  trigger: AutomationTrigger;
  next_run_at?: string | null;
  last_run_at?: string | null;
  recipient?: string | null;
  media_type?: string | null;
  source_kind?: string | null;
  created_from?: string | null;
  original_request?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_run?: LastRun | null;
  definition?: { steps?: Array<{ id?: string; skill?: string; args?: Record<string, unknown> }> };
  runs?: AutomationRun[];
}

export interface AutomationRun {
  id: string;
  status: RunStatus;
  summary?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
  error_category?: string | null;
}

export interface AutomationApproval {
  id: string;
  automation_id?: string | null;
  status: string;
  reason: string;
  step_name: string;
  expires_at?: string | null;
}

const BASE = "/automations/v2";
const enc = encodeURIComponent;

export const listAutomations = () =>
  http.get<{ automations: Automation[] }>(`${BASE}?limit=100`).then((r) => r.automations ?? []);
export const getAutomation = (id: string) => http.get<Automation>(`${BASE}/${enc(id)}`);
export const listApprovals = () =>
  http.get<{ approvals: AutomationApproval[] }>(`${BASE}/approvals`).then((r) => r.approvals ?? []);
export const decideApproval = (id: string, approved: boolean) =>
  http.post(`${BASE}/approvals/${enc(id)}/decision`, { approved });
export const pauseAutomation = (id: string) => http.post<Automation>(`${BASE}/${enc(id)}/pause`);
export const activateAutomation = (id: string) => http.post<Automation>(`${BASE}/${enc(id)}/activate`);
export const cancelAutomation = (id: string) => http.post<Automation>(`${BASE}/${enc(id)}/cancel`);
export const archiveAutomation = (id: string) => http.post<Automation>(`${BASE}/${enc(id)}/archive`);
export const duplicateAutomation = (id: string) => http.post<Automation>(`${BASE}/${enc(id)}/duplicate`, {});
/** La même clé pour un même geste : une seule exécution côté serveur. */
export const runAutomationNow = (id: string, requestId: string) =>
  http.post<AutomationRun>(`${BASE}/${enc(id)}/run`, { request_id: requestId });
export const updateAutomationTrigger = (id: string, trigger: AutomationTrigger) =>
  http.patch<Automation>(`${BASE}/${enc(id)}`, { trigger });

export function newRequestId(client: string) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${client}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

// ── Lecture partagée avec le mobile ─────────────────────────────────────────

export type Filter = "upcoming" | "attention" | "paused" | "done" | "failed" | "all";
export type Tone = "neutral" | "active" | "attention" | "success" | "error";

/** Déclencheurs réellement exécutés en production (événement, webhook et
 *  condition n'ont pas encore de chaîne complète : jamais présentés actifs). */
export const AVAILABLE_TRIGGERS = new Set(["exact_time", "flexible_time", "recurrence", "manual"]);

const failedRun = (s?: string | null) => s === "failed" || s === "timed_out";

export function sectionOf(a: Automation, pending: Set<string>): Exclude<Filter, "all"> {
  const last = a.last_run?.status;
  if (a.status === "awaiting_confirmation" || a.status === "draft" || pending.has(a.id) || last === "ambiguous" || last === "waiting_for_approval") return "attention";
  if (a.status === "paused") return "paused";
  if (a.status === "cancelled" || a.status === "archived") return "done";
  if (failedRun(last) && !a.next_run_at) return "failed";
  if (a.next_run_at || a.trigger?.kind === "manual") return "upcoming";
  if (failedRun(last)) return "failed";
  return "done";
}

export function inFilter(a: Automation, f: Filter, pending: Set<string>) {
  if (f === "all") return true;
  const s = sectionOf(a, pending);
  if (f === "failed") return s === "failed" || failedRun(a.last_run?.status);
  return s === f;
}

export function automationStatus(a: Automation): { label: string; tone: Tone } {
  const last = a.last_run?.status;
  switch (a.status) {
    case "awaiting_confirmation": return { label: "Confirmation requise", tone: "attention" };
    case "draft": return { label: "Brouillon", tone: "neutral" };
    case "paused": return { label: "En pause", tone: "neutral" };
    case "cancelled": return { label: "Annulée", tone: "neutral" };
    case "archived": return { label: "Archivée", tone: "neutral" };
  }
  if (last === "ambiguous") return { label: "Résultat incertain", tone: "attention" };
  if (a.next_run_at) return { label: "Programmée", tone: "active" };
  if (failedRun(last)) return { label: "Échec", tone: "error" };
  if (last === "succeeded") return { label: "Terminée", tone: "success" };
  return { label: "Active", tone: "active" };
}

export function runStatus(status: RunStatus, viaWhatsApp: boolean): { label: string; tone: Tone } {
  const map: Record<RunStatus, { label: string; tone: Tone }> = {
    queued: { label: "En file", tone: "neutral" },
    waiting: { label: "En attente", tone: "neutral" },
    running: { label: "En cours", tone: "active" },
    waiting_for_approval: { label: "Validation requise", tone: "attention" },
    // « Acceptée », pas « livrée » : l'identifiant de message rendu par la
    // passerelle ne prouve pas la réception par le destinataire.
    succeeded: { label: viaWhatsApp ? "Acceptée par WhatsApp" : "Exécutée", tone: "success" },
    failed: { label: "Échec", tone: "error" },
    cancelled: { label: "Annulée", tone: "neutral" },
    skipped: { label: "Ignorée", tone: "neutral" },
    ambiguous: { label: "Incertaine", tone: "attention" },
    timed_out: { label: "Délai dépassé", tone: "error" },
  };
  return map[status] ?? { label: "État inconnu", tone: "neutral" };
}

const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function formatWhen(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function recurrenceLabel(cron = "") {
  const p = cron.trim().split(/\s+/);
  if (p.length !== 5) return "Récurrence personnalisée";
  const [m, h, dom, mon, dow] = p;
  const mi = Number(m), hi = Number(h);
  if (!Number.isInteger(mi) || !Number.isInteger(hi) || mon !== "*") return "Récurrence personnalisée";
  const time = `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  if (dom === "*" && dow === "*") return `Tous les jours · ${time}`;
  if (dom === "*" && (dow === "1-5" || dow === "MON-FRI")) return `Du lundi au vendredi · ${time}`;
  if (dom === "*" && /^[0-7]$/.test(dow)) return `Chaque ${DAYS[Number(dow) % 7]} · ${time}`;
  if (dow === "*" && /^\d{1,2}$/.test(dom)) return `Le ${dom} de chaque mois · ${time}`;
  return "Récurrence personnalisée";
}

export function scheduleLabel(a: Pick<Automation, "trigger" | "next_run_at">) {
  const t = a.trigger ?? {};
  switch (t.kind) {
    case "exact_time": return `Une fois · ${formatWhen(t.at || a.next_run_at)}`;
    case "flexible_time": return `Vers ${formatWhen(t.at || a.next_run_at)}`;
    case "recurrence": return recurrenceLabel(String(t.cron ?? ""));
    case "manual": return "Sur demande";
    default: return "Déclencheur pas encore disponible";
  }
}

const MEDIA: Record<string, string> = {
  text: "Message", image: "Image", video: "Vidéo", gif: "GIF", audio: "Audio", voice: "Note vocale",
  sticker: "Sticker", document: "Document", poll: "Sondage", contact: "Contact", location: "Position", event: "Événement",
};
const SOURCES: Record<string, string> = {
  generated_image: "image générée", web_image: "image du Web", tts: "voix de synthèse", generated_document: "document généré",
};

export function contentLabel(mediaType?: string | null, sourceKind?: string | null) {
  const base = MEDIA[mediaType ?? ""] ?? "Message";
  const source = SOURCES[sourceKind ?? ""];
  return source ? `${base} · ${source}` : base;
}

const isSentence = (s: string) => s.includes(" ") && !/^[a-z0-9_]+$/.test(s);

/** La phrase du serveur quand elle est lisible ; jamais un code nu. */
export function errorMessage(error?: string | null, category?: string | null, status?: string | null) {
  const cat = (category ?? "").toLowerCase();
  const text = (error ?? "").trim();
  if (status === "ambiguous" || cat.includes("ambiguous")) return "On ne sait pas si l’envoi est parti : vérifiez dans WhatsApp avant de relancer.";
  if (cat.startsWith("operator_")) return "Interrompue par l’équipe Toumaï.";
  if (cat.includes("antibot") || cat.includes("cadence")) return isSentence(text) ? text : "Envoi retenu pour protéger votre compte WhatsApp.";
  if (isSentence(text)) return text;
  if (cat.includes("session") || cat.includes("connector")) return "WhatsApp n’est pas connecté.";
  if (cat.includes("timeout") || status === "timed_out") return "Délai dépassé.";
  if (cat.startsWith("media") || text.startsWith("media_")) return "Le média n’a pas pu être préparé.";
  return "L’exécution a échoué.";
}

export function viaWhatsApp(a: Automation) {
  const steps = a.definition?.steps;
  if (Array.isArray(steps)) return steps.some((s) => String(s.skill ?? "").includes("whatsapp"));
  return Boolean(a.recipient);
}

/** Aperçu du contenu programmé, sans valeurs de gabarit ni identifiants. */
export function contentPreview(a: Automation) {
  const steps = a.definition?.steps ?? [];
  const send = [...steps].reverse().find((s) => s.id === "send" || String(s.skill ?? "").includes("whatsapp"));
  const args = send?.args ?? {};
  for (const key of ["message", "caption", "pollName", "eventName", "displayName", "filename"]) {
    const v = String(args[key] ?? "").trim();
    if (v && !v.includes("{{")) return v;
  }
  return "";
}
