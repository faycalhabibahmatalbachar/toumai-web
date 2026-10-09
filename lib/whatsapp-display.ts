const INTERNAL_REASONING_MARKERS = [
  /\bthe user\b/i,
  /\bwe need to\b/i,
  /\bwe should\b/i,
  /\bwe can respond\b/i,
  /\bwe cannot\b/i,
  /\binstruction:/i,
  /\brespond in the same language\b/i,
  /\blikely a different language\b/i,
  /\blet'?s try to\b/i,
  /\bthis is likely\b/i,
];

export function isLikelyInternalReasoning(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) return false;

  let matches = 0;
  for (const marker of INTERNAL_REASONING_MARKERS) {
    if (marker.test(text)) matches += 1;
    if (matches >= 2) return true;
  }

  return false;
}

export function safeWhatsAppVisibleText(
  value: string | null | undefined,
): string | null {
  const text = (value || "").trim();
  if (!text) return null;
  if (isLikelyInternalReasoning(text)) return null;
  return text;
}


export function isTechnicalWhatsAppIdentity(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) return false;
  return /@(lid|s\.whatsapp\.net|g\.us)$/i.test(text) || /^\d{16,}$/.test(text);
}

export function whatsAppNumberFromIdentity(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) return null;
  // WhatsApp LIDs (and group JIDs) do not encode a real phone number.
  if (text.includes("@") && !text.endsWith("@s.whatsapp.net")) return null;
  const local = text.includes("@") ? text.split("@", 1)[0] : text;
  const digits = local.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

export function displayWhatsAppIdentity(input: {
  name?: string | null;
  number?: string | null;
  id?: string | null;
  kind?: "contact" | "group" | string | null;
}) {
  const candidate = (input.name || "").trim();
  const privateJid = Boolean(input.id?.endsWith("@lid"));
  const generic = /^(whatsapp|groupe whatsapp|whatsapp group|group whatsapp|group|groupe|contact|contact whatsapp|whatsapp contact|unknown|undefined|null)$/i.test(candidate);
  if (
    candidate &&
    !generic &&
    !isTechnicalWhatsAppIdentity(candidate) &&
    candidate !== input.id &&
    !(privateJid && /^\+?\d{14,16}$/.test(candidate))
  ) {
    return candidate;
  }

  const number = privateJid
    ? null
    : (whatsAppNumberFromIdentity(input.id) || whatsAppNumberFromIdentity(input.number));
  if (number && input.kind !== "group") return `+${number}`;

  return input.kind === "group" ? "Groupe WhatsApp" : "WhatsApp";
}

export function displayWhatsAppSecondary(input: {
  number?: string | null;
  id?: string | null;
  kind?: "contact" | "group" | string | null;
}) {
  const number = input.id?.endsWith("@lid")
    ? null
    : (whatsAppNumberFromIdentity(input.id) || whatsAppNumberFromIdentity(input.number));
  if (number && input.kind !== "group") return `+${number}`;
  return input.kind === "group" ? "Groupe WhatsApp" : "WhatsApp";
}
