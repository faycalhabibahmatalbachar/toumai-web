"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Bot,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plug,
  RefreshCw,
  Search,
  Send,
  Settings,
  UserRoundPlus,
  Workflow,
  X,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { WhatsAppComposeModal } from "@/components/whatsapp/WhatsAppComposeModal";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import {
  getWaEtat,
  getWhatsAppAutomations,
  pauseWhatsAppAutomation,
  resumeWhatsAppAutomation,
  syncWaCarnet,
  type WaEtat,
  type WhatsAppAutomation,
} from "@/lib/connectors-api";
import {
  getWaAutopilotAnalytics,
  getWaAutopilotLogs,
  getWaLiveConversations,
  getWhatsAppOverview,
  type WaAutopilotAnalytics,
  type WaAutopilotLog,
  type WaLiveConversation,
  type WaOverviewMetric,
  type WhatsAppOverview,
} from "@/lib/whatsapp-enterprise-api";
import { useCached } from "@/lib/swr-cache";

const PAGE_BG = "#06111a";
const SIDEBAR_BG = "#0a151e";
const SURFACE = "#0d1923";
const SURFACE_RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const FAINT = "#6f7f8d";
const GREEN = "#08c875";
const BLUE = "#2f8cff";
const ORANGE = "#ff9518";

const PERIODS = [7, 30, 90] as const;
type PeriodDays = (typeof PERIODS)[number];
type ActivityPoint = { date: string; label: string; sent: number; received: number };

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/agent", label: "Agents", icon: Bot },
  { href: "/library", label: "Connaissances", icon: BookOpen },
  { href: "/automations", label: "Automatisations", icon: Workflow },
] as const;

