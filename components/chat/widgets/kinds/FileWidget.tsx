"use client";

import {
  Archive,
  ExternalLink,
  File,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { displayText, fileKind, formatBytes, pick, pickNum, safeHttpUrl, type FileKind, type Rec, type StatusKey } from "@/lib/widgets/core";
import { useWidgetText } from "@/lib/widgets/i18n";
import { ActionBar, InlineNotice, WidgetButton, WidgetCard, WidgetHeader } from "../primitives";

const ICONS: Record<FileKind, LucideIcon> = {
  pdf: FileText, doc: FileText, sheet: FileSpreadsheet, slides: Presentation, text: FileText,
  archive: Archive, image: ImageIcon, audio: Music, video: Film, code: FileCode2, unknown: File,
};

const KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF", doc: "Document", sheet: "Tableur", slides: "Présentation", text: "Texte",
  archive: "Archive", image: "Image", audio: "Audio", video: "Vidéo", code: "Code", unknown: "Fichier",
};

/**
 * Un fichier, quelle que soit sa provenance (généré, joint, analysé).
 * L'aperçu n'est proposé que lorsque le navigateur sait le lire sans rien
 * exécuter : image, audio, vidéo. Le reste s'ouvre dans un nouvel onglet.
 */
export function FileWidget({ data }: { data: Rec }) {
  const { t, locale } = useWidgetText();
  const [mediaFailed, setMediaFailed] = useState(false);
  const name = displayText(pick(data, "name", "filename", "title"), 120) || KIND_LABEL.unknown;
  const mime = pick(data, "mime_type", "mime", "content_type", "format");
  const kind = fileKind(name, mime.includes("/") ? mime : "") !== "unknown" ? fileKind(name, mime) : fileKind(`x.${mime}`);
  const url = safeHttpUrl(data.url ?? data.download_url);
  const preview = safeHttpUrl(data.preview_url ?? (kind === "image" ? data.url : undefined));
  const rawStatus = pick(data, "status");
  const error = displayText(pick(data, "error"), 200);
  const status: StatusKey = error || rawStatus === "error" ? "failed" : rawStatus === "processing" ? "running" : "success";

  const pages = pickNum(data, "pages", "page_count");
  const rows = pickNum(data, "rows", "row_count");
  const sheets = pickNum(data, "sheets", "sheet_count");
  const detail = [
    KIND_LABEL[kind],
    formatBytes(data.size_bytes ?? data.size ?? data.file_size, locale),
    pages !== null ? t.files.pages(pages) : "",
    sheets !== null ? t.files.sheets(sheets) : "",
    rows !== null ? t.files.rows(rows) : "",
    pick(data, "duration"),
  ].filter(Boolean).join(" · ");

  return (
    <WidgetCard label={name} testId="file" className="!max-w-[28rem]">
      {kind === "image" && preview && !mediaFailed && status !== "failed" ? (
        <a href={url || preview} target="_blank" rel="noopener noreferrer" className="block border-b border-[var(--border)] bg-[var(--hover)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={name} loading="lazy" onError={() => setMediaFailed(true)} className="mx-auto max-h-64 w-full object-contain" />
        </a>
      ) : null}
      <WidgetHeader
        icon={ICONS[kind]}
        title={<span className="block truncate" title={name}>{name}</span>}
        subtitle={status === "running" ? t.files.processing : detail}
        status={status === "success" ? undefined : status}
        statusLabel={status === "failed" ? t.files.error : undefined}
      />
      {kind === "audio" && url && !mediaFailed ? (
        <div className="px-3.5 pb-3"><audio controls preload="none" src={url} onError={() => setMediaFailed(true)} className="h-9 w-full" /></div>
      ) : null}
      {kind === "video" && url && !mediaFailed ? (
        <div className="px-3.5 pb-3"><video controls preload="metadata" src={url} onError={() => setMediaFailed(true)} className="max-h-72 w-full rounded-xl bg-black" /></div>
      ) : null}
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : mediaFailed ? <InlineNotice tone="warning">{t.files.error}</InlineNotice> : null}
      {url && status !== "failed" ? (
        <ActionBar>
          <WidgetButton href={url} external icon={ExternalLink} variant="secondary">{t.files.open}</WidgetButton>
        </ActionBar>
      ) : null}
    </WidgetCard>
  );
}
