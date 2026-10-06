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
