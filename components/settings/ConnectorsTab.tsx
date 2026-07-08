"use client";

/** Connecteurs & Intégrations — refonte « Connecteurs Pro » : liste groupée
 * (Communication / Productivité / Données en temps réel), bandeau stats,
 * recherche ⌘K + segmented control, rail droit sticky. Jetons visuels scopés
 * dans .cx-scope (globals.css) — spec « Connecteurs Pro.dc.html ». */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cxScopeClass, cxScopeStyle, cxDisplayStyle } from "./cx-fonts";
import {
  connectMail,
  disconnectGoogle,
  disconnectMail,
  disconnectWhatsApp,
  getGoogleAuthUrl,
  getGoogleStatus,
  getMailStatus,
  getWhatsAppStatus,
  linkWhatsApp,
  linkWhatsAppQr,
  refreshWhatsAppCode,
  type MailStatus,
  type WhatsAppState,
} from "@/lib/connectors-api";
import { WhatsAppPermissionsPanel } from "./WhatsAppPermissionsPanel";
import { GoogleCalendarIcon, GmailIcon, WhatsAppIcon, MeteoIcon } from "./BrandIcons";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import {
  enableWebNotifications,
  getWebNotifState,
  isWebNotifEnabled,
  notify,
  setWebNotifEnabled,
} from "@/lib/web-notifications";

/* ---------- Types & configuration ---------- */

type RowStatus =
  | "connected"
  | "always"
  | "pending"
  | "disconnected"
  | "loading"
  | "unavailable"
  | "error";

type ConnectorId = "whatsapp" | "mail" | "google" | "meteo" | "webnotif";
type StatusFilter = "all" | "connected" | "inactive";
type OnStatus = (s: RowStatus) => void;

const SEARCH_KEYWORDS: Record<ConnectorId, string> = {
  whatsapp: "whatsapp auto-pilote messages baileys",
  mail: "mail gmail e-mail email outlook imap smtp",
  google: "google agenda calendar calendrier événements",
  meteo: "météo meteo weather pluie température",
  webnotif: "notifications web navigateur alertes push",
};

const GROUPS: { label: string; ids: ConnectorId[] }[] = [
  { label: "Communication", ids: ["whatsapp", "mail"] },
  { label: "Productivité", ids: ["google"] },
  { label: "Données en temps réel", ids: ["meteo"] },
  { label: "Cet appareil", ids: ["webnotif"] },
];

const BADGE: Record<
  RowStatus,
  { label: string; text: string; bg: string; border: string; dot: string }
> = {
  connected: {
    label: "Connecté",
    text: "var(--cx-success-text)",
    bg: "var(--cx-success-bg)",
    border: "var(--cx-success-border)",
    dot: "var(--cx-success)",
  },
  always: {
    label: "Toujours actif",
    text: "var(--cx-info-text)",
    bg: "var(--cx-info-bg)",
    border: "var(--cx-info-border)",
    dot: "var(--cx-info-text)",
  },
  pending: {
    label: "En attente",
    text: "var(--cx-warn-text)",
    bg: "var(--cx-warn-bg)",
    border: "var(--cx-warn-border)",
    dot: "var(--cx-warn-text)",
  },
  disconnected: {
    label: "Non connecté",
    text: "var(--cx-text-muted)",
    bg: "var(--cx-hover)",
    border: "var(--cx-border-default)",
    dot: "var(--cx-text-faint)",
  },
  loading: {
    label: "Vérification…",
    text: "var(--cx-text-muted)",
    bg: "var(--cx-hover)",
    border: "var(--cx-border-default)",
    dot: "var(--cx-text-faint)",
  },
  unavailable: {
    label: "Indisponible",
    text: "var(--cx-text-muted)",
    bg: "var(--cx-hover)",
    border: "var(--cx-border-default)",
    dot: "var(--cx-text-faint)",
  },
  error: {
    label: "Erreur",
    text: "var(--cx-error-text)",
    bg: "var(--cx-error-bg)",
    border: "var(--cx-error-border)",
    dot: "var(--cx-error)",
  },
};

const ACTIVE = (s: RowStatus | undefined) => s === "connected" || s === "always";

/* ---------- Composant principal ---------- */

