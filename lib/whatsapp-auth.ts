import { API_BASE } from "./config";
import { authHeaders, saveSession, type TokenPayload } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T | Record<string, unknown>;
}

export interface WhatsAppChallenge {
  challenge_id: string;
  destination: string;
  expires_in: number;
  resend_after: number;
}

export interface WhatsAppMfaChallenge {
  mfa_required: true;
  pending_token: string;
}

export interface WhatsAppEnrollmentStatus {
  enrolled: boolean;
  phone_masked?: string | null;
  verified_at?: string | null;
  required: boolean;
}

export interface WhatsAppEnrollmentVerified {
  enrolled: true;
  phone_masked?: string | null;
  verified_at?: string | null;
}

export interface WhatsAppMfaRecoveryStatus {
  available: boolean;
  phone_masked?: string | null;
}

export type WhatsAppMfaRecoveryPayload = TokenPayload & {
  mfa_reset?: boolean;
};

export type WhatsAppVerifyResult =
  | { status: "authenticated" }
  | { status: "mfa_required"; pendingToken: string };

export class WhatsAppAuthError extends Error {
  readonly code: string | null;
  readonly status: number;
  readonly retryAfter: number | null;

  constructor(message: string, options: { code?: string | null; status: number; retryAfter?: number | null }) {
    super(message);
    this.name = "WhatsAppAuthError";
    this.code = options.code ?? null;
    this.status = options.status;
    this.retryAfter = options.retryAfter ?? null;
  }
}

export function isWhatsAppAuthError(value: unknown): value is WhatsAppAuthError {
  return value instanceof WhatsAppAuthError;
}

/** Validation de forme uniquement. Elle ne doit jamais servir à révéler si un
 * numéro possède un compte Toumaï ou s'il est inscrit sur WhatsApp. */
export function estNumeroWhatsappValide(value: string): boolean {
  const compact = value.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(compact);
}

let widgetUnavailable = false;

export function signalerWhatsappWidgetIndisponible(): void {
  widgetUnavailable = true;
}

function garantirFallbackTurnstile(turnstileToken: string | null): void {
  // Si un vrai jeton arrive, on revient immédiatement à la validation
  // Cloudflare normale. Sans jeton, on déclare le fallback prévu par le
  // backend afin qu'un widget bloqué ne ferme jamais la porte du compte.
  widgetUnavailable = !turnstileToken;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(widgetUnavailable
        ? { "X-Toumai-Client": "navigateur-sans-widget" }
        : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || body.success === false || !body.data) {
    const details = body.data && typeof body.data === "object"
      ? body.data as Record<string, unknown>
      : {};
    const retryAfterRaw = details.retry_after;
    const retryAfter = typeof retryAfterRaw === "number" && Number.isFinite(retryAfterRaw)
      ? Math.max(0, Math.floor(retryAfterRaw))
      : null;
    throw new WhatsAppAuthError(body.message || `Erreur ${response.status}`, {
      code: typeof details.code === "string" ? details.code : null,
      status: response.status,
      retryAfter,
    });
  }
  return body.data as T;
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
}

export async function demanderCodeWhatsApp(
  phone: string,
  turnstileToken: string | null,
  idempotencyKey: string,
): Promise<WhatsAppChallenge> {
  garantirFallbackTurnstile(turnstileToken);
  return request<WhatsAppChallenge>("/auth/whatsapp/request", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ phone, turnstile_token: turnstileToken }),
  });
}

export async function verifierCodeWhatsApp(
  phone: string,
  challengeId: string,
  code: string,
): Promise<WhatsAppVerifyResult> {
  const data = await request<TokenPayload | WhatsAppMfaChallenge>("/auth/whatsapp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, challenge_id: challengeId, code }),
  });
  if ((data as WhatsAppMfaChallenge).mfa_required === true) {
    return {
      status: "mfa_required",
      pendingToken: (data as WhatsAppMfaChallenge).pending_token,
    };
  }
  const payload: TokenPayload = { ...(data as TokenPayload), is_guest: false };
  saveSession(payload);
  return { status: "authenticated" };
}

/** Vérifie si le compte bloqué sur l'étape MFA possède déjà un WhatsApp
 * vérifié. Le serveur ne renvoie jamais le numéro complet, seulement son masque. */
export async function etatRecuperationMfaWhatsapp(
  pendingToken: string,
): Promise<WhatsAppMfaRecoveryStatus> {
  return request<WhatsAppMfaRecoveryStatus>("/auth/2fa/recovery/whatsapp/status", {
    method: "POST",
    body: JSON.stringify({ pending_token: pendingToken }),
  });
}

/** Demande le code de récupération. Le numéro saisi doit correspondre au
 * numéro WhatsApp déjà vérifié du même compte côté serveur. */
export async function demanderRecuperationMfaWhatsapp(
  pendingToken: string,
  phone: string,
  turnstileToken: string | null,
  idempotencyKey: string,
): Promise<WhatsAppChallenge> {
  garantirFallbackTurnstile(turnstileToken);
  return request<WhatsAppChallenge>("/auth/2fa/recovery/whatsapp/request", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      pending_token: pendingToken,
      phone,
      turnstile_token: turnstileToken,
    }),
  });
}

/** Deuxième preuve de récupération : mot de passe déjà validé + OTP du numéro
 * WhatsApp lié. Le backend détruit alors l'ancien TOTP et ses codes de secours,
 * révoque les anciennes sessions et rend une session neuve. */
export async function verifierRecuperationMfaWhatsapp(
  pendingToken: string,
  phone: string,
  challengeId: string,
  code: string,
): Promise<WhatsAppMfaRecoveryPayload> {
  const data = await request<WhatsAppMfaRecoveryPayload>(
    "/auth/2fa/recovery/whatsapp/verify",
    {
      method: "POST",
      body: JSON.stringify({
        pending_token: pendingToken,
        phone,
        challenge_id: challengeId,
        code,
      }),
    },
  );
  const payload: WhatsAppMfaRecoveryPayload = { ...data, is_guest: false };
  saveSession(payload);
  return payload;
}

/** État d'enrôlement du compte déjà authentifié. Le serveur décide si ce
 * compte fait partie du périmètre obligatoire (email/mot de passe). */
export async function etatEnrolementWhatsApp(): Promise<WhatsAppEnrollmentStatus> {
  return authenticatedRequest<WhatsAppEnrollmentStatus>("/auth/whatsapp/enrollment", {
    method: "GET",
  });
}

/** Demande un OTP pour LIER un nouveau numéro au compte courant. Cette route
 * n'est pas la connexion publique par téléphone : elle exige une session
 * Toumaï valide et ne peut donc pas servir de relais de spam arbitraire. */
export async function demanderCodeEnrolementWhatsApp(
  phone: string,
  turnstileToken: string | null,
  idempotencyKey: string,
): Promise<WhatsAppChallenge> {
  garantirFallbackTurnstile(turnstileToken);
  return authenticatedRequest<WhatsAppChallenge>("/auth/whatsapp/enrollment/request", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ phone, turnstile_token: turnstileToken }),
  });
}

/** Consomme l'OTP une seule fois et lie le numéro au compte courant. */
export async function verifierCodeEnrolementWhatsApp(
  phone: string,
  challengeId: string,
  code: string,
): Promise<WhatsAppEnrollmentVerified> {
  return authenticatedRequest<WhatsAppEnrollmentVerified>("/auth/whatsapp/enrollment/verify", {
    method: "POST",
    body: JSON.stringify({ phone, challenge_id: challengeId, code }),
  });
}