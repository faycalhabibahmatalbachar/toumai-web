"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 160ms ease",
      }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  return s < 10 ? `${s.toFixed(1)} s` : `${Math.round(s)} s`;
}

/**
 * Panneau « Réflexion » — affiche la trace de raisonnement RÉELLEMENT produite
 * par le modèle, repliée par défaut.
 *
 * Ce composant ne s'affiche que si une trace existe vraiment : « Toumaï 5 »
 * annonçait auparavant qu'il prenait le temps de réfléchir sans qu'aucun
 * raisonnement ne soit demandé ni capturé. La durée affichée est mesurée côté
 * serveur, jamais simulée.
 */
export function ReasoningPanel({
  reasoning,
  durationMs,
  streaming = false,
}: {
  reasoning: string;
  durationMs?: number;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const text = (reasoning || "").trim();
  if (!text) return null;

  const duration = formatDuration(durationMs);
  const label = streaming
    ? "Réflexion en cours…"
    : duration
      ? `Réflexion — ${duration}`
      : "Réflexion";

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] font-medium text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-secondary)]"
      >
        <ChevronIcon open={open} />
        <span className={streaming ? "animate-pulse" : undefined}>{label}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 border-l-2 border-[var(--border)] py-0.5 pl-3">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-tertiary)]">
                {text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
