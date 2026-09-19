"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";

import type { TodayWaitingItem, TodayWaitingResponse } from "@/lib/today-api";
import { safeInternalPath } from "@/lib/widgets/core";

function publicRecipientLabel(label?: string | null): string {
  const value = (label ?? "").trim();
  if (!value || /^\+?\d[\d\s().-]{6,}$/.test(value)) return "Contact WhatsApp";
  return value;
}

function waitingDateLabel(raw?: string | null, timezone?: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

function waitingOpenTarget(item: TodayWaitingItem): string | null {
  if (!(item.available_actions ?? []).includes("open")) return null;
  const safe = safeInternalPath(item.deep_link);
  if (!safe) return null;
  return safe.startsWith("/automations/") ? "/automations" : safe;
}

function WaitingCard({
  item,
  timezone,
}: {
  item: TodayWaitingItem;
  timezone?: string;
}) {
  const due = waitingDateLabel(item.due_at, timezone);
  const target = waitingOpenTarget(item);
  const remaining =
    typeof item.attempts?.remaining === "number" ? item.attempts.remaining : null;

  return (
    <article className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--background)]/45 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] text-[var(--cx-text-muted)]"
          aria-hidden="true"
        >
          <MessageCircle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-[var(--cx-text-primary)]">
              {publicRecipientLabel(item.recipient_label)}
            </h3>
            <span className="rounded-full border border-[var(--cx-border-default)] px-2 py-0.5 text-[11px] font-medium text-[var(--cx-text-muted)]">
              {item.status_label || "En attente"}
            </span>
            {item.overdue && (
              <span className="rounded-full border border-[var(--cx-warn-border)] bg-[var(--cx-warn-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--cx-warn-text)]">
                En retard
              </span>
            )}
          </div>

          {item.context && (
            <p className="mt-2 text-sm leading-6 text-[var(--cx-text-muted)]">
              {item.context}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--cx-text-faint)]">
            {due && (
              <span>
                {item.overdue
                  ? "Échéance dépassée · " + due
                  : "Prochaine échéance · " + due}
              </span>
            )}
            {remaining !== null && (
              <span>
                {remaining === 0
                  ? "Aucune relance restante"
                  : remaining === 1
                    ? "1 relance restante"
                    : String(remaining) + " relances restantes"}
              </span>
            )}
          </div>

          {target && (
            <div className="mt-3">
              <Link
                href={target}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
              >
                Ouvrir
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function WaitingSection({
  data,
  loading,
  error,
  timezone,
  retry,
}: {
  data: TodayWaitingResponse | null;
  loading: boolean;
  error: unknown;
  timezone?: string;
  retry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = data?.waiting ?? [];
  const visible = expanded ? items : items.slice(0, 4);
  const remaining = Math.max(0, items.length - visible.length);

  return (
    <section
      className="mt-10"
      aria-labelledby="today-waiting-title"
      aria-busy={loading && !data}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2
            id="today-waiting-title"
            className="text-sm font-semibold text-[var(--cx-text-primary)]"
          >
            En attente
          </h2>
          <p className="mt-1 text-xs text-[var(--cx-text-faint)]">
            Les suivis où Toumaï attend encore une réponse ou une prochaine étape.
          </p>
        </div>
        {data && (
          <span className="text-xs tabular-nums text-[var(--cx-text-faint)]">
            {data.count}
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="grid gap-2.5 sm:grid-cols-2" aria-hidden="true">
          {[0, 1].map((key) => (
            <div
              key={key}
              className="h-36 animate-pulse rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]"
            />
          ))}
        </div>
      ) : error && !data ? (
        <div
          className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-5"
          role="status"
        >
          <p className="text-sm font-semibold text-[var(--cx-text-primary)]">
            Les suivis n’ont pas pu être chargés.
          </p>
          <p className="mt-1 text-sm text-[var(--cx-text-muted)]">
            Le reste de votre journée reste accessible.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-xl border border-[var(--cx-border-default)] px-3 py-2 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
          >
            Réessayer
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-5 py-5">
          <p className="text-sm font-medium text-[var(--cx-text-secondary)]">
            Aucun suivi actif.
          </p>
          <p className="mt-1 text-sm text-[var(--cx-text-muted)]">
            Toumaï n’attend aucune réponse pour le moment.
          </p>
        </div>
      ) : (
        <>
          {data && data.overdue_count > 0 && (
            <p className="mb-3 text-xs font-medium text-[var(--cx-warn-text)]">
              {data.overdue_count === 1
                ? "1 suivi a dépassé son échéance."
                : String(data.overdue_count) + " suivis ont dépassé leur échéance."}
            </p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {visible.map((item) => (
              <WaitingCard key={item.id} item={item} timezone={timezone} />
            ))}
          </div>
          {!expanded && remaining > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
              aria-expanded="false"
            >
              {remaining === 1
                ? "Voir 1 autre suivi"
                : "Voir " + String(remaining) + " autres suivis"}
            </button>
          )}
          {expanded && items.length > 4 && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-2 min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
              aria-expanded="true"
            >
              Réduire
            </button>
          )}
        </>
      )}
    </section>
  );
}
