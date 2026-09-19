"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { RefreshCw, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import { getToday, type TodayResponse } from "@/lib/today-api";
import { getProfile, prenomAffichable, type UserProfile } from "@/lib/user-api";
import { useCached } from "@/lib/swr-cache";

function subscribeClock(notify: () => void) {
  const timer = window.setInterval(notify, 60_000);
  const wake = () => notify();
  window.addEventListener("focus", wake);
  document.addEventListener("visibilitychange", wake);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", wake);
    document.removeEventListener("visibilitychange", wake);
  };
}

function useClientNow(): number {
  return useSyncExternalStore(subscribeClock, () => Date.now(), () => 0);
}

function localDateLabel(now: number): string {
  if (!now) return "Aujourd’hui";
  const text = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(now));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function attentionCount(data: TodayResponse | null): number | null {
  if (!data) return null;
  const explicit = ["attention", "needs_attention", "action_required"]
    .map((key) => data.counts?.[key])
    .find((value): value is number => typeof value === "number");
  if (explicit !== undefined) return explicit;
  return data.items.filter((item) => item.action_required === true).length;
}

function attentionLabel(count: number | null): string {
  if (count === null) return "Votre journée se prépare.";
  if (count === 0) return "Rien ne demande votre attention pour le moment.";
  if (count === 1) return "1 élément demande votre attention.";
  return `${count} éléments demandent votre attention.`;
}

function HeaderSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-hidden="true">
      <div className="h-9 w-52 animate-pulse rounded-xl bg-[var(--cx-hover)]" />
      <div className="h-4 w-40 animate-pulse rounded-lg bg-[var(--cx-hover)]" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded-lg bg-[var(--cx-hover)]" />
    </div>
  );
}

export default function TodayPage() {
  const { session, loading: authLoading } = useAuth();
  const { pret } = useExigerCompte();
  const now = useClientNow();
  const [refreshing, setRefreshing] = useState(false);

  const today = useCached<TodayResponse>("today:center", getToday, {
    enabled: Boolean(session),
    ttlMs: 15_000,
    revalidateOnFocus: true,
  });
  const profile = useCached<UserProfile>("user:profile", getProfile, {
    enabled: Boolean(session),
    ttlMs: 60_000,
    revalidateOnFocus: false,
  });

  const firstName = useMemo(
    () => prenomAffichable(profile.data?.full_name),
    [profile.data?.full_name],
  );
  const count = attentionCount(today.data);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([today.refresh(), profile.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }, [profile, refreshing, today]);

  if (authLoading || !pret) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" aria-label="Chargement" />
      </div>
    );
  }

  return (
    <div className={`${cxScopeClass} min-h-dvh bg-[var(--background)]`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-2 text-sm text-[var(--cx-text-faint)]">
          <Link
            href="/chat"
            className="rounded-lg px-2 py-1.5 transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
          >
            Toumaï AI
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--cx-text-secondary)]">Aujourd’hui</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-7 sm:px-6 md:px-8 md:pt-10">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {firstName && (
              <p className="mb-2 text-sm font-medium text-[var(--cx-text-muted)]">
                Bonjour {firstName}
              </p>
            )}

            {today.loading && !today.data ? (
              <HeaderSkeleton />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--cx-accent-border)] bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]"
                    aria-hidden="true"
                  >
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h1
                    className="text-3xl font-medium tracking-[-.03em] text-[var(--cx-text-primary)] sm:text-4xl"
                    style={cxDisplayStyle}
                  >
                    Aujourd’hui
                  </h1>
                </div>
                <p className="mt-4 text-sm font-medium text-[var(--cx-text-secondary)]">
                  {localDateLabel(now)}
                </p>
                <p className="mt-1.5 text-[15px] leading-6 text-[var(--cx-text-muted)]" aria-live="polite">
                  {attentionLabel(count)}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] px-4 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {refreshing ? "Actualisation…" : "Actualiser"}
          </button>
        </section>

        {today.error && !today.data && (
          <div className="mt-8 rounded-2xl border border-[var(--cx-error-border)] bg-[var(--cx-error-bg)] p-5" role="alert">
            <p className="text-sm font-semibold text-[var(--cx-error-text)]">
              Votre journée n’a pas pu être chargée.
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--cx-text-muted)]">
              Vérifiez votre connexion puis réessayez. Aucun détail technique n’est affiché ici.
            </p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded-xl border border-[var(--cx-error-border)] px-4 py-2 text-sm font-semibold text-[var(--cx-error-text)] transition hover:bg-[var(--cx-hover)]"
            >
              Réessayer
            </button>
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-dashed border-[var(--cx-border-default)] bg-[var(--cx-surface)]/55 p-6 sm:p-8">
          <p className="text-sm font-semibold text-[var(--cx-text-primary)]">Centre Aujourd’hui</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cx-text-muted)]">
            Le résumé, la timeline, les attentes et les actions arrivent ici à partir des données déjà calculées par Toumaï.
          </p>
        </div>
      </main>
    </div>
  );
}
