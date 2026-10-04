"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bot,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { WhatsAppPermissionsPanel } from "@/components/settings/WhatsAppPermissionsPanel";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";
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

  return (
    <div className={`${cxScopeClass} min-h-dvh bg-[var(--background)] text-[var(--cx-text-primary)]`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1380px] items-center justify-between px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/chat"
              aria-label="Retour au chat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
            >
              <ArrowLeft size={18} strokeWidth={1.8} />
            </Link>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
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

      <main className="mx-auto w-full max-w-[1380px] px-4 pb-20 pt-10 md:px-7 md:pt-14">
        <section className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-16">
          <div className="min-w-0">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cx-accent-text)]">Canal WhatsApp</p>
              <h1
                className="max-w-2xl text-[36px] font-medium leading-[1.04] tracking-[-0.035em] sm:text-[48px]"
                style={cxDisplayStyle}
              >
                Un espace calme pour piloter WhatsApp avec Toumaï AI.
              </h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--cx-text-muted)] sm:text-base">
                Le canal, les permissions de l&apos;IA, les automatisations et les preuves d&apos;exécution restent séparés. Vous ne voyez ici que ce qui est réellement disponible sur votre compte.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <Link
                href="/whatsapp/ai"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--cx-text-primary)] px-4 text-sm font-semibold text-[var(--background)] transition hover:opacity-90"
              >
                <Bot size={16} />
                AI Agent
              </Link>
              <button
                type="button"
                onClick={() => setPermissionsOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--cx-border-default)] px-4 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
              >
                <ShieldCheck size={16} />
                Permissions
              </button>
              <Link
                href="/automations"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--cx-border-default)] px-4 text-sm font-semibold text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
              >
                <Workflow size={16} />
                Automatisations
              </Link>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-border-subtle)] sm:grid-cols-3">
              <SignalCell
                icon={<MessageSquareText size={17} />}
                label="Canal"
                value={etatLoading ? "Vérification…" : connected ? "Opérationnel" : etat?.libelle ?? "Indisponible"}
                tone={connected ? "good" : "neutral"}
              />
              <SignalCell
                icon={<ShieldCheck size={17} />}
                label="Protection"
                value={!etat?.protection ? "Standard" : protectionHealthy ? "Normale" : "Prudence"}
                tone={protectionHealthy ? "good" : "warn"}
              />
              <SignalCell
                icon={<Clock3 size={17} />}
                label="Dernière activité"
                value={etat?.derniere_activite_ms ? formatRelative(etat.derniere_activite_ms) : "Aucune activité récente"}
                tone="neutral"
              />
            </div>

            <section className="mt-14">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cx-text-faint)]">Exécution</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Activité récente</h2>
                </div>
                <span className="hidden text-xs text-[var(--cx-text-faint)] sm:inline">7 derniers jours · numéros masqués</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
                {activityLoading && (
                  <div className="space-y-1 p-3" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--cx-input)]" />)}
                  </div>
                )}

                {!activityLoading && activityError && (
                  <div className="flex items-center gap-3 px-5 py-6 text-sm text-[var(--cx-error-text)]">
                    <CircleAlert size={17} />
                    {activityError}
                  </div>
                )}

                {!activityLoading && !activityError && items.length === 0 && (
                  <div className="px-6 py-14 text-center">
                    <Activity className="mx-auto text-[var(--cx-text-faint)]" size={22} />
                    <p className="mt-3 text-sm font-medium">Aucune action récente</p>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[var(--cx-text-faint)]">
                      Les actions exécutées par Toumaï AI apparaîtront ici avec leur résultat et leur horodatage.
                    </p>
                  </div>
                )}

                {!activityLoading && !activityError && items.map((item, index) => (
                  <ActivityRow key={`${item.created_at}-${index}`} item={item} />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:pt-20">
            <QuietCard icon={<Bot size={18} />} title="AI Agent" description="Pilotez le mode de réponse, la persona, la langue, la signature et les réponses dans les groupes avec le vrai auto-pilote.">
              <Link
                href="/whatsapp/ai"
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-[var(--cx-border-subtle)] px-3.5 py-3 text-sm font-medium transition hover:bg-[var(--cx-hover)]"
              >
                Configurer l&apos;agent
                <ChevronRight size={16} className="text-[var(--cx-text-faint)]" />
              </Link>
            </QuietCard>

            <QuietCard icon={<Workflow size={18} />} title="Automatisations" description="Les scénarios existants restent accessibles dans le centre d’automatisation actuel.">
              <Link
                href="/automations"
                className="mt-5 flex w-full items-center justify-between rounded-xl border border-[var(--cx-border-subtle)] px-3.5 py-3 text-sm font-medium transition hover:bg-[var(--cx-hover)]"
              >
                Voir les automatisations
                <ExternalLink size={15} className="text-[var(--cx-text-faint)]" />
              </Link>
            </QuietCard>

            <QuietCard icon={<Settings2 size={18} />} title="Canal & permissions" description="Les réglages techniques du connecteur et les permissions de l’IA restent séparés de son comportement.">
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionsOpen(true)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--cx-border-subtle)] px-3.5 py-3 text-sm font-medium transition hover:bg-[var(--cx-hover)]"
                >
                  Permissions
                  <ChevronRight size={16} className="text-[var(--cx-text-faint)]" />
                </button>
                <Link
                  href="/settings?tab=connectors"
                  className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]"
                >
                  Connecteur
                  <ExternalLink size={15} className="text-[var(--cx-text-faint)]" />
                </Link>
              </div>
            </QuietCard>

            <QuietCard icon={<Sparkles size={18} />} title="Suite Enterprise" description="Inbox partagé, opérations et Business Platform seront ajoutés seulement quand leurs données sont réellement disponibles.">
              <p className="mt-5 border-t border-[var(--cx-border-subtle)] pt-4 text-xs leading-5 text-[var(--cx-text-faint)]">
                Aucun écran factice n&apos;est exposé dans cette console.
              </p>
            </QuietCard>
          </aside>
        </section>
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

function SignalCell({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "good" | "warn" | "neutral" }) {
  const toneClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-[var(--cx-text-muted)]";
  return (
    <div className="bg-[var(--cx-surface)] px-5 py-5">
      <div className={`flex items-center gap-2 ${toneClass}`}>{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="mt-2 truncate text-sm font-semibold text-[var(--cx-text-primary)]">{value}</p>
    </div>
  );
}

function ActivityRow({ item }: { item: WaActivityItem }) {
  return (
    <div className="flex items-start gap-4 border-t border-[var(--cx-border-subtle)] px-5 py-4 first:border-t-0 hover:bg-[var(--cx-hover-row)]">
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.ok ? "bg-emerald-500" : "bg-red-500"}`} />
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

function QuietCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cx-input)] text-[var(--cx-text-secondary)]">{icon}</div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-[var(--cx-text-muted)]">{description}</p>
      {children}
    </section>
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
