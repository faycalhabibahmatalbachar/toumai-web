"use client";

import { useEffect, useRef, useState } from "react";
import { SELECTABLE_MODELS, findModel } from "@/lib/models";

/**
 * Sélecteur de modèle — même contenu et même hiérarchie d'information que la
 * feuille du mobile (`model_selector_sheet.dart`) : pastille colorée, nom,
 * accroche, description, badge « Nouveau », coche sur le modèle actif.
 */
export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = findModel(value) ?? SELECTABLE_MODELS[0];
  const panelRef = useRef<HTMLDivElement>(null);

  // Échap referme : un menu qu'on ne peut fermer qu'à la souris bloque la
  // navigation au clavier.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Changer de modèle"
        // Même hauteur (36 px) que les pastilles d'icône de la barre du
        // composeur : à 30 px, le sélecteur flottait entre deux lignes.
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: current.color }}
        />
        {current.name}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            role="listbox"
            aria-label="Modèle"
            className="absolute bottom-full right-0 z-20 mb-2 w-[19rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            style={{ boxShadow: "var(--chat-elev-2, 0 24px 60px -24px rgba(0,0,0,.6))" }}
          >
            <div className="px-4 pb-1 pt-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Modèle</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Choisissez selon ce que vous avez à faire.
              </p>
            </div>
            {SELECTABLE_MODELS.map((m) => {
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[var(--hover)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)` }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {m.name}
                      </span>
                      {m.isNew && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            background: `color-mix(in srgb, ${m.color} 18%, transparent)`,
                            color: m.color,
                          }}
                        >
                          Nouveau
                        </span>
                      )}
                    </span>
                    <span className="block text-xs font-medium text-[var(--text-secondary)]">
                      {m.tagline}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-[var(--text-tertiary)]">
                      {m.description}
                    </span>
                  </span>
                  {active && (
                    <span className="ml-auto shrink-0 pt-0.5 text-[var(--primary)]">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
            <p className="border-t border-[var(--border)] px-4 py-2.5 text-[11px] leading-snug text-[var(--text-tertiary)]">
              Images, documents et code sont dirigés automatiquement vers le modèle spécialisé.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="text-[var(--text-tertiary)] transition-transform"
      style={{ transform: open ? "rotate(180deg)" : undefined }}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
