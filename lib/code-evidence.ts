"use client";

/**
 * Filtre défensif pour les commandes/logs Toumaï Code.
 *
 * Le backend reste responsable de ne jamais émettre de secret. Le frontend
 * applique en plus cette redaction avant rendu pour éviter qu'un token,
 * mot de passe ou credential présent par erreur dans une preuve publique
 * soit affiché dans le chat ou le workspace.
 */
export function redactSensitiveText(value?: string | null): string {
  if (!value) return "";

  let output = value;
  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]");
  output = output.replace(
    /(\b(?:authorization|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|secret|password|passwd)\b\s*[:=]\s*)([^\s,;]+)/gi,
    "$1[REDACTED]",
  );
  output = output.replace(
    /(https?:\/\/[^\s\/:@]+:)[^@\s]+@/gi,
    "$1[REDACTED]@",
  );
  return output;
}

export function codingEvidenceStateLabel(state?: string | null): string {
  switch ((state || "").toLowerCase()) {
    case "planned": return "Planifié";
    case "queued": return "En file";
    case "running": return "En cours";
    case "passed":
    case "success":
    case "done": return "Réussi";
    case "failed":
    case "error": return "Échec";
    case "blocked": return "Bloqué";
    case "skipped": return "Ignoré";
    case "cancelled": return "Annulé";
    default: return state || "Aucune preuve publiée";
  }
}
