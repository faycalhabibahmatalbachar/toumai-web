"use client";

import {
  CalendarClock,
  Copy,
  ExternalLink,
  History,
  MessageCircle,
  Pause,
  Play,
  Repeat,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  automationStatus,
  contentLabel,
  contentPreview,
  errorMessage,
  recurrenceLabel,
  runStatus,
  scheduleLabel,
  viaWhatsApp,
  type Automation,
  type AutomationStatus,
  type AutomationTrigger,
} from "@/lib/automations-api";
import { displayText, parseDate, pick, rec, type Rec, type StatusKey } from "@/lib/widgets/core";
import { formatDateTime, formatRelative, useWidgetText } from "@/lib/widgets/i18n";
import {
  ConfirmationPanel,
  ContentPreview,
  InlineNotice,
  MetaList,
  OverflowMenu,
  WidgetButton,
  WidgetCard,
  WidgetHeader,
  ActionBar,
  type MenuItem,
  type MetaItem,
} from "../primitives";
import { useWidgetRuntime } from "../runtime";

const KNOWN_STATUSES = new Set<AutomationStatus>(["draft", "awaiting_confirmation", "active", "paused", "archived", "cancelled"]);

/** Données du widget serveur → forme `Automation` partielle, sans rien inventer. */
export function automationFromWidget(data: Rec): Automation {
  const rawStatus = pick(data, "status") as AutomationStatus;
  const trigger = rec(data.trigger) as AutomationTrigger;
  return {
    id: pick(data, "id", "automation_id"),
    name: pick(data, "name"),
    status: KNOWN_STATUSES.has(rawStatus) ? rawStatus : "active",
    enabled: data.enabled !== false,
    trigger,
    next_run_at: pick(data, "next_run_at", "schedule", "when") || null,
    recipient: pick(data, "recipient", "to_name", "to") || null,
    media_type: pick(data, "media_type") || null,
    source_kind: pick(data, "source_kind") || null,
  };
}

function statusKeyOf(a: Automation): { key: StatusKey; label: string } {
  const { label, tone } = automationStatus(a);
  if (a.last_run?.status === "running" || a.last_run?.status === "queued") return { key: "running", label };
  switch (tone) {
    case "active": return { key: a.next_run_at ? "scheduled" : "active", label };
    case "attention": return { key: "needs_action", label };
    case "success": return { key: "success", label };
    case "error": return { key: "failed", label };
    default:
      return { key: a.status === "paused" ? "paused" : a.status === "draft" ? "draft" : a.status === "archived" ? "archived" : "cancelled", label };
  }
}

type Busy = "" | "pause" | "resume" | "run" | "duplicate" | "cancel";

