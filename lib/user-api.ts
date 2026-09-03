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
