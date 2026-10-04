"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bot,
  ChevronRight,
  Clock3,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Smartphone,
  Users,
  Workflow,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { WhatsAppPermissionsPanel } from "@/components/settings/WhatsAppPermissionsPanel";
import { cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import {
  getWaActivity,
  getWaEtat,
  type WaActivityItem,
  type WaEtat,
} from "@/lib/connectors-api";
import { useCached } from "@/lib/swr-cache";

const CATEGORY_LABEL: Record<string, string> = {
  message: "Message envoyé",
  image: "Image envoyée",
  video: "Vidéo envoyée",
  audio: "Audio envoyé",
  document: "Document envoyé",
  fichier: "Fichier envoyé",
  statut: "Statut publié",
  lecture: "Messages consultés",
  resume: "Conversation résumée",
  recherche: "Recherche effectuée",
  analyse: "Analyse effectuée",
  gestion: "Conversation gérée",
  contacts: "Contacts synchronisés",
  avance: "Action avancée",
  autre: "Action WhatsApp",
};

export default function WhatsAppEnterprisePage() {
  const { session } = useAuth();
  useExigerCompte();
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const { data: etat, loading: etatLoading } = useCached<WaEtat>("wa:etat", getWaEtat, {
    enabled: !!session,
  });

  const {
    data: activity,
    loading: activityLoading,
    error: activityError,
  } = useCached<{ items: WaActivityItem[] }>(
    "wa:enterprise:activity:7",
    () => getWaActivity({ days: 7, limit: 8 }),
    { enabled: !!session },
  );

  const items = activity?.items ?? [];
  const connected = etat?.code === "connecte" && etat.pret;
  const protectionHealthy = etat?.protection?.available !== false && etat?.protection?.mode !== "prudence";
  const accountName = etat?.nom_profil || "Compte WhatsApp";
  const accountNumber = etat?.numero || "Numéro non disponible";

  return (
    <div className={`${cxScopeClass} min-h-dvh bg-[var(--background)] text-[var(--cx-text-primary)]`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/chat"
              aria-label="Retour au chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
            >
              <ArrowLeft size={18} strokeWidth={1.8} />
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <WhatsAppIcon size={22} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">WhatsApp</p>
              <p className="truncate text-xs text-[var(--cx-text-faint)]">Toumaï AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusPill connected={connected} loading={etatLoading} label={etat?.libelle} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 md:px-6 md:pt-10">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cx-text-faint)]">Canal connecté</p>
            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] sm:text-[34px]">WhatsApp</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cx-text-muted)]">
              Gérez le compte connecté, l’agent IA, les permissions et les dernières actions exécutées.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPermissionsOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--cx-border-default)] px-4 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
            >
              <ShieldCheck size={16} />
              Permissions
            </button>
            <Link
              href="/whatsapp/ai"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--cx-text-primary)] px-4 text-sm font-semibold text-[var(--background)] transition hover:opacity-90"
            >
              <Bot size={16} />
              Agent IA
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                <WhatsAppIcon size={30} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{accountName}</h2>
                  <InlineState connected={connected} loading={etatLoading} label={etat?.libelle} />
                </div>
                <p className="mt-1 truncate text-sm tabular-nums text-[var(--cx-text-muted)]">{accountNumber}</p>
              </div>
            </div>

            <Link
              href="/settings?tab=connectors"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-[var(--cx-border-default)] px-3.5 text-sm font-medium text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
            >
              Gérer le connecteur
            </Link>
          </div>

          <div className="grid border-t border-[var(--cx-border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
            <OverviewStat
              icon={<MessageSquareText size={16} />}
              label="État du canal"
              value={etatLoading ? "Vérification…" : connected ? "Opérationnel" : etat?.libelle ?? "Indisponible"}
              tone={connected ? "good" : "neutral"}
            />
            <OverviewStat
              icon={<ShieldCheck size={16} />}
              label="Protection"
              value={!etat?.protection ? "Standard" : protectionHealthy ? "Normale" : "Prudence"}
              tone={protectionHealthy ? "good" : "warn"}
            />
            <OverviewStat
              icon={<Clock3 size={16} />}
              label="Dernière activité"
              value={etat?.derniere_activite_ms ? formatRelative(etat.derniere_activite_ms) : "Aucune récente"}
              tone="neutral"
            />
            <OverviewStat
              icon={<Users size={16} />}
              label="Contacts"
              value={typeof etat?.contacts === "number" ? etat.contacts.toLocaleString("fr-FR") : "—"}
              tone="neutral"
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--cx-border-subtle)] px-5 py-4 md:px-6">
              <div>
                <h2 className="text-sm font-semibold">Activité récente</h2>
                <p className="mt-1 text-xs text-[var(--cx-text-faint)]">7 derniers jours · numéros masqués</p>
              </div>
              <Activity size={18} className="text-[var(--cx-text-faint)]" />
            </div>

            {activityLoading && (
              <div className="space-y-1 p-3" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--cx-input)]" />)}
              </div>
            )}

            {!activityLoading && activityError && (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-[var(--cx-error-text)]">Impossible de charger l’activité</p>
                <p className="mt-1 text-sm text-[var(--cx-text-faint)]">{activityError}</p>
              </div>
            )}

            {!activityLoading && !activityError && items.length === 0 && (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--cx-input)] text-[var(--cx-text-faint)]">
                  <Activity size={19} />
                </div>
                <p className="mt-4 text-sm font-medium">Aucune action récente</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--cx-text-faint)]">
                  Les actions réellement exécutées par Toumaï AI apparaîtront ici avec leur résultat et leur horodatage.
                </p>
              </div>
            )}

            {!activityLoading && !activityError && items.map((item, index) => (
              <ActivityRow key={`${item.created_at}-${index}`} item={item} />
            ))}
          </section>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
              <div className="border-b border-[var(--cx-border-subtle)] px-5 py-4">
                <h2 className="text-sm font-semibold">Configuration</h2>
                <p className="mt-1 text-xs text-[var(--cx-text-faint)]">Fonctions du canal WhatsApp</p>
              </div>

              <ActionLink
                href="/whatsapp/ai"
                icon={<Bot size={17} />}
                title="Agent IA"
                description="Réponses, persona et comportement"
              />
              <ActionButton
                onClick={() => setPermissionsOpen(true)}
                icon={<ShieldCheck size={17} />}
                title="Permissions"
                description="Contrôler les actions autorisées"
              />
              <ActionLink
                href="/automations"
                icon={<Workflow size={17} />}
                title="Automatisations"
                description="Scénarios et exécutions planifiées"
              />
              <ActionLink
                href="/settings?tab=connectors"
                icon={<Settings2 size={17} />}
                title="Connecteur"
                description="Connexion et configuration du compte"
              />
            </section>

            <section className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-5">
              <div className="flex items-center gap-2 text-[var(--cx-text-secondary)]">
                <Smartphone size={17} />
                <h2 className="text-sm font-semibold text-[var(--cx-text-primary)]">Compte</h2>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <DetailRow label="Plateforme" value={etat?.plateforme || "WhatsApp"} />
                <DetailRow
                  label="Connecté depuis"
                  value={etat?.connecte_depuis_ms ? formatRelative(etat.connecte_depuis_ms) : "—"}
                />
                <DetailRow label="Lecture" value={etat?.lecture_possible ? "Disponible" : "Indisponible"} />
              </dl>
            </section>
          </aside>
        </div>
      </main>

      {permissionsOpen && <WhatsAppPermissionsPanel onClose={() => setPermissionsOpen(false)} />}
    </div>
  );
}

