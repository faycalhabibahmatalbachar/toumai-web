"use client";

/** Tableau de bord WhatsApp — design « Pro » (langage Connecteurs Pro) :
 * en-tête display + vrai logo WhatsApp sur tuile blanche, cartes KPI chiffres
 * Newsreader, journal en liste groupée avec icônes SVG trait (jamais d'emoji),
 * rail droit sticky (répartition, confidentialité, actions rapides).
 * Confidentialité : les numéros arrivent déjà masqués du serveur
 * (+235 66•••••61) — ils ne transitent jamais en clair. */

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { cxScopeClass, cxScopeStyle, cxDisplayStyle } from "@/components/settings/cx-fonts";

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
    <div className={`${cxScopeClass} flex min-h-dvh flex-col`} style={cxScopeStyle}>
      {/* ── Topbar sticky ── */}
      <header className="sticky top-0 z-30 flex select-none items-center justify-between bg-[var(--background)]/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            draggable={false}
            aria-label="Retour au chat"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]"
          >
            <BackIcon />
          </Link>
          <span className="text-sm text-[var(--cx-text-faint)]">
            Toumaï AI <span className="mx-1">/</span>
            <span className="text-[var(--cx-text-secondary)]">Tableau de bord WhatsApp</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:flex"
            style={{
              color: connected ? "var(--cx-success-text)" : "var(--cx-text-muted)",
              background: connected ? "var(--cx-success-bg)" : "var(--cx-hover)",
              borderColor: connected ? "var(--cx-success-border)" : "var(--cx-border-default)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: connected ? "var(--cx-success)" : "var(--cx-text-faint)",
                animation: connected ? "cx-pulse 2.4s ease-in-out infinite" : undefined,
              }}
              aria-hidden="true"
            />
            {connected ? "Auto-pilote opérationnel" : waState ? "Non connecté" : "Vérification…"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1240px] flex-1 px-4 pb-16 pt-4 md:px-8">
        {/* ── En-tête display ── */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px]"
              style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
              aria-hidden="true"
            >
              <WhatsAppIcon size={26} />
            </div>
            <div>
              <h1
                className="text-[30px] font-medium leading-[1.1] tracking-[-0.015em] text-[var(--cx-text-primary)] sm:text-[38px]"
                style={cxDisplayStyle}
              >
                Tableau de bord WhatsApp
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--cx-text-muted)]">
                {connected ? (
                  <>
                    Compte lié :{" "}
                    <span className="tabular-nums text-[var(--cx-text-secondary)]">
                      {maskLocal(waState?.number)}
                    </span>{" "}
                    — toutes les actions de Toumaï AI, horodatées et filtrables, numéros toujours
                    masqués.
                  </>
                ) : (
                  "Toutes les actions réalisées par Toumaï AI sur votre compte WhatsApp — horodatées, filtrables, numéros toujours masqués."
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!connected && waState && (
              <Link
                href="/settings?tab=connectors"
                className="rounded-[10px] px-[18px] py-2.5 text-sm font-semibold text-[#FFF6F1] transition hover:bg-[var(--cx-accent-hover)]"
                style={{ background: "var(--cx-accent)", boxShadow: "0 4px 14px rgba(232,104,58,0.25)" }}
              >
                Connecter WhatsApp
              </Link>
            )}
            {connected && (
              <Link
                href="/settings?tab=connectors"
                className="rounded-[10px] border px-[18px] py-2.5 text-sm font-semibold transition hover:brightness-110"
                style={{
                  background: "var(--cx-accent-bg)",
                  borderColor: "var(--cx-accent-border)",
                  color: "var(--cx-accent-text)",
                }}
              >
                Gérer les permissions
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-9 xl:flex-row">
          {/* ── Colonne principale ── */}
          <div className="min-w-0 flex-1">
            {/* Cartes KPI */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard icon={<ChatIcon />} label="Messages envoyés" value={stats?.messages} loaded={!!stats} />
              <KpiCard icon={<ImageIcon />} label="Médias partagés" value={stats?.medias} loaded={!!stats} />
              <KpiCard icon={<BoltIcon />} label="Actions réalisées" value={stats?.actions} loaded={!!stats} />
              <KpiCard icon={<ChartIcon />} label="Total interactions" value={stats?.total} loaded={!!stats} />
            </div>

            {/* Filtres : catégories + période */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium transition"
                      style={
                        active
                          ? {
                              borderColor: "var(--cx-accent-border)",
                              background: "var(--cx-accent-bg)",
                              color: "var(--cx-accent-text)",
                            }
                          : {
                              borderColor: "var(--cx-border-default)",
                              color: "var(--cx-text-muted)",
                            }
                      }
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 gap-1 self-start rounded-[10px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] p-1">
                {PERIODS.map((p) => {
                  const active = days === p.days;
                  return (
                    <button
                      key={p.days}
                      onClick={() => setDays(p.days)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition"
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
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Journal d'activité */}
            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
                  Journal d&apos;activité
                </p>
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--cx-text-faint)]">
                  <ShieldIcon /> Numéros masqués · données chiffrées
                </span>
              </div>
              <div className="overflow-hidden rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
                {fetching && (
                  <div className="space-y-2 p-4" aria-hidden="true">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--cx-input)]" />
                    ))}
                  </div>
                )}
                {error && !fetching && (
                  <p className="p-5 text-sm text-[var(--cx-error-text)]">{error}</p>
                )}
                {!fetching && !error && items.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <span
                      className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[11px] text-[var(--cx-text-faint)]"
                      style={{ background: "var(--cx-hover)" }}
                      aria-hidden="true"
                    >
                      <InboxIcon />
                    </span>
                    <p className="text-sm text-[var(--cx-text-secondary)]">
                      Aucune interaction {category ? "de ce type " : ""}sur cette période.
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-[var(--cx-text-faint)]">
                      Demandez par exemple à Toumaï AI d&apos;envoyer un message WhatsApp — chaque
                      action exécutée apparaîtra ici.
                    </p>
                  </div>
                )}

                {!fetching &&
                  !error &&
                  items.map((it, i) => (
                    <div
                      key={`${it.created_at}-${i}`}
                      className="flex items-start gap-3.5 border-t border-[var(--cx-border-subtle)] px-5 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--cx-hover-row)]"
                    >
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                        style={{
                          background: it.ok ? "var(--cx-accent-bg)" : "var(--cx-error-bg)",
                          color: it.ok ? "var(--cx-accent-text)" : "var(--cx-error-text)",
                        }}
                        aria-hidden="true"
                      >
                        <CategoryIcon category={it.category} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--cx-text-primary)]">
                          {CATEGORY_LABEL[it.category] ?? it.tool}
                          {it.recipient_masked && (
                            <span className="font-normal tabular-nums text-[var(--cx-text-secondary)]">
                              {" "}
                              — {it.recipient_masked}
                            </span>
                          )}
                        </p>
                        {it.preview && (
                          <p className="mt-0.5 truncate text-[13px] text-[var(--cx-text-muted)]">
                            {it.preview}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs tabular-nums text-[var(--cx-text-faint)]">
                          {formatTime(it.created_at)}
                        </p>
                        <span
                          className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                          style={
                            it.ok
                              ? {
                                  background: "var(--cx-success-bg)",
                                  borderColor: "var(--cx-success-border)",
                                  color: "var(--cx-success-text)",
                                }
                              : {
                                  background: "var(--cx-error-bg)",
                                  borderColor: "var(--cx-error-border)",
                                  color: "var(--cx-error-text)",
                                }
                          }
                        >
                          <span
                            className="h-[5px] w-[5px] rounded-full"
                            style={{ background: it.ok ? "var(--cx-success)" : "var(--cx-error)" }}
                            aria-hidden="true"
                          />
                          {it.ok ? "Réussi" : "Échec"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* ── Rail droit ── */}
          <aside className="w-full shrink-0 xl:w-[280px]">
            <div className="space-y-4 xl:sticky xl:top-[76px]">
              <RailCard label="Répartition">
                {stats && stats.total > 0 ? (
                  <div className="space-y-3">
                    <Breakdown label="Messages" value={stats.messages} total={stats.total} color="var(--cx-accent)" />
                    <Breakdown label="Médias" value={stats.medias} total={stats.total} color="var(--cx-success)" />
                    <Breakdown label="Actions" value={stats.actions} total={stats.total} color="var(--cx-info-text)" />
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed text-[var(--cx-text-faint)]">
                    Les statistiques apparaîtront dès la première action sur la période.
                  </p>
                )}
              </RailCard>

              <RailCard label="Confidentialité">
                <ul className="space-y-2.5">
                  {[
                    "Numéros masqués côté serveur",
                    "Données chiffrées de bout en bout",
                    "Chaque action sensible confirmée",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--cx-text-secondary)]"
                    >
                      <span className="mt-0.5 shrink-0 text-[var(--cx-success-text)]" aria-hidden="true">
                        <CheckIcon />
                      </span>
                      {line}
                    </li>
                  ))}
                </ul>
              </RailCard>

              <RailCard label="Actions rapides">
                {[
                  { label: "Gérer les connecteurs", href: "/settings?tab=connectors", icon: <PlugIcon /> },
                  { label: "Choix de confidentialité", href: "/privacy-choices", icon: <ShieldIcon /> },
                  { label: "Retour au chat", href: "/chat", icon: <ChatIcon /> },
                ].map((a) => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className="flex w-full items-center justify-between gap-2 rounded-[9px] px-2 py-2.5 text-left text-[13px] font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-[var(--cx-text-muted)]" aria-hidden="true">
                        {a.icon}
                      </span>
                      {a.label}
                    </span>
                    <ChevronRightIcon />
                  </Link>
                ))}
              </RailCard>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- Blocs ---------- */

function KpiCard({
  icon,
  label,
  value,
  loaded,
}: {
  icon: ReactNode;
  label: string;
  value?: number;
  loaded: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-4">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-[10px]"
        style={{ background: "var(--cx-accent-bg)", color: "var(--cx-accent-text)" }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p
        className="mt-3 text-[28px] font-medium leading-none tabular-nums text-[var(--cx-text-primary)]"
        style={cxDisplayStyle}
      >
        {loaded ? (value ?? 0).toLocaleString("fr-FR") : "—"}
      </p>
      <p className="mt-1.5 text-[13px] text-[var(--cx-text-muted)]">{label}</p>
    </div>
  );
}

function RailCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-4">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Ligne de répartition — libellé, compte, mini-barre proportionnelle. */
function Breakdown({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] text-[var(--cx-text-secondary)]">{label}</span>
        <span className="text-[12px] tabular-nums text-[var(--cx-text-muted)]">
          {value.toLocaleString("fr-FR")} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--cx-input)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>
    </div>
  );
}

