"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  CircleX,
  FileText,
  LoaderCircle,
  Search,
} from "lucide-react";
import type { ActionState, ActionStep, ResponseBlock } from "@/lib/chat-response";
import { activityLabel } from "@/lib/tool-ui";
import { MediaMessage, imagesFromUrls } from "./media/MediaMessage";
import type { ChatImage } from "./media/types";
import { ActionExecutionCard } from "./widgets/ActionExecutionCard";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

function safeHttpUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function host(raw: string): string {
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function SourcesBlock({ block }: { block: Extract<ResponseBlock, { type: "sources" }> }) {
  const sources = block.sources
    .map((source, index) => ({ source, index, url: safeHttpUrl(source.url) }))
    .filter((entry): entry is typeof entry & { url: string } => Boolean(entry.url))
    .slice(0, 8);
  if (!sources.length) return null;

  return (
    <section className="mt-3" aria-label="Sources consultées">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--text-tertiary)]">
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Sources · {sources.length}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map(({ source, index, url }) => (
          <a
            key={url + index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            aria-label={`Source ${index + 1} : ${source.title || host(url)} — ${host(url)}`}
            className="group min-w-0 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--hover)]"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--card)] px-1 text-[11px] font-semibold text-[var(--text-secondary)]">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{source.title || host(url)}</p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">{host(url)}</p>
                {"snippet" in source && typeof source.snippet === "string" && source.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">{source.snippet}</p>
                ) : null}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function WebImagesBlock({ block }: { block: Extract<ResponseBlock, { type: "web_images" }> }) {
  const images = block.images
    .map((image, index): ChatImage | null => {
      const url = safeHttpUrl(image.url);
      if (!url) return null;
      return {
        id: image.url + index,
        url,
        alt: image.title || "Image issue de la recherche Web",
        sourceUrl: safeHttpUrl(image.source_url) || undefined,
        sourceTitle: image.title,
      };
    })
    .filter((image): image is ChatImage => Boolean(image));
  if (!images.length) return null;
  return (
    <section className="mt-3" aria-label="Images de la recherche Web">
      <MediaMessage images={images} />
    </section>
  );
}

function ActivityBlock({ block }: { block: Extract<ResponseBlock, { type: "activity" }> }) {
  return (
    <div className="mt-2 flex max-w-[560px] items-center gap-2 text-[12px] text-[var(--text-tertiary)]" aria-live="polite">
      <span className="relative inline-flex h-4 w-4 items-center justify-center" aria-hidden="true">
        <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-[var(--primary)]/20" />
        <LoaderCircle className="relative h-3.5 w-3.5 animate-spin" />
      </span>
      <span>{block.label || activityLabel(block.activity, block.detail)}</span>
    </div>
  );
}

function stateVisual(state: ActionState): {
  icon: React.ReactNode;
  color: string;
  sr: string;
  active: boolean;
} {
  switch (state) {
    case "done":
    case "success":
      return { icon: <Check className="h-3 w-3" />, color: "var(--success)", sr: "réussi", active: false };
    case "warning":
    case "partial_success":
      return { icon: <AlertTriangle className="h-3 w-3" />, color: "var(--warning, #d9a441)", sr: "partiel", active: false };
    case "failed":
    case "expired":
      return { icon: <CircleX className="h-3 w-3" />, color: "var(--error)", sr: "échec", active: false };
    case "blocked":
      return { icon: <CircleX className="h-3 w-3" />, color: "var(--text-tertiary)", sr: "non exécuté", active: false };
    case "cancelled":
      return { icon: <CircleX className="h-3 w-3" />, color: "var(--text-tertiary)", sr: "annulé", active: false };
    case "running":
    case "verifying":
    case "preparing":
    case "queued":
      return { icon: <LoaderCircle className="h-3 w-3 animate-spin" />, color: "var(--primary)", sr: "en cours", active: true };
    case "awaiting_confirmation":
    case "pending":
    default:
      return { icon: <Circle className="h-3 w-3" />, color: "var(--text-tertiary)", sr: "en attente", active: false };
  }
}

function ActionsBlock({
  steps,
  title,
}: {
  steps: ActionStep[];
  title?: string;
}) {
  if (!steps.length) return null;
  const succeeded = steps.filter((step) => ["done", "success"].includes(step.state)).length;
  const failed = steps.filter((step) => ["failed", "expired"].includes(step.state)).length;
  const blocked = steps.filter((step) => step.state === "blocked").length;
  const partial = steps.some((step) => ["warning", "partial_success"].includes(step.state));
  const active = steps.some((step) => ["preparing", "queued", "running", "verifying"].includes(step.state));

  const summary = active
    ? "Exécution en cours"
    : failed
      ? `Workflow interrompu · ${succeeded}/${steps.length} étape${steps.length > 1 ? "s" : ""} réussie${succeeded > 1 ? "s" : ""}`
      : blocked
        ? `Workflow incomplet · ${blocked} étape${blocked > 1 ? "s" : ""} non exécutée${blocked > 1 ? "s" : ""}`
        : partial
          ? "Workflow terminé avec un résultat partiel"
          : `${succeeded || steps.length} action${(succeeded || steps.length) > 1 ? "s" : ""} terminée${(succeeded || steps.length) > 1 ? "s" : ""}`;

  return (
    <section className="mt-3 w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]" aria-label="Actions exécutées">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{title || summary}</p>
          {title ? <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{summary}</p> : null}
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
          {steps.length} étape{steps.length > 1 ? "s" : ""}
        </span>
      </div>
      <ol className="border-t border-[var(--border)] px-4 py-2.5">
        {steps.slice(0, 20).map((step, index) => {
          const visual = stateVisual(step.state);
          return (
            <li key={step.action_id || `${step.capability}-${index}`} className="relative flex min-h-9 items-start gap-3 py-1.5">
              {index < Math.min(steps.length, 20) - 1 ? (
                <span className="absolute left-[7px] top-7 h-[calc(100%-13px)] w-px bg-[var(--border)]" aria-hidden="true" />
              ) : null}
              <span
                className="relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--card)]"
                style={{ color: visual.color }}
                aria-hidden="true"
              >
                {visual.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] leading-5 text-[var(--text-primary)]">
                  {step.label}
                  <span className="sr-only"> — {visual.sr}</span>
                </p>
                {(step.detail || step.target) ? (
                  <p className="text-[10px] leading-4 text-[var(--text-tertiary)]">{step.detail || step.target}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function FileBlock({ block }: { block: Extract<ResponseBlock, { type: "file" }> }) {
  const file = block.file;
  const detail = [
    file.mime_type,
    file.pages ? `${file.pages} page${file.pages > 1 ? "s" : ""}` : "",
    file.sheets ? `${file.sheets} feuille${file.sheets > 1 ? "s" : ""}` : "",
    file.rows ? `${file.rows.toLocaleString("fr-FR")} lignes` : "",
    file.duration,
  ].filter(Boolean).join(" · ");

  const href = safeHttpUrl(file.url);
  return (
    <section className="mt-3 flex w-full max-w-[560px] items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3" aria-label={`Fichier ${file.name}`}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)]/45 text-[var(--text-secondary)]">
        <FileText className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{file.name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
          {file.status === "processing" ? "Analyse en cours…" : detail || "Fichier prêt"}
        </p>
        {file.error ? <p role="alert" className="mt-1 text-[11px] text-[var(--error)]">{file.error}</p> : null}
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[11px] font-medium text-[var(--primary)] hover:underline">Ouvrir le fichier</a> : null}
      </div>
    </section>
  );
}

export function RichResponseBlocks({
  blocks,
  hideConfirmation = false,
}: {
  blocks?: ResponseBlock[];
  /** ChatMessage legacy peut encore posséder toolConfirmation. Pendant la migration,
   * ce flag empêche le même pending_id d'être rendu deux fois. */
  hideConfirmation?: boolean;
}) {
  if (!blocks?.length) return null;
  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id || `${block.type}-${index}`;
        switch (block.type) {
          case "sources":
            return <SourcesBlock key={key} block={block} />;
          case "web_images":
            return <WebImagesBlock key={key} block={block} />;
          case "generated_images":
            return block.urls.length ? (
              <div key={key} className="mt-3">
                <MediaMessage images={imagesFromUrls(block.urls, { alt: "Image générée par Toumaï AI" })} />
              </div>
            ) : null;
          case "widget":
            return <WidgetRenderer key={key} widget={block.widget} />;
          case "actions":
            return <ActionsBlock key={key} steps={block.steps} title={block.title} />;
          case "file":
            return <FileBlock key={key} block={block} />;
          case "activity":
            return <ActivityBlock key={key} block={block} />;
          case "tool_confirmation":
            return hideConfirmation ? null : <ActionExecutionCard key={key} confirmation={block.confirmation} />;
        }
      })}
    </>
  );
}
