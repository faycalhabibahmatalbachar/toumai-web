"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Info,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Workflow,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import {
  getToday,
  getTodayBrief,
  type TodayBrief,
  type TodayItem,
  type TodayPriority,
  type TodayResponse,
} from "@/lib/today-api";
import { getProfile, prenomAffichable, type UserProfile } from "@/lib/user-api";
import { useCached } from "@/lib/swr-cache";
import { safeHttpUrl, safeInternalPath } from "@/lib/widgets/core";

const TIMELINE_SECTIONS = [
  { key: "overdue", label: "En retard" },
  { key: "now", label: "Maintenant" },
  { key: "later_today", label: "Plus tard" },
  { key: "evening", label: "Ce soir" },
  { key: "unscheduled", label: "À traiter" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  automation: "Automatisation",
  automation_run: "Automatisation",
  followup: "Suivi",
  reminder: "Rappel",
  document_action: "Document",
  notification: "Notification",
  calendar_event: "Agenda",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pending: "À faire",
  scheduled: "Prévu",
  waiting_for_reply: "En attente",
  followup_due: "Relance prévue",
  executing: "En cours",
  paused: "En pause",
  failed: "À corriger",
  timed_out: "Délai dépassé",
  ambiguous: "À vérifier",
  waiting_approval: "Validation requise",
  waiting_for_approval: "Validation requise",
  action_required: "Action requise",
};

const PRIORITY_LABELS: Record<TodayPriority, string> = {
  critical: "Critique",
  urgent: "Urgent",
  normal: "Normal",
  information: "Information",
};

const PRIORITY_STYLES: Record<TodayPriority, string> = {
  critical: "border-[var(--cx-error-border)] bg-[var(--cx-error-bg)] text-[var(--cx-error-text)]",
  urgent: "border-[var(--cx-warn-border)] bg-[var(--cx-warn-bg)] text-[var(--cx-warn-text)]",
  normal: "border-[var(--cx-info-border)] bg-[var(--cx-info-bg)] text-[var(--cx-info-text)]",
  information: "border-[var(--cx-border-default)] bg-[var(--cx-hover)] text-[var(--cx-text-muted)]",
};

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

function localDateLabel(now: number, localDate?: string): string {
  if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    const [year, month, day] = localDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const text = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
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

function humanPriority(priority: string): { label: string; style: string } {
  if (priority === "critical" || priority === "urgent" || priority === "normal" || priority === "information") {
    return { label: PRIORITY_LABELS[priority], style: PRIORITY_STYLES[priority] };
  }
  return { label: "À suivre", style: PRIORITY_STYLES.normal };
}

function humanStatus(status?: string | null): string {
  return status ? STATUS_LABELS[status] ?? "À suivre" : "À suivre";
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? "Toumaï";
}

function itemTime(item: TodayItem, timezone?: string): string | null {
  const raw = item.due_at || item.scheduled_at;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}

function sourceIcon(source: string) {
  const cls = "h-4 w-4";
  switch (source) {
    case "calendar_event":
      return <CalendarDays className={cls} />;
    case "followup":
      return <MessageCircle className={cls} />;
    case "notification":
      return <Bell className={cls} />;
    case "document_action":
      return <FileText className={cls} />;
    case "automation":
    case "automation_run":
      return <Workflow className={cls} />;
    default:
      return <Clock3 className={cls} />;
  }
}

type OpenTarget = { href: string; external: boolean };

function openTarget(item: TodayItem): OpenTarget | null {
  const actions = new Set(item.available_actions ?? []);
  if (![...actions].some((action) => ["open", "open_calendar", "open_document"].includes(action))) {
    return null;
  }

  const external = safeHttpUrl(item.deep_link);
  if (external) return { href: external, external: true };

  const internal = safeInternalPath(item.deep_link);
  if (!internal) return null;

  // Automation OS Web uses one static route with ?id=... for details. The
  // backend deep-link is cross-client and may use /automations/<id>.
  if (internal.startsWith("/automations/")) {
    const automationId =
      typeof item.metadata?.automation_id === "string" ? item.metadata.automation_id : null;
    return {
      href: automationId ? `/automations?id=${encodeURIComponent(automationId)}` : "/automations",
      external: false,
    };
  }
  return { href: internal, external: false };
}

function PriorityIcon({ priority }: { priority: string }) {
  if (priority === "critical" || priority === "urgent") {
    return <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (priority === "information") {
    return <Info className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />;
}

function TodayCard({
  item,
  timezone,
  compact = false,
}: {
  item: TodayItem;
  timezone?: string;
  compact?: boolean;
}) {
  const priority = humanPriority(item.priority);
  const time = itemTime(item, timezone);
  const target = openTarget(item);

  return (
    <article className="group rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--background)]/45 p-4 transition hover:border-[var(--cx-border-default)] sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] text-[var(--cx-text-muted)]"
          aria-hidden="true"
        >
          {sourceIcon(item.source_type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {time && (
              <span className="text-xs font-semibold tabular-nums text-[var(--cx-text-secondary)]">
                {time}
              </span>
            )}
            <span className="text-xs text-[var(--cx-text-faint)]">{sourceLabel(item.source_type)}</span>
            <span aria-hidden="true" className="text-[var(--cx-text-faint)]">·</span>
            <span className="text-xs text-[var(--cx-text-faint)]">{humanStatus(item.status)}</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-6 text-[var(--cx-text-primary)]">
            {item.title}
          </h3>
          {!compact && item.summary && (
            <p className="mt-1 text-sm leading-6 text-[var(--cx-text-muted)]">{item.summary}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priority.style}`}
              aria-label={`Priorité : ${priority.label}`}
            >
              <PriorityIcon priority={item.priority} />
              {priority.label}
            </span>
            {target && (
              target.external ? (
                <a
                  href={target.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
                >
                  Ouvrir
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  href={target.href}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
                >
                  Ouvrir
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TimelineSection({
  title,
  items,
  timezone,
}: {
  title: string;
  items: TodayItem[];
  timezone?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const visible = expanded ? items : items.slice(0, 4);
  const remaining = Math.max(0, items.length - visible.length);

  return (
    <section className="mt-9" aria-labelledby={`timeline-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id={`timeline-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="text-sm font-semibold text-[var(--cx-text-primary)]"
        >
          {title}
        </h2>
        <span className="text-xs tabular-nums text-[var(--cx-text-faint)]">{items.length}</span>
      </div>
      <div className="grid gap-2.5">
        {visible.map((item) => (
          <TodayCard key={item.id} item={item} timezone={timezone} />
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 min-h-10 rounded-xl px-3 text-sm font-semibold text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
          aria-expanded="false"
        >
          Voir {remaining === 1 ? "1 autre" : `${remaining} autres`}
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
    </section>
  );
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
  const brief = useCached<TodayBrief>("today:brief", getTodayBrief, {
    enabled: Boolean(session),
    ttlMs: 30_000,
    revalidateOnFocus: true,
  });

  const firstName = useMemo(
    () => prenomAffichable(profile.data?.full_name),
    [profile.data?.full_name],
  );
  const count = attentionCount(today.data);
  const timelineCount = useMemo(
    () =>
      TIMELINE_SECTIONS.reduce(
        (sum, section) => sum + (today.data?.timeline?.[section.key]?.length ?? 0),
        0,
      ),
    [today.data],
  );

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([today.refresh(), brief.refresh(), profile.refresh()]);
    } finally {
      setRefreshing(false);
    }
  }, [brief, profile, refreshing, today]);

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
                  {localDateLabel(now, today.data?.local_date)}
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

        <section
          className="mt-8 overflow-hidden rounded-3xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] shadow-[0_1px_0_rgba(255,255,255,0.025)]"
          aria-labelledby="today-brief-title"
          aria-busy={brief.loading && !brief.data}
        >
          <div className="flex items-center gap-3 border-b border-[var(--cx-border-subtle)] px-5 py-4 sm:px-6">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]"
              aria-hidden="true"
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id="today-brief-title" className="text-sm font-semibold text-[var(--cx-text-primary)]">
                Brief Toumaï
              </h2>
              <p className="mt-0.5 text-xs text-[var(--cx-text-faint)]">
                L’essentiel de votre journée, en quelques secondes.
              </p>
            </div>
          </div>

          {brief.loading && !brief.data ? (
            <div className="space-y-3 px-5 py-5 sm:px-6" aria-hidden="true">
              <div className="h-4 w-full animate-pulse rounded-lg bg-[var(--cx-hover)]" />
              <div className="h-4 w-[92%] animate-pulse rounded-lg bg-[var(--cx-hover)]" />
              <div className="h-4 w-[68%] animate-pulse rounded-lg bg-[var(--cx-hover)]" />
            </div>
          ) : brief.data?.text ? (
            <div className="px-5 py-5 sm:px-6">
              <p className="max-w-3xl text-[15px] leading-7 text-[var(--cx-text-secondary)]">
                {brief.data.text}
              </p>
            </div>
          ) : (
            <div className="px-5 py-5 sm:px-6" role={brief.error ? "status" : undefined}>
              <p className="text-sm text-[var(--cx-text-muted)]">
                {brief.error
                  ? "Le brief est momentanément indisponible. Le reste de votre journée reste accessible."
                  : "Rien à résumer pour le moment."}
              </p>
              {brief.error && (
                <button
                  type="button"
                  onClick={() => void brief.refresh()}
                  className="mt-3 rounded-xl border border-[var(--cx-border-default)] px-3 py-2 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cx-accent)]"
                >
                  Réessayer le brief
                </button>
              )}
            </div>
          )}
        </section>

        {today.data && timelineCount === 0 && (
          <div className="mt-9 rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-5 py-7 text-center">
            <p className="text-sm font-semibold text-[var(--cx-text-primary)]">Votre journée est dégagée.</p>
            <p className="mt-1 text-sm text-[var(--cx-text-muted)]">
              Aucun élément planifié ou à traiter n’apparaît pour le moment.
            </p>
          </div>
        )}

        {today.data &&
          TIMELINE_SECTIONS.map((section) => (
            <TimelineSection
              key={section.key}
              title={section.label}
              items={today.data?.timeline?.[section.key] ?? []}
              timezone={today.data?.timezone}
            />
          ))}

        {today.data && today.data.tomorrow_preview.length > 0 && (
          <section className="mt-11 border-t border-[var(--cx-border-subtle)] pt-7" aria-labelledby="tomorrow-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="tomorrow-title" className="text-sm font-semibold text-[var(--cx-text-primary)]">
                  Demain
                </h2>
                <p className="mt-1 text-xs text-[var(--cx-text-faint)]">Un aperçu, sans surcharger aujourd’hui.</p>
              </div>
              {today.data.integrations.google_calendar?.connected && (
                <span className="rounded-full border border-[var(--cx-border-default)] px-2.5 py-1 text-[11px] font-medium text-[var(--cx-text-muted)]">
                  Agenda connecté
                </span>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {today.data.tomorrow_preview.slice(0, 4).map((item) => (
                <TodayCard key={item.id} item={item} timezone={today.data?.timezone} compact />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
