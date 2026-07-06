"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getProfile, type UserProfile } from "@/lib/user-api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { cxScopeClass, cxScopeStyle, cxDisplayStyle } from "@/components/settings/cx-fonts";
import { GeneralSection } from "@/components/settings/GeneralSection";
import { PersonalizationSection } from "@/components/settings/PersonalizationSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { VoiceSection } from "@/components/settings/VoiceSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { ConnectorsTab } from "@/components/settings/ConnectorsTab";
import { SupportTab } from "@/components/settings/SupportTab";

type Section =
  | "general"
  | "personalization"
  | "appearance"
  | "voice"
  | "notifications"
  | "connectors"
  | "support";

interface SectionDef {
  id: Section;
  label: string;
  title: string;
  sub: string;
  icon: React.ReactNode;
}

/** Navigation groupée — rail fixe collé au bord gauche de l'écran. */
const GROUPS: { label: string; items: SectionDef[] }[] = [
  {
    label: "Compte",
    items: [
      {
        id: "general",
        label: "Général",
        title: "Général",
        sub: "Votre profil, votre compte et votre utilisation.",
        icon: <UserIcon />,
      },
      {
        id: "personalization",
        label: "Personnalisation",
        title: "Personnalisation",
        sub: "Adaptez le comportement de Toumaï AI à votre façon de travailler.",
        icon: <SparkleIcon />,
      },
    ],
  },
  {
    label: "Expérience",
    items: [
      {
        id: "appearance",
        label: "Apparence",
        title: "Apparence",
        sub: "Thème et confort de lecture.",
        icon: <PaletteIcon />,
      },
      {
        id: "voice",
        label: "Voix",
        title: "Voix de l'assistant",
        sub: "Choisissez la voix du mode vocal — écoutez chaque voix avant de décider.",
        icon: <SoundIcon />,
      },
      {
        id: "notifications",
        label: "Notifications",
        title: "Notifications",
        sub: "Ce que Toumaï AI a le droit de vous signaler.",
        icon: <BellIcon />,
      },
    ],
  },
  {
    label: "Écosystème",
    items: [
      {
        id: "connectors",
        label: "Connecteurs",
        title: "Connecteurs & Intégrations",
        sub: "Gérez les services tiers reliés à Toumaï AI — WhatsApp, Mail, Agenda…",
        icon: <PlugIcon />,
      },
    ],
  },
];

const SUPPORT_SECTION: SectionDef = {
  id: "support",
  label: "Aide & Support",
  title: "Aide & Support",
  sub: "Guides rapides et contact direct.",
  icon: <LifeBuoyIcon />,
};

const ALL_SECTIONS: SectionDef[] = [...GROUPS.flatMap((g) => g.items), SUPPORT_SECTION];

// Compatibilité avec les anciens liens ?tab=… (menu Outils du chat, sidebar).
const LEGACY_TABS: Record<string, Section> = {
  profile: "general",
  preferences: "personalization",
  connectors: "connectors",
  support: "support",
};

