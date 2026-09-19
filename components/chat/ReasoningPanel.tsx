"use client";

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)} s` : `${Math.round(s)} s`;
}

/**
 * Indicateur de raisonnement public.
 *
 * La chaîne de pensée brute du modèle est privée et ne doit jamais être
 * affichée, y compris pour les anciennes conversations qui l'ont déjà stockée.
 * Le client peut montrer uniquement un état et une durée mesurée.
 */
export function ReasoningPanel({
  reasoning: _privateReasoning,
  durationMs,
  streaming = false,
}: {
  reasoning: string;
  durationMs?: number;
  streaming?: boolean;
}) {
  const duration = formatDuration(durationMs);
  if (!streaming && !duration) return null;

  const label = streaming
    ? "Réflexion en cours…"
    : `Réflexion · ${duration}`;

  return (
    <div
      className="mb-2 px-1.5 py-1 text-[12px] font-medium text-[var(--text-tertiary)]"
      role="status"
      aria-live={streaming ? "polite" : undefined}
    >
      <span className={streaming ? "animate-pulse" : undefined}>{label}</span>
    </div>
  );
}
