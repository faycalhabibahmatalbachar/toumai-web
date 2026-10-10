import { http } from "./http";
import { cacheSessionOwner } from "./swr-cache";
import {
  WA_CACHE,
  readWhatsAppCache,
  waCachedRead,
  waMutation,
  writeWhatsAppCache,
  type WhatsAppReadOptions,
} from "./whatsapp-cache";

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
  picture_url?: string | null;
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
  photo_profil?: string;
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
  /** État réel du régulateur serveur. Absent avec un backend plus ancien. */
  protection?: WaProtectionState;
}

export interface WaProtectionClassState {
  derniere_minute: number;
  derniere_heure: number;
  dernier_jour: number;
  plafond_jour: number;
  echecs_consecutifs: number;
  en_repos: boolean;
}

export interface WaProtectionState {
  available: boolean;
  shared: boolean | null;
  source: "redis" | "local" | "unavailable";
  mode: "normal" | "prudence" | "unknown";
  prudence: { active: boolean; reste_s: number };
  classes: Partial<Record<"lecture" | "ecriture" | "sensible", WaProtectionClassState>>;
  policies: {
    anti_duplicate: boolean;
    burst_control: boolean;
    verified_execution: boolean;
  };
}

export function getWaEtat(readOptions: WhatsAppReadOptions = {}): Promise<WaEtat> {
  return waCachedRead(WA_CACHE.etat, () => http.get("/whatsapp/etat"), {
    freshMs: 1_000,
    revalidate: readOptions.revalidate,
  });
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

export function getWaCapacites(readOptions: WhatsAppReadOptions = {}): Promise<WaCapacites> {
  return waCachedRead(WA_CACHE.capacites, () => http.get("/whatsapp/capacites"), {
    freshMs: 15_000,
    revalidate: readOptions.revalidate,
  });
}

export function getWhatsAppStatus(readOptions: WhatsAppReadOptions = {}): Promise<WhatsAppState> {
  return waCachedRead(WA_CACHE.status, () => http.get("/whatsapp/status"), {
    freshMs: 1_000,
    revalidate: readOptions.revalidate,
  });
}

/** Liaison par code de jumelage (saisie du numéro). */
export function linkWhatsApp(phone: string): Promise<WhatsAppState> {
  return waMutation(http.post("/whatsapp/link", { phone }));
}

/** Liaison par QR (sans numéro) — souvent plus fiable, comme sur mobile. */
export function linkWhatsAppQr(): Promise<WhatsAppState> {
  return waMutation(http.post("/whatsapp/link", {}));
}

export function refreshWhatsAppCode(): Promise<{ pairingCode: string; codeExpiresAt: string }> {
  return waMutation(http.post("/whatsapp/refresh-code"), ["wa:status", "wa:etat"]);
}

export function disconnectWhatsApp(): Promise<{ status: "disconnected" }> {
  return waMutation(http.post("/whatsapp/logout"));
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

export function getWaSettings(readOptions: WhatsAppReadOptions = {}): Promise<WaSettings> {
  return waCachedRead(WA_CACHE.settings, () => http.get("/whatsapp/settings"), {
    freshMs: 20_000,
    revalidate: readOptions.revalidate,
  });
}

export function updateWaSettings(patch: Partial<WaSettings>): Promise<WaSettings> {
  return waMutation(http.put("/whatsapp/settings", patch), ["wa:settings", "wa:capacites", "wa:activity"]);
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

export function getWaActivity(
  opts?: {
    category?: string;
    days?: number;
    limit?: number;
  },
  readOptions: WhatsAppReadOptions = {},
): Promise<{ items: WaActivityItem[]; stats: WaActivityStats }> {
  const p = new URLSearchParams();
  if (opts?.category) p.set("category", opts.category);
  if (opts?.days) p.set("days", String(opts.days));
  if (opts?.limit) p.set("limit", String(opts.limit));
  const qs = p.toString();
  const key = WA_CACHE.activity(opts?.category || "", opts?.days || 0, opts?.limit || 0);
  return waCachedRead(
    key,
    () => http.get(`/whatsapp/activity${qs ? `?${qs}` : ""}`),
    { freshMs: 10_000, revalidate: readOptions.revalidate },
  );
}

// ---- Carnet d'adresses WhatsApp -------------------------------------------

/** Un contact du carnet.
 *
 * `number` PEUT ETRE NULL, et c'est une information, pas un chargement rate.
 * WhatsApp designe certaines personnes par un identifiant de confidentialite
 * (@lid) et ne livre alors aucun numero. Le serveur rend donc `null` plutot
 * qu'un numero fabrique a partir des chiffres de cet identifiant : celui-ci
 * ressemble a un numero, n'en est pas un, et designe quelqu'un qui n'existe
 * pas — WhatsApp accepte l'envoi sans erreur et le message ne part nulle part. */
export interface WaContact {
  jid: string;
  number: string | null;
  name: string;
  name_source?: "saved_contact" | "profile" | "phone" | "unresolved";
  picture_url?: string | null;
}

export interface WaCarnet {
  contacts: WaContact[];
  count: number;
  /** `passerelle` = la verite WhatsApp du moment ; `base` = la copie datee.
   *  On affiche la difference au lieu de faire passer l'une pour l'autre. */
  source: "passerelle" | "base";
  derniere_synchronisation: string | null;
  total_en_base: number;
}

export function getWaCarnet(
  search?: string,
  readOptions: WhatsAppReadOptions = {},
): Promise<WaCarnet> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return waCachedRead(
    WA_CACHE.carnet(search || ""),
    () => http.get(`/whatsapp/contacts${q}`),
    { freshMs: search ? 8_000 : 30_000, revalidate: readOptions.revalidate },
  );
}

/** Full, owner-scoped address book for the conversations screen.
 * One request per cache lifetime, never per visible row. */
export function getWaContactNameBook(
  readOptions: WhatsAppReadOptions = {},
): Promise<WaCarnet> {
  return waCachedRead(
    WA_CACHE.carnet("__identity_names_2000__"),
    () => http.get<WaCarnet>("/whatsapp/contacts?limit=2000"),
    { freshMs: 60_000, revalidate: readOptions.revalidate },
  );
}

export async function getWaProfilePictures(
  jids: string[],
  force = false,
): Promise<Record<string, string | null>> {
  const unique = Array.from(new Set(jids.map((jid) => jid.trim()).filter(Boolean))).slice(0, 120);
  if (!unique.length) return {};

  const pictures: Record<string, string | null> = {};
  const missing: string[] = [];
  for (const jid of unique) {
    const cached = force
      ? null
      : readWhatsAppCache<{ url: string | null }>(WA_CACHE.profilePicture(jid), 30 * 60 * 1000);
    if (cached) pictures[jid] = cached.url;
    else missing.push(jid);
  }
  if (!missing.length) return pictures;

  const requestOwner = cacheSessionOwner();
  try {
    const response = await http.post<{ pictures: Record<string, string | null>; count: number }>(
      "/whatsapp/profile-pictures",
      { jids: missing, force },
    );
    // Do not attach A's profile photos to B's contacts after a session switch.
    if (requestOwner !== cacheSessionOwner()) {
      throw new Error("La session WhatsApp a changé pendant le chargement des photos.");
    }
    for (const jid of missing) {
      const url = response.pictures?.[jid] ?? null;
      pictures[jid] = url;
      writeWhatsAppCache(WA_CACHE.profilePicture(jid), { url });
    }
  } catch (error) {
    if (requestOwner !== cacheSessionOwner() || Object.keys(pictures).length === 0) {
      throw error;
    }
  }
  return pictures;
}

export interface WaSynchroCarnet {
  ok: boolean;
  synchronises: number;
  nouveaux?: number;
  total: number;
}

/** Recopie le carnet de la passerelle dans la base.
 *
 * `forcer` redemande le carnet a WhatsApp : c'est lent, et sur une session
 * deja jumelee ca ne ramene qu'une poignee de contacts — WhatsApp ne livre le
 * carnet complet qu'au jumelage initial. Reserve a un geste explicite. */
export function syncWaCarnet(forcer = false): Promise<WaSynchroCarnet> {
  return waMutation(
    http.post(`/whatsapp/contacts/sync${forcer ? "?forcer=true" : ""}`),
    ["wa:carnet", "wa:profile-picture", "wa:overview"],
  );
}


// ---- Automatisations WhatsApp --------------------------------------------

export type WhatsAppAutomationStatus =
  | "pending"
  | "processing"
  | "paused"
  | "sent"
  | "failed"
  | "cancelled";

export interface WhatsAppAutomation {
  id: string;
  title: string;
  recipient: string;
  action_type: "send_text" | "send_media";
  message_preview: string;
  media_type?: string | null;
  filename?: string | null;
  send_at: string;
  timezone: string;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "cron";
  cron_expr?: string;
  status: WhatsAppAutomationStatus;
  attempts: number;
  sent_at?: string | null;
  last_error?: string;
  provider_message_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Full text is delivered only by an exact owner-scoped GET, never a list. */
export type WhatsAppAutomationDetail = WhatsAppAutomation & { message_full?: string };

export function getWhatsAppAutomationDetail(id: string): Promise<WhatsAppAutomationDetail> {
  // Deliberately bypass the list cache: truncated previews must never become
  // editable message bodies, and a stale cached owner must not leak details.
  return http.get<WhatsAppAutomationDetail>(
    `/whatsapp/automations/${encodeURIComponent(id)}`,
  );
}

export interface WhatsAppAutomationHistoryEntry {
  action: string;
  success: boolean;
  error: string;
  source: string;
  result: { provider_message_id?: string | null };
  created_at: string;
}

export function getWhatsAppAutomations(
  params?: {
    status?: WhatsAppAutomationStatus;
    limit?: number;
  },
  readOptions: WhatsAppReadOptions = {},
): Promise<{ tasks: WhatsAppAutomation[]; count: number }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));
  const suffix = query.size ? `?${query.toString()}` : "";
  return waCachedRead(
    WA_CACHE.automations(params?.status || "", params?.limit || 0),
    () => http.get(`/whatsapp/automations${suffix}`),
    { freshMs: 5_000, revalidate: readOptions.revalidate },
  );
}