export function AutomationWidget({ data, title }: { data: Rec; title?: string }) {
  const { t, locale, lang } = useWidgetText();
  const runtime = useWidgetRuntime();
  const initial = useMemo(() => automationFromWidget(data), [data]);
  const [automation, setAutomation] = useState<Automation>(initial);
  const [busy, setBusy] = useState<Busy>("");
  const [confirm, setConfirm] = useState<"" | "cancel" | "run">("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const id = automation.id;
  const isUpdate = Boolean(pick(data, "action"));

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await runtime.automations.get(id);
      if (fresh?.id) setAutomation((current) => ({ ...current, ...fresh }));
    } catch {
      // Relecture informative : la carte garde l'état reçu dans le fil.
    }
  }, [id, runtime]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  // Temps réel sans socket : relecture tant que l'état peut encore changer
  // bientôt (exécution proche ou en cours) et que l'onglet est visible.
  useEffect(() => {
    const ms = runtime.automations.refreshMs;
    if (!id || !ms) return;
    const next = parseDate(automation.next_run_at);
    const soon = next && next.getTime() - Date.now() < 15 * 60_000;
    const running = automation.last_run?.status === "running" || automation.last_run?.status === "queued";
    if (automation.status !== "active" || (!soon && !running)) return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, ms);
    return () => window.clearInterval(timer);
  }, [id, automation.status, automation.next_run_at, automation.last_run?.status, runtime, refresh]);

  const perform = async (action: Exclude<Busy, "">) => {
    if (!id || busy) return;
    setBusy(action);
    setNotice(null);
    try {
      if (action === "pause") setAutomation(await runtime.automations.pause(id));
      if (action === "resume") setAutomation(await runtime.automations.activate(id));
      if (action === "cancel") setAutomation(await runtime.automations.cancel(id));
      if (action === "duplicate") await runtime.automations.duplicate(id);
      if (action === "run") {
        await runtime.automations.runNow(id);
        void refresh();
      }
      const text = { pause: t.automation.paused, resume: t.automation.resumed, cancel: t.automation.cancelled, duplicate: t.automation.duplicated, run: t.automation.ranNow }[action];
      setNotice({ tone: "success", text });
    } catch (error) {
      const message = error instanceof Error && error.message && error.message.includes(" ") ? error.message : t.automation.actionFailed;
      setNotice({ tone: "error", text: displayText(message, 160) });
    } finally {
      setBusy("");
      setConfirm("");
    }
  };

  const status = statusKeyOf(automation);
  const trigger = automation.trigger || {};
  const kind = String(trigger.kind || (automation.next_run_at ? "exact_time" : ""));
  const whatsapp = viaWhatsApp(automation) || pick(data, "connector") === "whatsapp";
  const nextDate = parseDate(automation.next_run_at || trigger.at);
  const recipient = automation.recipient ? displayText(automation.recipient, 60) : "";
  const preview = contentPreview(automation);
  const lastRun = automation.last_run;

  const whenValue = kind === "recurrence"
    ? recurrenceLabel(String(trigger.cron ?? ""))
    : kind === "manual"
      ? t.automation.manual
      : kind !== "exact_time" && kind !== "flexible_time"
        // Déclencheurs non encore branchés : libellé partagé, jamais « actif ».
        ? scheduleLabel(automation)
        : nextDate
          ? `${formatDateTime(nextDate, locale)} · ${formatRelative(nextDate, locale)}`
          : "";

  // Carte COMPACTE : quand, et seulement ce qui ajoute une information. Le
  // type de contenu disparaît quand l'aperçu du message le montre déjà.
  const zone = timezoneLabel(trigger.timezone, t.automation.localTime);
  const meta: MetaItem[] = [
    { label: t.automation.when, value: [whenValue, zone].filter(Boolean).join(" · "), icon: kind === "recurrence" ? Repeat : CalendarClock, wide: true },
    kind === "recurrence" && nextDate ? { label: t.automation.next, value: formatDateTime(nextDate, locale) } : null,
    !preview || (automation.media_type && automation.media_type !== "text")
      ? { label: t.automation.content, value: contentLabel(automation.media_type, automation.source_kind) }
      : null,
    lastRun ? {
      label: t.automation.lastRun,
      value: [runStatus(lastRun.status, whatsapp).label, formatDateTime(parseDate(lastRun.finished_at), locale)].filter(Boolean).join(" · "),
    } : null,
  ].filter(Boolean) as MetaItem[];

  const lastError = lastRun && ["failed", "timed_out", "ambiguous"].includes(lastRun.status)
    ? errorMessage(lastRun.error, lastRun.error_category, lastRun.status)
    : "";

  const closed = automation.status === "cancelled" || automation.status === "archived";
  const menu: MenuItem[] = id ? [
    automation.status === "active" ? { label: t.automation.pause, icon: Pause, onSelect: () => void perform("pause") } : null,
    automation.status === "paused" ? { label: t.automation.resume, icon: Play, onSelect: () => void perform("resume") } : null,
    !closed && automation.status !== "awaiting_confirmation" ? { label: t.automation.runNow, icon: Send, onSelect: () => setConfirm("run") } : null,
    !closed ? { label: t.automation.reschedule, icon: CalendarClock, onSelect: () => window.location.assign(runtime.links.automation(id)) } : null,
    { label: t.automation.duplicate, icon: Copy, onSelect: () => void perform("duplicate") },
    { label: t.automation.history, icon: History, onSelect: () => window.location.assign(runtime.links.automation(id)) },
    !closed ? { label: t.automation.cancel, icon: Trash2, danger: true, onSelect: () => setConfirm("cancel") } : null,
  ].filter(Boolean) as MenuItem[] : [];

  const headerTitle = automation.name || title || (isUpdate ? t.automation.updated : t.automation.created);
  const channel = whatsapp ? "WhatsApp" : "";
  const subtitle = [channel, recipient].filter(Boolean).join(" · ") || undefined;

  return (
    <WidgetCard label={headerTitle} tone={undefined} live testId="automation">
      <WidgetHeader
        icon={whatsapp ? MessageCircle : Zap}
        title={headerTitle}
        subtitle={subtitle}
        status={busy ? "running" : status.key}
        statusLabel={busy ? t.automation.running : lang === "fr" ? status.label : undefined}
      />
      <MetaList items={meta} />
      {preview ? <ContentPreview lines={2}>{preview}</ContentPreview> : null}
      {lastError ? <InlineNotice tone="error">{lastError}</InlineNotice> : null}
      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      {confirm === "cancel" ? (
        <ConfirmationPanel
          title={t.automation.cancelTitle}
          body={t.automation.cancelBody}
          confirmLabel={t.automation.cancel}
          destructive
          busy={busy === "cancel"}
          onCancel={() => setConfirm("")}
          onConfirm={() => void perform("cancel")}
        />
      ) : confirm === "run" ? (
        <ConfirmationPanel
          title={t.automation.runNow}
          body={[channel, recipient, contentLabel(automation.media_type, automation.source_kind)].filter(Boolean).join(" · ")}
          confirmLabel={t.automation.runNow}
          busy={busy === "run"}
          onCancel={() => setConfirm("")}
          onConfirm={() => void perform("run")}
        />
      ) : id ? (
        <ActionBar>
          <WidgetButton href={runtime.links.automation(id)} icon={ExternalLink} variant="secondary">{t.common.view}</WidgetButton>
          <span className="ms-auto" />
          <OverflowMenu items={menu} />
        </ActionBar>
      ) : null}
    </WidgetCard>
  );
}

