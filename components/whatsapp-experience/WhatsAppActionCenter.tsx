"use client";

import {
  CalendarClock,
  CirclePlus,
  ContactRound,
  FileText,
  History,
  Image as ImageIcon,
  MessageCircle,
  MessagesSquare,
  Mic2,
  Settings2,
  Sparkles,
  UsersRound,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import {
  WHATSAPP_ACTIONS,
  WHATSAPP_ACTION_GROUP_LABELS,
} from "@/lib/whatsapp-ui/capabilities";
import type {
  WhatsAppActionDefinition,
  WhatsAppActionGroup,
  WhatsAppActionIcon,
  WhatsAppConnectionPresentation,
  WhatsAppExperienceState,
} from "@/lib/whatsapp-ui/types";

const ICONS: Record<WhatsAppActionIcon, LucideIcon> = {
  message: MessageCircle,
  image: ImageIcon,
  document: FileText,
  voice: Mic2,
  conversation: MessagesSquare,
  summary: Sparkles,
  group: UsersRound,
  status: CirclePlus,
  schedule: CalendarClock,
  contacts: ContactRound,
};

const GROUP_ORDER: WhatsAppActionGroup[] = ["send", "read", "manage", "automation"];

function statusText(connection: WhatsAppConnectionPresentation) {
  switch (connection.status) {
    case "connected": return "Connecté";
    case "connecting": return "Connexion…";
    case "disconnected": return "Non connecté";
    case "expired": return "Session expirée";
    case "offline": return "Service indisponible";
    default: return "État inconnu";
  }
}

function statusTone(connection: WhatsAppConnectionPresentation) {
  switch (connection.status) {
    case "connected": return "tmw-tone-success";
    case "expired": return "tmw-tone-warning";
    case "offline": return "tmw-tone-warning";
    default: return "";
  }
}

function connectionHelp(connection: WhatsAppConnectionPresentation) {
  if (connection.detail) return connection.detail;
  switch (connection.status) {
    case "connected": return "Votre compte est prêt pour les actions autorisées.";
    case "connecting": return "Toumaï vérifie la liaison avec WhatsApp.";
    case "disconnected": return "Connectez WhatsApp pour utiliser ces actions.";
    case "expired": return "Reliez à nouveau votre téléphone pour continuer.";
    case "offline": return "Les actions qui nécessitent WhatsApp sont temporairement indisponibles.";
    default: return "Toumaï ne peut pas confirmer l’état du connecteur actuellement.";
  }
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-[78px] animate-pulse rounded-2xl bg-[var(--hover)] motion-reduce:animate-none" />
      ))}
    </div>
  );
}

export function WhatsAppActionCenter({
  connection,
  state = "ready",
  actions = WHATSAPP_ACTIONS,
  onAction,
  onConnect,
  onOpenRecentActivity,
  onOpenAdvanced,
}: {
  connection: WhatsAppConnectionPresentation;
  state?: WhatsAppExperienceState;
  actions?: readonly WhatsAppActionDefinition[];
  onAction?: (action: WhatsAppActionDefinition) => void;
  onConnect?: () => void;
  onOpenRecentActivity?: () => void;
  onOpenAdvanced?: () => void;
}) {
  const usable = connection.status === "connected";
  const loading = state === "loading" || connection.status === "connecting";

  return (
    <section
      className="w-full max-w-[36rem] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_60px_rgba(0,0,0,0.16)]"
      aria-label="Actions WhatsApp"
      data-testid="wa-v2-action-center"
    >
      <header className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-sm" aria-hidden="true">
            <WhatsAppIcon size={25} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">WhatsApp</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] ${statusTone(connection)}`}>
                <span className="tmw-dot h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                {statusText(connection)}
              </span>
              {connection.stale ? (
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-tertiary)]">Données en cache</span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-[12.5px] text-[var(--text-secondary)]">
              {connection.profileName || connection.maskedNumber || connectionHelp(connection)}
            </p>
            {(connection.profileName || connection.maskedNumber) ? (
              <p className="mt-1 text-[11.5px] leading-5 text-[var(--text-tertiary)]">{connectionHelp(connection)}</p>
            ) : null}
          </div>
        </div>

        {!usable && !loading ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)]/45 px-3.5 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {connection.status === "offline" ? <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" /> : <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />}
              <p className="text-[12px] leading-5 text-[var(--text-secondary)]">{connectionHelp(connection)}</p>
            </div>
            {connection.status !== "offline" ? (
              <button
                type="button"
                onClick={onConnect}
                className="rounded-xl bg-[var(--text-primary)] px-3 py-2 text-[12px] font-semibold text-[var(--background)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                {connection.status === "expired" ? "Reconnecter" : "Connecter"}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="max-h-[65vh] overflow-y-auto p-3.5 sm:p-4">
        {loading ? <SkeletonGrid /> : null}

        {!loading ? GROUP_ORDER.map((group) => {
          const groupActions = actions.filter((action) => action.group === group);
          if (!groupActions.length) return null;
          return (
            <div key={group} className="mb-4 last:mb-0">
              <p className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {WHATSAPP_ACTION_GROUP_LABELS[group]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {groupActions.map((action) => {
                  const Icon = ICONS[action.icon];
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={!usable}
                      onClick={() => onAction?.(action)}
                      className="group flex min-h-[82px] flex-col items-start rounded-2xl border border-[var(--border)] bg-[var(--background)]/35 p-3 text-left transition hover:border-[var(--text-tertiary)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-45"
                      data-action-id={action.id}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text-secondary)] transition group-hover:text-[var(--text-primary)]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="mt-2 text-[12.5px] font-semibold text-[var(--text-primary)]">{action.label}</span>
                      <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-4 text-[var(--text-tertiary)]">{action.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
        <p className="mr-auto text-[10.5px] text-[var(--text-tertiary)]">Les actions sensibles demandent une confirmation avant exécution.</p>
        <button
          type="button"
          onClick={onOpenRecentActivity}
          disabled={!usable}
          data-testid="wa-v2-open-activity"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11.5px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Activité
        </button>
        <button
          type="button"
          onClick={onOpenAdvanced}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11.5px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          Gérer
        </button>
      </footer>
    </section>
  );
}
