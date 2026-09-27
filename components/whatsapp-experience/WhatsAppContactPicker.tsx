"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Search, UserRound } from "lucide-react";
import { getWaCarnet, type WaCarnet, type WaContact } from "@/lib/connectors-api";

function displayNumber(number: string | null): string {
  if (!number) return "Numéro indisponible";
  const clean = number.trim();
  return clean.startsWith("+") ? clean : `+${clean}`;
}

export function WhatsAppContactPicker({
  actionLabel,
  onBack,
  onSelect,
}: {
  actionLabel: string;
  onBack: () => void;
  onSelect: (contact: WaContact) => void;
}) {
  const [carnet, setCarnet] = useState<WaCarnet | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCarnet(await getWaCarnet());
    } catch (err) {
      setCarnet(null);
      setError(err instanceof Error ? err.message : "Impossible de charger le carnet WhatsApp");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // autoFocus handles the commit itself; the next-frame focus makes the
    // handoff robust if a parent modal finishing its own focus work races us.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [load]);

  const visibleContacts = useMemo(() => {
    if (!carnet) return [];
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return carnet.contacts;
    return carnet.contacts.filter((contact) => {
      const name = contact.name.toLocaleLowerCase("fr");
      const number = contact.number || "";
      return name.includes(normalized) || number.includes(normalized.replace(/\s+/g, ""));
    });
  }, [carnet, query]);

  return (
    <section className="w-full" data-testid="wa-v2-contact-picker" aria-label={`Choisir un contact pour ${actionLabel}`}>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          data-testid="wa-v2-contact-back"
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Actions
        </button>
        <div className="min-w-0 text-right">
          <p className="truncate text-[12px] font-semibold text-[var(--text-primary)]">Choisir un contact</p>
          <p className="truncate text-[10.5px] text-[var(--text-tertiary)]">{actionLabel} · carnet synchronisé</p>
        </div>
      </div>

      {carnet?.source === "base" ? (
        <div
          className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] text-[var(--text-secondary)]"
          data-testid="wa-v2-contact-stale-warning"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Copie enregistrée : la passerelle ne répond pas. Les contacts récents peuvent manquer.</span>
        </div>
      ) : null}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un nom ou un numéro"
          aria-label="Rechercher un contact WhatsApp"
          data-testid="wa-v2-contact-search"
          className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        />
      </label>

      <div className="mt-3 min-h-48 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-[12px] text-[var(--text-tertiary)]" data-testid="wa-v2-contact-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement du carnet…
          </div>
        ) : error ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center" data-testid="wa-v2-contact-error">
            <p className="text-[12px] font-semibold text-[var(--text-primary)]">Carnet indisponible</p>
            <p className="mt-1 max-w-sm text-[11px] text-[var(--text-tertiary)]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Réessayer
            </button>
          </div>
        ) : visibleContacts.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center px-5 text-center" data-testid="wa-v2-contact-empty">
            <UserRound className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="mt-2 text-[12px] font-semibold text-[var(--text-primary)]">
              {query.trim() ? "Aucun contact correspondant" : "Aucun contact synchronisé"}
            </p>
            <p className="mt-1 max-w-sm text-[11px] text-[var(--text-tertiary)]">
              {query.trim()
                ? "Essayez un autre nom ou numéro. La recherche reste locale à la liste chargée."
                : "Ouvrez la gestion WhatsApp pour synchroniser le carnet avant de choisir un destinataire."}
            </p>
          </div>
        ) : (
          <ul className="max-h-[46dvh] divide-y divide-[var(--border)] overflow-y-auto" data-testid="wa-v2-contact-list">
            {visibleContacts.slice(0, 200).map((contact) => {
              const usable = Boolean(contact.number);
              return (
                <li key={contact.jid}>
                  <button
                    type="button"
                    disabled={!usable}
                    onClick={() => usable && onSelect(contact)}
                    data-testid="wa-v2-contact-option"
                    data-contact-jid={contact.jid}
                    data-contact-number={contact.number || ""}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={usable ? `Choisir ${contact.name}, ${displayNumber(contact.number)}` : `${contact.name}, numéro indisponible`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--hover)] text-[13px] font-semibold text-[var(--text-secondary)]" aria-hidden="true">
                      {(contact.name || "#").charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--text-primary)]">{contact.name}</span>
                      <span className={`block truncate text-[11px] text-[var(--text-tertiary)] ${usable ? "" : "italic"}`}>
                        {displayNumber(contact.number)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && !error && carnet ? (
        <p className="mt-2 px-1 text-[10.5px] text-[var(--text-tertiary)]" data-testid="wa-v2-contact-count">
          {visibleContacts.length} affiché{visibleContacts.length > 1 ? "s" : ""} sur {carnet.total_en_base} contact{carnet.total_en_base > 1 ? "s" : ""} synchronisé{carnet.total_en_base > 1 ? "s" : ""}.
        </p>
      ) : null}
    </section>
  );
}
