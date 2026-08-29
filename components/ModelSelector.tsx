"use client";

import { useEffect, useState } from "react";
import { SELECTABLE_MODELS, findModel } from "@/lib/models";

/**
 * Sélecteur de modèle — sobre et lisible, pas décoratif.
 *
 * Les pastilles de couleur par modèle et le badge « Nouveau » en violet
 * donnaient à un choix technique l'allure d'un rayon de bonbons : la couleur
 * ne portait aucune information que le nom ne portait déjà. Ne restent que le
 * nom, ce à quoi le modèle sert, et une coche sur celui qui est actif.
 *
 * Le panneau s'ouvre VERS LE HAUT : le sélecteur vit dans la barre du
 * composeur, en bas de l'écran — un menu déroulant vers le bas sortirait de la
 * fenêtre.
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
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
      >
        {current.name}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Modèle"
            className="absolute bottom-full right-0 z-20 mb-2 w-[21rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"
            style={{ boxShadow: "var(--chat-elev-2, 0 24px 60px -24px rgba(0,0,0,.6))" }}
          >
            <div className="py-1.5">
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
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                          {m.name}
                        </span>
                        {m.isNew && (
                          <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                            Nouveau
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-[var(--text-secondary)]">
                        {m.tagline}
                      </span>
                      <span className="mt-1 block text-[12.5px] leading-snug text-[var(--text-tertiary)]">
                        {m.description}
                      </span>
                    </span>
                    <span className="mt-1 w-4 shrink-0 text-[var(--text-primary)]">
                      {active && <CheckIcon />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="border-t border-[var(--border)] px-4 py-2.5 text-[11.5px] leading-snug text-[var(--text-tertiary)]">
              Images, documents et code sont dirigés automatiquement vers le modèle
              spécialisé.
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