export function ConnectorsTab() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Statuts remontés en direct par chaque rangée — alimente stats et filtre.
  const [statuses, setStatuses] = useState<Partial<Record<ConnectorId, RowStatus>>>({});
  // Bump de clé = « Tester les connexions » : chaque rangée re-vérifie.
  const [checkKey, setCheckKey] = useState(0);
  const [kbdLabel, setKbdLabel] = useState("Ctrl K");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setKbdLabel("⌘K");
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reportStatus = (id: ConnectorId) => (s: RowStatus) =>
    setStatuses((prev) => (prev[id] === s ? prev : { ...prev, [id]: s }));

  const q = query.trim().toLowerCase();
  const visible = (id: ConnectorId) => {
    if (q && !SEARCH_KEYWORDS[id].includes(q)) return false;
    if (statusFilter === "all") return true;
    const active = ACTIVE(statuses[id]);
    return statusFilter === "connected" ? active : !active;
  };

  const activeCount = Object.values(statuses).filter((s) => ACTIVE(s)).length;
  const errorCount = Object.values(statuses).filter((s) => s === "error").length;
  const noResults = GROUPS.every((g) => g.ids.every((id) => !visible(id)));

  function addConnector() {
    setStatusFilter("inactive");
    setQuery("");
    searchRef.current?.focus();
  }

  function testAll() {
    setStatuses({});
    setCheckKey((k) => k + 1);
  }

  return (
    <div className={cxScopeClass} style={cxScopeStyle}>
      {/* ── En-tête : H1 display + bouton primaire ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            className="text-[30px] font-medium leading-[1.1] tracking-[-0.015em] text-[var(--cx-text-primary)] sm:text-[38px]"
            style={cxDisplayStyle}
          >
            Connecteurs &amp; Intégrations
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--cx-text-muted)]">
            Gérez les services tiers reliés à Toumaï AI — chaque connexion reste sous votre
            contrôle, chaque action sensible demande votre accord.
          </p>
        </div>
        <button
          onClick={addConnector}
          className="flex items-center gap-2 rounded-[10px] px-[18px] py-2.5 text-sm font-semibold text-[#FFF6F1] transition hover:bg-[var(--cx-accent-hover)]"
          style={{ background: "var(--cx-accent)", boxShadow: "0 4px 14px rgba(232,104,58,0.25)" }}
        >
          <PlusIcon />
          Ajouter un connecteur
        </button>
      </div>

      <div className="flex flex-col gap-9 xl:flex-row">
        {/* ── Colonne principale ── */}
        <div className="min-w-0 flex-1">
          {/* Bandeau stats */}
          <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[var(--cx-border-subtle)] pb-5">
            <Stat n={activeCount} label={activeCount > 1 ? "connectés" : "connecté"} />
            <StatBar />
            <Stat
              n={errorCount}
              label={errorCount > 1 ? "erreurs" : "erreur"}
              tone={errorCount > 0 ? "var(--cx-error-text)" : undefined}
            />
            <StatBar />
            <div className="flex items-center gap-2 text-[13px] text-[var(--cx-text-muted)]">
              <span className="text-[var(--cx-success-text)]" aria-hidden="true">
                <LockIcon />
              </span>
              Connexions chiffrées
            </div>
          </div>

          {/* Recherche + filtres */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--cx-text-faint)]">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un connecteur…"
                className="w-full rounded-[10px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] py-2.5 pl-10 pr-16 text-sm text-[var(--cx-text-body)] outline-none transition placeholder:text-[var(--cx-text-faint)] focus:border-[var(--cx-accent-border)]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[var(--cx-border-default)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--cx-text-faint)]">
                {kbdLabel}
              </kbd>
            </div>
            <div
              className="flex shrink-0 gap-1 rounded-[10px] border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] p-1"
              role="tablist"
              aria-label="Filtrer par statut"
            >
              {(
                [
                  ["all", "Tous"],
                  ["connected", "Connectés"],
                  ["inactive", "Inactifs"],
                ] as [StatusFilter, string][]
              ).map(([f, label]) => {
                const active = statusFilter === f;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(f)}
                    className="rounded-lg px-3 py-1.5 text-[13px] font-medium transition"
                    style={{
                      background: active ? "var(--cx-surface)" : "transparent",
                      color: active ? "var(--cx-text-primary)" : "var(--cx-text-muted)",
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.25)" : undefined,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Groupes de connecteurs — rangées remontées, jamais démontées
              (le filtre utilise l'attribut hidden pour préserver l'état). */}
          <div key={checkKey} className="space-y-6">
            <Group label="Communication" hidden={!visible("whatsapp") && !visible("mail")}>
              <div hidden={!visible("whatsapp")}>
                <WhatsAppRow onStatus={reportStatus("whatsapp")} />
              </div>
              <div hidden={!visible("mail")}>
                <MailRow onStatus={reportStatus("mail")} />
              </div>
            </Group>
            <Group label="Productivité" hidden={!visible("google")}>
              <div hidden={!visible("google")}>
                <GoogleRow onStatus={reportStatus("google")} />
              </div>
            </Group>
            <Group label="Données en temps réel" hidden={!visible("meteo")}>
              <div hidden={!visible("meteo")}>
                <MeteoRow onStatus={reportStatus("meteo")} />
              </div>
            </Group>
            <Group label="Cet appareil" hidden={!visible("webnotif")}>
              <div hidden={!visible("webnotif")}>
                <WebNotifRow onStatus={reportStatus("webnotif")} />
              </div>
            </Group>

            {noResults && (
              <div className="rounded-[14px] border border-dashed border-[var(--cx-border-default)] bg-[var(--cx-surface)] px-6 py-12 text-center">
                <p className="text-sm text-[var(--cx-text-secondary)]">
                  Aucun connecteur ne correspond
                  {q ? (
                    <>
                      {" "}
                      à «&nbsp;<span className="text-[var(--cx-text-primary)]">{query}</span>&nbsp;»
                    </>
                  ) : (
                    " à ce filtre"
                  )}
                  .
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-4 rounded-[9px] border border-[var(--cx-border-strong)] px-3.5 py-2 text-[13px] font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            )}
          </div>

          {/* Bannière « Bon à savoir » */}
          <div
            className="mt-6 flex items-start gap-3 rounded-[14px] border p-4"
            style={{
              borderColor: "rgba(232,104,58,0.18)",
              background:
                "linear-gradient(135deg, rgba(232,104,58,0.06), rgba(232,104,58,0.015))",
            }}
          >
            <span className="mt-0.5 shrink-0 text-[var(--cx-accent-text)]" aria-hidden="true">
              <InfoIcon />
            </span>
            <p className="text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">
              <span className="font-semibold text-[var(--cx-text-primary)]">Bon à savoir</span> —
              vos connexions sont chiffrées, chaque action sensible demande votre confirmation et
              vous pouvez révoquer une permission à tout moment.{" "}
              <a
                href="/settings?tab=support"
                className="font-medium text-[var(--cx-accent-text)] transition hover:text-[var(--cx-accent-hover)]"
              >
                En savoir plus →
              </a>
            </p>
          </div>
        </div>

        {/* ── Rail droit ── */}
        <aside className="w-full shrink-0 xl:w-[280px]">
          <div className="space-y-4 xl:sticky xl:top-[84px]">
            <RailCard label="Actions rapides">
              {[
                { label: "Ajouter un connecteur", icon: <PlusIcon />, onClick: addConnector },
                { label: "Tester les connexions", icon: <RefreshIcon />, onClick: testAll },
                {
                  label: "Voir les journaux",
                  icon: <JournalIcon />,
                  onClick: () => {
                    window.location.href = "/whatsapp";
                  },
                },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className="flex w-full items-center justify-between gap-2 rounded-[9px] px-2 py-2.5 text-left text-[13px] font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-[var(--cx-text-muted)]" aria-hidden="true">
                      {a.icon}
                    </span>
                    {a.label}
                  </span>
                  <ChevronRightIcon />
                </button>
              ))}
            </RailCard>

            <RailCard label="Sécurité">
              <ul className="space-y-2.5">
                {[
                  "Connexions chiffrées de bout en bout",
                  "Confirmation avant chaque action sensible",
                  "Permissions révocables à tout moment",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--cx-text-secondary)]">
                    <span className="mt-0.5 shrink-0 text-[var(--cx-success-text)]" aria-hidden="true">
                      <CheckIcon />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </RailCard>

            <RailCard label="Besoin d'aide ?">
              <p className="text-[13px] leading-relaxed text-[var(--cx-text-muted)]">
                Consultez le guide des connecteurs ou écrivez directement au support.
              </p>
              <a
                href="/settings?tab=support"
                className="mt-3 block rounded-[9px] border border-[var(--cx-border-strong)] px-3.5 py-2 text-center text-[13px] font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
              >
                Aide &amp; Support
              </a>
            </RailCard>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Blocs de mise en page ---------- */

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span
        className="text-[26px] font-medium leading-none tabular-nums"
        style={{ ...cxDisplayStyle, color: tone ?? "var(--cx-text-primary)" }}
      >
        {n}
      </span>
      <span className="text-[13px] text-[var(--cx-text-muted)]">{label}</span>
    </div>
  );
}

