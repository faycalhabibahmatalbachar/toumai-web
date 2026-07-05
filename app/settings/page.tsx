"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getProfile, type UserProfile } from "@/lib/user-api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
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

/** Navigation groupée façon console Claude/Anthropic — chaque groupe porte
 * un intitulé en petites capitales, les items un état actif teinté. */
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
  {
    label: "",
    items: [
      {
        id: "support",
        label: "Aide & Support",
        title: "Aide & Support",
        sub: "Guides rapides et contact direct.",
        icon: <LifeBuoyIcon />,
      },
    ],
  },
];

const ALL_SECTIONS: SectionDef[] = GROUPS.flatMap((g) => g.items);

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
          <h1 className="landing-serif text-lg tracking-tight">Paramètres</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 md:flex-row md:gap-14 md:py-10">
        {/* Navigation — sticky sous le header, groupée par thème. */}
        <nav className="shrink-0 md:sticky md:top-[72px] md:h-fit md:w-60 md:self-start">
          {/* Identité — informative, pas cliquable : l'action se fait dans
              la section Général. */}
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[var(--surface)] px-3.5 py-3">
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
              <p className="truncate text-sm font-semibold">
                {!session
                  ? "Connexion…"
                  : session.is_guest
                    ? "Session invité"
                    : profile
                      ? profile.full_name || "Mon compte"
                      : "Connexion…"}
              </p>
              <p className="truncate text-xs capitalize text-[var(--text-tertiary)]">
                {!session ? "" : isGuest ? "Invité" : `Formule ${profile?.plan ?? "free"}`}
              </p>
            </div>
          </div>

          {/* Mobile : pills horizontales. Desktop : colonnes groupées. */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
            {GROUPS.map((group, gi) => (
              <div key={group.label || `g${gi}`} className="contents md:block">
                {group.label ? (
                  <p className="hidden px-3 pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-tertiary)] first:pt-0 md:block">
                    {group.label}
                  </p>
                ) : (
                  <div className="my-3 hidden h-px bg-[var(--border)] md:block" aria-hidden="true" />
                )}
                {group.items.map((s) => {
                  const active = section === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSection(s.id)}
                      aria-current={active ? "page" : undefined}
                      className="flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-[var(--hover)] md:w-full"
                      style={{
                        background: active
                          ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                          : undefined,
                        color: active ? "var(--primary)" : "var(--text-secondary)",
                      }}
                    >
                      <span className={active ? "" : "opacity-70"} aria-hidden="true">
                        {s.icon}
                      </span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* Contenu — titre éditorial serif, transition douce entre sections. */}
        <div key={section} className="min-w-0 flex-1 animate-fade-in pb-16">
          <h2 className="landing-serif text-[26px] tracking-tight">{current.title}</h2>
          <p className="mb-8 mt-1.5 max-w-lg text-sm leading-relaxed text-[var(--text-tertiary)]">
            {current.sub}
          </p>

          {!session ? (
            <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--card)]" aria-hidden="true" />
          ) : (
            <>
              {section === "general" && <GeneralSection />}
              {section === "personalization" && <PersonalizationSection />}
              {section === "appearance" && <AppearanceSection />}
              {section === "voice" && <VoiceSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "connectors" && <ConnectorsTab />}
              {section === "support" && <SupportTab />}
            </>
          )}
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
