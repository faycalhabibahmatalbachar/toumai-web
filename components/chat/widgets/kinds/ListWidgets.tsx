"use client";

import { CalendarDays, Inbox, MapPin, MessageCircle, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  cellText,
  detectTableKind,
  displayText,
  humanizeKey,
  parseDate,
  pick,
  records,
  tableColumns,
  truncate,
  type Rec,
} from "@/lib/widgets/core";
import { formatDateTime, formatTime, useWidgetText } from "@/lib/widgets/i18n";
import { CollapsibleList, EmptyState, EntityAvatar, StatusBadge, WidgetCard, WidgetHeader } from "../primitives";

/** « Ahmat Saleh <ahmat@x.td> » → nom seul, adresse en second plan. */
function splitSender(raw: string): { name: string; address: string } {
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || match[2], address: match[2] };
  return { name: raw, address: "" };
}

export function MailListWidget({ rows, title }: { rows: Rec[]; title?: string }) {
  const { t, locale } = useWidgetText();
  const label = title || t.mail.inbox;
  return (
    <WidgetCard label={label} testId="mail_list">
      <WidgetHeader icon={Inbox} title={label} subtitle={rows.length ? t.mail.count(rows.length) : undefined} />
      {rows.length ? (
        <CollapsibleList
          label={label}
          items={rows}
          initial={4}
          className="border-t border-[var(--border)]"
          render={(mail) => {
            const sender = splitSender(pick(mail, "from", "sender", "from_name"));
            const date = parseDate(pick(mail, "date", "received_at"));
            const unread = mail.unread === true || mail.seen === false;
            return (
              <div className="flex min-w-0 items-start gap-3 px-3.5 py-2.5">
                <EntityAvatar name={sender.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <p className={`min-w-0 flex-1 truncate text-[12.5px] ${unread ? "font-semibold" : "font-medium"} text-[var(--text-primary)]`}>{displayText(sender.name, 60)}</p>
                    {date ? <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-tertiary)]">{formatDateTime(date, locale, false)}</span> : null}
                  </div>
                  <p className="truncate text-[12px] text-[var(--text-secondary)]">
                    {unread ? <span className="tmw-tone-active tmw-dot me-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" aria-label={t.mail.unread} /> : null}
                    {displayText(pick(mail, "subject", "title"), 120) || "—"}
                  </p>
                  {pick(mail, "preview", "snippet") ? <p className="mt-0.5 line-clamp-2 break-words text-[11.5px] leading-4 text-[var(--text-tertiary)]">{truncate(pick(mail, "preview", "snippet"), 220)}</p> : null}
                </div>
              </div>
            );
          }}
        />
      ) : <EmptyState icon={Inbox} title={t.mail.none} />}
    </WidgetCard>
  );
}

