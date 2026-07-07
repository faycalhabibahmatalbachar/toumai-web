import { http } from "./http";

// ---- Google Agenda -------------------------------------------------------

export function getGoogleStatus(): Promise<{ connected: boolean }> {
  return http.get("/google/status");
}

export function getGoogleAuthUrl(): Promise<{ auth_url: string }> {
  return http.get("/google/auth");
}

export function disconnectGoogle(): Promise<{ connected: boolean }> {
  return http.post("/google/logout");
}

// ---- Mail (IMAP/SMTP) -----------------------------------------------------

export interface MailStatus {
  connected: boolean;
  email: string | null;
}

export function getMailStatus(): Promise<MailStatus> {
  return http.get("/mail/status");
}

export function connectMail(email: string, appPassword: string): Promise<{ connected: boolean; email: string }> {
  return http.post("/mail/connect", { email, app_password: appPassword });
}

export function disconnectMail(): Promise<{ connected: boolean }> {
  return http.post("/mail/disconnect");
}

// ---- WhatsApp (passerelle Baileys) ----------------------------------------

export type WhatsAppStatus =
  | "unconfigured"
  | "disconnected"
  | "qr"
  | "connecting"
  | "pairing"
  | "connected"
  | "error";

export interface WhatsAppState {
  status: WhatsAppStatus;
  /** QR code (data:image/png;base64,…) à scanner dans WhatsApp. */
  qr?: string | null;
  pairingCode?: string | null;
  codeExpiresAt?: string | null;
  number?: string | null;
  /** Message d'erreur éventuel renvoyé par la passerelle. */
  error?: string | null;
}

export function getWhatsAppStatus(): Promise<WhatsAppState> {
  return http.get("/whatsapp/status");
}

/** Liaison par code de jumelage (saisie du numéro). */
export function linkWhatsApp(phone: string): Promise<WhatsAppState> {
  return http.post("/whatsapp/link", { phone });
}

/** Liaison par QR (sans numéro) — souvent plus fiable, comme sur mobile. */
export function linkWhatsAppQr(): Promise<WhatsAppState> {
  return http.post("/whatsapp/link", {});
}

export function refreshWhatsAppCode(): Promise<{ pairingCode: string; codeExpiresAt: string }> {
  return http.post("/whatsapp/refresh-code");
}

export function disconnectWhatsApp(): Promise<{ status: "disconnected" }> {
  return http.post("/whatsapp/logout");
}

/** Permissions de l'IA sur le compte WhatsApp — appliquées côté backend
 * (registre d'outils) : une capacité désactivée est refusée avant exécution. */
export interface WaSettings {
  send_text: boolean;
  send_voice: boolean;
  send_image: boolean;
  send_video: boolean;
  send_document: boolean;
  send_file: boolean;
  post_status: boolean;
  read_messages: boolean;
  summaries: boolean;
  search: boolean;
  analyze: boolean;
  manage_messages: boolean;
  advanced: boolean;
  sync_contacts: boolean;
  save_contacts: boolean;
  status_audience: "all" | "contacts";
}

export function getWaSettings(): Promise<WaSettings> {
  return http.get("/whatsapp/settings");
}

export function updateWaSettings(patch: Partial<WaSettings>): Promise<WaSettings> {
  return http.put("/whatsapp/settings", patch);
}

/** Journal des interactions de l'IA sur WhatsApp — numéros déjà masqués
 * côté serveur, jamais transmis en clair. */
export interface WaActivityItem {
  tool: string;
  category: string;
  recipient_masked?: string | null;
  preview?: string | null;
  ok: boolean;
  created_at: string;
}

export interface WaActivityStats {
  total: number;
  messages: number;
  medias: number;
  actions: number;
  errors: number;
}

export function getWaActivity(opts?: {
  category?: string;
  days?: number;
  limit?: number;
}): Promise<{ items: WaActivityItem[]; stats: WaActivityStats }> {
  const p = new URLSearchParams();
  if (opts?.category) p.set("category", opts.category);
  if (opts?.days) p.set("days", String(opts.days));
  if (opts?.limit) p.set("limit", String(opts.limit));
  const qs = p.toString();
  return http.get(`/whatsapp/activity${qs ? `?${qs}` : ""}`);
}
