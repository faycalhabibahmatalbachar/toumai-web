import fs from "node:fs";

const page = fs.readFileSync("app/login/page.tsx", "utf8");
const client = fs.readFileSync("lib/whatsapp-auth.ts", "utf8");

function must(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`WA_AUTH_LOGIN_RESILIENCE_FAIL: ${label}`);
  }
}

must(client, "export class WhatsAppAuthError", "typed API error missing");
must(client, "retry_after", "server retry_after is not preserved");
must(client, "estNumeroWhatsappValide", "client-side phone shape validation missing");
must(client, "/^\\+[1-9]\\d{7,14}$/", "international phone validation is not E.164-shaped");

must(page, "whatsappExpiresAt", "OTP expiry clock missing");
must(page, "whatsappResendSeconds", "resend cooldown clock missing");
must(page, "renvoyerWhatsapp", "resend action missing");
must(page, "await envoyerCodeWhatsapp(true)", "resend does not force a fresh request key");
must(page, "if (forceNewKey) whatsappRequestKey.current = null", "fresh resend idempotency reset missing");
must(page, "whatsappFailures >= 5", "five-attempt browser lock missing");
must(page, '"INVALID_CODE",\n        "INVALID_CHALLENGE",', "enumeration-safe verification grouping missing");
must(page, "nextFailures >= 5 ? text.whatsappLocked : text.invalidCode", "generic invalid/locked presentation missing");
must(page, "setTurnstileToken(null)", "single-use Turnstile reset missing");
must(page, "whatsappWidgetUnavailable", "Turnstile unavailable fallback missing");
must(page, "text.whatsappExpired", "expired-code UX missing");
must(page, "text.whatsappInvalidPhone", "invalid phone UX missing");

const turnstileCount = (page.match(/<Turnstile/g) || []).length;
if (turnstileCount < 3) {
  throw new Error("WA_AUTH_LOGIN_RESILIENCE_FAIL: fresh Turnstile is not available for resend");
}

for (const forbidden of [
  "numéro existe sur WhatsApp",
  "numéro n'existe pas sur WhatsApp",
  "compte WhatsApp non lié",
  "not registered on WhatsApp",
]) {
  if (page.toLowerCase().includes(forbidden.toLowerCase())) {
    throw new Error(`WA_AUTH_LOGIN_RESILIENCE_FAIL: enumeration-sensitive copy found: ${forbidden}`);
  }
}

console.log("WA_AUTH_LOGIN_RESILIENCE=PASS");