export default function SettingsPage() {
  const { session, loading, loginAsGuest } = useAuth();
  const [section, setSection] = useState<Section>("general");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const guestAttempted = useRef(false);

  useEffect(() => {
    if (loading || session || guestAttempted.current) return;
    guestAttempted.current = true;
    loginAsGuest().catch(() => {});
  }, [loading, session, loginAsGuest]);

  useEffect(() => {
    if (!session) return;
    getProfile()
      .then(setProfile)
      .catch(() => {});
  }, [session]);

  // Lien direct vers une section (ex: /settings?tab=connectors) sans
  // useSearchParams (contrainte Suspense de l'export statique).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab") ?? "";
    const target =
      LEGACY_TABS[requested] ??
      (ALL_SECTIONS.some((s) => s.id === requested) ? (requested as Section) : null);
    if (target) setSection(target);
  }, []);

  const isGuest = !session || session.is_guest;
  const current = ALL_SECTIONS.find((s) => s.id === section) ?? ALL_SECTIONS[0];

  const displayName = !session
    ? "Connexion…"
    : session.is_guest
      ? "Session invité"
      : profile
        ? profile.full_name || "Mon compte"
        : "Connexion…";

  function NavItem({ s }: { s: SectionDef }) {
    const active = section === s.id;
    return (
      <button
        onClick={() => setSection(s.id)}
        aria-current={active ? "page" : undefined}
        className="relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--hover)] md:w-full"
        style={{
          background: active ? "color-mix(in srgb, var(--primary) 10%, transparent)" : undefined,
          color: active ? "var(--primary)" : "var(--text-secondary)",
        }}
      >
        {/* Barre d'accent à gauche de l'item actif, collée au bord du rail. */}
        {active && (
          <span
            aria-hidden="true"
            className="absolute -left-4 top-1/2 hidden h-6 w-[3px] -translate-y-1/2 rounded-r-full md:block"
            style={{ background: "var(--primary)" }}
          />
        )}
        <span className={active ? "" : "opacity-70"} aria-hidden="true">
          {s.icon}
        </span>
        {s.label}
      </button>
    );
  }

  return (
    <div className="flex min-h-dvh">
      {/* ── Rail gauche — collé au coin de l'écran, pleine hauteur ── */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] px-4 pb-4 pt-4 md:flex">
        <Link href="/chat" draggable={false} className="flex select-none items-center gap-2.5 px-1">
          <Logo size={26} />
          <span className="text-[15px] font-semibold tracking-tight">Toumaï AI</span>
        </Link>

        {/* Carte identité — mène à la section Général. */}
        <button
          onClick={() => setSection("general")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-left transition hover:border-[var(--primary)]/40"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Logo size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="truncate text-xs capitalize text-[var(--text-tertiary)]">
              {!session ? "" : isGuest ? "Invité" : `Formule ${profile?.plan ?? "free"}`}
            </p>
          </div>
          <ChevronIcon />
        </button>

        <nav className="mt-2 flex-1">
          {GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-tertiary)]">
                {group.label}
              </p>
              {group.items.map((s) => (
                <NavItem key={s.id} s={s} />
              ))}
            </div>
          ))}
          <div className="my-3 h-px bg-[var(--border)]" aria-hidden="true" />
          <NavItem s={SUPPORT_SECTION} />
        </nav>

      </aside>

      {/* ── Contenu ── */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex select-none items-center justify-between bg-[var(--background)]/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              draggable={false}
              aria-label="Retour au chat"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[var(--hover)]"
            >
              <BackIcon />
            </Link>
            <h1 className="landing-serif text-lg tracking-tight">Paramètres</h1>
          </div>
          <div className="flex items-center gap-3">
            {section === "connectors" && (
              <span
                className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:flex"
                style={{
                  color: "var(--success)",
                  background: "color-mix(in srgb, var(--success) 10%, transparent)",
                  borderColor: "color-mix(in srgb, var(--success) 22%, transparent)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--success)", animation: "cx-pulse 2.4s ease-in-out infinite" }}
                  aria-hidden="true"
                />
                Tous les systèmes opérationnels
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile : identité + pills horizontales. */}
        <div className="px-4 md:hidden">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[var(--surface)] px-3.5 py-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Logo size={22} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs capitalize text-[var(--text-tertiary)]">
                {!session ? "" : isGuest ? "Invité" : `Formule ${profile?.plan ?? "free"}`}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {ALL_SECTIONS.map((s) => (
              <NavItem key={s.id} s={s} />
            ))}
          </div>
        </div>

        <div key={section} className="animate-fade-in px-4 pb-16 pt-2 md:px-8 md:pt-6">
          {/* Langage « Pro » sur toute la page : jetons cx + fontes display/UI,
              conteneur large pour exploiter l'écran. Les Connecteurs rendent
              leur propre en-tête (bouton Ajouter) ; les autres sections
              reçoivent le titre display du shell puis s'organisent en deux
              colonnes (les Panels sont insécables via break-inside-avoid). */}
          <div className={`${cxScopeClass} max-w-[1240px]`} style={cxScopeStyle}>
            {section !== "connectors" && (
              <div className="mb-7">
                <h2
                  className="text-[30px] font-medium leading-[1.1] tracking-[-0.015em] text-[var(--cx-text-primary)] sm:text-[38px]"
                  style={cxDisplayStyle}
                >
                  {current.title}
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--cx-text-muted)]">
                  {current.sub}
                </p>
              </div>
            )}

            {!session ? (
              <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--cx-surface)]" aria-hidden="true" />
            ) : section === "connectors" ? (
              <ConnectorsTab />
            ) : (
              <div className="xl:columns-2 xl:gap-7">
                {section === "general" && <GeneralSection />}
                {section === "personalization" && <PersonalizationSection />}
                {section === "appearance" && <AppearanceSection />}
                {section === "voice" && <VoiceSection />}
                {section === "notifications" && <NotificationsSection />}
                {section === "support" && <SupportTab />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Icônes ---------- */

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[var(--text-tertiary)]"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21a9 9 0 110-18 9 8 0 019 8 4.5 4.5 0 01-4.5 4.5h-1.8a2 2 0 00-1.4 3.4c.3.3.5.8.5 1.2a1.9 1.9 0 01-1.8 1.9z" strokeLinejoin="round" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0V8zM12 18v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LifeBuoyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M14.8 9.2l4.3-4.3M4.9 19.1l4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
