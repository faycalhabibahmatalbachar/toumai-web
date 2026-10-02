import { API_BASE } from "./config";
import { saveSession, type TokenPayload } from "./api";

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
