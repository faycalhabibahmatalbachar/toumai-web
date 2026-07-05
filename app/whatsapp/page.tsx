"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getWaActivity,
  getWhatsAppStatus,
  type WaActivityItem,
  type WaActivityStats,
  type WhatsAppState,
} from "@/lib/connectors-api";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Tableau de bord WhatsApp — centralise TOUTES les interactions de l'IA sur
 * le compte WhatsApp lié : logs structurés par type, horodatés, filtrables.
 * Confidentialité : les numéros arrivent déjà masqués du serveur
 * (+235 66•••••61) — ils ne transitent jamais en clair. */

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "90 jours" },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "Tout" },
  { value: "message", label: "Messages" },
  { value: "image", label: "Images" },
  { value: "audio", label: "Audios" },
  { value: "document", label: "Documents" },
  { value: "statut", label: "Statuts" },
  { value: "lecture", label: "Lecture" },
  { value: "resume", label: "Résumés" },
  { value: "gestion", label: "Gestion" },
];

const CATEGORY_ICON: Record<string, string> = {
  message: "💬",
  image: "🖼️",
  video: "🎬",
  audio: "🎙️",
  document: "📄",
  fichier: "📎",
  statut: "📢",
  lecture: "👁️",
  resume: "📝",
  recherche: "🔎",
  analyse: "📊",
  gestion: "✏️",
  contacts: "👤",
  avance: "⚡",
  autre: "•",
};

const CATEGORY_LABEL: Record<string, string> = {
  message: "Message envoyé",
  image: "Image envoyée",
  video: "Vidéo envoyée",
  audio: "Audio envoyé",
  document: "Document envoyé",
  fichier: "Fichier envoyé",
  statut: "Statut publié",
  lecture: "Lecture de messages",
  resume: "Résumé de conversation",
  recherche: "Recherche",
  analyse: "Analyse",
  gestion: "Gestion de message",
  contacts: "Contacts",
  avance: "Fonction avancée",
  autre: "Action",
};

export default function WhatsAppDashboardPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const guestAttempted = useRef(false);
  const [days, setDays] = useState(30);
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<WaActivityItem[]>([]);
  const [stats, setStats] = useState<WaActivityStats | null>(null);
  const [waState, setWaState] = useState<WhatsAppState | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => {});
  }, [loading, session, loginAsGuest]);

  useEffect(() => {
    if (!session) return;
    getWhatsAppStatus()
      .then(setWaState)
      .catch(() => {});
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    setError(null);
    getWaActivity({ category: category || undefined, days, limit: 150 })
      .then((d) => {
        setItems(d.items);
        setStats(d.stats);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"))
      .finally(() => setFetching(false));
  }, [session, category, days]);

  const connected = waState?.status === "connected";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex select-none items-center justify-between bg-[var(--background)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            draggable={false}
            aria-label="Retour au chat"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--hover)]"
          >
            <BackIcon />
          </Link>
          <h1 className="landing-serif text-lg tracking-tight">Tableau de bord WhatsApp</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-4">
        <p className="max-w-xl text-sm leading-relaxed text-[var(--text-tertiary)]">
          Toutes les actions réalisées par Toumaï AI sur votre compte WhatsApp — horodatées,
          filtrables, et avec les numéros toujours masqués pour votre confidentialité.
        </p>

        {/* Statut de connexion + période */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: connected ? "var(--success)" : "var(--text-tertiary)" }}
              aria-hidden="true"
            />
            <span className="text-xs font-medium">
              {connected
                ? `Connecté — ${maskLocal(waState?.number)}`
                : waState
                  ? "WhatsApp non connecté"
                  : "Vérification…"}
            </span>
            {!connected && waState && (
              <Link
                href="/settings?tab=connectors"
                className="text-xs font-semibold"
                style={{ color: "var(--primary)" }}
              >
                Connecter →
              </Link>
            )}
          </div>
          <div className="flex gap-0.5 rounded-full border border-[var(--border)] bg-[var(--background)] p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition"
                style={
                  days === p.days
                    ? {
                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }
                    : { color: "var(--text-secondary)" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cartes de synthèse */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Messages envoyés", value: stats?.messages, icon: "💬" },
            { label: "Médias partagés", value: stats?.medias, icon: "🖼️" },
            { label: "Actions réalisées", value: stats?.actions, icon: "⚡" },
            { label: "Total interactions", value: stats?.total, icon: "📊" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
                  style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)" }}
                  aria-hidden="true"
                >
                  {c.icon}
                </span>
                <span className="landing-serif text-2xl tracking-tight">
                  {stats ? (c.value ?? 0).toLocaleString("fr-FR") : "—"}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres par type */}
        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition"
              style={
                category === c.value
                  ? {
                      borderColor: "var(--primary)",
                      background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                    }
                  : { borderColor: "var(--border)", color: "var(--text-secondary)" }
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Journal */}
        <section className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
            <h2 className="text-sm font-semibold">Actions récentes</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
              <ShieldIcon /> Numéros masqués · données chiffrées
            </span>
          </div>

          {fetching && (
            <div className="space-y-2 p-4" aria-hidden="true">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--card)]" />
              ))}
            </div>
          )}
          {error && !fetching && <p className="p-5 text-sm text-[var(--error)]">{error}</p>}
          {!fetching && !error && items.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Aucune interaction {category ? "de ce type " : ""}sur cette période.
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Demandez par exemple à Toumaï AI d&apos;envoyer un message WhatsApp — chaque action
                exécutée apparaîtra ici.
              </p>
            </div>
          )}

          {!fetching &&
            items.map((it, i) => (
              <div
                key={`${it.created_at}-${i}`}
                className="flex items-start gap-3 border-t border-[var(--border)] px-5 py-3.5 first:border-t-0"
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
                  style={{ background: "color-mix(in srgb, var(--primary) 9%, transparent)" }}
                  aria-hidden="true"
                >
                  {CATEGORY_ICON[it.category] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {CATEGORY_LABEL[it.category] ?? it.tool}
                    {it.recipient_masked && (
                      <span className="text-[var(--text-secondary)]"> — {it.recipient_masked}</span>
                    )}
                  </p>
                  {it.preview && (
                    <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">{it.preview}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[var(--text-tertiary)]">{formatTime(it.created_at)}</p>
                  <span
                    className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      it.ok
                        ? { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" }
                        : { background: "color-mix(in srgb, var(--error) 14%, transparent)", color: "var(--error)" }
                    }
                  >
                    {it.ok ? "Réussi" : "Échec"}
                  </span>
                </div>
              </div>
            ))}
        </section>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/settings?tab=connectors"
            className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Gérer les permissions
          </Link>
          <Link
            href="/privacy-choices"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
          >
            Choix de confidentialité
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Masque un numéro reçu du statut de connexion (le seul cas où le backend
 * renvoie encore un numéro complet). */
function maskLocal(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 7) return raw;
  const cc = digits.slice(0, 3);
  const local = digits.slice(3);
  return `+${cc} ${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 4))}${local.slice(-2)}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
        " " +
        d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
