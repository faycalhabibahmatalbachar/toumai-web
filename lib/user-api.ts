import { http } from "./http";

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  plan?: string;
  language?: string;
  created_at?: string;
}

export interface UsageStats {
  tokens_today: number;
  tokens_month: number;
  requests_today: number;
  requests_month: number;
}

export function getProfile(): Promise<UserProfile> {
  return http.get<UserProfile>("/user/profile");
}

export function getUsage(): Promise<UsageStats> {
  return http.get<UsageStats>("/user/usage");
}

/** Un identifiant fabriqué par la machine n'est pas un nom.
 *
 * CE QU'ON A AFFICHÉ À DES GENS
 * -----------------------------
 * « Bonjour, guest-6bbab7de-3469-41e9-a441-b27e5fdf9214. »
 *
 * Le champ `full_name` d'une session invitée porte l'identifiant technique
 * du compte. Rien ne l'empêchait de remonter jusqu'à l'écran d'accueil : le
 * garde-fou existait bien pour la session invitée EN COURS, mais le profil
 * était mis en cache ailleurs (l'écran de réglages), et l'accueil relisait
 * ce cache sans se poser la question.
 *
 * Le filtre est donc posé LÀ OÙ LE NOM EST LU, pas là où il est écrit :
 * c'est le seul endroit par lequel tous les chemins passent.
 */
export function nomAffichable(nom?: string | null): string | null {
  const propre = (nom ?? "").trim();
  if (!propre) return null;
  // « guest-<uuid> », et par prudence tout ce qui contient un UUID entier :
  // aucun être humain ne s'appelle ainsi, et l'afficher est toujours un bug.
  if (/^guest[-_]/i.test(propre)) return null;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(propre)) return null;
  return propre;
}

/** Le prénom seul, pour la salutation d'accueil. */
export function prenomAffichable(nom?: string | null): string | null {
  const propre = nomAffichable(nom);
  return propre ? (propre.split(/\s+/)[0] || null) : null;
}

export function updateFullName(fullName: string): Promise<{ full_name: string }> {
  return http.put<{ full_name: string }>("/user/profile", { full_name: fullName });
}

export function updateAvatar(dataUrl: string): Promise<{ avatar_url: string }> {
  return http.put<{ avatar_url: string }>("/user/profile", { avatar_data: dataUrl });
}

export function removeAvatar(): Promise<{ avatar_url: null }> {
  return http.put<{ avatar_url: null }>("/user/profile", { avatar_url: null });
}


// ─── Deuxième facteur (TOTP) ────────────────────────────────────────────────

export interface MfaEtat {
  enabled: boolean;
  /** Un secret existe mais aucun code n'a encore été vérifié. */
  pending: boolean;
  recovery_codes_left: number;
}

export interface MfaEnrolement {
  secret: string;
  otpauth_uri: string;
}

export async function getMfaEtat(): Promise<MfaEtat> {
  return http.get<MfaEtat>("/auth/2fa");
}

export async function mfaEnroler(): Promise<MfaEnrolement> {
  return http.post<MfaEnrolement>("/auth/2fa/enroll", {});
}

/** Confirme l'enrôlement et rend les codes de secours — UNE seule fois.
 *
 * Ces codes ne ressortiront jamais du serveur : ils y sont hachés. C'est le
 * seul instant où ils existent en clair, et l'interface doit le dire. */
export async function mfaVerifier(code: string): Promise<string[]> {
  const r = await http.post<{ recovery_codes: string[] }>("/auth/2fa/verify", { code });
  return r?.recovery_codes ?? [];
}

export async function mfaNouveauxCodes(code: string): Promise<string[]> {
  const r = await http.post<{ recovery_codes: string[] }>("/auth/2fa/recovery-codes", { code });
  return r?.recovery_codes ?? [];
}

export async function mfaDesactiver(code: string): Promise<void> {
  await http.post<{ enabled: boolean }>("/auth/2fa/disable", { code });
}


// ─── Stockage ───────────────────────────────────────────────────────────────

export interface FamilleStockage {
  cle: string;
  nom: string;
  detail: string;
  fichiers: number;
  octets: number;
}

export interface UsageStockage {
  /** `false` quand le stockage n'est pas joignable. On ne montre PAS « 0 octet »
   *  dans ce cas : ce serait un mensonge tranquille, l'utilisateur croirait
   *  n'avoir rien stocké. */
  disponible: boolean;
  familles: FamilleStockage[];
  total_octets: number;
  quota_octets: number;
}

export function getStockage(): Promise<UsageStockage> {
  return http.get<UsageStockage>("/user/storage");
}

export function viderStockage(
  famille: string,
): Promise<{ supprimes: number; octets_liberes: number }> {
  return http.delete<{ supprimes: number; octets_liberes: number }>(
    `/user/storage/${encodeURIComponent(famille)}`,
  );
}

/** « 3,4 Mo » plutôt que « 3565158 octets ».
 *
 * Un nombre d'octets brut n'aide personne à décider s'il faut faire le
 * ménage — c'est précisément la décision que cet écran doit rendre possible. */
export function formaterOctets(n: number): string {
  if (n <= 0) return "0 octet";
  const unites = ["octets", "Ko", "Mo", "Go"];
  const i = Math.min(unites.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const valeur = n / Math.pow(1024, i);
  // Une décimale sous 10, aucune au-delà : « 9,4 Mo » est utile, « 412,7 Mo »
  // est du bruit.
  return `${valeur.toLocaleString("fr-FR", {
    maximumFractionDigits: valeur < 10 && i > 0 ? 1 : 0,
  })} ${unites[i]}`;
}
