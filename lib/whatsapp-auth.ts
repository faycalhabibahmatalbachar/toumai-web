import { API_BASE } from "./config";
import { authHeaders, saveSession, type TokenPayload } from "./api";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
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

export type WhatsAppVerifyResult =
  | { status: "authenticated" }
  | { status: "mfa_required"; pendingToken: string };

let widgetUnavailable = false;

export function signalerWhatsappWidgetIndisponible(): void {
  widgetUnavailable = true;
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
    throw new Error(body.message || `Erreur ${response.status}`);
  }
  return body.data;
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