/** Ancien projet serveur `scheduled_task` (message WhatsApp programmé). Son
 * identifiant n'est PAS celui d'une automatisation : aucune action n'y est
 * branchée, on n'en affiche donc aucune. */
export function ScheduledTaskWidget({ data, title }: { data: Rec; title?: string }) {
  const { t, locale } = useWidgetText();
  const when = parseDate(pick(data, "schedule", "send_at", "next_run_at"));
  const recipient = displayText(pick(data, "to_name", "recipient", "to"), 60);
  const message = pick(data, "message", "text");
  return (
    <WidgetCard label={title || t.scheduled.single} testId="scheduled_task">
      <WidgetHeader
        icon={MessageCircle}
        title={title || t.scheduled.single}
        subtitle={["WhatsApp", recipient].filter(Boolean).join(" · ")}
        status={normalizeScheduled(pick(data, "status"))}
      />
      <MetaList items={[{ label: t.automation.when, value: when ? `${formatDateTime(when, locale)} · ${formatRelative(when, locale)}` : "", icon: CalendarClock }]} />
      {message ? <ContentPreview lines={2}>{message}</ContentPreview> : null}
    </WidgetCard>
  );
}

/** « Africa/Ndjamena » → « heure de N’Djamena ». Un identifiant IANA n'est
 * pas une information lisible. */
function timezoneLabel(raw: unknown, label: (city: string) => string): string {
  const zone = typeof raw === "string" ? raw.trim() : "";
  if (!zone) return "";
  if (zone === "Africa/Ndjamena") return label("N’Djamena");
  const city = zone.split("/").pop()?.replace(/_/g, " ") || zone;
  return label(city);
}

function normalizeScheduled(raw: string): StatusKey {
  switch (raw) {
    case "sent": return "sent";
    case "failed": return "failed";
    case "cancelled": return "cancelled";
    case "pending": case "active": case "": return "scheduled";
    default: return "unknown";
  }
}
