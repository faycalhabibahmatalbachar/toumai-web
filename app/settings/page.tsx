"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Bell,
  CircleHelp,
  Database,
  Palette,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";

function SettingsSectionLoading() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-28 animate-pulse rounded-2xl bg-[var(--cx-surface)]" />
      <div className="h-44 animate-pulse rounded-2xl bg-[var(--cx-surface)]" />
    </div>
  );
}

const GeneralSection = dynamic(
  () => import("@/components/settings/GeneralSection").then((module) => module.GeneralSection),
  { loading: SettingsSectionLoading },
);
const PersonalizationSection = dynamic(
  () => import("@/components/settings/PersonalizationSection").then((module) => module.PersonalizationSection),
  { loading: SettingsSectionLoading },
);
const AppearanceSection = dynamic(
  () => import("@/components/settings/AppearanceSection").then((module) => module.AppearanceSection),
  { loading: SettingsSectionLoading },
);
const VoiceSection = dynamic(
  () => import("@/components/settings/VoiceSection").then((module) => module.VoiceSection),
  { loading: SettingsSectionLoading },
);
const NotificationsSection = dynamic(
  () => import("@/components/settings/NotificationsSection").then((module) => module.NotificationsSection),
  { loading: SettingsSectionLoading },
);
const ConnectorsTab = dynamic(
  () => import("@/components/settings/ConnectorsTab").then((module) => module.ConnectorsTab),
  { loading: SettingsSectionLoading },
);
const SecuritySection = dynamic(
  () => import("@/components/settings/SecuritySection").then((module) => module.SecuritySection),
  { loading: SettingsSectionLoading },
);
const MemorySection = dynamic(
  () => import("@/components/settings/MemorySection").then((module) => module.MemorySection),
  { loading: SettingsSectionLoading },
);
const SessionsSection = dynamic(
  () => import("@/components/settings/SessionsSection").then((module) => module.SessionsSection),
  { loading: SettingsSectionLoading },
);
const SharesSection = dynamic(
  () => import("@/components/settings/SharesSection").then((module) => module.SharesSection),
  { loading: SettingsSectionLoading },
);
const DataControlsSection = dynamic(
  () => import("@/components/settings/DataControlsSection").then((module) => module.DataControlsSection),
  { loading: SettingsSectionLoading },
);
const StorageSection = dynamic(
  () => import("@/components/settings/StorageSection").then((module) => module.StorageSection),
  { loading: SettingsSectionLoading },
);
const SupportTab = dynamic(
  () => import("@/components/settings/SupportTab").then((module) => module.SupportTab),
  { loading: SettingsSectionLoading },
);

type Section =
  | "account"
  | "personalization"
  | "experience"
  | "notifications"
  | "connectors"
  | "privacy"
  | "security"
  | "support";

interface SectionDef {
  id: Section;
  label: string;
  title: string;
  icon: LucideIcon;
}

/** Navigation plate : le modèle utilisé par ChatGPT, Claude et Linear évite
 * les sous-titres de groupes quand la liste tient déjà dans un seul écran. */
const NAV_ITEMS: SectionDef[] = [
  { id: "account", label: "Compte", title: "Compte", icon: UserRound },
  { id: "notifications", label: "Notifications", title: "Notifications", icon: Bell },
  { id: "personalization", label: "Personnalisation", title: "Personnalisation", icon: Sparkles },
  { id: "connectors", label: "Connecteurs", title: "Connecteurs", icon: PlugZap },
  { id: "experience", label: "Apparence & voix", title: "Apparence & voix", icon: Palette },
  { id: "privacy", label: "Contrôle des données", title: "Contrôle des données", icon: Database },
  { id: "security", label: "Sécurité", title: "Sécurité", icon: ShieldCheck },
];

const SUPPORT_SECTION: SectionDef = {
  id: "support",
  label: "Aide",
  title: "Aide",
  icon: CircleHelp,
};

const ALL_SECTIONS: SectionDef[] = [...NAV_ITEMS, SUPPORT_SECTION];

// Compatibilité avec les anciens liens ?tab=… (menu Outils du chat, sidebar).
const LEGACY_TABS: Record<string, Section> = {
  general: "account",
  profile: "account",
  preferences: "personalization",
  appearance: "experience",
  voice: "experience",
  memory: "personalization",
  shares: "privacy",
  storage: "privacy",
  sessions: "security",
  connectors: "connectors",
  support: "support",
};

