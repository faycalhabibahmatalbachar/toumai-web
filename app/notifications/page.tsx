"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronLeft,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { useExigerCompte } from "@/hooks/useExigerCompte";
import {
  archiveNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
  type NotificationInboxItem,
} from "@/lib/notifications-api";

const PAGE_SIZE = 30;

function dateLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function eventLabel(event?: string | null) {
  const value = event ?? "";
  if (value.startsWith("security.") || value.startsWith("account.")) return "Sécurité";
  if (value.startsWith("billing.")) return "Paiement";
  if (value.startsWith("automation.")) return "Automatisation";
  if (value.startsWith("whatsapp.")) return "WhatsApp";
  if (value.startsWith("reminder.")) return "Rappel";
  if (value.startsWith("connector.mail")) return "E-mail";
  if (value.startsWith("connector.calendar")) return "Agenda";
  if (value.startsWith("agent.") || value.startsWith("chat.")) return "Assistant";
  return "Toumaï AI";
}

export default function NotificationsPage() {
  useExigerCompte();

  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [page, count] = await Promise.all([
        listNotifications(0, PAGE_SIZE),
        unreadNotificationCount(),
      ]);
      setItems(page.items);
      setHasMore(page.hasMore);
      setUnread(count);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Notifications indisponibles");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function loadMore() {
    if (more || !hasMore) return;
    setMore(true);
    try {
      const page = await listNotifications(items.length, PAGE_SIZE);
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !known.has(item.id))];
      });
      setHasMore(page.hasMore);
    } finally {
      setMore(false);
    }
  }

  async function markRead(item: NotificationInboxItem) {
    if (item.read_at) return;
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, read_at: now, status: "read" } : row)),
    );
    setUnread((value) => Math.max(0, value - 1));
    try {
      await markNotificationRead(item.id);
    } catch {
      void refresh(true);
    }
  }

  async function markAll() {
    if (!unread) return;
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((row) => (row.read_at ? row : { ...row, read_at: now, status: "read" })),
    );
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch {
      void refresh(true);
    }
  }

  async function archive(item: NotificationInboxItem) {
    const wasUnread = !item.read_at;
    setItems((current) => current.filter((row) => row.id !== item.id));
    if (wasUnread) setUnread((value) => Math.max(0, value - 1));
    try {
      await archiveNotification(item.id);
    } catch {
      void refresh(true);
    }
  }

  function open(item: NotificationInboxItem) {
    void markRead(item);
    if (item.deep_link && item.deep_link.startsWith("/")) {
      window.location.assign(item.deep_link);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link
            href="/chat"
            aria-label="Retour au chat"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            <ChevronLeft size={21} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              Notifications
              {unread > 0 && (
                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </h1>
            <p className="text-xs text-[var(--text-tertiary)]">
              Votre Inbox reste disponible même si un Push est manqué.
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              title="Tout marquer comme lu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
            >
              <CheckCheck size={19} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            title="Actualiser"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-6">
        {loading && items.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center">
            <LoaderCircle className="animate-spin text-[var(--text-tertiary)]" />
          </div>
        ) : error && items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
            >
              Réessayer
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--text-tertiary)]">
              <Bell size={24} />
            </span>
            <h2 className="font-semibold">Rien pour le moment</h2>
            <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
              Les événements importants de Toumaï AI apparaîtront ici, même si leur Push externe échoue.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const unreadItem = !item.read_at;
              const urgent = item.priority === "P0" || item.priority === "P1";
              return (
                <article
                  key={item.id}
                  className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]"
                  data-unread={unreadItem ? "1" : undefined}
                >
                  <div className="flex gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                          {eventLabel(item.canonical_event ?? item.event)}
                        </span>
                        {urgent && (
                          <ShieldAlert
                            size={14}
                            className={item.priority === "P0" ? "text-[var(--error)]" : "text-[var(--primary)]"}
                          />
                        )}
                        {unreadItem && (
                          <span
                            className="mt-1 h-2 w-2 rounded-full bg-[var(--primary)]"
                            aria-label="Non lue"
                          />
                        )}
                      </div>
                      <h2 className={`mt-1 text-[15px] leading-snug ${unreadItem ? "font-semibold" : "font-medium"}`}>
                        {item.title || "Toumaï AI"}
                      </h2>
                      {item.body && (
                        <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                          {item.body}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                        {dateLabel(item.created_at)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void archive(item)}
                      title="Archiver"
                      aria-label="Archiver cette notification"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] opacity-70 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] group-hover:opacity-100"
                    >
                      <Archive size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center py-6">
            <button
              type="button"
              disabled={more}
              onClick={() => void loadMore()}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] disabled:opacity-60"
            >
              {more ? "Chargement…" : "Afficher plus"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
