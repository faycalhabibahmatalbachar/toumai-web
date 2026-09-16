/**
 * Noyau du système de widgets — fonctions PURES, sans import.
 *
 * Tout ce qui décide d'un affichage à partir d'une donnée serveur vit ici :
 * lecture tolérante des champs, masquage des identifiants techniques, statut
 * unifié, reconnaissance des tableaux. Les composants ne font que dessiner le
 * résultat.
 *
 * POURQUOI AUCUN IMPORT
 * ---------------------
 * Ce fichier est testé tel quel par Node (`node --test`), sans compilation ni
 * résolution d'alias. Un seul `import "@/…"` rendrait ces tests impossibles, et
 * ce sont précisément les règles qu'on veut verrouiller : une donnée absente ne
 * doit jamais casser une carte, un JID ne doit jamais s'afficher.
 */

// ── Lecture tolérante ────────────────────────────────────────────────────────

export type Rec = Record<string, unknown>;

export function rec(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Rec) : {};
}

export function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Premier champ texte non vide parmi plusieurs clés possibles. */
export function pick(data: Rec, ...keys: string[]): string {
  for (const key of keys) {
    const value = str(data[key]);
    if (value) return value;
  }
  return "";
}

export function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function pickNum(data: Rec, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = num(data[key]);
    if (value !== null) return value;
  }
  return null;
}