const LOWER_NAV = [
  { href: "/settings?tab=connectors", label: "Intégrations", icon: Plug },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

export default function WhatsAppOverviewPage() {
  const { session } = useAuth();
  useExigerCompte();

  const [days, setDays] = useState<PeriodDays>(30);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [contactSyncing, setContactSyncing] = useState(false);
  const [contactSyncMessage, setContactSyncMessage] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [automationBusy, setAutomationBusy] = useState<Record<string, boolean>>({});
  const [automationOverride, setAutomationOverride] = useState<Record<string, boolean>>({});

  const { data: etat, loading: etatLoading } = useCached<WaEtat>("wa:etat", getWaEtat, {
    enabled: !!session,
    ttlMs: 5_000,
  });

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
  } = useCached<WhatsAppOverview>(
    `wa:overview:v1:${days}`,
    () => getWhatsAppOverview(days),
    { enabled: !!session, ttlMs: 15_000 },
  );

  // Compatibilité de rollout uniquement : les anciens agrégats ne sont lus
  // que si le contrat Overview v1 n'est pas encore servi en production.
  const useLegacyOverview = overviewError === "WA_OVERVIEW_V1_NOT_DEPLOYED";
  const overviewUnavailable = Boolean(overviewError) && !useLegacyOverview;

  const { data: analytics, loading: analyticsLoading } = useCached<WaAutopilotAnalytics>(
    `wa:overview:analytics:${days}`,
    () => getWaAutopilotAnalytics(days),
    { enabled: !!session && useLegacyOverview, ttlMs: 15_000 },
  );

  const { data: conversationsData, loading: conversationsLoading } = useCached(
    "wa:overview:live-conversations",
    () => getWaLiveConversations({ limit: 4 }),
    { enabled: !!session, ttlMs: 10_000 },
  );

  const {
    data: automationsData,
    loading: automationsLoading,
    refresh: refreshAutomations,
  } = useCached<{ tasks: WhatsAppAutomation[]; count: number }>(
    "wa:overview:automations",
    () => getWhatsAppAutomations({ limit: 20 }),
    { enabled: !!session, ttlMs: 10_000 },
  );

  const { data: logs, loading: logsLoading } = useCached<WaAutopilotLog[]>(
    `wa:overview:logs:${days}`,
    () => loadLogsForPeriod(days),
    { enabled: !!session && useLegacyOverview, ttlMs: 30_000 },
  );

  const connected = overview?.connection
    ? overview.connection.status === "connected" && overview.connection.ready
    : etat?.code === "connecte" && etat.pret;
  const connection = overview?.connection
    ? overviewConnectionPresentation(overview.connection)
    : connectionPresentation(etat, etatLoading);
  const connectionNumber = overview?.connection.display_phone || etat?.numero || "Aucun numéro lié";
  const chartData = useMemo(
    () => overview?.activity ? overviewActivitySeries(overview.activity) : buildActivitySeries(logs ?? [], days),
    [overview, logs, days],
  );
  const conversations = conversationsData?.conversations ?? [];
  const activeAutomations = useMemo(
    () =>
      (automationsData?.tasks ?? [])
        .filter((task) => ["pending", "processing", "paused"].includes(task.status))
        .slice(0, 3),
    [automationsData],
  );

  const conversationMetric = overview?.metrics.conversations;
  const messageMetric = overview?.metrics.messages_sent;
  const responseMetric = overview?.metrics.response_rate;
  const conversationKpi = overviewUnavailable
    ? null
    : conversationMetric?.value ?? analytics?.kpis.conversations.value ?? conversationsData?.count ?? 0;
  const messageKpi = overviewUnavailable
    ? null
    : messageMetric?.value ?? analytics?.kpis.messages.value ?? 0;
  const responseKpi = responseMetric?.value ?? (useLegacyOverview ? analytics?.kpis.success_rate.value ?? null : null);
  const overviewDataLoading = overviewLoading || (useLegacyOverview && analyticsLoading);
  const chartLoading = overviewLoading || (useLegacyOverview && logsLoading);
  const profileName = overview?.connection.profile_name?.trim() || etat?.nom_profil?.trim() || "Mon espace";
  const initials = makeInitials(profileName);

  async function handleContactSync() {
    if (contactSyncing) return;
    setContactSyncing(true);
    setContactSyncMessage(null);
    try {
      await syncWaCarnet(false);
      setContactSyncMessage("Contacts synchronisés.");
    } catch (error) {
      setContactSyncMessage(error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setContactSyncing(false);
    }
  }

  async function toggleAutomation(task: WhatsAppAutomation) {
    if (automationBusy[task.id]) return;
    const current = automationOverride[task.id] ?? isAutomationEnabled(task);
    const next = !current;
    setAutomationOverride((value) => ({ ...value, [task.id]: next }));
    setAutomationBusy((value) => ({ ...value, [task.id]: true }));
    try {
      if (next) await resumeWhatsAppAutomation(task.id);
      else await pauseWhatsAppAutomation(task.id);
      await refreshAutomations();
      setAutomationOverride((value) => {
        const clone = { ...value };
        delete clone[task.id];
        return clone;
      });
    } catch {
      setAutomationOverride((value) => ({ ...value, [task.id]: current }));
    } finally {
      setAutomationBusy((value) => ({ ...value, [task.id]: false }));
    }
  }

  return (
    <div className="min-h-dvh text-[#f4f7f9]" style={{ background: PAGE_BG }}>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[253px] border-r lg:block" style={{ background: SIDEBAR_BG, borderColor: BORDER }}>
        <SidebarContent />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fermer la navigation" className="absolute inset-0 bg-black/65" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative h-full w-[286px] border-r shadow-2xl" style={{ background: SIDEBAR_BG, borderColor: BORDER }}>
            <button type="button" aria-label="Fermer la navigation" onClick={() => setMobileNavOpen(false)} className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[#9ba8b3] hover:bg-white/5">
              <X size={19} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-[253px]">
        <header className="sticky top-0 z-40 flex h-[70px] items-center border-b px-4 md:px-7" style={{ background: "rgba(6,17,26,.96)", borderColor: BORDER, backdropFilter: "blur(16px)" }}>
          <button type="button" aria-label="Ouvrir la navigation" onClick={() => setMobileNavOpen(true)} className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-[#9ba8b3] hover:bg-white/5 lg:hidden">
            <Menu size={20} />
          </button>

          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ac86d] shadow-[0_8px_25px_rgba(37,211,102,.18)]"><WhatsAppIcon size={25} /></div>
            <span className="text-[17px] font-semibold">WhatsApp</span>
            <ChevronRight size={18} color={FAINT} />
            <span className="text-[14px]" style={{ color: MUTED }}>Overview</span>
          </div>

          <div className="ml-auto flex items-center gap-3 md:gap-5">
            <button type="button" className="hidden h-11 w-[435px] max-w-[34vw] items-center gap-3 rounded-xl border px-4 text-left xl:flex" style={{ background: SURFACE_RAISED, borderColor: BORDER, color: MUTED }}>
              <Search size={18} />
              <span className="min-w-0 flex-1 truncate text-[13px]">Rechercher un contact, une conversation, une action...</span>
              <kbd className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: BORDER, color: FAINT }}>Ctrl K</kbd>
            </button>

            <button type="button" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5" style={{ color: MUTED }}>
              <Bell size={20} strokeWidth={1.8} />
              <span className="absolute right-[7px] top-[6px] h-2.5 w-2.5 rounded-full border-2" style={{ background: ORANGE, borderColor: PAGE_BG }} />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1687f8] text-sm font-bold text-white">{initials}</div>
              <div className="hidden min-w-0 xl:block">
                <p className="max-w-[130px] truncate text-[13px] font-semibold">{profileName}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>Mon espace</p>
              </div>
              <ChevronDown size={15} color={MUTED} className="hidden xl:block" />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-8 pt-7 md:px-7 lg:px-[29px]">
          <section className="mb-6 flex items-center gap-5">
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[18px] bg-[#08b963] shadow-[0_14px_40px_rgba(37,211,102,.15)]"><WhatsAppIcon size={45} /></div>
            <div className="min-w-0">
              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] md:text-[36px]">WhatsApp Overview</h1>
              <p className="mt-1 text-[15px] md:text-[16px]" style={{ color: MUTED }}>Pilotez vos conversations et automatisez vos échanges avec Toumaï AI.</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <MetricCard
              label="Conversations"
              value={conversationKpi === null ? "—" : formatInteger(conversationKpi)}
              delta={metricDelta(conversationMetric, analytics?.kpis.conversations.delta)}
              unit={metricDeltaUnit(conversationMetric, analytics?.kpis.conversations.delta_unit)}
              loading={overviewDataLoading}
              icon={<MessageCircle size={27} />}
              tone="green"
            />
            <MetricCard
              label="Messages envoyés"
              value={messageKpi === null ? "—" : formatInteger(messageKpi)}
              delta={metricDelta(messageMetric, analytics?.kpis.messages.delta)}
              unit={metricDeltaUnit(messageMetric, analytics?.kpis.messages.delta_unit)}
              loading={overviewDataLoading}
              icon={<Send size={27} />}
              tone="orange"
            />
            <MetricCard
              label="Taux de réponse"
              value={responseKpi === null ? "—" : `${formatDecimal(responseKpi)}%`}
              delta={metricDelta(responseMetric, useLegacyOverview ? analytics?.kpis.success_rate.delta : null)}
              unit={metricDeltaUnit(responseMetric, useLegacyOverview ? analytics?.kpis.success_rate.delta_unit : undefined)}
              loading={overviewDataLoading}
              note={responseMetric?.instrumented === false ? "Non instrumenté sur tous les messages" : undefined}
              icon={<Clock3 size={28} />}
              tone="purple"
            />
            <ConnectionCard connection={connection} number={connectionNumber} connected={connected} loading={!overview && etatLoading} />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2.15fr)_minmax(300px,.95fr)]">
            <Card className="min-h-[286px] overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-1 pt-5 md:px-6">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Activité des messages</h2>
                  <div className="mt-4 flex flex-wrap items-center gap-5 text-[12px]" style={{ color: MUTED }}>
                    <LegendDot color={GREEN} label="Messages envoyés" />
                    <LegendDot color={BLUE} label="Messages reçus" />
                  </div>
                </div>
                <div className="relative">
                  <button type="button" onClick={() => setPeriodOpen((value) => !value)} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-[12px] font-medium" style={{ background: SURFACE_RAISED, borderColor: BORDER, color: TEXT }}>
                    <CalendarDays size={15} color={MUTED} />
                    {days === 7 ? "7 derniers jours" : days === 30 ? "30 derniers jours" : "90 derniers jours"}
                    <ChevronDown size={14} color={MUTED} />
                  </button>
                  {periodOpen && (
                    <div className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border p-1 shadow-2xl" style={{ background: SURFACE_RAISED, borderColor: BORDER }}>
                      {PERIODS.map((period) => (
                        <button key={period} type="button" onClick={() => { setDays(period); setPeriodOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5" style={{ color: period === days ? GREEN : TEXT }}>
                          {period} derniers jours
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[203px] px-4 pb-3 pt-2 md:px-5">
                {chartLoading ? (
                  <div className="h-full animate-pulse rounded-xl bg-white/[0.025]" />
                ) : chartData.some((point) => point.sent > 0 || point.received > 0) ? (
                  <ActivityChart data={chartData} />
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <CircleGauge className="mx-auto" size={24} color={FAINT} />
                      <p className="mt-3 text-sm font-medium">Aucune activité instrumentée</p>
                      <p className="mt-1 text-xs" style={{ color: MUTED }}>Les événements Baileys réels apparaîtront ici.</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 md:p-6">
              <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Actions rapides</h2>
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="flex h-[58px] w-full items-center gap-4 rounded-xl border px-4 text-left transition hover:brightness-110"
                  style={{ background: "linear-gradient(90deg,#06aa62,#079a59)", borderColor: "rgba(37,211,102,.55)", color: TEXT }}
                >
                  <Send size={21} />
                  <span className="flex-1 text-[14px] font-medium">Nouveau message</span>
                  <ChevronRight size={18} color="#d9fff0" />
                </button>
                <button type="button" disabled={contactSyncing} onClick={handleContactSync} className="flex h-[58px] w-full items-center gap-4 rounded-xl border px-4 text-left transition hover:bg-white/[0.035] disabled:opacity-60" style={{ background: SURFACE_RAISED, borderColor: BORDER }}>
                  {contactSyncing ? <RefreshCw size={22} className="animate-spin" /> : <UserRoundPlus size={22} />}
                  <span className="flex-1 text-[14px] font-medium">Importer des contacts</span>
                  <ChevronRight size={18} color={MUTED} />
                </button>
                <QuickAction href="/whatsapp/automations" icon={<Settings size={22} />} label="Gérer les automatisations" />
              </div>
              {contactSyncMessage && <p className="mt-3 text-xs" style={{ color: MUTED }}>{contactSyncMessage}</p>}
            </Card>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 pb-2 pt-4 md:px-6">
                <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Conversations récentes</h2>
                <Link href="/whatsapp/conversations" className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: BLUE }}>Voir tout <ChevronRight size={15} /></Link>
              </div>
              <div className="overflow-x-auto px-4 pb-2 md:px-5">
                <div className="min-w-[650px]">
                  <div className="grid grid-cols-[1.2fr_1.45fr_.7fr_.55fr_28px] gap-3 rounded-md px-2 py-1.5 text-[11px]" style={{ background: "rgba(255,255,255,.025)", color: MUTED }}>
                    <span>Contact</span><span>Dernier message</span><span>Statut</span><span>Date</span><span />
                  </div>
                  {conversationsLoading && [0, 1, 2, 3].map((index) => <div key={index} className="mt-1 h-[54px] animate-pulse rounded-lg bg-white/[0.025]" />)}
                  {!conversationsLoading && conversations.length === 0 && <div className="py-10 text-center text-sm" style={{ color: MUTED }}>Aucune conversation récente.</div>}
                  {!conversationsLoading && conversations.map((conversation, index) => <ConversationRow key={conversation.id || `${conversation.last_message.timestamp_ms}-${index}`} conversation={conversation} index={index} />)}
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b px-5 py-4 md:px-6" style={{ borderColor: BORDER }}>
                <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Automatisations actives ({activeAutomations.length})</h2>
                <Link href="/whatsapp/automations" className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: BLUE }}>Voir tout <ChevronRight size={15} /></Link>
              </div>
              <div className="px-5 md:px-6">
                {automationsLoading && [0, 1, 2].map((index) => <div key={index} className="my-2 h-[62px] animate-pulse rounded-lg bg-white/[0.025]" />)}
                {!automationsLoading && activeAutomations.length === 0 && <div className="py-10 text-center text-sm" style={{ color: MUTED }}>Aucune automatisation active.</div>}
                {!automationsLoading && activeAutomations.map((task) => {
                  const checked = automationOverride[task.id] ?? isAutomationEnabled(task);
                  return (
                    <div key={task.id} className="flex min-h-[66px] items-center gap-3 border-b py-3 last:border-0" style={{ borderColor: BORDER }}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#083b2a]" style={{ color: GREEN }}><Workflow size={19} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{task.title}</p>
                        <p className="mt-1 truncate text-[11px]" style={{ color: MUTED }}>{automationSubtitle(task)}</p>
                      </div>
                      <Toggle checked={checked} disabled={!!automationBusy[task.id]} label={`${task.title} : ${checked ? "activée" : "désactivée"}`} onClick={() => void toggleAutomation(task)} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </section>
        </main>
      </div>

      <WhatsAppComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
      />
    </div>
  );
}

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const width = 820;
  const height = 190;
  const left = 44;
  const right = 12;
  const top = 10;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const rawMax = Math.max(1, ...data.flatMap((point) => [point.sent, point.received]));
  const yMax = niceCeil(rawMax);
  const x = (index: number) => left + (data.length <= 1 ? 0 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / yMax) * plotHeight;
  const sent = data.map((point, index) => [x(index), y(point.sent)] as const);
  const received = data.map((point, index) => [x(index), y(point.received)] as const);
  const sentLine = linePath(sent);
  const receivedLine = linePath(received);
  const baseline = top + plotHeight;
  const sentArea = areaPath(sent, baseline);
  const receivedArea = areaPath(received, baseline);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(yMax * ratio));
  const tickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="h-full w-full" role="img" aria-label="Évolution des messages envoyés et reçus">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="wa-sent-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.24" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wa-received-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const yy = y(tick);
          return (
            <g key={tick}>
              <line x1={left} y1={yy} x2={width - right} y2={yy} stroke={BORDER} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
              <text x={left - 8} y={yy + 4} textAnchor="end" fill={MUTED} fontSize="10">{tick}</text>
            </g>
          );
        })}

        {data.map((point, index) => {
          if (index % tickEvery !== 0 && index !== data.length - 1) return null;
          const xx = x(index);
          return (
            <g key={point.date}>
              <line x1={xx} y1={top} x2={xx} y2={baseline} stroke={BORDER} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.6" />
              <text x={xx} y={height - 6} textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"} fill={MUTED} fontSize="10">{point.label}</text>
            </g>
          );
        })}

        <path d={receivedArea} fill="url(#wa-received-gradient)" />
        <path d={sentArea} fill="url(#wa-sent-gradient)" />
        <path d={receivedLine} fill="none" stroke={BLUE} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <path d={sentLine} fill="none" stroke={GREEN} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <table className="sr-only">
        <caption>Données d’activité WhatsApp</caption>
        <thead><tr><th>Date</th><th>Messages envoyés</th><th>Messages reçus</th></tr></thead>
        <tbody>{data.map((point) => <tr key={point.date}><td>{point.label}</td><td>{point.sent}</td><td>{point.received}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col px-3 pb-5 pt-4">
      <Link href="/chat" className="flex h-12 items-center gap-3 px-3" aria-label="Toumaï AI">
        <Image
          src="/logo.png"
          alt=""
          width={38}
          height={38}
          priority
          className="h-[38px] w-[38px] shrink-0 object-contain"
        />
        <span className="text-[23px] font-bold tracking-[-0.03em]">Toumaï AI</span>
      </Link>
      <nav className="mt-5 space-y-1">
        {NAV_ITEMS.map((item) => <SidebarLink key={item.href} {...item} />)}
        <Link href="/whatsapp" className="flex h-[54px] items-center gap-3 rounded-xl border px-4 text-[14px] font-semibold shadow-[0_0_28px_rgba(255,149,24,.12)]" style={{ background: "linear-gradient(90deg, rgba(255,149,24,.23), rgba(255,149,24,.10))", borderColor: "rgba(255,149,24,.72)", color: TEXT }}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0ac86d]"><WhatsAppIcon size={18} /></span>
          WhatsApp
        </Link>
      </nav>
      <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,.035)" }}>
        {LOWER_NAV.map((item) => <SidebarLink key={item.href} {...item} />)}
      </div>
    </div>
  );
}

function SidebarLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof LayoutDashboard }) {
  return <Link href={href} className="flex h-[48px] items-center gap-4 rounded-xl px-4 text-[14px] transition hover:bg-white/[0.04]" style={{ color: "#bdc7cf" }}><Icon size={21} strokeWidth={1.75} /><span>{label}</span></Link>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[14px] border ${className}`} style={{ background: SURFACE, borderColor: BORDER }}>{children}</section>;
}

function MetricCard({ label, value, delta, unit, loading, note, icon, tone }: { label: string; value: string; delta?: number | null; unit?: "pct" | "pts"; loading: boolean; note?: string; icon: ReactNode; tone: "green" | "orange" | "purple" }) {
  const palette = { green: { bg: "#073d2c", fg: "#e9fff5" }, orange: { bg: "#4a2c13", fg: "#fff5e7" }, purple: { bg: "#3c2058", fg: "#f7edff" } }[tone];
  const trend = delta ?? null;
  const positive = trend !== null && trend >= 0;
  return (
    <Card className="flex min-h-[137px] items-center gap-4 p-5">
      <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full" style={{ background: palette.bg, color: palette.fg }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <div className="mt-1 flex items-end gap-3">
          <strong className="text-[28px] font-semibold leading-none tracking-[-0.025em]">{loading ? "—" : value}</strong>
          {trend !== null && <span className="mb-0.5 inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: positive ? GREEN : "#ff6b6b" }}>{positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{Math.abs(trend).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{unit === "pts" ? " pts" : "%"}</span>}
        </div>
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>{note || "vs période précédente"}</p>
      </div>
    </Card>
  );
}

function ConnectionCard({ connection, number, connected, loading }: { connection: { label: string; color: string }; number: string; connected: boolean; loading: boolean }) {
  return (
    <Card className="min-h-[137px] p-5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_15px_currentColor]" style={{ background: connection.color, color: connection.color }} />
        <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{loading ? "Vérification..." : connection.label}</p><p className="mt-1 truncate text-[12px] tabular-nums" style={{ color: MUTED }}>{number}</p></div>
        <button type="button" aria-label="Options de connexion" className="flex h-9 w-9 items-center justify-center rounded-lg border" style={{ borderColor: BORDER, background: SURFACE_RAISED, color: MUTED }}><MoreHorizontal size={18} /></button>
      </div>
      <Link href="/settings?tab=connectors" className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-[12px] font-medium transition hover:bg-white/[0.035]" style={{ borderColor: BORDER, background: SURFACE_RAISED, color: TEXT }}>
        {connected ? <ExternalLink size={15} /> : <RefreshCw size={15} />} Gérer la connexion
      </Link>
    </Card>
  );
}

function QuickAction({ href, icon, label, primary = false }: { href: string; icon: ReactNode; label: string; primary?: boolean }) {
  return <Link href={href} className="flex h-[58px] items-center gap-4 rounded-xl border px-4 transition hover:brightness-110" style={{ background: primary ? "linear-gradient(90deg,#06aa62,#079a59)" : SURFACE_RAISED, borderColor: primary ? "rgba(37,211,102,.55)" : BORDER, color: TEXT }}>{icon}<span className="flex-1 text-[14px] font-medium">{label}</span><ChevronRight size={18} color={primary ? "#d9fff0" : MUTED} /></Link>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: color }} />{label}</span>;
}

function ConversationRow({ conversation, index }: { conversation: WaLiveConversation; index: number }) {
  const name = conversation.name || conversation.number || conversation.id || "Contact WhatsApp";
  const secondary = conversation.number ? `+${conversation.number}` : conversation.id;
  const preview = conversation.last_message.text || "Message WhatsApp";
  const status = conversation.pending ? "En attente" : conversation.last_message.from_me ? "Répondu" : "Nouveau";
  const statusColor = conversation.pending ? ORANGE : conversation.last_message.from_me ? BLUE : GREEN;
  const avatarColors = ["#16b868", "#ff8d1a", "#2f8cff", "#8b4fd4"];
  return (
    <Link
      href={`/whatsapp/conversations?chat=${encodeURIComponent(conversation.id)}`}
      className="grid min-h-[47px] grid-cols-[1.2fr_1.45fr_.7fr_.55fr_28px] items-center gap-3 border-b px-2 py-1 transition hover:bg-white/[0.025] last:border-0"
      style={{ borderColor: BORDER }}
    >
      <div className="flex min-w-0 items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: avatarColors[index % avatarColors.length] }}>{makeInitials(name)}</div><div className="min-w-0"><p className="truncate text-[12px] font-semibold">{name}</p><p className="mt-0.5 truncate text-[10px] tabular-nums" style={{ color: MUTED }}>{secondary}</p></div></div>
      <p className="truncate text-[11px]" style={{ color: "#b7c2cb" }}>{preview}</p>
      <div><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: `${statusColor}18`, color: statusColor }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />{status}</span></div>
      <time className="text-[10px]" style={{ color: MUTED }} dateTime={conversation.last_message.timestamp_ms ? new Date(conversation.last_message.timestamp_ms).toISOString() : undefined}>{formatRelativeTimestamp(conversation.last_message.timestamp_ms)}</time>
      <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: MUTED }}><ChevronRight size={16} /></span>
    </Link>
  );
}

function Toggle({ checked, disabled, label, onClick }: { checked: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onClick} className="relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50" style={{ background: checked ? GREEN : "#33414c" }}><span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: checked ? 24 : 4 }} /></button>;
}

function overviewActivitySeries(
  activity: WhatsAppOverview["activity"],
): ActivityPoint[] {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return activity.map((point) => {
    const date = new Date(point.timestamp || point.date);
    return {
      date: point.date,
      label: Number.isNaN(date.getTime()) ? point.date : formatter.format(date),
      sent: point.sent,
      received: point.received,
    };
  });
}

function metricDelta(metric: WaOverviewMetric | undefined, legacy?: number | null) {
  return metric?.comparison?.value ?? legacy ?? null;
}

function metricDeltaUnit(
  metric: WaOverviewMetric | undefined,
  legacy?: "pct" | "pts",
): "pct" | "pts" | undefined {
  if (metric?.comparison?.unit === "percentage_points") return "pts";
  if (metric?.comparison) return "pct";
  return legacy;
}

function overviewConnectionPresentation(
  connection: WhatsAppOverview["connection"],
) {
  if (connection.status === "connected") return { label: connection.label || "WhatsApp connecté", color: GREEN };
  if (connection.status === "connecting") return { label: connection.label || "Connexion en cours", color: ORANGE };
  if (connection.status === "degraded") return { label: connection.label || "Connexion dégradée", color: ORANGE };
  return { label: connection.label || "WhatsApp non connecté", color: FAINT };
}

async function loadLogsForPeriod(days: PeriodDays): Promise<WaAutopilotLog[]> {
  const all: WaAutopilotLog[] = [];
  const pageSize = 100;
  const maxPages = 10;
  const threshold = Date.now() - days * 86_400_000;
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await getWaAutopilotLogs(page, pageSize);
    all.push(...response.logs);
    if (response.logs.length < pageSize || all.length >= response.pagination.total) break;
    const oldest = response.logs[response.logs.length - 1]?.created_at;
    if (oldest && new Date(oldest).getTime() < threshold) break;
  }
  return all.filter((log) => new Date(log.created_at).getTime() >= threshold);
}

function buildActivitySeries(logs: WaAutopilotLog[], days: PeriodDays): ActivityPoint[] {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  const map = new Map<string, ActivityPoint>();
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - offset);
    const key = localDayKey(date);
    map.set(key, { date: key, label: formatter.format(date), sent: 0, received: 0 });
  }
  for (const log of logs) {
    const date = new Date(log.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const bucket = map.get(localDayKey(date));
    if (!bucket) continue;
    if (log.incoming?.trim()) bucket.received += 1;
    if (log.reply?.trim() && log.delivered !== false) bucket.sent += 1;
  }
  return Array.from(map.values());
}

function linePath(points: readonly (readonly [number, number])[]) {
  if (!points.length) return "";
  if (points.length === 1) {
    return `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  }

  // Courbe Catmull-Rom convertie en Bézier cubique : elle suit les mesures
  // sans inventer de points et retrouve le mouvement fluide de la maquette.
  const tension = 1 / 6;
  let path = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    path += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return path;
}