/** Exact totals for historical WhatsApp scheduled deliveries (not Automation OS v2). */
export interface WhatsAppLegacyAutomationStats {
  total: number;
  by_status: Record<WhatsAppAutomationStatus, number>;
}

export type WhatsAppLegacyAutomationFilter = "all" | "active" | "paused" | "failed" | "done";

export function getWhatsAppAutomationStats(
  readOptions: WhatsAppReadOptions = {},
): Promise<WhatsAppLegacyAutomationStats> {
  return waCachedRead(
    WA_CACHE.automationStats,
    () => http.get<WhatsAppLegacyAutomationStats>("/whatsapp/automations/stats"),
    { freshMs: 5_000, revalidate: readOptions.revalidate },
  );
}

export function getWhatsAppAutomationsPage(
  params: { status: WhatsAppLegacyAutomationFilter; search?: string; limit?: number; offset?: number },
  readOptions: WhatsAppReadOptions = {},
): Promise<{ tasks: WhatsAppAutomation[]; count: number; limit: number; offset: number }> {
  const query = new URLSearchParams({
    status: params.status,
    search: params.search?.trim() || "",
    limit: String(params.limit ?? 25),
    offset: String(params.offset ?? 0),
  });
  return waCachedRead(
    WA_CACHE.automationsPage(params.status, params.search || "", params.offset || 0, params.limit || 25),
    () => http.get<{ tasks: WhatsAppAutomation[]; count: number; limit: number; offset: number }>("/whatsapp/automations/paged?" + query.toString()),
    { freshMs: 5_000, revalidate: readOptions.revalidate },
  );
}

