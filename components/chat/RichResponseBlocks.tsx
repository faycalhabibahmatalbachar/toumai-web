"use client";

import {
  AlertTriangle,
  Check,
  Circle,
  CircleX,
  ExternalLink,
  FileText,
  Globe2,
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

function SourceIcon({ url, favicon, title }: { url: string; favicon?: string; title?: string }) {
  const safeFavicon = safeHttpUrl(favicon);
  const label = (title || host(url) || "W").trim().charAt(0).toUpperCase();
  if (safeFavicon) {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safeFavicon} alt="" className="h-3.5 w-3.5 object-contain" referrerPolicy="no-referrer" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[9px] font-semibold text-[var(--text-secondary)]" aria-hidden="true">
      {label || <Globe2 className="h-3 w-3" />}
    </span>
  );
}

type SourceVisitMeta = { retrieved?: boolean; visit_status?: string };

function wasActuallyVisited(source: object): boolean {
  const meta = source as SourceVisitMeta;
  return meta.retrieved === true || meta.visit_status === "visited";
}

function SourcesBlock({ block }: { block: Extract<ResponseBlock, { type: "sources" }> }) {
  const sources = block.sources
    .map((source, index) => ({ source, index, url: safeHttpUrl(source.url) }))
    .filter((entry): entry is typeof entry & { url: string } => Boolean(entry.url))
    .slice(0, 6);
  if (!sources.length) return null;

  const visitedCount = sources.filter(({ source }) => wasActuallyVisited(source)).length;
  const foundOnlyCount = sources.length - visitedCount;
  const statusSummary = visitedCount === sources.length
    ? `${visitedCount} site${visitedCount > 1 ? "s" : ""} consulté${visitedCount > 1 ? "s" : ""}`
    : visitedCount > 0
      ? `${visitedCount} consulté${visitedCount > 1 ? "s" : ""} · ${foundOnlyCount} trouvé${foundOnlyCount > 1 ? "s" : ""}`
      : `${sources.length} source${sources.length > 1 ? "s" : ""} trouvée${sources.length > 1 ? "s" : ""}`;

  return (
    <section className="mt-3 w-full max-w-[560px]" aria-label="Recherche sur le Web et sources">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]/55">
        <div className="flex min-h-11 items-center gap-2 px-3.5 py-2.5 text-[12px] font-semibold text-[var(--text-primary)]">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Recherche sur le Web</span>
          <span className="ml-auto text-[10.5px] font-normal text-[var(--text-tertiary)]">{statusSummary}</span>
        </div>

        <details className="group border-t border-[var(--border)]">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3.5 text-[11px] font-medium text-[var(--text-secondary)] outline-none transition hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]">
            <span className="flex -space-x-1" aria-hidden="true">
              {sources.slice(0, 4).map(({ source, url, index }) => (
                <span key={`preview-${url}-${index}`} className="rounded-md bg-[var(--card)] ring-1 ring-[var(--card)]">
                  <SourceIcon url={url} favicon={source.favicon_url} title={source.title} />
                </span>
              ))}
            </span>
            <span>Sources · {sources.length}</span>
            <span className="ml-auto text-[10px] font-normal text-[var(--text-tertiary)] group-open:hidden">Afficher</span>
            <span className="ml-auto hidden text-[10px] font-normal text-[var(--text-tertiary)] group-open:inline">Masquer</span>
          </summary>

          <ol className="border-t border-[var(--border)] px-2 py-1.5" aria-label="Sources de la réponse">
            {sources.map(({ source, index, url }) => {
              const visited = wasActuallyVisited(source);
              const sourceState = visited ? "Consulté" : "Trouvé";
              return (
                <li key={url + index}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    aria-label={`Source ${index + 1} : ${source.title || host(url)} — ${sourceState.toLowerCase()} — ${host(url)}`}
                    className="group/source flex min-h-12 min-w-0 items-start gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    <span className="mt-0.5">
                      <SourceIcon url={url} favicon={source.favicon_url} title={source.title} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-[var(--text-primary)]">
                        <span className="mr-1.5 text-[9.5px] text-[var(--text-tertiary)]">[{index + 1}]</span>
                        {source.title || host(url)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--text-tertiary)]">{sourceState} · {host(url)}</p>
                      {typeof source.snippet === "string" && source.snippet ? (
                        <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-4 text-[var(--text-secondary)]">{source.snippet}</p>
                      ) : null}
                    </div>
                    <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-[var(--text-tertiary)] opacity-0 transition group-hover/source:opacity-100 group-focus-visible/source:opacity-100" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ol>
        </details>
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
        <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-[var(--primary)]/20 motion-reduce:animate-none" />
        <LoaderCircle className="relative h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
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
      return { icon: <Check className="h-4 w-4" />, color: "var(--success)", sr: "réussi", active: false };
    case "warning":
    case "partial_success":
      return { icon: <AlertTriangle className="h-4 w-4" />, color: "var(--warning, #d9a441)", sr: "partiel", active: false };
    case "failed":
    case "expired":
      return { icon: <CircleX className="h-4 w-4" />, color: "var(--error)", sr: "échec", active: false };
    case "blocked":
      return { icon: <Circle className="h-3.5 w-3.5" />, color: "var(--text-tertiary)", sr: "non exécuté", active: false };
    case "cancelled":
      return { icon: <CircleX className="h-4 w-4" />, color: "var(--text-tertiary)", sr: "annulé", active: false };
    case "running":
    case "verifying":
    case "preparing":
    case "queued":
      return { icon: <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />, color: "var(--primary)", sr: "en cours", active: true };
    case "awaiting_confirmation":
    case "pending":
    default:
      return { icon: <Circle className="h-3.5 w-3.5" />, color: "var(--text-tertiary)", sr: "en attente", active: false };
  }
}

function truncateText(raw: string, max = 92): string {
  const value = (raw || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  if (digits.length >= 11 && digits.startsWith("235")) {
    return `+235 ${digits.slice(3, 5)}•••${digits.slice(-3)}`;
  }
  return `+${digits.slice(0, Math.max(2, digits.length - 8))} ${digits.slice(-8, -6)}•••${digits.slice(-3)}`;
}

function safeActionText(raw?: string): string {
  let value = raw || "";
  value = value.replace(/\b\d{8,20}@g\.us\b/gi, "groupe WhatsApp");
  value = value.replace(/\+?\d{8,15}/g, (phone) => maskPhone(phone));
  if (/messages?\s+whatsapp.*non inclus|non inclus.*formule/i.test(value)) {
    return "Non inclus dans votre formule.";
  }
  return truncateText(value, 110);
}

function stepTitle(step: ActionStep): string {
  const success = ["done", "success"].includes(step.state);
  const active = ["preparing", "queued", "running", "verifying"].includes(step.state);
  const blocked = step.state === "blocked";
  const failed = ["failed", "expired"].includes(step.state);
  const capability = step.capability || "";

  if (capability === "whatsapp.group.create") {
    if (success) return "Groupe créé";
    if (active) return "Création du groupe…";
    if (blocked) return "Création non exécutée";
    if (failed) return "Création du groupe échouée";
    return "Créer le groupe";
  }
  if (capability === "whatsapp.message.send") {
    if (success) return "Message envoyé";
    if (active) return "Envoi du message…";
    if (blocked || failed) return "Message non envoyé";
    return "Envoyer le message";
  }
  if (capability.includes("participant.add")) {
    if (success) return "Membre ajouté";
    if (active) return "Ajout du membre…";
    if (blocked || failed) return "Membre non ajouté";
    return "Ajouter un membre";
  }
  if (capability.includes("participant.remove")) {
    if (success) return "Membre retiré";
    if (active) return "Retrait du membre…";
    if (blocked || failed) return "Membre non retiré";
    return "Retirer un membre";
  }
  if (capability.includes("rename")) {
    if (success) return "Groupe renommé";
    if (active) return "Renommage du groupe…";
    return failed ? "Renommage échoué" : "Renommer le groupe";
  }

  return safeActionText(step.label) || "Action";
}

function stepDetail(step: ActionStep): string {
  const raw = step.detail || step.target || "";
  if (!raw) return "";

  if (step.capability === "whatsapp.group.create" && ["done", "success"].includes(step.state)) {
    const group = raw.match(/Groupe\s+[«\"]([^»\"]+)[»\"]/i)?.[1];
    const count = raw.match(/\((\d+)\s+membre/i)?.[1];
    if (group && count) return `${truncateText(group, 54)} · ${count} participant${count === "1" ? "" : "s"}`;
    if (group) return truncateText(group, 64);
    if (count) return `${count} participant${count === "1" ? "" : "s"}`;
  }

  return safeActionText(raw);
}

function aggregateIcon(active: boolean, problems: number, failed: number) {
  if (active) return <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
  if (failed > 0) return <CircleX className="h-4 w-4" aria-hidden="true" />;
  if (problems > 0) return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  return <Check className="h-4 w-4" aria-hidden="true" />;
}

function ActionsBlock({
  steps,
}: {
  steps: ActionStep[];
}) {
  if (!steps.length) return null;

  const succeeded = steps.filter((step) => ["done", "success"].includes(step.state)).length;
  const failed = steps.filter((step) => ["failed", "expired"].includes(step.state)).length;
  const blocked = steps.filter((step) => step.state === "blocked").length;
  const partial = steps.filter((step) => ["warning", "partial_success"].includes(step.state)).length;
  const active = steps.some((step) => ["preparing", "queued", "running", "verifying"].includes(step.state));
  const problems = failed + partial || (blocked ? 1 : 0);
  const allSuccess = !active && problems === 0 && blocked === 0 && succeeded === steps.length;

  const summary = active
    ? "Exécution…"
    : problems > 0
      ? `Terminé avec ${problems} problème${problems > 1 ? "s" : ""}`
      : allSuccess
        ? `${steps.length} action${steps.length > 1 ? "s" : ""} terminée${steps.length > 1 ? "s" : ""}`
        : "Workflow terminé";

  const accent = failed > 0
    ? "border-l-red-500/70"
    : problems > 0 || blocked > 0
      ? "border-l-amber-500/70"
      : allSuccess
        ? "border-l-emerald-500/70"
        : "border-l-[var(--border)]";

  const showRows = active || problems > 0 || blocked > 0;

  return (
    <section
      className={`mt-2.5 w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--border)] border-l-2 bg-[var(--card)] ${accent}`}
      aria-label="Résultat des actions"
      aria-live="polite"
      role={failed > 0 && succeeded === 0 ? "alert" : undefined}
    >
      <div className="px-3.5 py-2.5">
        <div className="flex min-h-8 items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[var(--text-secondary)]">
            {aggregateIcon(active, problems + blocked, failed)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{summary}</p>
            <p className="mt-0.5 text-[10.5px] text-[var(--text-tertiary)]">
              {steps.length} action{steps.length > 1 ? "s" : ""}
            </p>
          </div>
          {!active ? (
            <details className="group relative shrink-0">
              <summary className="min-h-8 cursor-pointer list-none rounded-lg px-2 py-1.5 text-[10.5px] text-[var(--text-tertiary)] outline-none transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
                Détails
              </summary>
              <div className="absolute right-0 top-9 z-20 w-[min(320px,80vw)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[10px] leading-4 text-[var(--text-tertiary)] shadow-xl">
                {steps.slice(0, 20).map((step, index) => (
                  <p key={`${step.action_id || step.capability}-${index}`} className={index ? "mt-2" : undefined}>
                    <span className="font-medium text-[var(--text-secondary)]">{stepTitle(step)}</span>
                    {step.status ? ` · ${safeActionText(step.status)}` : ""}
                    {step.verified === true ? " · vérifié" : ""}
                    {step.verified === false ? " · non vérifié" : ""}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        {showRows ? (
          <ol className="mt-2 space-y-0.5" aria-label="Étapes du workflow">
            {steps.slice(0, 20).map((step, index) => {
              const visual = stateVisual(step.state);
              const detail = stepDetail(step);
              return (
                <li key={step.action_id || `${step.capability}-${index}`} className="flex min-w-0 items-start gap-2 py-1.5">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: visual.color }} aria-hidden="true">
                    {visual.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-medium leading-4 text-[var(--text-primary)]">
                      {stepTitle(step)}
                      <span className="sr-only"> — {visual.sr}</span>
                    </p>
                    {detail ? <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-tertiary)]">{detail}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
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
  /** ChatMessage peut encore porter toolConfirmation pendant la migration.
   * Quand il existe, ActionExecutionCard est l'unique surface du runtime :
   * ni le bloc de confirmation ni le bloc actions ne doivent être dupliqués. */
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
            return hideConfirmation ? null : <ActionsBlock key={key} steps={block.steps} />;
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
