"use client";

import { useEffect, useRef } from "react";

export interface PaletteItem {
  id: string;
  /** Ce qui est tapé après le déclencheur, sans le `/` ni le `@`. */
  trigger: string;
  label: string;
  hint?: string;
  /** Termes supplémentaires qui doivent faire remonter l'entrée. */
  keywords?: string[];
  /** Pastille colorée à gauche (modèles). */
  color?: string;
  /** Grisé + non sélectionnable, avec la raison affichée. */
  disabledReason?: string;
}

/**
 * Liste des commandes `/` et des mentions `@`, au-dessus du composeur.
 *
 * Purement présentationnelle : la navigation au clavier est gérée par le
 * composeur (qui garde le focus dans la zone de texte), ce composant ne fait
 * qu'afficher et réagir à la souris.
 */
export function CommandPalette({
  items,
  activeIndex,
  onHover,
  onPick,
  footer,
}: {
  items: PaletteItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (item: PaletteItem) => void;
  footer?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Garde l'entrée active visible quand on navigue aux flèches.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (items.length === 0) return null;

  return (
    <div
      role="listbox"
      className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
    >
      <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
        {items.map((item, i) => {
          const disabled = Boolean(item.disabledReason);
          return (
            <button
              key={item.id}
              data-index={i}
              role="option"
              aria-selected={i === activeIndex}
              disabled={disabled}
              onMouseEnter={() => onHover(i)}
              // `onMouseDown` plutôt que `onClick` : le clic ne doit pas
              // d'abord retirer le focus de la zone de texte.
              onMouseDown={(e) => {
                e.preventDefault();
                if (!disabled) onPick(item);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition disabled:opacity-45"
              style={{ background: i === activeIndex && !disabled ? "var(--hover)" : undefined }}
            >
              {item.color ? (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
              ) : (
                <span className="shrink-0 font-mono text-xs text-[var(--text-tertiary)]">
                  /{item.trigger}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[var(--text-primary)]">
                  {item.label}
                </span>
                {(item.disabledReason || item.hint) && (
                  <span className="block truncate text-xs text-[var(--text-tertiary)]">
                    {item.disabledReason ?? item.hint}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {footer && (
        <p className="border-t border-[var(--border)] px-3.5 py-2 text-[11px] text-[var(--text-tertiary)]">
          {footer}
        </p>
      )}
    </div>
  );
}

/** Filtre sur le début du mot puis sur le contenu — l'entrée exacte d'abord. */
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const score = (it: PaletteItem): number => {
    const hay = [it.trigger, it.label, ...(it.keywords ?? [])].map((s) => s.toLowerCase());
    if (hay.some((h) => h.startsWith(q))) return 0;
    if (hay.some((h) => h.includes(q))) return 1;
    return 2;
  };
  return items
    .map((it) => ({ it, s: score(it) }))
    .filter((x) => x.s < 2)
    .sort((a, b) => a.s - b.s)
    .map((x) => x.it);
}
