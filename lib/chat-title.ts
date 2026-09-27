/** Display-only protection for titles supplied by the chat service. */
export type ChatUiLocale = "fr" | "en" | "ar";

export function chatUiLocale(language: string | null | undefined): ChatUiLocale {
  const base = (language || "fr").toLowerCase().split("-")[0];
  return base === "en" || base === "ar" ? base : "fr";
}

export const chatUiCopy: Record<ChatUiLocale, {
  untitled: string;
  conversations: string;
  emptyHistory: string;
  noResults: string;
  tryAnother: string;
}> = {
  fr: { untitled: "Nouvelle conversation", conversations: "Conversations", emptyHistory: "Aucune conversation enregistrée.", noResults: "Aucune conversation trouvée", tryAnother: "Essayez un autre mot-clé." },
  en: { untitled: "New conversation", conversations: "Conversations", emptyHistory: "No saved conversations.", noResults: "No conversations found", tryAnother: "Try another keyword." },
  ar: { untitled: "محادثة جديدة", conversations: "المحادثات", emptyHistory: "لا توجد محادثات محفوظة.", noResults: "لم يتم العثور على محادثات", tryAnother: "جرّب كلمة أخرى." },
};

export type TitleFallbackReason = "empty" | "placeholder" | "malformed" | "incomplete" | "meta";

export function titleFallbackReason(title: unknown): TitleFallbackReason | null {
  if (typeof title !== "string" || !title.trim()) return "empty";
  const value = title.trim().replace(/\s+/g, " ");
  if (/[\u0000-\u001f\ufffd]/u.test(value) || value.length > 160) return "malformed";
  if (/^(?:untitled|new (?:chat|conversation)|sans titre|nouvelle conversation|chat title|conversation title|titre de la conversation)\s*[.!:…-]?$/iu.test(value)) return "placeholder";
  // These are assistant instructions or summaries, not useful conversation names.
  if (/^(?:they want the assistant|the user (?:wants|asks|asked|is asking)|user (?:wants|asks|asked)|the assistant (?:should|must)|as an ai)\b/iu.test(value)) return "meta";
  if (value.length < 90 && /\b(?:to|for|with|about|and|of|the|de|des|du|pour|avec|et|à)\s*$/iu.test(value)) return "incomplete";
  return null;
}

export function displayChatTitle(title: unknown, locale: ChatUiLocale): string {
  return titleFallbackReason(title) ? chatUiCopy[locale].untitled : (title as string).trim();
}

/** Report only counts and reasons; never log user conversation text. */
export function reportTitleFallbacks(sessions: Array<{ title: unknown }>): void {
  const reasons = sessions.map((session) => titleFallbackReason(session.title)).filter((reason) => reason !== null);
  if (reasons.length) console.warn("[chat-title] display fallback used", { count: reasons.length, reasons });
}