function areaPath(points: readonly (readonly [number, number])[], baseline: number) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last[0].toFixed(2)},${baseline.toFixed(2)} L${first[0].toFixed(2)},${baseline.toFixed(2)} Z`;
}

function niceCeil(value: number) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function connectionPresentation(etat: WaEtat | null, loading: boolean) {
  if (loading) return { label: "Vérification...", color: FAINT };
  if (!etat) return { label: "WhatsApp indisponible", color: "#ff6b6b" };
  if (etat.code === "connecte" && etat.pret) return { label: "WhatsApp connecté", color: GREEN };
  if (etat.code === "injoignable") return { label: "Passerelle injoignable", color: ORANGE };
  if (["connexion", "jumelage", "qr"].includes(etat.code)) return { label: "Connexion en cours", color: ORANGE };
  if (etat.code === "session_expiree") return { label: "Session expirée", color: "#ff6b6b" };
  if (etat.code === "en_pause") return { label: "WhatsApp en pause", color: ORANGE };
  return { label: etat.libelle || "WhatsApp non connecté", color: FAINT };
}

function formatInteger(value: number) {
  return Math.max(0, value || 0).toLocaleString("fr-FR");
}

function formatDecimal(value: number) {
  return Math.max(0, value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatRelativeTimestamp(value: number) {
  if (!value) return "—";
  return formatRelativeDate(new Date(value).toISOString());
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "À l’instant";
  if (diff < 86_400_000 && date.getDate() === now.getDate()) return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}

function makeInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "TA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isAutomationEnabled(task: WhatsAppAutomation) {
  return task.status === "pending" || task.status === "processing";
}

function automationSubtitle(task: WhatsAppAutomation) {
  if (task.status === "paused") return "En pause";
  if (task.recurrence && task.recurrence !== "none") return `Récurrence : ${task.recurrence}`;
  if (task.message_preview) return task.message_preview;
  return "Automatisation WhatsApp";
}
