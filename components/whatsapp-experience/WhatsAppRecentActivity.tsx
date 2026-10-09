"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, History, RefreshCw } from "lucide-react";
import { getWaActivity, type WaActivityItem, type WaActivityStats } from "@/lib/connectors-api";

type ActivityState = "loading" | "ready" | "empty" | "error";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function labelFor(item: WaActivityItem) {
  const tool = item.tool.replace(/^whatsapp_/, "").replaceAll("_", " ");
  return tool ? tool.charAt(0).toUpperCase() + tool.slice(1) : "Action WhatsApp";
}

export function WhatsAppRecentActivity({
  onBack,
  onOpenAdvanced,
}: {
  onBack: () => void;
  onOpenAdvanced: () => void;
}) {
  const [state, setState] = useState<ActivityState>("loading");
  const [items, setItems] = useState<WaActivityItem[]>([]);
  const [stats, setStats] = useState<WaActivityStats | null>(null);
  const generation = useRef(0);

  async function load() {
    const current = ++generation.current;
    setState("loading");
    try {
      const result = await getWaActivity({ days: 7, limit: 5 });
      if (generation.current !== current) return;
      const nextItems = Array.isArray(result.items) ? result.items.slice(0, 5) : [];
      setItems(nextItems);
      setStats(result.stats || null);
      setState(nextItems.length ? "ready" : "empty");
    } catch {
      if (generation.current !== current) return;
      setItems([]);
      setStats(null);
      setState("error");
    }
  }

  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
    };
  }, []);

  return (
    <section
      className="w-full overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)]"
      data-testid="wa-v2-recent-activity"
      aria-label="Activité WhatsApp récente"
    >
      <header className="flex items-start gap-3 border-b border-[var(--border)] p-4">
        <button
          type="button"
          onClick={onBack}
          data-testid="wa-v2-activity-back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label="Retour aux actions WhatsApp"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)]/50 text-[var(--text-secondary)]">
          <History className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activité récente</h3>
          <p className="mt-0.5 text-[11.5px] leading-5 text-[var(--text-tertiary)]">Les destinataires sont affichés tels que le serveur les a déjà masqués.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === "loading"}
          data-testid="wa-v2-activity-refresh"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          aria-label="Actualiser l’activité WhatsApp"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
        </button>
      </header>

      {stats && state === "ready" ? (
        <div className="grid grid-cols-4 gap-1 border-b border-[var(--border)] px-3 py-2.5" data-testid="wa-v2-activity-stats">
          {[
            ["Total", stats.total],
            ["Messages", stats.messages],
            ["Médias", stats.medias],
            ["Erreurs", stats.errors],
          ].map(([label, value]) => (
            <div key={String(label)} className="min-w-0 text-center">
              <p className="text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">{String(value)}</p>
              <p className="truncate text-[9.5px] text-[var(--text-tertiary)]">{String(label)}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="max-h-[52vh] overflow-y-auto p-3">
        {state === "loading" ? (
          <div className="space-y-2" data-testid="wa-v2-activity-loading" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-[var(--hover)] motion-reduce:animate-none" />)}
          </div>
        ) : null}

        {state === "empty" ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center" data-testid="wa-v2-activity-empty">
            <History className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Aucune activité récente</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-tertiary)]">Aucune action WhatsApp enregistrée sur la période affichée.</p>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center" data-testid="wa-v2-activity-error">
            <CircleAlert className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Activité indisponible</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-tertiary)]">Toumaï ne peut pas lire l’historique actuellement. Aucune donnée n’est inventée.</p>
          </div>
        ) : null}

        {state === "ready" ? (
          <div className="space-y-2" data-testid="wa-v2-activity-list">
            {items.map((item, index) => (
              <article key={`${item.created_at}-${item.tool}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/35 p-3" data-testid="wa-v2-activity-item">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)]">
                    {item.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)]">{labelFor(item)}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]"><Clock3 className="h-3 w-3" aria-hidden="true" />{formatTimestamp(item.created_at)}</span>
                    </div>
                    {item.recipient_masked ? <p className="mt-1 text-[11px] font-medium text-[var(--text-secondary)]" data-testid="wa-v2-activity-recipient">{item.recipient_masked}</p> : null}
                    {item.preview ? <p className="mt-1 line-clamp-2 text-[10.5px] leading-4 text-[var(--text-tertiary)]">{item.preview}</p> : null}
                    <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{item.ok ? "Terminée" : "Échec"} · {item.category}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
        <p className="text-[10.5px] text-[var(--text-tertiary)]">5 événements maximum · 7 derniers jours</p>
        <button type="button" onClick={onOpenAdvanced} className="rounded-xl px-2.5 py-2 text-[11.5px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">Voir tout</button>
      </footer>
    </section>
  );
}
