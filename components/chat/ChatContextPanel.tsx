"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  Globe2,
  Images,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Message } from "@/components/ChatMessage";
import { MediaMessage, imagesFromUrls } from "@/components/chat/media/MediaMessage";
import type { ChatImage } from "@/components/chat/media/types";
import { SourceFavicon } from "@/components/chat/widgets/kinds/ResearchWidgets";
import { WorkspaceResult } from "@/components/chat/WorkspaceResult";
import { CodingRunCard } from "@/components/chat/CodingRunCard";
import { CodeWorkspace } from "@/components/chat/CodeWorkspace";

type ContextTab = "result" | "sources" | "files" | "images" | "action";

function safeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatFileSize(bytes?: number): string {
  if (!Number.isFinite(bytes) || !bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function actionChannel(tool?: string): string {
  const value = (tool || "").toLowerCase();
  if (value.includes("whatsapp") || value.includes("group")) return "WhatsApp";
  if (value.includes("mail") || value.includes("email")) return "E-mail";
  if (value.includes("calendar") || value.includes("event")) return "Agenda";
  return "Action Toumaï";
}

export function ChatContextPanel({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  const pieces = message.pieces?.length
    ? message.pieces
    : message.piece
      ? [message.piece]
      : [];

  const responseFiles = (message.blocks ?? [])
    .filter((block) => block.type === "file")
    .map((block) => block.file);
  const codingFiles = message.codingProject?.files ?? [];

  const files = [
    ...pieces.map((piece, index) => ({
      key: `piece-${index}-${piece.nom}`,
      name: piece.nom,
      type: piece.type,
      size: piece.taille,
      pages: piece.pages,
      url: null as string | null,
      generated: false,
    })),
    ...responseFiles.map((file, index) => ({
      key: `generated-${file.id || index}-${file.name}`,
      name: file.name,
      type: file.mime_type,
      size: file.size_bytes,
      pages: file.pages,
      url: safeHttpUrl(file.url),
      generated: true,
    })),
    ...codingFiles.map((path, index) => ({
      key: `coding-${index}-${path}`,
      name: path,
      type: undefined,
      size: undefined,
      pages: undefined,
      url: null as string | null,
      generated: true,
    })),
  ];

  const blockSources = (message.blocks ?? [])
    .filter((block) => block.type === "sources")
    .flatMap((block) => block.sources);
  const sourceMap = new Map<string, (typeof blockSources)[number]>();
  for (const source of [...(message.sources ?? []), ...blockSources]) {
    const url = safeHttpUrl(source.url);
    if (url) sourceMap.set(url, source);
  }
  const sources = [...sourceMap.values()];

  const blockGeneratedImageUrls = (message.blocks ?? [])
    .filter((block) => block.type === "generated_images")
    .flatMap((block) => block.urls);
  const blockSearchImages = (message.blocks ?? [])
    .filter((block) => block.type === "web_images")
    .flatMap((block) => block.images);
  const searchImages = [...(message.searchImages ?? []), ...blockSearchImages];

  const searchedUrlSet = new Set(
    searchImages
      .map((image) => safeHttpUrl(image.url))
      .filter((url): url is string => Boolean(url)),
  );
  const generatedImages = imagesFromUrls(
    [...(message.imageUrls ?? []), ...blockGeneratedImageUrls].filter((url) => {
      const safe = safeHttpUrl(url);
      return Boolean(safe && !searchedUrlSet.has(safe));
    }),
    { alt: "Image générée par Toumaï AI" },
  );
  const searchedImages = searchImages
    .map((image, index): ChatImage | null => {
      const url = safeHttpUrl(image.url);
      if (!url) return null;
      return {
        id: `${url}-${index}`,
        url,
        alt: image.title,
        sourceUrl: safeHttpUrl(image.source_url) ?? undefined,
        sourceTitle: image.title,
      };
    })
    .filter((image): image is ChatImage => Boolean(image));
  const previewImages = pieces
    .map((piece, index): ChatImage | null => {
      const url = safeHttpUrl(piece.apercu);
      if (!url) return null;
      return { id: `piece-${index}-${url}`, url, alt: piece.nom };
    })
    .filter((image): image is ChatImage => Boolean(image));
  const images = [...generatedImages, ...searchedImages, ...previewImages];

  const hasWorkspaceResult =
    message.role === "assistant" &&
    (
      Boolean(message.codingRun || message.codingProject) ||
      (Boolean(message.content.trim()) &&
        (message.content.length >= 600 || /\`\`\`/.test(message.content)))
    );

  const tabs = useMemo(
    () =>
      [
        hasWorkspaceResult
          ? { id: "result" as const, label: "Résultat", count: null, icon: FileText }
          : null,
        sources.length
          ? { id: "sources" as const, label: "Sources", count: sources.length, icon: Globe2 }
          : null,
        files.length
          ? { id: "files" as const, label: "Fichiers", count: files.length, icon: FileText }
          : null,
        images.length
          ? { id: "images" as const, label: "Images", count: images.length, icon: Images }
          : null,
        message.toolConfirmation
          ? { id: "action" as const, label: "Action", count: null, icon: ShieldCheck }
          : null,
      ].filter(Boolean) as Array<{
        id: ContextTab;
        label: string;
        count: number | null;
        icon: typeof Globe2;
      }>,
    [files.length, hasWorkspaceResult, images.length, message.toolConfirmation, sources.length],
  );

  const [tab, setTab] = useState<ContextTab>(tabs[0]?.id ?? "sources");

  useEffect(() => {
    setTab(tabs[0]?.id ?? "sources");
  }, [message.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!tabs.length) return null;

  const isCodeWorkspace = Boolean(message.codingRun || message.codingProject);

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le panneau contextuel"
        onClick={onClose}
        className="chat-context-backdrop fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] xl:hidden"
      />
      <aside
        role="complementary"
        aria-label="Workspace de la réponse"
        className={"chat-context-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl xl:relative xl:z-10 xl:shrink-0 xl:shadow-none " + (isCodeWorkspace ? "max-w-none xl:w-[44rem] xl:max-w-[44rem] 2xl:w-[52rem] 2xl:max-w-[52rem]" : "max-w-[34rem] xl:w-[30rem] xl:max-w-[30rem] 2xl:w-[34rem] 2xl:max-w-[34rem]")}
      >
        <header className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">{isCodeWorkspace ? "Workspace Code" : "Workspace"}</p>
            <p className="truncate text-[11px] text-[var(--text-tertiary)]">
              {isCodeWorkspace ? "Actions, fichiers et preuves publiques du run" : "Travaillez sur le résultat sans quitter la conversation"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
            className="chat-iconbtn"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {isCodeWorkspace ? (
          <div className="min-h-0 flex-1">
            <CodeWorkspace run={message.codingRun} project={message.codingProject} />
          </div>
        ) : (
          <>
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] data-[active=true]:bg-[var(--hover)] data-[active=true]:text-[var(--text-primary)]"
              data-active={tab === id}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
              {typeof count === "number" ? (
                <span className="rounded-full bg-[var(--card)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                  {count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
          {tab === "result" && hasWorkspaceResult ? (
            <div className="space-y-3">
              {message.codingRun ? (
                <CodingRunCard
                  run={message.codingRun}
                  project={message.codingProject}
                />
              ) : null}
              {message.content.trim() ? <WorkspaceResult content={message.content} /> : null}
            </div>
          ) : null}

          {tab === "sources" && sources.length ? (
            <div className="space-y-2">
              {sources.map((source, index) => {
                const url = safeHttpUrl(source.url);
                if (!url) return null;
                return (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="group flex min-w-0 gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 transition hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] hover:bg-[var(--card)]"
                  >
                    <span className="mt-0.5">
                      <SourceFavicon url={url} favicon={source.favicon_url} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold leading-5 text-[var(--text-primary)]">
                        <span className="mr-1.5 text-[10.5px] font-normal tabular-nums text-[var(--text-tertiary)]">
                          {index + 1}
                        </span>
                        {source.title || hostOf(url)}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-tertiary)]">
                        {hostOf(url)}
                      </span>
                      {source.snippet ? (
                        <span className="mt-1.5 line-clamp-3 block text-[11.5px] leading-[17px] text-[var(--text-secondary)]">
                          {source.snippet}
                        </span>
                      ) : null}
                    </span>
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)] opacity-60 transition group-hover:opacity-100" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          ) : null}

          {tab === "files" && files.length ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--card)] text-[var(--text-secondary)]">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {file.name}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                        {[
                          file.type,
                          file.pages ? `${file.pages} page${file.pages > 1 ? "s" : ""}` : null,
                          formatFileSize(file.size),
                          file.generated ? "Créé par Toumaï" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Fichier"}
                      </p>
                    </div>
                    {file.url ? (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chat-iconbtn"
                        aria-label={`Ouvrir ${file.name}`}
                        title="Ouvrir"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "images" && images.length ? <MediaMessage images={images} /> : null}

          {tab === "action" && message.toolConfirmation ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {actionChannel(message.toolConfirmation.tool)}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-[18px] text-[var(--text-secondary)]">
                    {message.toolConfirmation.text ||
                      "Cette réponse contient une action protégée qui nécessite une confirmation."}
                  </p>
                </div>
              </div>
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] leading-[17px] text-[var(--text-tertiary)]">
                La confirmation, l’annulation et le résultat vérifié restent dans la carte d’action du fil. Les paramètres techniques ne sont pas exposés ici.
              </p>
            </div>
          ) : null}
        </div>
          </>
        )}
      </aside>
    </>
  );
}
