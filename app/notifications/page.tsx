"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronLeft,
  CreditCard,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MessageCircle,
  Mic,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import {
  archiveNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ToumaiNotification,
} from "@/lib/notifications-api";

const PAGE_SIZE = 50;

function eventName(item: ToumaiNotification): string {
  return item.canonical_event || item.event || "";
}

function iconFor(item: ToumaiNotification) {
  const event = eventName(item);
  if (event.startsWith("security.")) return ShieldCheck;
  if (event.startsWith("billing.")) return CreditCard;
  if (event.startsWith("reminder.") || event.startsWith("automation.")) return TimerReset;
  if (event.startsWith("whatsapp.") || event.startsWith("chat.")) return MessageCircle;
  if (event.startsWith("file.")) return FileText;
  if (event.startsWith("image.")) return ImageIcon;
  if (event.startsWith("voice.")) return Mic;
  if (event.startsWith("agent.")) return Sparkles;
  return Bell;
}

function formatDate(raw?: string | null): string {
  if (!raw) return "";
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) return "";
  const age = Date.now() - value.getTime();
  if (age < 60_000) return "À l’instant";
  if (age < 3_600_000) return "Il y a " + Math.max(1, Math.floor(age / 60_000)) + " min";
  if (age < 86_400_000) return "Il y a " + Math.floor(age / 3_600_000) + " h";
  if (age < 7 * 86_400_000) return "Il y a " + Math.floor(age / 86_400_000) + " j";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: value.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(value);
}

function safeDestination(item: ToumaiNotification): string | null {
  const raw = item.deep_link?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;

  const allowed =
    raw === "/chat" ||
    raw.startsWith("/chat?") ||
    raw === "/automations" ||
    raw.startsWith("/automations?") ||
    raw === "/whatsapp" ||
    raw.startsWith("/whatsapp?") ||
    raw === "/settings" ||
    raw.startsWith("/settings?") ||
    raw === "/library" ||
    raw.startsWith("/library?");
  return allowed ? raw : null;
}

export default function NotificationsPage() {
  useExigerCompte();

  const [items, setItems] = useState<ToumaiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items],
  );

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("notification");
    if (id) setHighlightId(id);
  }, []);

  const load = useCallback(
    async (reset = true) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const offset = reset ? 0 : items.length;
        const page = await listNotifications({ limit: PAGE_SIZE, offset });
        setItems((current) => (reset ? page.data : [...current, ...page.data]));
        setHasMore(page.has_more);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les notifications.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [items.length],
  );

  useEffect(() => {
    void load(true);
    // Chargement initial uniquement; la pagination utilise la version courante ensuite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setBusy(id: string, value: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function read(item: ToumaiNotification) {
    if (item.read_at || busyIds.has(item.id)) return;
    const before = item;
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, read_at: now } : candidate,
      ),
    );
    setBusy(item.id, true);
    try {
      await markNotificationRead(item.id);
    } catch (err) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? before : candidate,
        ),
      );
      setError(
        err instanceof Error
          ? err.message
          : "La notification n’a pas pu être marquée comme lue.",
      );
    } finally {
      setBusy(item.id, false);
    }
  }

  async function open(item: ToumaiNotification) {
    await read(item);
    const destination = safeDestination(item);
    if (destination) window.location.assign(destination);
  }

  async function archive(item: ToumaiNotification) {
    if (busyIds.has(item.id)) return;
    const index = items.findIndex((candidate) => candidate.id === item.id);
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    setBusy(item.id, true);
    try {
      await archiveNotification(item.id);
    } catch (err) {
      setItems((current) => {
        const next = [...current];
        next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
        return next;
      });
      setError(
        err instanceof Error
          ? err.message
          : "La notification n’a pas pu être archivée.",
      );
    } finally {
      setBusy(item.id, false);
    }
  }

  async function markAllRead() {
    if (!unreadCount || markingAll) return;
    const before = items;
    const now = new Date().toISOString();
    setMarkingAll(true);
    setItems((current) =>
      current.map((item) => (item.read_at ? item : { ...item, read_at: now })),
    );
    try {
      await markAllNotificationsRead();
    } catch (err) {
      setItems(before);
      setError(
        err instanceof Error
          ? err.message
          : "Les notifications n’ont pas pu être marquées comme lues.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background)]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/chat"
            aria-label="Retour au chat"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            <ChevronLeft size={21} />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-[-0.01em]">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">
              L’Inbox durable de votre compte Toumaï.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            aria-label="Actualiser"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>

          <Link
            href="/settings?tab=notifications"
            aria-label="Préférences de notification"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            <Settings2 size={18} />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:px-6">
        <div className="mb-4 flex min-h-9 items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {unreadCount
              ? unreadCount.toString() +
                " non lue" +
                (unreadCount > 1 ? "s" : "")
              : "Tout est lu"}
          </p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--primary)] transition hover:bg-[var(--hover)] disabled:opacity-50"
            >
              {markingAll ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCheck size={16} />
              )}
              Tout marquer comme lu
            </button>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[color-mix(in_srgb,var(--error)_32%,transparent)] bg-[color-mix(in_srgb,var(--error)_9%,transparent)] px-4 py-3 text-sm text-[var(--error)]"
          >
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((value) => (
              <div
                key={value}
                className="h-24 animate-pulse rounded-2xl bg-[var(--card)]"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] px-6 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--card)] text-[var(--text-secondary)]">
              <Bell size={25} />
            </span>
            <h2 className="font-semibold">Aucune notification</h2>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
              Les événements importants de Toumaï apparaîtront ici, même si un
              Push ou un Email n’a pas pu être livré.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = iconFor(item);
              const unread = !item.read_at;
              const highlighted = highlightId === item.id;
              const priority = item.priority || "P2";
              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border p-4 transition"
                  style={{
                    borderColor: highlighted ? "var(--primary)" : "var(--border)",
                    background: unread
                      ? "var(--card)"
                      : "color-mix(in srgb, var(--surface) 82%, transparent)",
                    boxShadow: highlighted
                      ? "0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent)"
                      : undefined,
                  }}
                >
                  <div className="flex gap-3.5">
                    <button
                      type="button"
                      onClick={() => void open(item)}
                      className="flex min-w-0 flex-1 gap-3.5 text-left"
                    >
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          color:
                            priority === "P0"
                              ? "var(--error)"
                              : priority === "P1"
                                ? "var(--warning, #d97706)"
                                : "var(--primary)",
                          background:
                            "color-mix(in srgb, currentColor 10%, transparent)",
                        }}
                      >
                        <Icon size={19} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span
                            className={
                              "min-w-0 flex-1 text-sm leading-snug text-[var(--text-primary)] " +
                              (unread ? "font-semibold" : "font-medium")
                            }
                          >
                            {item.title || "Notification"}
                          </span>
                          {unread && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]"
                              aria-label="Non lue"
                            />
                          )}
                        </span>

                        {item.body && (
                          <span className="mt-1.5 block line-clamp-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                            {item.body}
                          </span>
                        )}

                        <span className="mt-2 block text-[11px] text-[var(--text-tertiary)]">
                          {formatDate(item.created_at)}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      title="Archiver"
                      aria-label="Archiver la notification"
                      disabled={busyIds.has(item.id)}
                      onClick={() => void archive(item)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-tertiary)] opacity-60 transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] group-hover:opacity-100 disabled:opacity-30"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void load(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--hover)] disabled:opacity-50"
            >
              {loadingMore && <LoaderCircle size={16} className="animate-spin" />}
              Charger plus
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