export function CalendarWidget({ data, title }: { data: Rec; title?: string }) {
  const { t, locale } = useWidgetText();
  const events = useMemo(() => records(data.events ?? data.items).slice(0, 60), [data]);
  const label = title || t.calendar.title;

  // Regroupement par jour : une journée chargée se lit d'un bloc.
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date | null; items: Rec[] }>();
    for (const event of events) {
      const start = parseDate(pick(event, "start", "start_time", "date"));
      const key = start ? start.toDateString() : "?";
      if (!map.has(key)) map.set(key, { date: start, items: [] });
      map.get(key)!.items.push(event);
    }
    return Array.from(map.values());
  }, [events]);

  return (
    <WidgetCard label={label} testId="calendar">
      <WidgetHeader icon={CalendarDays} title={label} subtitle={events.length ? t.calendar.events(events.length) : undefined} />
      {events.length ? (
        <CollapsibleList
          label={label}
          items={groups}
          initial={3}
          className="border-t border-[var(--border)]"
          render={(group) => (
            <div className="px-3.5 py-2.5">
              <p className="text-[11px] font-medium capitalize text-[var(--text-tertiary)]">
                {group.date ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(group.date) : "—"}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {group.items.map((event, index) => {
                  const rawStart = pick(event, "start", "start_time", "date");
                  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(rawStart);
                  const start = parseDate(rawStart);
                  const end = parseDate(pick(event, "end", "end_time"));
                  const location = displayText(pick(event, "location"), 80);
                  return (
                    <li key={`${pick(event, "id")}-${index}`} className="flex min-w-0 gap-3">
                      <span className="w-16 shrink-0 pt-px text-[12px] tabular-nums text-[var(--text-secondary)]">
                        {allDay ? t.calendar.allDay : [formatTime(start, locale), formatTime(end, locale)].filter(Boolean).join("–")}
                      </span>
                      <div className="min-w-0 flex-1 border-s-2 border-[var(--primary)]/60 ps-2.5">
                        <p className="break-words text-[12.5px] font-medium text-[var(--text-primary)]">{displayText(pick(event, "summary", "title"), 120) || "—"}</p>
                        {location ? <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-[var(--text-tertiary)]"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />{location}</p> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        />
      ) : <EmptyState icon={CalendarDays} title={t.calendar.none} />}
    </WidgetCard>
  );
}

export function ScheduledMessagesWidget({ rows, title }: { rows: Rec[]; title?: string }) {
  const { t, locale } = useWidgetText();
  const label = title || t.scheduled.title;
  return (
    <WidgetCard label={label} testId="scheduled_messages">
      <WidgetHeader icon={MessageCircle} title={label} subtitle={rows.length ? `WhatsApp · ${rows.length}` : "WhatsApp"} />
      {rows.length ? (
        <CollapsibleList
          label={label}
          items={rows}
          initial={4}
          className="border-t border-[var(--border)]"
          render={(row) => {
            const when = parseDate(pick(row, "send_at", "scheduled_for", "run_at"));
            const status = pick(row, "status");
            const key = status === "sent" ? "sent" : status === "failed" ? "failed" : status === "cancelled" ? "cancelled" : "scheduled";
            return (
              <div className="flex min-w-0 items-start gap-3 px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-[var(--text-primary)]">{displayText(pick(row, "to_name", "to", "recipient"), 60) || "—"}</p>
                  <p className="mt-0.5 line-clamp-2 break-words text-[12px] text-[var(--text-secondary)]">{truncate(pick(row, "message", "text"), 160)}</p>
                  {when ? <p className="mt-0.5 text-[11px] tabular-nums text-[var(--text-tertiary)]">{formatDateTime(when, locale)}</p> : null}
                  {pick(row, "last_error") ? <p className="mt-0.5 text-[11px] text-[var(--tmw-error)]">{displayText(pick(row, "last_error"), 140)}</p> : null}
                </div>
                <StatusBadge status={key} />
              </div>
            );
          }}
        />
      ) : <EmptyState icon={MessageCircle} title={t.scheduled.none} />}
    </WidgetCard>
  );
}

/** Tableau générique : colonnes lisibles, identifiants masqués, défilement propre. */
export function TableWidget({ data, title }: { data: unknown; title?: string }) {
  const { t } = useWidgetText();
  const source = Array.isArray(data) ? data : records((data as Rec | null)?.rows ?? (data as Rec | null)?.items);
  const rows = records(source);
  const [limit, setLimit] = useState(8);
  const kind = detectTableKind(rows, title);
  const columns = useMemo(() => tableColumns(rows), [rows]);

  if (kind === "emails") return <MailListWidget rows={rows} title={title} />;
  if (kind === "scheduled_messages") return <ScheduledMessagesWidget rows={rows} title={title} />;

  const label = title || "Tableau";
  if (!rows.length || !columns.length) {
    return (
      <WidgetCard label={label} testId="table">
        <WidgetHeader icon={Table2} title={label} />
        <EmptyState title={t.table.empty} />
      </WidgetCard>
    );
  }
  return (
    <WidgetCard label={label} testId="table" className="!max-w-[var(--chat-measure,46rem)]">
      <WidgetHeader icon={Table2} title={label} subtitle={t.table.rows(rows.length)} />
      <div className="overflow-x-auto overscroll-x-contain border-t border-[var(--border)]" tabIndex={0} role="region" aria-label={label}>
        <table className="w-full min-w-max border-collapse text-start text-[12px]">
          <thead className="tmw-inset">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="whitespace-nowrap px-3.5 py-2 text-start text-[11px] font-medium text-[var(--text-tertiary)]">{humanizeKey(column)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((row, index) => (
              <tr key={index} className="border-t border-[var(--border)]">
                {columns.map((column) => (
                  <td key={column} className="max-w-[16rem] px-3.5 py-2 align-top text-[var(--text-primary)]">
                    <span className="line-clamp-3 break-words">{cellText(row[column])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit(Math.min(rows.length, 200))}
          className="flex min-h-10 w-full items-center justify-center border-t border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] outline-none hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
        >
          {t.common.showAll(rows.length)}
        </button>
      ) : null}
    </WidgetCard>
  );
}