export function updateWhatsAppAutomation(
  id: string,
  patch: {
    message?: string;
    send_at?: string;
    recurrence?: WhatsAppAutomation["recurrence"];
    cron_expr?: string;
  },
): Promise<WhatsAppAutomation> {
  return waMutation(
    http.patch(`/whatsapp/automations/${encodeURIComponent(id)}`, patch),
    ["wa:automations", "wa:automation-history", "wa:overview"],
  );
}

export function pauseWhatsAppAutomation(id: string): Promise<WhatsAppAutomation> {
  return waMutation(
    http.post(`/whatsapp/automations/${encodeURIComponent(id)}/pause`),
    ["wa:automations", "wa:automation-history", "wa:overview"],
  );
}

export function resumeWhatsAppAutomation(id: string): Promise<WhatsAppAutomation> {
  return waMutation(
    http.post(`/whatsapp/automations/${encodeURIComponent(id)}/resume`),
    ["wa:automations", "wa:automation-history", "wa:overview"],
  );
}

export function cancelWhatsAppAutomation(id: string): Promise<WhatsAppAutomation> {
  return waMutation(
    http.post(`/whatsapp/automations/${encodeURIComponent(id)}/cancel`, {
      confirmed: true,
    }),
    ["wa:automations", "wa:automation-history", "wa:overview"],
  );
}

/** Read historical action logs past the first page; no cross-account cache. */
export function getWhatsAppAutomationHistoryPage(
  id: string,
  limit = 50,
  offset = 0,
): Promise<{ entries: WhatsAppAutomationHistoryEntry[]; count: number; limit: number; offset: number }> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const safeOffset = Math.max(0, Math.trunc(offset));
  return http.get<{ entries: WhatsAppAutomationHistoryEntry[]; count: number; limit: number; offset: number }>(
    `/whatsapp/automations/${encodeURIComponent(id)}/history?limit=${safeLimit}&offset=${safeOffset}`,
  );
}

export function getWhatsAppAutomationHistory(
  id: string,
  limit = 30,
  readOptions: WhatsAppReadOptions = {},
): Promise<{ entries: WhatsAppAutomationHistoryEntry[]; count: number }> {
  return waCachedRead(
    WA_CACHE.automationHistory(id, limit),
    () =>
      http.get(
        `/whatsapp/automations/${encodeURIComponent(id)}/history?limit=${limit}`,
      ),
    { freshMs: 5_000, revalidate: readOptions.revalidate },
  );
}
