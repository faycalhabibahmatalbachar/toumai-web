"use client";

import { type ReactNode } from "react";
import { Check, Minus } from "lucide-react";

/** Panneau de réglages — label discret, surface calme et rangées séparées par
 * des filets fins. La lecture reste verticale, comme dans les meilleurs
 * produits IA : une décision à la fois. */
export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      {title && (
        <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--cx-text-label)]">
          {title}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] shadow-[0_1px_0_rgba(255,255,255,0.025)]">
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
      className={`border-t border-[var(--cx-border-subtle)] px-4 py-[18px] first:border-t-0 sm:px-5 ${
        stacked ? "" : "flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-8"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium leading-5 text-[var(--cx-text-primary)]">{label}</p>
        {description && (
          <p className="mt-1 max-w-[58ch] text-[12.5px] leading-[1.55] text-[var(--cx-text-muted)]">{description}</p>
        )}
      </div>
      <div className={stacked ? "mt-4" : "flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0"}>{children}</div>
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
            <Check size={11} strokeWidth={3.2} />
          ) : (
            <Minus size={10} strokeWidth={3} />
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
    <div className="flex w-full gap-1 overflow-x-auto rounded-[10px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] p-1 sm:w-auto">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            disabled={disabled}
            aria-pressed={active}
            className="min-h-8 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 sm:flex-none"
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
