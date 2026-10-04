"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
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

function resolveSection(url: URL): Section {
  const requested = url.searchParams.get("tab") ?? "";
  if (requested in LEGACY_TABS) return LEGACY_TABS[requested];
  if (ALL_SECTIONS.some((item) => item.id === requested)) return requested as Section;
  return "account";
}

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

function SettingsWindow({
  initialSection,
  onClose,
}: {
  initialSection: Section;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const [section, setSection] = useState<Section>(initialSection);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const current = ALL_SECTIONS.find((item) => item.id === section) ?? ALL_SECTIONS[0];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-0 backdrop-blur-[2px] md:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-dvh w-full min-w-0 overflow-hidden bg-[var(--background)] text-[var(--text-primary)] shadow-2xl md:h-[min(92dvh,900px)] md:max-w-[1280px] md:rounded-[24px] md:border md:border-[var(--border)]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 72% -10%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 34rem)",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <aside className="hidden h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)]/95 px-3 py-3 backdrop-blur-xl md:flex">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres"
            title="Fermer"
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <X size={20} strokeWidth={1.8} />
          </button>

          <nav className="space-y-0.5" aria-label="Sections des paramètres">
            {NAV_ITEMS.map((item) => (
              <SettingsNavItem
                key={item.id}
                item={item}
                active={section === item.id}
                onSelect={setSection}
              />
            ))}
            <div className="my-2 h-px bg-[var(--border)]" aria-hidden="true" />
            <SettingsNavItem
              item={SUPPORT_SECTION}
              active={section === SUPPORT_SECTION.id}
              onSelect={setSection}
            />
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/92 px-4 py-3 backdrop-blur-xl md:hidden">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer les paramètres"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <X size={20} strokeWidth={1.8} />
            </button>
            <label className="block min-w-0 flex-1">
              <span className="sr-only">Section des paramètres</span>
              <select
                value={section}
                onChange={(event) => setSection(event.target.value as Section)}
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium outline-none focus:border-[var(--primary)]"
              >
                {ALL_SECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div key={section} className="animate-fade-in px-4 pb-20 pt-8 md:px-10 md:pt-12 lg:px-16">
            <div
              className={`${cxScopeClass} mx-auto ${section === "connectors" ? "max-w-[1180px]" : "max-w-[860px]"}`}
              style={cxScopeStyle}
            >
              {section !== "connectors" && (
                <div className="mb-7 border-b border-[var(--cx-border-subtle)] pb-5">
                  <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-[var(--cx-text-primary)] sm:text-[24px]">
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
    </div>
  );
}

/**
 * Sur /chat uniquement, transforme les liens vers /settings en fenêtre de
 * premier plan. Les autres destinations conservent leur navigation normale.
 * L'URL de la conversation ne change donc jamais quand les paramètres
 * s'ouvrent, et les anciens liens ?tab=... continuent à cibler la bonne
 * section dans la fenêtre.
 */
export function SettingsOverlayBridge() {
  const [open, setOpen] = useState(false);
  const [initialSection, setInitialSection] = useState<Section>("account");
  const triggerRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    function interceptSettingsNavigation(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/settings") return;

      event.preventDefault();
      triggerRef.current = anchor;
      setInitialSection(resolveSection(url));
      setOpen(true);
    }

    document.addEventListener("click", interceptSettingsNavigation, true);
    return () => document.removeEventListener("click", interceptSettingsNavigation, true);
  }, []);

  function close() {
    setOpen(false);
    const trigger = triggerRef.current;
    triggerRef.current = null;
    window.requestAnimationFrame(() => trigger?.focus());
  }

  return open ? <SettingsWindow initialSection={initialSection} onClose={close} /> : null;
}