function StatusPill({ connected, loading, label }: { connected: boolean; loading: boolean; label?: string }) {
  const text = loading ? "Vérification…" : connected ? "Connecté" : label || "Non connecté";
  return (
    <span className="hidden items-center gap-2 rounded-full border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-3 py-1.5 text-xs text-[var(--cx-text-secondary)] sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-[var(--cx-text-faint)]"}`} />
      {text}
    </span>
  );
}

function InlineState({ connected, loading, label }: { connected: boolean; loading: boolean; label?: string }) {
  const text = loading ? "Vérification…" : connected ? "Connecté" : label || "Non connecté";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cx-border-subtle)] bg-[var(--cx-input)] px-2.5 py-1 text-[11px] font-medium text-[var(--cx-text-secondary)]">
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-[var(--cx-text-faint)]"}`} />
      {text}
    </span>
  );
}

function OverviewStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-[var(--cx-text-muted)]";
  return (
    <div className="border-b border-[var(--cx-border-subtle)] px-5 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className={`flex items-center gap-2 ${toneClass}`}>
        {icon}
        <span className="text-xs font-medium text-[var(--cx-text-faint)]">{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--cx-text-primary)]">{value}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: WaActivityItem }) {
  return (
    <div className="flex items-start gap-4 border-t border-[var(--cx-border-subtle)] px-5 py-4 first:border-t-0 transition hover:bg-[var(--cx-hover-row)] md:px-6">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.ok ? "bg-emerald-500" : "bg-red-500"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{CATEGORY_LABEL[item.category] ?? item.tool}</p>
          {item.recipient_masked && <span className="text-xs tabular-nums text-[var(--cx-text-faint)]">{item.recipient_masked}</span>}
        </div>
        {item.preview && <p className="mt-1 truncate text-sm text-[var(--cx-text-muted)]">{item.preview}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs tabular-nums text-[var(--cx-text-faint)]">{formatTime(item.created_at)}</p>
        <p className={`mt-1 text-[11px] font-medium ${item.ok ? "text-emerald-500" : "text-red-500"}`}>{item.ok ? "Réussi" : "Échec"}</p>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-t border-[var(--cx-border-subtle)] px-5 py-4 first:border-t-0 transition hover:bg-[var(--cx-hover-row)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cx-input)] text-[var(--cx-text-secondary)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--cx-text-faint)]">{description}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-[var(--cx-text-faint)]" />
    </Link>
  );
}

function ActionButton({
  onClick,
  icon,
  title,
  description,
}: {
  onClick: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-t border-[var(--cx-border-subtle)] px-5 py-4 text-left transition hover:bg-[var(--cx-hover-row)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--cx-input)] text-[var(--cx-text-secondary)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--cx-text-faint)]">{description}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-[var(--cx-text-faint)]" />
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--cx-text-faint)]">{label}</dt>
      <dd className="truncate text-right font-medium text-[var(--cx-text-secondary)]">{value}</dd>
    </div>
  );
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatRelative(timestampMs: number) {
  const delta = Math.max(0, Date.now() - timestampMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}
