"use client";

import {
  BellRing,
  CalendarClock,
  ExternalLink,
  Pause,
  Play,
  Repeat,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  errorMessage,
  recurrenceLabel,
  scheduleLabel,
  type Automation,
  type AutomationStatus,
  type AutomationTrigger,
} from "@/lib/automations-api";
import { displayText, parseDate, pick, rec, toneOf, type Rec, type StatusKey } from "@/lib/widgets/core";
import { formatDateTime, formatRelative, useWidgetText } from "@/lib/widgets/i18n";
import {
  ActionBar,
  ConfirmationPanel,
  ContentPreview,
  InlineNotice,
  MetaList,
  OverflowMenu,
  WidgetButton,
  WidgetCard,
  WidgetHeader,
  type MenuItem,
  type MetaItem,
} from "../primitives";
import { useWidgetRuntime } from "../runtime";

const KNOWN = new Set<AutomationStatus>([
  "draft",
  "awaiting_confirmation",
  "active",
  "paused",
  "archived",
  "cancelled",
]);

function fromWidget(data: Rec): Automation {
  const status = pick(data, "status") as AutomationStatus;
  return {
    id: pick(data, "id", "automation_id"),
    name: pick(data, "name") || "Rappel",
    status: KNOWN.has(status) ? status : "active",
    enabled: data.enabled !== false,
    trigger: rec(data.trigger) as AutomationTrigger,
    next_run_at: pick(data, "next_run_at", "schedule") || null,
  };
}

function visibleReminderText(data: Rec, automation: Automation): string {
  const direct = displayText(pick(data, "reminder_text", "text", "body"), 220);
  if (direct) return direct;
  return displayText((automation.name || "").replace(/^Rappel\s*[·:-]\s*/i, ""), 220) || "Rappel";
}

function stateOf(a: Automation, labels: {
  active: string;
  paused: string;
  cancelled: string;
  running: string;
}): { key: StatusKey; label: string } {
  const run = a.last_run?.status;
  if (run === "running" || run === "queued") return { key: "running", label: labels.running };
  if (run === "failed" || run === "timed_out") return { key: "failed", label: "Échec" };
  if (run === "ambiguous" || run === "waiting_for_approval") return { key: "needs_action", label: "À vérifier" };
  if (a.status === "paused") return { key: "paused", label: labels.paused };
  if (a.status === "cancelled" || a.status === "archived") return { key: "cancelled", label: labels.cancelled };
  if (a.status === "draft" || a.status === "awaiting_confirmation") return { key: "needs_action", label: "À confirmer" };
  return { key: a.next_run_at ? "scheduled" : "active", label: labels.active };
}

function timezoneLabel(raw: unknown, localTime: (city: string) => string): string {
  const zone = typeof raw === "string" ? raw.trim() : "";
  if (!zone) return "";
  if (zone === "Africa/Ndjamena") return localTime("N’Djamena");
  const city = zone.split("/").pop()?.replace(/_/g, " ") || zone;
  return localTime(city);
}

type Busy = "" | "pause" | "resume" | "cancel";