function SettingsNavItem({
  item,
  active,
  onSelect,
}: {
  item: SectionDef;
  active: boolean;
  onSelect: (section: Section) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      className="group relative flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-[13.5px] font-medium transition"
      style={{
        background: active ? "var(--hover)" : undefined,
        borderColor: active ? "var(--border)" : "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition"
        style={{
          background: "transparent",
          color: active ? "var(--text-primary)" : "var(--text-tertiary)",
        }}
        aria-hidden="true"
      >
        <item.icon size={17} strokeWidth={1.8} />
      </span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export default function SettingsPage() {
  const { session } = useAuth();
  useExigerCompte();
  const [section, setSection] = useState<Section>("account");

  // Lien direct vers une section (ex: /settings?tab=connectors) sans
  // useSearchParams (contrainte Suspense de l'export statique).
  useEffect(() => {
    const lireSection = () => {
      const requested = new URLSearchParams(window.location.search).get("tab") ?? "";
      const target =
        LEGACY_TABS[requested] ??
        (ALL_SECTIONS.some((s) => s.id === requested) ? (requested as Section) : null);
      if (!target) return;
      window.requestAnimationFrame(() => setSection(target));
    };
    lireSection();
    window.addEventListener("popstate", lireSection);
    return () => window.removeEventListener("popstate", lireSection);
  }, []);

  const current = ALL_SECTIONS.find((s) => s.id === section) ?? ALL_SECTIONS[0];

  function choisirSection(next: Section) {
    if (next === section) return;
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
  }

  return (
    <div
      className="min-h-dvh bg-[var(--background)] text-[var(--text-primary)] md:flex"
      style={{
        backgroundImage:
          "radial-gradient(circle at 72% -10%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 34rem)",
      }}
    >
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)]/95 px-3 py-3 backdrop-blur-xl md:flex">
        <Link
          href="/chat"
          draggable={false}
          aria-label="Fermer les paramètres"
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
        >
          <X size={20} strokeWidth={1.8} />
        </Link>

        <nav className="space-y-0.5" aria-label="Sections des paramètres">
          {NAV_ITEMS.map((item) => (
            <SettingsNavItem
              key={item.id}
              item={item}
              active={section === item.id}
              onSelect={choisirSection}
            />
          ))}
          <div className="my-2 h-px bg-[var(--border)]" aria-hidden="true" />
          <SettingsNavItem
            item={SUPPORT_SECTION}
            active={section === SUPPORT_SECTION.id}
            onSelect={choisirSection}
          />
        </nav>

      </aside>

      {/* ── Contenu ── */}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur-xl md:hidden">
          <Link
            href="/chat"
            aria-label="Fermer les paramètres"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)]"
          >
            <X size={20} strokeWidth={1.8} />
          </Link>
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Section des paramètres</span>
            <select
              value={section}
              onChange={(event) => choisirSection(event.target.value as Section)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium outline-none focus:border-[var(--primary)]"
            >
              {ALL_SECTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div key={section} className="animate-fade-in px-4 pb-20 pt-8 md:px-10 md:pt-12 lg:px-16">
          {/* Jetons cx et fontes display/UI sur toute la page. Les connecteurs
              gardent leur propre en-tête ; les autres sections suivent une
              colonne de lecture unique, stable sur ordinateur et mobile. */}
          <div
            className={`${cxScopeClass} mx-auto ${section === "connectors" ? "max-w-[1180px]" : "max-w-[860px]"}`}
            style={cxScopeStyle}
          >
            {section !== "connectors" && (
              <div className="mb-7 border-b border-[var(--cx-border-subtle)] pb-5">
                <h2
                  className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[var(--cx-text-primary)] sm:text-[24px]"
                >
                  {current.title}
                </h2>
              </div>
            )}

            {!session ? (
              <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--cx-surface)]" aria-hidden="true" />
            ) : section === "connectors" ? (
              <ConnectorsTab />
            ) : (
              <div>
                {section === "account" && <GeneralSection />}
                {section === "personalization" && (
                  <>
                    <PersonalizationSection />
                    <MemorySection />
                  </>
                )}
                {section === "experience" && (
                  <>
                    <AppearanceSection />
                    <VoiceSection />
                  </>
                )}
                {section === "notifications" && <NotificationsSection />}
                {section === "privacy" && (
                  <>
                    <DataControlsSection />
                    <SharesSection />
                    <StorageSection />
                  </>
                )}
                {section === "security" && (
                  <>
                    <SecuritySection />
                    <SessionsSection />
                  </>
                )}
                {section === "support" && <SupportTab />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
