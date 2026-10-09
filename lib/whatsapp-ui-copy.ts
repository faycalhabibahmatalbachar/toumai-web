/**
 * WhatsApp UI language: friendly, actionable copy belongs here, not transport
 * diagnostics. Only apply these helpers to application-provided errors/status,
 * NEVER to user messages, contact names or other user-authored content.
 */
import { errorMessage, type ErrorContext } from "./errors";

const INTERNAL_DETAIL = /\b(?:passerelle|gateway|backend|frontend|endpoint|webhook|server[_ -]?ack|SSE|revalidat(?:ion|e)|cache|stale|fallback|payload|json|http\s*[45]\d\d|traceback|stack\s*trace|sha-?256|base\s*de\s*donn[ée]es|non\s*instrument[ée]|mock|simul[ée]|source\s*:\s*|red[ée]marr(?:age|[ée]))\b/i;

/**
 * Preserve meaningful user-facing warnings (rights, timeout, failed delivery,
 * missing files). Replace only internal implementation explanations.
 */
export function whatsappUiCopy(value: string | null | undefined, fallback = "Cette opération n’a pas abouti. Réessayez."): string {
  const text = (value || "").trim();
  if (!text) return fallback;
  if (INTERNAL_DETAIL.test(text) || /[{}]|\b(?:[a-z]+_[a-z_]+|[A-Za-z]+Error:)\b/.test(text) || text.length > 220) return fallback;
  return text;
}

export function whatsappUiError(error: unknown, context: ErrorContext = "generic"): string {
  const fallback: Record<ErrorContext, string> = {
    chat: "Impossible d’actualiser les messages. Réessayez.",
    voice: "Le message vocal n’a pas pu être traité. Réessayez.",
    upload: "Impossible de préparer le fichier. Réessayez.",
    history: "Impossible d’actualiser la conversation. Réessayez.",
    settings: "Impossible d’enregistrer les modifications. Réessayez.",
    generic: "Cette opération n’a pas abouti. Réessayez.",
  };
  return whatsappUiCopy(errorMessage(error, context), fallback[context]);
}

export function whatsappHistoryEntryDetail(entry: { error?: string | null; success?: boolean }): string {
  if (entry.success) return "Effectuée";
  return whatsappUiCopy(entry.error, "Non effectuée");
}
