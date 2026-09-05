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
  /** LA PASSERELLE NE REPOND PAS. Ce n'est PAS un compte delie.
   *
   * Le serveur distinguait deja les deux ; l'ecran, non : `injoignable`
   * tombait dans le cas par defaut et affichait « Connecter ». On invitait
   * donc quelqu'un a relier son telephone alors que le service etait en
   * panne, et il recommencait indefiniment. Les deux etats se resolvent par
   * des gestes opposes : l'un se repare en reliant, l'autre en attendant. */
  | "injoignable"
  /** WhatsApp a invalide la session : il faut refaire le jumelage une fois. */
  | "session_expiree"
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
  /** Precision technique quand le service ne repond pas. Jamais affichee
   *  telle quelle : elle sert au diagnostic, pas a l'utilisateur. */
  detail?: string | null;
}

/** L'ETAT DU CONNECTEUR, DANS LE VOCABULAIRE DU PRODUIT.
 *
 * `/whatsapp/status` rend ce que la passerelle dit. `/whatsapp/etat` rend ce
 * que le produit en conclut : un code stable, une phrase deja ecrite, et
 * l'action a proposer. L'app, le site et l'assistant traduisaient chacun
 * « disconnected » a leur facon, et les trois versions avaient diverge. */
export interface WaEtat {
  code:
    | "non_configure"
    | "injoignable"
    | "deconnecte"
    | "jumelage"
    | "qr"
    | "connexion"
    | "connecte"
    | "session_expiree"
    | "en_pause"
    | "erreur";
  pret: boolean;
  lecture_possible: boolean;
  libelle: string;
  action?: "connecter" | "reconnecter" | "reessayer" | "saisir_code" | "scanner" | "attendre" | "reprendre";
  action_libelle?: string;
  numero?: string;
  nom_profil?: string;
  plateforme?: string;
  connecte_depuis_ms?: number;
  derniere_activite_ms?: number;
  contacts?: number;
  code_jumelage?: string;
  code_expire_le?: number;
  detail?: string;
  /** LES ÉTAPES DE LA LIAISON, quand une liaison est en cours.
   *
   * Relier un compte prend une à deux minutes, dont l'essentiel se passe sur
   * le téléphone, hors de notre vue. Sans rien à l'écran, cette attente
   * ressemble à une panne : c'est le moment où quelqu'un relance la connexion
   * « pour voir », ce qui invalide le code qu'il était en train de saisir.
   *
   * Absente quand rien ne se passe : une séquence figée à l'étape zéro
   * laisserait croire le contraire. */
  progression?: {
    etapes: { cle: string; libelle: string; etat: "en_attente" | "en_cours" | "termine" | "echoue" | "annule" }[];
    rang: number;
    total: number;
    libelle_courant: string;
    termine: boolean;
  };
  /** Ce que la passerelle en service sait reellement faire. */
  capacites?: Record<string, boolean>;
  capacites_source?: "passerelle" | "inconnu" | "aucune";
  /** Ce qu'aucune version ne fera, avec la raison. */
  hors_de_portee?: Record<string, string>;
}

export function getWaEtat(): Promise<WaEtat> {
  return http.get("/whatsapp/etat");
}

export interface WaCapacites {
  /** D'ou vient cette liste.
   *
   * `passerelle` : elle a declare, on peut s'y fier dans les deux sens.
   * `inconnu` : elle ne sait pas repondre. La liste est informative, elle ne
   * doit RIEN interdire — voir le commentaire de `indisponible` dans
   * WhatsAppPermissionsPanel.
   * `aucune` : pas de connecteur du tout, ce que dit deja l'etat. */
  source: "passerelle" | "inconnu" | "aucune";
  version: string | null;
  capacites: Record<string, boolean>;
  impossibles: Record<string, string>;
}

export function getWaCapacites(): Promise<WaCapacites> {
  return http.get("/whatsapp/capacites");
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
  // Le compte WhatsApp lui-même, distinct de la messagerie : on peut vouloir
  // que l'assistant écrive à ses contacts sans qu'il touche à son profil, à sa
  // confidentialité, à ses groupes ni à l'organisation de ses conversations.
  manage_account: boolean;
  manage_contacts: boolean;
  manage_groups: boolean;
  manage_chats: boolean;
  calls: boolean;
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
