"use client";

import { ExternalLink, Globe2, Search } from "lucide-react";
import { useState } from "react";
import type { WebSource } from "@/lib/chat-stream";
import { displayText, hostOf, parseDate, pick, pickNum, safeHttpUrl, type Rec, type StatusKey } from "@/lib/widgets/core";
import { formatDateTime, useWidgetText } from "@/lib/widgets/i18n";
import { WidgetCard, WidgetHeader } from "../primitives";

type SourceVisit = { retrieved?: boolean; visit_status?: string };

function visited(source: object): boolean {
  const meta = source as SourceVisit;
  return meta.retrieved === true || meta.visit_status === "visited";
}

/** Favicon du site, sinon l'initiale du domaine — jamais une image cassée. */
export function SourceFavicon({ url, favicon, size = 16 }: { url: string; favicon?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const icon = safeHttpUrl(favicon);
  const letter = hostOf(url).charAt(0).toUpperCase() || "W";
  return (
    <span
      className="tmw-inset inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-[var(--border)] text-[9px] font-semibold text-[var(--text-secondary)]"
      style={{ width: size + 4, height: size + 4 }}
      aria-hidden="true"
    >
      {icon && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={icon} alt="" width={size - 4} height={size - 4} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="object-contain" />
        : letter}
    </span>
  );
}

/**
 * Les sources d'une réponse : une ligne résumée et des pastilles de domaines,
 * la liste complète derrière un dépliage. Quinze grosses cartes dans le fil
 * enterreraient la réponse elle-même.
 */
export function SourcesCard({ sources }: { sources: WebSource[] }) {
  const { t, locale } = useWidgetText();
  const [open, setOpen] = useState(false);
  const items = sources
    .map((source, index) => ({ source, index, url: safeHttpUrl(source.url) }))
    .filter((entry): entry is typeof entry & { url: string } => Boolean(entry.url))
    .slice(0, 12);
  if (!items.length) return null;

  const readCount = items.filter(({ source }) => visited(source)).length;
  const summary = readCount
    ? `${t.search.sources(items.length)} · ${readCount} ${t.search.visited.toLowerCase()}`
    : t.search.sources(items.length);

  return (
    <WidgetCard label={t.search.title} testId="sources" className="!mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2 text-start outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
      >
        <span className="flex -space-x-1.5 rtl:space-x-reverse" aria-hidden="true">
          {items.slice(0, 4).map(({ source, url, index }) => (
            <span key={`${url}-${index}`} className="rounded-[6px] ring-2 ring-[var(--card)]">
              <SourceFavicon url={url} favicon={source.favicon_url} />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--text-secondary)]">{summary}</span>
        <span className="shrink-0 text-[11.5px] text-[var(--text-tertiary)]">{open ? t.common.showLess : t.common.details}</span>
      </button>
      {open ? (
        <ol className="border-t border-[var(--border)] px-1.5 py-1.5" aria-label={t.search.title}>
          {items.map(({ source, url, index }) => {
            const state = visited(source) ? t.search.visited : t.search.found;
            const date = formatDateTime(parseDate(source.published_at), locale, false);
            return (
              <li key={`${url}-${index}`}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="group flex min-h-12 min-w-0 items-start gap-2.5 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <span className="mt-0.5"><SourceFavicon url={url} favicon={source.favicon_url} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-[var(--text-primary)]">
                      <span className="me-1.5 text-[11px] tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                      {displayText(source.title, 140) || hostOf(url)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-tertiary)]">{[hostOf(url), date, state].filter(Boolean).join(" · ")}</span>
                    {source.snippet ? <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-4 text-[var(--text-secondary)]">{displayText(source.snippet, 260)}</span> : null}
                  </span>
                  <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ol>
      ) : null}
    </WidgetCard>
  );
}

/** Progression d'une recherche projetée par le serveur (`search_activity`). */
export function SearchActivityWidget({ data, title }: { data: Rec; title?: string }) {
  const { t } = useWidgetText();
  const done = pick(data, "status") === "done";
  const failed = ["failed", "error", "abstained"].includes(pick(data, "status"));
  const visitedCount = pickNum(data, "visited_count", "sources_count", "count");
  const conflicts = pickNum(data, "conflict_count");
  const status: StatusKey = failed ? "unavailable" : done ? (conflicts ? "warning" : "success") : "running";
  const summary = displayText(pick(data, "summary"), 220) || (done ? (visitedCount !== null ? t.search.sources(visitedCount) : "") : t.search.running);
  const label = title || (pick(data, "phase") ? t.search.deep : t.search.title);
  return (
    <WidgetCard label={label} testId="search_activity" live className="!max-w-[30rem]">
      <WidgetHeader
        icon={done ? Globe2 : Search}
        title={label}
        subtitle={summary}
        status={status}
        statusLabel={failed ? t.search.none : undefined}
      />
    </WidgetCard>
  );
}