function StatBar() {
  return <span className="h-[22px] w-px bg-[var(--cx-border-default)]" aria-hidden="true" />;
}

function Group({ label, hidden, children }: { label: string; hidden: boolean; children: ReactNode }) {
  return (
    <section hidden={hidden}>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
        {label}
      </p>
      <div className="cx-rows overflow-hidden rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
        {children}
      </div>
    </section>
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

/* ---------- Rangée de connecteur ---------- */

interface MenuItem {
  label: string;
  onClick: () => void;
}

function Row({
  icon,
  tile = "white",
  name,
  status,
  meta,
  actions,
  expanded,
  menuItems,
}: {
  icon: ReactNode;
  tile?: "white" | "night";
  name: string;
  status: RowStatus;
  meta: ReactNode;
  actions?: ReactNode;
  expanded?: ReactNode;
  menuItems?: MenuItem[];
}) {
  const badge = BADGE[status];
  return (
    <div className="transition-colors hover:bg-[var(--cx-hover-row)]">
      <div className="flex flex-wrap items-center gap-4 px-5 py-[18px]">
        {/* Tuile icône — fond blanc pour les vrais logos de marque. */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px]"
          style={
            tile === "white"
              ? { background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }
              : {
                  background: "linear-gradient(160deg, #2E4A6B, #1C3050)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }
          }
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0 flex-[1_1_220px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] font-semibold text-[var(--cx-text-primary)]">{name}</span>
            <span
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-semibold"
              style={{ color: badge.text, background: badge.bg, borderColor: badge.border }}
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: badge.dot }}
                aria-hidden="true"
              />
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[var(--cx-text-muted)]">{meta}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          {menuItems && menuItems.length > 0 && <Kebab items={menuItems} />}
        </div>
      </div>
      {expanded && <div className="px-5 pb-[18px] sm:pl-[80px]">{expanded}</div>}
    </div>
  );
}

function Kebab({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  // Position fixe calculée depuis le bouton : le menu échappe à
  // l'overflow-hidden du groupe (sinon il serait coupé par le cadre).
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    }
    setOpen((o) => !o);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Plus d'options"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
      >
        <DotsIcon />
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed z-50 w-52 overflow-hidden rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-surface)] py-1"
            style={{ top: pos.top, right: pos.right, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className="block w-full px-3.5 py-2 text-left text-[13px] text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Boutons ---------- */

function BtnPrimary({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-[#FFF6F1] transition hover:bg-[var(--cx-accent-hover)] disabled:opacity-40"
      style={{ background: "var(--cx-accent)" }}
    >
      {children}
    </button>
  );
}

function BtnAccentOutline({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-[9px] border px-3.5 py-2 text-[13px] font-semibold transition hover:brightness-110"
      style={{
        background: "var(--cx-accent-bg)",
        borderColor: "var(--cx-accent-border)",
        color: "var(--cx-accent-text)",
      }}
    >
      {children}
    </button>
  );
}

function BtnGhost({
  children,
  onClick,
  disabled,
  href,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
}) {
  const cls =
    "rounded-[9px] border border-[var(--cx-border-strong)] px-3.5 py-2 text-[13px] font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)] disabled:opacity-40";
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ---------- Confirmation (action sensible) ---------- */

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div
        className="relative w-full max-w-sm rounded-[14px] border border-[var(--cx-border-default)] bg-[var(--cx-surface)] p-5"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
      >
        <p className="text-[15px] font-semibold text-[var(--cx-text-primary)]">{title}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <BtnGhost onClick={onCancel}>Annuler</BtnGhost>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
            style={{ background: "var(--cx-error)" }}
          >
            {busy ? "Déconnexion…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Connecteurs ---------- */

function GoogleRow({ onStatus }: { onStatus: OnStatus }) {
  // Seed depuis le cache persistant : statut affiché instantanément,
  // revalidé en arrière-plan au montage.
  const [connected, setConnected] = useState<boolean | null>(() => cacheSeed<boolean>("cx:google"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function apply(v: boolean) {
    setConnected(v);
    cacheWrite("cx:google", v);
  }

  function refresh() {
    return getGoogleStatus()
      .then((s) => apply(s.connected))
      .catch(() => setConnected((c) => c ?? false));
  }

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function connect() {
    setError(null);
    setBusy(true);
    try {
      const { auth_url } = await getGoogleAuthUrl();
      window.open(auth_url, "_blank", "width=520,height=680");
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts += 1;
        const s = await getGoogleStatus().catch(() => null);
        if (s?.connected) {
          apply(true);
          setBusy(false);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (attempts > 40) {
          setBusy(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 3000);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Échec de la connexion");
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectGoogle();
      apply(false);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  const status: RowStatus = error
    ? "error"
    : connected === null
      ? "loading"
      : connected
        ? "connected"
        : "disconnected";
  useEffect(() => {
    onStatus(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <>
      <Row
        icon={<GoogleCalendarIcon size={26} />}
        name="Google Agenda"
        status={status}
        meta={
          error ? (
            <span className="text-[var(--cx-error-text)]">{error}</span>
          ) : connected ? (
            "Lecture et création d'événements autorisées"
          ) : (
            "Laissez Toumaï AI lire et créer des événements dans votre agenda."
          )
        }
        actions={
          connected ? (
            <BtnGhost onClick={() => setConfirmOpen(true)} disabled={busy}>
              Déconnecter
            </BtnGhost>
          ) : (
            <BtnPrimary onClick={connect} disabled={busy || connected === null}>
              {busy ? "En attente d'autorisation…" : "Connecter"}
            </BtnPrimary>
          )
        }
        menuItems={[{ label: "Tester la connexion", onClick: refresh }]}
      />
      {confirmOpen && (
        <ConfirmDialog
          title="Déconnecter Google Agenda ?"
          body="Toumaï AI ne pourra plus lire ni créer d'événements dans votre agenda. Vous pourrez vous reconnecter à tout moment."
          confirmLabel="Déconnecter"
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={disconnect}
        />
      )}
    </>
  );
}

function MailRow({ onStatus }: { onStatus: OnStatus }) {
  const [status, setStatus] = useState<MailStatus | null>(() => cacheSeed<MailStatus>("cx:mail"));
  const [form, setForm] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function apply(s: MailStatus) {
    setStatus(s);
    cacheWrite("cx:mail", s);
  }

  function refresh() {
    return getMailStatus()
      .then(apply)
      .catch(() => setStatus((c) => c ?? { connected: false, email: null }));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await connectMail(email, pwd);
      apply({ connected: res.connected, email: res.email });
      setForm(false);
      setPwd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion échouée");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectMail();
      apply({ connected: false, email: null });
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  const rowStatus: RowStatus = error
    ? "error"
    : status === null
      ? "loading"
      : status.connected
        ? "connected"
        : "disconnected";
  useEffect(() => {
    onStatus(rowStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowStatus]);

  const inputCls =
    "rounded-[9px] border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 py-2 text-[13px] text-[var(--cx-text-body)] outline-none transition placeholder:text-[var(--cx-text-faint)] focus:border-[var(--cx-accent-border)]";

  return (
    <>
      <Row
        icon={<GmailIcon size={26} />}
        name="Gmail"
        status={rowStatus}
        meta={
          error ? (
            <span className="text-[var(--cx-error-text)]">{error}</span>
          ) : status?.connected && status.email ? (
            <>
              <span className="text-[var(--cx-text-secondary)]">{status.email}</span> · lecture et
              envoi d&apos;e-mails
            </>
          ) : (
            "Lisez et envoyez des e-mails via Toumaï AI (Gmail, Outlook…)."
          )
        }
        actions={
          status?.connected ? (
            <BtnGhost onClick={() => setConfirmOpen(true)} disabled={busy}>
              Déconnecter
            </BtnGhost>
          ) : (
            <BtnPrimary onClick={() => setForm((f) => !f)}>
              {form ? "Fermer" : "Connecter"}
            </BtnPrimary>
          )
        }
        menuItems={[{ label: "Tester la connexion", onClick: refresh }]}
        expanded={
          !status?.connected && form ? (
            <form onSubmit={submit} className="flex max-w-sm flex-col gap-2">
              <input
                type="email"
                required
                placeholder="vous@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
              />
              <input
                type="password"
                required
                placeholder="Mot de passe d'application"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className={inputCls}
              />
              <p className="text-[11.5px] leading-relaxed text-[var(--cx-text-faint)]">
                Utilisez un « mot de passe d&apos;application », pas votre mot de passe principal
                (Gmail : myaccount.google.com/apppasswords).
              </p>
              <div className="flex gap-2">
                <BtnPrimary type="submit" disabled={busy}>
                  {busy ? "Vérification…" : "Connecter"}
                </BtnPrimary>
                <BtnGhost onClick={() => setForm(false)}>Annuler</BtnGhost>
              </div>
            </form>
          ) : undefined
        }
      />
      {confirmOpen && (
        <ConfirmDialog
          title="Déconnecter Gmail ?"
          body="Toumaï AI ne pourra plus lire ni envoyer d'e-mails avec ce compte. Vos identifiants seront supprimés."
          confirmLabel="Déconnecter"
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={disconnect}
        />
      )}
    </>
  );
}

function WhatsAppRow({ onStatus }: { onStatus: OnStatus }) {
  const [state, setState] = useState<WhatsAppState | null>(() =>
    cacheSeed<WhatsAppState>("cx:whatsapp"),
  );
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const s = await getWhatsAppStatus().catch(() => null);
      if (!s) return;
      apply(s);
      if (s.status === "connected" || s.status === "disconnected" || s.status === "error") {
        stopPolling();
      }
    }, 3000);
  }

  function apply(s: WhatsAppState) {
    setState(s);
    cacheWrite("cx:whatsapp", s);
  }

  function refresh() {
    return getWhatsAppStatus()
      .then((s) => {
        apply(s);
        if (s.status === "qr" || s.status === "pairing" || s.status === "connecting") startPolling();
      })
      .catch(() => setState((c) => c ?? { status: "disconnected" }));
  }

  useEffect(() => {
    refresh();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function link() {
    if (!phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const s = await linkWhatsApp(phone.trim());
      apply(s);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la liaison");
    } finally {
      setBusy(false);
    }
  }

  // Liaison par QR (sans numéro) — méthode par défaut, la plus fiable.
  async function linkQr() {
    setBusy(true);
    setError(null);
    try {
      const s = await linkWhatsAppQr();
      apply(s);
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la liaison");
    } finally {
      setBusy(false);
    }
  }

  async function refreshCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await refreshWhatsAppCode();
      setState((prev) =>
        prev ? { ...prev, pairingCode: res.pairingCode, codeExpiresAt: res.codeExpiresAt } : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du rafraîchissement");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectWhatsApp();
      apply({ status: "disconnected" });
      setLinkOpen(false);
      stopPolling();
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la déconnexion");
    } finally {
      setBusy(false);
    }
  }

  const rowStatus: RowStatus =
    state === null
      ? "loading"
      : state.status === "unconfigured"
        ? "unavailable"
        : state.status === "connected"
          ? "connected"
          : state.status === "error"
            ? "error"
            : state.status === "qr" || state.status === "pairing" || state.status === "connecting"
              ? "pending"
              : "disconnected";
  useEffect(() => {
    onStatus(rowStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowStatus]);

  const meta = error ? (
    <span className="text-[var(--cx-error-text)]">{error}</span>
  ) : state?.status === "unconfigured" ? (
    "Auto-pilote WhatsApp — pas encore disponible sur cette instance."
  ) : state?.status === "connected" && state.number ? (
    <>
      <span className="tabular-nums text-[var(--cx-text-secondary)]">{state.number}</span> ·
      auto-pilote actif
    </>
  ) : rowStatus === "pending" ? (
    "Liaison en cours — saisissez le code dans WhatsApp pour terminer."
  ) : (
    "Laissez Toumaï AI répondre automatiquement sur WhatsApp (auto-pilote)."
  );

  return (
    <>
      <Row
        icon={<WhatsAppIcon size={26} />}
        name="WhatsApp"
        status={rowStatus}
        meta={meta}
        actions={
          state?.status === "connected" ? (
            <>
              <BtnAccentOutline onClick={() => setPermissionsOpen(true)}>
                Gérer les permissions
              </BtnAccentOutline>
              <BtnGhost onClick={() => setConfirmOpen(true)} disabled={busy}>
                Déconnecter
              </BtnGhost>
            </>
          ) : state?.status === "unconfigured" || state === null ? undefined : rowStatus ===
            "pending" ? undefined : (
            <BtnPrimary onClick={() => setLinkOpen((o) => !o)}>
              {linkOpen ? "Fermer" : "Connecter"}
            </BtnPrimary>
          )
        }
        menuItems={
          state?.status === "unconfigured"
            ? undefined
            : [
                { label: "Tester la connexion", onClick: refresh },
                {
                  label: "Voir les journaux",
                  onClick: () => {
                    window.location.href = "/whatsapp";
                  },
                },
                ...(state?.status === "connected"
                  ? [{ label: "Paramètres", onClick: () => setPermissionsOpen(true) }]
                  : []),
              ]
        }
        expanded={
          rowStatus === "pending" && (state?.qr || state?.pairingCode) ? (
            <div className="flex max-w-md flex-col gap-3">
              {state?.pairingCode ? (
                <>
                  <ol className="ml-4 list-decimal space-y-1 text-[13px] text-[var(--cx-text-secondary)]">
                    <li>Ouvrez WhatsApp <strong>sur le téléphone de ce numéro</strong>.</li>
                    <li>Réglages → <strong>Appareils connectés</strong> → <strong>Lier un appareil</strong>.</li>
                    <li>En bas : <strong>Lier avec le numéro de téléphone à la place</strong>.</li>
                    <li>Saisissez ce code (8 caractères, <strong>sans le tiret</strong>) :</li>
                  </ol>
                  <div className="flex items-center gap-2">
                    <p className="w-fit rounded-[9px] border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-4 py-2 font-mono text-xl font-semibold tracking-[0.25em] text-[var(--cx-text-primary)]">
                      {state.pairingCode}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText((state.pairingCode || "").replace(/-/g, ""));
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 1500);
                      }}
                      className="rounded-[9px] border border-[var(--cx-border-strong)] px-3 py-2 text-xs font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]"
                    >
                      {copiedCode ? "Copié ✓" : "Copier"}
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--cx-text-faint)]">
                    ⚠️ Le code expire vite. Si WhatsApp affiche « impossible de lier », régénérez un
                    nouveau code ci-dessous et saisissez-le rapidement, sans le tiret.
                  </p>
                  <button
                    onClick={refreshCode}
                    disabled={busy}
                    className="w-fit text-[12px] text-[var(--cx-text-faint)] underline underline-offset-2 transition hover:text-[var(--cx-text-primary)] disabled:opacity-40"
                  >
                    Régénérer un nouveau code
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] text-[var(--cx-text-secondary)]">
                    Dans WhatsApp : <strong>Appareils connectés → Lier un appareil</strong>, puis
                    scannez ce QR code :
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={state.qr!}
                    alt="QR code WhatsApp"
                    className="h-52 w-52 rounded-xl border border-[var(--cx-border-default)] bg-white p-2"
                  />
                </>
              )}
              <div className="flex items-center gap-2 text-[12px] text-[var(--cx-text-faint)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cx-success)]" />
                En attente de la connexion…
                <button
                  onClick={disconnect}
                  disabled={busy}
                  className="ml-2 underline underline-offset-2 transition hover:text-[var(--cx-text-primary)]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : linkOpen && (rowStatus === "disconnected" || rowStatus === "error") ? (
            <div className="flex max-w-md flex-col gap-3">
              {/* Méthode 1 (recommandée) : QR à scanner — la plus fiable, comme
                  sur l'application mobile. */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-medium text-[var(--cx-text-primary)]">
                  Recommandé — scanner un QR code
                </p>
                <p className="text-[12px] text-[var(--cx-text-muted)]">
                  Dans WhatsApp : Appareils connectés → Lier un appareil → scannez le QR affiché.
                </p>
                <BtnPrimary onClick={linkQr} disabled={busy}>
                  {busy ? "Génération…" : "Afficher le QR code"}
                </BtnPrimary>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[var(--cx-text-faint)]">
                <span className="h-px flex-1 bg-[var(--cx-border-subtle)]" />
                ou par numéro
                <span className="h-px flex-1 bg-[var(--cx-border-subtle)]" />
              </div>

              {/* Méthode 2 : code de jumelage par numéro. */}
              <div className="flex flex-col gap-2">
                <input
                  type="tel"
                  placeholder="+235 XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-[9px] border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 py-2 text-[13px] tabular-nums text-[var(--cx-text-body)] outline-none transition placeholder:text-[var(--cx-text-faint)] focus:border-[var(--cx-accent-border)]"
                />
                <div className="flex gap-2">
                  <BtnGhost onClick={link} disabled={busy || !phone.trim()}>
                    {busy ? "Liaison…" : "Obtenir un code par numéro"}
                  </BtnGhost>
                  <BtnGhost onClick={() => setLinkOpen(false)}>Annuler</BtnGhost>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />
      {permissionsOpen && <WhatsAppPermissionsPanel onClose={() => setPermissionsOpen(false)} />}
      {confirmOpen && (
        <ConfirmDialog
          title="Déconnecter WhatsApp ?"
          body="L'auto-pilote sera désactivé et l'appareil lié sera retiré de votre compte WhatsApp."
          confirmLabel="Déconnecter"
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={disconnect}
        />
      )}
    </>
  );
}

/** Notifications web — Toumaï AI prévient l'utilisateur sur cet appareil
 * (fin de tâche agent, action WhatsApp, rappel d'agenda…). */
function WebNotifRow({ onStatus }: { onStatus: OnStatus }) {
  const [perm, setPerm] = useState<ReturnType<typeof getWebNotifState>>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPerm(getWebNotifState());
    setEnabled(isWebNotifEnabled());
  }, []);

  const status: RowStatus =
    perm === "unsupported"
      ? "unavailable"
      : perm === "denied"
        ? "error"
        : enabled
          ? "connected"
          : "disconnected";
  useEffect(() => {
    onStatus(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function enable() {
    setBusy(true);
    const res = await enableWebNotifications();
    setPerm(res);
    const on = res === "granted";
    setEnabled(on);
    if (on) notify("Toumaï AI", "Les notifications sont activées — vous serez prévenu ici.");
    setBusy(false);
  }

  function disable() {
    setWebNotifEnabled(false);
    setEnabled(false);
  }

  function test() {
    notify("Toumaï AI", "Notification de test — tout fonctionne.");
  }

  const meta =
    perm === "unsupported"
      ? "Votre navigateur ne prend pas en charge les notifications."
      : perm === "denied"
        ? "Bloquées par le navigateur — réautorisez le site dans les réglages du navigateur."
        : enabled
          ? "Toumaï AI vous prévient sur cet appareil : fin de tâche, action WhatsApp, rappels."
          : "Soyez prévenu quand Toumaï AI termine une tâche ou agit pour vous.";

  return (
    <Row
      icon={<BellGlyph />}
      tile="night"
      name="Notifications web"
      status={status}
      meta={meta}
      actions={
        perm === "unsupported" || perm === "denied" ? undefined : enabled ? (
          <BtnGhost onClick={disable}>Désactiver</BtnGhost>
        ) : (
          <BtnPrimary onClick={enable} disabled={busy}>
            {busy ? "Autorisation…" : "Activer"}
          </BtnPrimary>
        )
      }
      menuItems={enabled ? [{ label: "Envoyer une notification de test", onClick: test }] : undefined}
    />
  );
}

/** Météo — service interne, toujours actif, sans configuration. */
function MeteoRow({ onStatus }: { onStatus: OnStatus }) {
  useEffect(() => {
    onStatus("always");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Row
      icon={<MeteoIcon size={26} />}
      tile="night"
      name="Météo"
      status="always"
      meta="Toumaï AI consulte la météo en direct (Open-Meteo) — aucune configuration requise."
    />
  );
}

/* ---------- Icônes UI (traits SVG, jamais d'emoji) ---------- */

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a9 9 0 11-2.64-6.36M21 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-[var(--cx-text-faint)]"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" />
    </svg>
  );
}

function BellGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
