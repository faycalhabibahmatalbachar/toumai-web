"use client";

import { CalendarDays, Check, CircleX, Gauge, Mail, MessageCircle, PlugZap, AlertTriangle, type LucideIcon } from "lucide-react";
import {
  displayText,
  parseDate,
  pick,
  pickNum,
  records,
  safeHttpUrl,
  type Rec,
  type StatusTone,
} from "@/lib/widgets/core";
import { formatDateTime, useWidgetText } from "@/lib/widgets/i18n";
import { ActionBar, CollapsibleList, InlineNotice, WidgetButton, WidgetCard, WidgetHeader } from "../primitives";
import { useWidgetRuntime } from "../runtime";

function providerIcon(provider: string): LucideIcon {
  const p = provider.toLowerCase();
  if (p.includes("whatsapp")) return MessageCircle;
  if (p.includes("agenda") || p.includes("calendar")) return CalendarDays;
  if (p.includes("mail") || p.includes("gmail")) return Mail;
  return PlugZap;
}

export function AuthRequiredWidget({ data }: { data: Rec }) {
  const { t } = useWidgetText();
  const runtime = useWidgetRuntime();
  const provider = pick(data, "provider", "service") || "Connecteur";
  const actionUrl = safeHttpUrl(data.action_url ?? data.url);
  const message = displayText(pick(data, "message"), 200);
  return (
    <WidgetCard label={t.connector.authTitle(provider)} tone="attention" accent testId="auth_required">
      <WidgetHeader icon={providerIcon(provider)} title={t.connector.authTitle(provider)} subtitle={message || t.connector.authBody} status="auth_required" />
      <ActionBar>
        {actionUrl
          ? <WidgetButton href={actionUrl} external variant="primary">{t.connector.connect}</WidgetButton>
          : <WidgetButton href={runtime.links.connectors} variant="primary">{t.connector.openSettings}</WidgetButton>}
      </ActionBar>
    </WidgetCard>
  );
}

export function QuotaWidget({ data }: { data: Rec }) {
  const { t, locale } = useWidgetText();
  const runtime = useWidgetRuntime();
  const used = pickNum(data, "used", "consumed");
  const limit = pickNum(data, "limit", "total");
  const remaining = pickNum(data, "remaining");
  const label = pick(data, "label", "resource") || t.quota.title;
  const message = displayText(pick(data, "message"), 220);
  const reset = parseDate(pick(data, "reset_at", "renews_at"));
  const excluded = data.included === false || (limit !== null && limit <= 0);
  const ratio = !excluded && used !== null && limit !== null && limit > 0 ? Math.min(1, Math.max(0, used / limit)) : null;
  const tone: StatusTone = excluded ? "neutral" : ratio === null ? "neutral" : ratio >= 1 ? "error" : ratio >= 0.8 ? "warning" : "active";

  return (
    <WidgetCard label={label} testId="quota" className="!max-w-[26rem]">
      <WidgetHeader
        icon={Gauge}
        title={label}
        subtitle={!excluded && reset ? t.quota.resets(formatDateTime(reset, locale)) : undefined}
        status={excluded ? "unavailable" : ratio !== null && ratio >= 1 ? "blocked" : undefined}
        statusLabel={excluded ? t.quota.notIncluded : undefined}
      />
      {ratio !== null ? (
        <div className={`px-3.5 pb-3 tmw-tone-${tone}`}>
          <div className="flex items-baseline justify-between gap-3 text-[12px] tabular-nums">
            <span className="text-[var(--text-primary)]">{used!.toLocaleString(locale)} / {limit!.toLocaleString(locale)}</span>
            {remaining !== null ? <span className="text-[var(--text-tertiary)]">{t.quota.remaining(remaining.toLocaleString(locale))}</span> : null}
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--hover)]"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={limit!}
            aria-valuenow={used!}
          >
            <div className="tmw-dot h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
      ) : null}
      {message ? <p className="px-3.5 pb-3 text-[12px] leading-[18px] text-[var(--text-secondary)]">{message}</p> : null}
      {excluded || (ratio !== null && ratio >= 1) ? (
        <ActionBar><WidgetButton href={runtime.links.plans} variant="secondary">{t.quota.upgrade}</WidgetButton></ActionBar>
      ) : null}
    </WidgetCard>
  );
}

type CapState = "available" | "unsupported" | "unavailable" | "undeclared";

const GROUPS: Array<[string, string]> = [
  ["Messages", "whatsapp.message."],
  ["Médias", "whatsapp.media."],
  ["Groupes", "whatsapp.group."],
  ["Membres", "whatsapp.group.participant."],
  ["Administrateurs", "whatsapp.group.admin."],
  ["Statuts", "whatsapp.status."],
  ["Contacts", "whatsapp.contact."],
  ["Appels", "whatsapp.call."],
];

export function CapabilitiesWidget({ data }: { data: Rec }) {
  const { t } = useWidgetText();
  const provider = pick(data, "provider") || "WhatsApp";
  const caps = records(data.capabilities);
  const availableCount = caps.filter((c) => c.available_now === true && c.supported !== false).length;

  const rows = GROUPS.map(([label, prefix]) => {
    const matching = caps.filter((c) => {
      const id = pick(c, "capability");
      // « whatsapp.group. » ne doit pas avaler les membres et les admins.
      if (prefix === "whatsapp.group.") return id.startsWith(prefix) && !id.startsWith("whatsapp.group.participant.") && !id.startsWith("whatsapp.group.admin.");
      return id.startsWith(prefix);
    });
    const state: CapState = !matching.length
      ? "undeclared"
      : matching.some((c) => c.available_now === true && c.supported !== false)
        ? "available"
        : matching.every((c) => c.supported === false)
          ? "unsupported"
          : "unavailable";
    return { label, state };
  });

  const visual: Record<CapState, { icon: LucideIcon; tone: StatusTone; text: string }> = {
    available: { icon: Check, tone: "success", text: t.connector.available },
    unsupported: { icon: CircleX, tone: "neutral", text: t.connector.unsupported },
    unavailable: { icon: AlertTriangle, tone: "warning", text: t.connector.unavailableNow },
    undeclared: { icon: CircleX, tone: "neutral", text: t.connector.undeclared },
  };

  if (!caps.length) {
    return (
      <WidgetCard label={t.connector.capabilities(provider)} testId="capabilities">
        <WidgetHeader icon={providerIcon(provider)} title={t.connector.capabilities(provider)} />
        <InlineNotice tone="warning">{t.connector.unavailableNow}</InlineNotice>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard label={t.connector.capabilities(provider)} testId="capabilities">
      <WidgetHeader icon={providerIcon(provider)} title={t.connector.capabilities(provider)} subtitle={t.connector.availableNow(availableCount)} />
      <CollapsibleList
        label={t.connector.capabilities(provider)}
        items={rows}
        initial={8}
        className="border-t border-[var(--border)]"
        render={(row) => {
          const v = visual[row.state];
          return (
            <div className={`flex min-h-10 items-center gap-3 px-3.5 py-2 tmw-tone-${v.tone}`}>
              <span className="tmw-icon-soft inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"><v.icon className="h-3 w-3" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1 text-[12.5px] text-[var(--text-primary)]">{row.label}</span>
              <span className="shrink-0 text-[11.5px] text-[var(--text-tertiary)]">{v.text}</span>
            </div>
          );
        }}
      />
    </WidgetCard>
  );
}