export function records(value: unknown): Rec[] {
  return Array.isArray(value)
    ? value.filter((item): item is Rec => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

export function truncate(input: string, max = 90): string {
  const value = (input || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, Math.max(1, max - 1))}…` : value;
}

// ── Sécurité d'affichage ─────────────────────────────────────────────────────

/** Seuls http(s) sont ouvrables. `javascript:`, `data:`, relatifs : refusés. */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Lien interne à l'application (commence par un seul `/`). */
export function safeInternalPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value.startsWith("/") && !value.startsWith("//") && !/[\s\\]/.test(value) ? value : null;
}

export function hostOf(raw: string): string {
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

/** « +235 66•••478 » : lisible pour la personne, inutile pour un curieux. */
export function maskPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 7) return raw;
  if (digits.length >= 11 && digits.startsWith("235")) {
    return `+235 ${digits.slice(3, 5)}•••${digits.slice(-3)}`;
  }
  const prefix = digits.length > 10 ? digits.slice(0, 3) : digits.slice(0, 2);
  return `+${prefix} ${digits.slice(prefix.length, prefix.length + 2)}•••${digits.slice(-3)}`;
}

/**
 * Texte prêt à afficher : aucun JID, aucun numéro complet, aucun nom de
 * fonction interne. Utilisé pour tout libellé qui vient du serveur ou d'un
 * connecteur.
 */
export function displayText(raw: unknown, max = 140): string {
  let value = str(raw);
  if (!value) return "";
  value = value.replace(/\b\d{8,20}(?:-\d+)?@g\.us\b/gi, "groupe WhatsApp");
  value = value.replace(/\b\d{6,20}(?::\d+)?@(?:s\.whatsapp\.net|lid|c\.us)\b/gi, (jid) => maskPhone(jid.split("@")[0]));
  // Numéro : « +… » avec espaces, ou une suite d'au moins 8 chiffres collés.
  // Un montant espacé (« 15 000 000 FCFA ») n'est pas un numéro.
  value = value.replace(/\+\d[\d ]{7,16}\d|(?<![\d.,])\d{8,15}(?![\d.,])/g, (phone) => maskPhone(phone));
  return truncate(value, max);
}

/** Libellé humain d'une clé technique : `next_run_at` → « Next run at ». */
export function humanizeKey(key: string): string {
  const words = (key || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-.]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

/** Clés qui ne doivent jamais apparaître dans un rendu générique. */
const HIDDEN_KEYS = /(^|_)(id|uuid|jid|token|secret|password|key|hash|signature|raw|payload|args|stack|trace)$/i;

export function isDisplayableKey(key: string): boolean {
  return !HIDDEN_KEYS.test(key) && !key.startsWith("_");
}

// ── Statut unifié ────────────────────────────────────────────────────────────

/**
 * Le vocabulaire visuel commun. Une même tonalité = une même couleur et une
 * même icône dans TOUT le produit : un succès WhatsApp et un succès d'agenda
 * doivent se reconnaître au premier coup d'œil.
 */
export type StatusTone = "neutral" | "progress" | "active" | "success" | "warning" | "error" | "attention";

export type StatusKey =
  | "idle" | "loading" | "pending" | "queued" | "running" | "verifying" | "scheduled" | "active"
  | "awaiting_confirmation" | "needs_action" | "success" | "sent" | "partial_success" | "warning"
  | "failed" | "error" | "expired" | "cancelled" | "paused" | "archived" | "draft" | "blocked"
  | "offline" | "permission_denied" | "auth_required" | "unavailable" | "empty" | "unknown";

const TONES: Record<StatusKey, StatusTone> = {
  idle: "neutral",
  loading: "progress",
  pending: "neutral",
  queued: "progress",
  running: "progress",
  verifying: "progress",
  scheduled: "active",
  active: "active",
  awaiting_confirmation: "attention",
  needs_action: "attention",
  success: "success",
  sent: "success",
  partial_success: "warning",
  warning: "warning",
  failed: "error",
  error: "error",
  expired: "error",
  cancelled: "neutral",
  paused: "neutral",
  archived: "neutral",
  draft: "neutral",
  blocked: "neutral",
  offline: "warning",
  permission_denied: "error",
  auth_required: "attention",
  unavailable: "warning",
  empty: "neutral",
  unknown: "neutral",
};

export function toneOf(status: StatusKey): StatusTone {
  return TONES[status] ?? "neutral";
}

/**
 * Traduit n'importe quel statut serveur connu vers le vocabulaire commun.
 * Un statut inconnu reste « unknown » : on n'invente jamais un succès.
 */
export function normalizeStatus(raw: unknown): StatusKey {
  const value = str(raw).toLowerCase().replace(/[\s-]+/g, "_");
  switch (value) {
    case "": return "unknown";
    case "done": case "succeeded": case "success": case "ok": case "completed": case "ready": case "verified_success": return "success";
    case "sent": case "delivered": case "read": return "sent";
    case "partial": case "partial_success": case "verification_failed": case "warning": return "partial_success";
    case "failed": case "failure": case "timeout": case "timed_out": case "unsupported": return "failed";
    case "error": return "error";
    case "expired": return "expired";
    case "cancelled": case "canceled": case "skipped": return "cancelled";
    case "paused": return "paused";
    case "archived": return "archived";
    case "draft": return "draft";
    case "blocked": return "blocked";
    case "running": case "executing": case "processing": case "in_progress": case "sending": return "running";
    case "verifying": return "verifying";
    case "queued": case "waiting": case "preparing": case "confirmed": return "queued";
    case "pending": return "pending";
    case "scheduled": return "scheduled";
    case "active": case "enabled": return "active";
    case "awaiting_confirmation": case "waiting_for_approval": return "awaiting_confirmation";
    case "ambiguous": case "needs_action": return "needs_action";
    case "auth_required": case "unauthorized": case "session_expired": case "session_expiree": return "auth_required";
    case "permission_denied": case "forbidden": return "permission_denied";
    case "offline": return "offline";
    case "unavailable": case "injoignable": return "unavailable";
    default: return "unknown";
  }
}

// ── Fichiers ─────────────────────────────────────────────────────────────────

export type FileKind = "pdf" | "doc" | "sheet" | "slides" | "text" | "archive" | "image" | "audio" | "video" | "code" | "unknown";

export function fileKind(name?: string, mime?: string): FileKind {
  const m = (mime || "").toLowerCase();
  const ext = ((name || "").toLowerCase().match(/\.([a-z0-9]{1,6})$/) || [])[1] || "";
  if (m === "application/pdf" || ext === "pdf") return "pdf";
  if (m.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"].includes(ext)) return "image";
  if (m.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "opus", "aac"].includes(ext)) return "audio";
  if (m.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext)) return "video";
  if (m.includes("spreadsheet") || m.includes("excel") || m === "text/csv" || ["xlsx", "xls", "csv", "ods"].includes(ext)) return "sheet";
  if (m.includes("presentation") || m.includes("powerpoint") || ["pptx", "ppt", "odp", "key"].includes(ext)) return "slides";
  if (m.includes("word") || m.includes("opendocument.text") || ["docx", "doc", "odt", "rtf"].includes(ext)) return "doc";
  if (m.includes("zip") || m.includes("compressed") || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["js", "ts", "tsx", "jsx", "py", "json", "html", "css", "java", "go", "rs", "sql", "sh"].includes(ext)) return "code";
  if (m.startsWith("text/") || ["txt", "md", "markdown"].includes(ext)) return "text";
  return "unknown";
}

export function formatBytes(bytes: unknown, locale = "fr-FR"): string {
  const value = num(bytes);
  if (value === null || value < 0) return "";
  const units = locale.startsWith("en") ? ["B", "KB", "MB", "GB"] : ["o", "Ko", "Mo", "Go"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || size >= 10 ? 0 : 1;
  return `${size.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[unit]}`;
}

// ── Dates ────────────────────────────────────────────────────────────────────

/** Date valide ou `null` — une chaîne illisible ne devient jamais « Invalid Date ». */
export function parseDate(raw: unknown): Date | null {
  if (raw instanceof Date) return Number.isFinite(raw.getTime()) ? raw : null;
  const n = num(raw);
  if (n !== null && typeof raw === "number") {
    const date = new Date(n < 10_000_000_000 ? n * 1000 : n);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const s = str(raw);
  // ISO 8601, ou RFC 2822 (« Tue, 16 Sep 2026 10:00:00 +0100 », format des
  // en-têtes d'e-mail). Une année à quatre chiffres est exigée : sans elle,
  // `Date` invente une année et l'affichage mentirait.
  if (!s || !(/\d{4}-\d{2}-\d{2}/.test(s) || /\b[A-Za-z]{3}\b.*\b\d{4}\b/.test(s))) return null;
  const date = new Date(s);
  return Number.isFinite(date.getTime()) ? date : null;
}

// ── Reconnaissance des tableaux ─────────────────────────────────────────────

export type TableKind = "emails" | "scheduled_messages" | "generic";

/**
 * Le serveur projette certaines listes en `type: "table"` (boîte de réception,
 * messages programmés). On reconnaît la FORME des lignes pour leur donner une
 * présentation propre, sans rien présumer quand la forme ne correspond pas.
 */
export function detectTableKind(rows: Rec[], title = ""): TableKind {
  if (!rows.length) return /réception|inbox|mail/i.test(title) ? "emails" : /programm|scheduled/i.test(title) ? "scheduled_messages" : "generic";
  const sample = rows.slice(0, 5);
  const has = (keys: string[]) => sample.filter((row) => keys.some((key) => key in row)).length >= Math.ceil(sample.length / 2);
  if (has(["subject"]) && has(["from", "sender", "from_name"])) return "emails";
  if (has(["send_at", "scheduled_for", "run_at"]) && has(["message", "text", "to", "to_name", "recipient"])) return "scheduled_messages";
  return "generic";
}

/** Colonnes affichables d'un tableau générique, identifiants exclus. */
export function tableColumns(rows: Rec[], max = 6): string[] {
  const seen: string[] = [];
  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      if (!seen.includes(key) && isDisplayableKey(key)) seen.push(key);
    }
  }
  return seen.slice(0, max);
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "✓" : "—";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString("fr-FR") : "";
  if (typeof value === "string") return displayText(value, 160);
  if (Array.isArray(value)) return `${value.length}`;
  return "…";
}

// ── Opérations en masse ─────────────────────────────────────────────────────

export interface StepSummary {
  total: number;
  succeeded: number;
  failed: number;
  blocked: number;
  partial: number;
  active: number;
  overall: StatusKey;
}

/** Résumé d'un ensemble d'étapes : « 97 envoyés · 3 échecs » plutôt que 100 lignes. */
export function summarizeSteps(states: unknown[]): StepSummary {
  let succeeded = 0, failed = 0, blocked = 0, partial = 0, active = 0;
  for (const raw of states) {
    const status = normalizeStatus(raw);
    if (status === "success" || status === "sent") succeeded += 1;
    else if (status === "failed" || status === "error" || status === "expired") failed += 1;
    else if (status === "blocked") blocked += 1;
    else if (status === "partial_success") partial += 1;
    else if (toneOf(status) === "progress") active += 1;
  }
  const total = states.length;
  let overall: StatusKey = "unknown";
  if (!total) overall = "empty";
  else if (active) overall = "running";
  else if (succeeded === total) overall = "success";
  else if (failed === total) overall = "failed";
  else if (succeeded || partial) overall = "partial_success";
  else if (failed) overall = "failed";
  else if (blocked === total) overall = "blocked";
  return { total, succeeded, failed, blocked, partial, active, overall };
}

// ── Qualité de l'air ────────────────────────────────────────────────────────

/** Tonalité d'un indice AQI (échelle US EPA). */
export function aqiTone(aqi: number | null): StatusTone {
  if (aqi === null) return "neutral";
  if (aqi <= 50) return "success";
  if (aqi <= 100) return "active";
  if (aqi <= 150) return "warning";
  return "error";
}

// ── Météo ───────────────────────────────────────────────────────────────────

export type WeatherIcon = "sun" | "cloud-sun" | "cloud" | "rain" | "storm" | "snow" | "fog" | "wind" | "unknown";

/** Icône d'après le code WMO (Open-Meteo) ou la description texte. */
export function weatherIcon(code: unknown, description = ""): WeatherIcon {
  const c = num(code);
  if (c !== null) {
    if (c === 0) return "sun";
    if (c <= 2) return "cloud-sun";
    if (c === 3) return "cloud";
    if (c === 45 || c === 48) return "fog";
    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "rain";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "snow";
    if (c >= 95) return "storm";
  }
  const d = description.toLowerCase();
  if (/orage|storm|thunder/.test(d)) return "storm";
  if (/pluie|averse|bruine|rain|shower|drizzle/.test(d)) return "rain";
  if (/neige|snow/.test(d)) return "snow";
  if (/brouillard|brume|fog|mist|poussi|dust|haze/.test(d)) return "fog";
  if (/vent|wind/.test(d)) return "wind";
  if (/partiel|peu nuageux|partly|few clouds/.test(d)) return "cloud-sun";
  if (/nuag|couvert|cloud|overcast/.test(d)) return "cloud";
  if (/clair|dégagé|degage|ensoleill|clear|sunny/.test(d)) return "sun";
  return "unknown";
}