/* ---------- Utilitaires ---------- */

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

/* ---------- Icônes — traits SVG 1.8px, jamais d'emoji ---------- */

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "message":
      return <ChatIcon />;
    case "image":
      return <ImageIcon />;
    case "video":
      return <VideoIcon />;
    case "audio":
      return <MicIcon />;
    case "document":
      return <DocIcon />;
    case "fichier":
      return <PaperclipIcon />;
    case "statut":
      return <MegaphoneIcon />;
    case "lecture":
      return <EyeIcon />;
    case "resume":
      return <NoteIcon />;
    case "recherche":
      return <SearchIcon />;
    case "analyse":
      return <ChartIcon />;
    case "gestion":
      return <PencilIcon />;
    case "contacts":
      return <UserIcon />;
    case "avance":
      return <BoltIcon />;
    default:
      return <DotIcon />;
  }
}

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...S} strokeWidth={2}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3.5 18l5-5 3.5 3.5L16 12l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5l6-3.5v10l-6-3.5" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path
        d="M21 12.5l-8.5 8.5a6 6 0 01-8.5-8.5L12.5 4a4 4 0 015.7 5.7L9.7 18.2a2 2 0 01-2.8-2.8l8-8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M3 11v3l14 4V6L3 11z" strokeLinejoin="round" />
      <path d="M17 8.5a3.5 3.5 0 010 6M7 14.5V19a1.5 1.5 0 003 0v-3.6" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S} strokeWidth={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path
        d="M17 3l4 4L8 20l-5 1 1-5L17 3z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" {...S}>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" strokeLinejoin="round" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...S}>
      <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0V8zM12 18v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...S}>
      <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...S} strokeWidth={2}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...S}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinejoin="round" />
      <path
        d="M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.7 4H7.3a2 2 0 00-1.8 1.1z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...S} strokeWidth={2} className="text-[var(--cx-text-faint)]">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
