// Backend Toumaï AI (Northflank) — même API que l'app mobile.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  "https://api.toumaiai.com/api/v1";

/** Clé publique Turnstile — publique par nature, elle vit dans la page. */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAEdxs3dOVW3EFTsf";

export const SITE_NAME = "Toumaï AI";
export const SITE_TAGLINE = "Votre assistant IA, toujours là.";

// Identifiant client OAuth Google — public par nature (contrairement au
// client secret), sans risque à committer, comme API_BASE ci-dessus.
// Même client que celui utilisé pour Google Agenda côté backend.
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
  "431553802094-ov2mkc9kvl0bofcn32hgpjgu5428gqck.apps.googleusercontent.com";