export function ReminderWidget({ data, title }: { data: Rec; title?: string }) {
  const { t, locale } = useWidgetText();
  const runtime = useWidgetRuntime();
  const initial = useMemo(() => fromWidget(data), [data]);
  const [automation, setAutomation] = useState<Automation>(initial);
  const [busy, setBusy] = useState<Busy>("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const id = automation.id;
  const reminderText = visibleReminderText(data, automation);
  const replayed = data.replayed === true;

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const fresh = await runtime.automations.get(id);
      if (fresh?.id) setAutomation(fresh);
    } catch {
      // La carte conserve l'état attesté par le message si la relecture échoue.
    }
  }, [id, runtime]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!id || !runtime.automations.refreshMs || automation.status === "cancelled" || automation.status === "archived") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, runtime.automations.refreshMs);
    return () => window.clearInterval(timer);
  }, [id, automation.status, runtime.automations.refreshMs, refresh]);

  const perform = async (action: Busy) => {
    if (!id || !action || busy) return;
    setBusy(action);
    setNotice(null);
    try {
      if (action === "pause") setAutomation(await runtime.automations.pause(id));
      if (action === "resume") setAutomation(await runtime.automations.activate(id));
      if (action === "cancel") setAutomation(await runtime.automations.cancel(id));
      setNotice({
        tone: "success",
        text: action === "pause" ? t.reminder.paused : action === "resume" ? t.reminder.resumed : t.reminder.cancelled,
      });
    } catch {
      setNotice({ tone: "error", text: t.reminder.actionFailed });
    } finally {
      setBusy("");
      setConfirmCancel(false);
    }
  };

  const trigger = automation.trigger || {};
  const kind = String(trigger.kind || (automation.next_run_at ? "exact_time" : ""));
  const nextDate = parseDate(automation.next_run_at || trigger.at);
  const when = kind === "recurrence"
    ? recurrenceLabel(String(trigger.cron ?? ""))
    : scheduleLabel(automation);
  const zone = timezoneLabel(trigger.timezone, t.automation.localTime);
  const state = stateOf(automation, {
    active: t.reminder.active,
    paused: t.reminder.pausedStatus,
    cancelled: t.reminder.cancelledStatus,
    running: t.reminder.running,
  });

  const meta: MetaItem[] = [
    {
      label: t.reminder.when,
      value: [when, zone].filter(Boolean).join(" · "),
      icon: kind === "recurrence" ? Repeat : CalendarClock,
      wide: true,
    },
    kind === "recurrence" && nextDate
      ? {
          label: t.reminder.next,
          value: [formatDateTime(nextDate, locale), formatRelative(nextDate, locale)].filter(Boolean).join(" · "),
          icon: CalendarClock,
          wide: true,
        }
      : null,
  ].filter(Boolean) as MetaItem[];

  const lastRun = automation.last_run;
  const lastError = lastRun && ["failed", "timed_out", "ambiguous"].includes(lastRun.status)
    ? errorMessage(lastRun.error, lastRun.error_category, lastRun.status)
    : "";

  const closed = automation.status === "cancelled" || automation.status === "archived";
  const menu: MenuItem[] = id
    ? [
        automation.status === "active"
          ? { label: t.reminder.pause, icon: Pause, onSelect: () => void perform("pause") }
          : null,
        automation.status === "paused"
          ? { label: t.reminder.resume, icon: Play, onSelect: () => void perform("resume") }
          : null,
        !closed
          ? { label: t.reminder.cancel, icon: Trash2, danger: true, onSelect: () => setConfirmCancel(true) }
          : null,
      ].filter(Boolean) as MenuItem[]
    : [];

  return (
    <WidgetCard
      label={title || t.reminder.title}
      tone={toneOf(state.key)}
      accent
      live
      testId="personal_reminder"
    >
      <WidgetHeader
        icon={BellRing}
        title={replayed ? t.reminder.already : t.reminder.created}
        subtitle={t.reminder.channel}
        status={busy ? "running" : state.key}
        statusLabel={busy ? t.reminder.updating : state.label}
        tone={toneOf(state.key)}
      />

      <div className="px-3.5 pb-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
          {t.reminder.content}
        </p>
      </div>
      <ContentPreview lines={3}>{reminderText}</ContentPreview>
      <MetaList items={meta} />

      {lastError ? <InlineNotice tone="error">{lastError}</InlineNotice> : null}
      {notice ? <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice> : null}

      {confirmCancel ? (
        <ConfirmationPanel
          title={t.reminder.cancelTitle}
          body={t.reminder.cancelBody}
          confirmLabel={t.reminder.cancel}
          destructive
          busy={busy === "cancel"}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => void perform("cancel")}
        />
      ) : id ? (
        <ActionBar>
          <WidgetButton
            href={runtime.links.automation(id)}
            icon={ExternalLink}
            variant="secondary"
          >
            {t.reminder.manage}
          </WidgetButton>
          <span className="ms-auto" />
          <OverflowMenu items={menu} />
        </ActionBar>
      ) : null}
    </WidgetCard>
  );
}
