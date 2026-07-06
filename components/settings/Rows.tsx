"use client";

import { type ReactNode } from "react";

/** Panneau de réglages — langage « Pro » : label de groupe uppercase hors du
 * cadre, carte plate radius 14 à liseré fin, rangées séparées par hairlines.
 * `break-inside-avoid` : les sections s'organisent en colonnes sur écran
 * large sans qu'un panneau soit coupé. */
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-6 break-inside-avoid">
      {title && (
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
          {title}
        </p>
      )}
      <div className="overflow-hidden rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
        {children}
      </div>
    </section>
  );
}

/** Rangée de réglage : libellé + description à gauche, contrôle à droite. */
export function Row({
  label,
  description,
  children,
  stacked = false,
}: {
  label: string;
  description?: string;
  children?: ReactNode;
  /** stacked : le contrôle passe sous le libellé (textarea, listes). */
  stacked?: boolean;
}) {
  return (
    <div
      className={`border-t border-[var(--cx-border-subtle)] px-5 py-4 first:border-t-0 ${
        stacked ? "" : "flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--cx-text-primary)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--cx-text-muted)]">{description}</p>
        )}
      </div>
      <div className={stacked ? "mt-3" : "flex shrink-0 items-center gap-2"}>{children}</div>
    </div>
  );
}

/** Interrupteur « Pro » — état explicite et contrasté : libellé Actif/Inactif
 * + rail accent avec coche dans le pouce quand c'est activé. */
export function CxSwitch({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span
        className="w-[42px] text-right text-[11px] font-semibold"
        style={{ color: checked ? "var(--cx-success-text)" : "var(--cx-text-faint)" }}
        aria-hidden="true"
      >
        {checked ? "Actif" : "Inactif"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-[26px] w-[46px] rounded-full border transition-colors disabled:opacity-40"
        style={
          checked
            ? { background: "var(--cx-accent)", borderColor: "var(--cx-accent)" }
            : { background: "var(--cx-input)", borderColor: "var(--cx-border-strong)" }
        }
      >
        <span
          className="absolute top-1/2 flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center rounded-full bg-white transition-all"
          style={{
            left: checked ? "23px" : "2px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
            color: checked ? "var(--cx-accent)" : "var(--cx-text-faint)",
          }}
        >
          {checked ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}

/** Contrôle segmenté — choix exclusif compact (ton, thème, taille…). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 rounded-[10px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            disabled={disabled}
            aria-pressed={active}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40"
            style={
              active
                ? {
                    background: "var(--cx-surface)",
                    color: "var(--cx-text-primary)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                  }
                : { color: "var(--cx-text-muted)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
