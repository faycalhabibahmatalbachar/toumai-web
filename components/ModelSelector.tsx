"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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
 *
 * CE QUI FAIT LA DIFFÉRENCE ENTRE UNE LISTE ET UN MENU
 * -----------------------------------------------------
 * Trois choses, et aucune n'est décorative :
 *
 * 1. **Le choix actif se voit sans chercher la coche** : sa rangée est teintée
 *    et son nom prend l'accent. Une coche seule, alignée à droite d'un texte
 *    variable, oblige l'œil à traverser la rangée pour répondre à « lequel est
 *    actif ? ».
 * 2. **Le clavier ouvre, parcourt et choisit** (↑ ↓ ⇱ ⇲ ⏎ ⎋), avec le focus
 *    posé sur l'entrée active à l'ouverture et RENDU au bouton à la fermeture.
 *    Sans ce retour, la tabulation repart du haut de la page.
 * 3. **L'ouverture est animée en 120 ms** — assez pour qu'on voie d'où le
 *    panneau sort, trop peu pour qu'on l'attende. `prefers-reduced-motion`
 *    l'annule.
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
  const listId = useId();
  const declencheur = useRef<HTMLButtonElement>(null);
  const rangees = useRef<(HTMLButtonElement | null)[]>([]);

  const indexActif = Math.max(
    0,
    SELECTABLE_MODELS.findIndex((m) => m.id === value),
  );

  // Fermer, c'est aussi rendre le focus : sinon le clavier se retrouve au
  // début du document, loin du composeur qu'on était en train d'utiliser.
  const fermer = useCallback((rendreLeFocus = true) => {
    setOpen(false);
    if (rendreLeFocus) declencheur.current?.focus();
  }, []);

  // À l'ouverture, le focus se pose sur le modèle actif — celui dont on part.
  useEffect(() => {
    if (!open) return;
    rangees.current[indexActif]?.focus();
  }, [open, indexActif]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fermer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fermer]);

  const naviguer = (e: React.KeyboardEvent, index: number) => {
    const dernier = SELECTABLE_MODELS.length - 1;
    const aller = (i: number) => {
      e.preventDefault();
      rangees.current[i]?.focus();
    };
    if (e.key === "ArrowDown") aller(index === dernier ? 0 : index + 1);
    else if (e.key === "ArrowUp") aller(index === 0 ? dernier : index - 1);
    else if (e.key === "Home") aller(0);
    else if (e.key === "End") aller(dernier);
    else if (e.key === "Tab") fermer(false);
  };

  return (
    <div className="relative">
      <button
        ref={declencheur}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // Le clavier ouvre le menu comme une liste déroulante native, par
          // une flèche — sans quoi il faut deviner qu'il s'agit d'un bouton.
          if (!open && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        title="Changer de modèle"
        className="model-trigger"
        data-open={open}
      >
        {current.name}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => fermer(false)} />
          <div
            id={listId}
            role="listbox"
            aria-label="Modèle"
            aria-activedescendant={`${listId}-${indexActif}`}
            className="model-menu absolute bottom-full right-0 z-20 mb-2 w-[18rem] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5"
            style={{ boxShadow: "var(--chat-elev-2, 0 24px 60px -24px rgba(0,0,0,.6))" }}
          >
            {SELECTABLE_MODELS.map((m, index) => {
              const active = m.id === value;
              return (
                <button
                  key={m.id}
                  id={`${listId}-${index}`}
                  ref={(el) => {
                    rangees.current[index] = el;
                  }}
                  role="option"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onKeyDown={(e) => naviguer(e, index)}
                  onClick={() => {
                    onChange(m.id);
                    fermer();
                  }}
                  className="model-row"
                  data-active={active}
                >
                  <span className="min-w-0 flex-1">
                    <span className="model-row-name block truncate text-[14px] font-medium">
                      {m.name}
                    </span>
                    {/* Une seule ligne sous le nom : la description complète
                        transformait un choix à deux entrées en pavé de texte. */}
                    <span className="block truncate text-[12.5px] text-[var(--text-tertiary)]">
                      {m.tagline}
                    </span>
                  </span>
                  <span className="model-row-check w-4 shrink-0">
                    {active && <CheckIcon />}
                  </span>
                </button>
              );
            })}
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
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
