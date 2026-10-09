"use client";

import { ContactRound, Download, FileText, Image as ImageIcon, ListChecks, Maximize2, Music2, Play, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WhatsAppVoiceNotePlayer } from "@/components/whatsapp/WhatsAppVoiceNotePlayer";
import { getWaMessageMediaBlob, type WaLiveMessage } from "@/lib/whatsapp-enterprise-api";

const BORDER = "#24323c";
const MUTED = "#9eacb7";
const FAINT = "#71808d";
const GREEN = "#08c875";

export function WhatsAppMessageMedia({ message }: { message: WaLiveMessage }) {
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState(message.mime_type || "");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const mediaType = normalizeType(message.type);
  const fileName = message.file_name || defaultFileName(mediaType, mime);
  const visibleMediaName = mediaType === "voice" ? "Message vocal" : fileName || typeLabelFallback(mediaType);
  const binaryMedia = ["image", "sticker", "video", "gif", "audio", "voice", "document"].includes(mediaType);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      if (!binaryMedia) {
        setLoading(false);
        setFailed(false);
        return;
      }
      if (!message.id || message.id.startsWith("local-")) {
        setLoading(false);
        setFailed(true);
        return;
      }
      setLoading(true);
      setFailed(false);
      try {
        const blob = await getWaMessageMediaBlob(message.id, { force: retryCount > 0 });
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setMime(blob.type || "");
      } catch {
        // The bounded request settles even if the gateway never responds.
        // A failed fetch must not be retried by SSE, polling or remounting.
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [binaryMedia, message.id, retryCount]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  const typeLabel = useMemo(() => labelFor(mediaType), [mediaType]);

  if (mediaType === "poll") {
    return (
      <div className="mb-2 min-w-[240px] rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <div className="flex items-center gap-2">
          <ListChecks size={17} color={GREEN} />
          <span className="text-[11px] font-semibold">Sondage</span>
        </div>
        <p className="mt-2 text-[12px] leading-5">{message.media_label || message.text || "Sondage WhatsApp"}</p>
      </div>
    );
  }

  if (mediaType === "contact") {
    return (
      <div className="mb-2 flex min-w-[240px] items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05]">
          <ContactRound size={18} color={GREEN} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold">{message.media_label || "Contact partagé"}</p>
          <p className="mt-0.5 text-[9px]" style={{ color: MUTED }}>Fiche contact</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div data-testid="whatsapp-media-loading" className="mb-2 flex min-w-[220px] items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <FileIcon type={mediaType} />
        <div>
          <p className="text-[11px] font-semibold">{visibleMediaName || typeLabel}</p>
          
        </div>
      </div>
    );
  }

  if (failed || !url) {
    return (
      <div data-testid="whatsapp-media-failed" className="mb-2 flex min-w-[220px] items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <FileIcon type={mediaType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold">{visibleMediaName || typeLabel}</p>
          <p className="mt-0.5 text-[9px]" style={{ color: FAINT }}>Média indisponible</p>
        </div>
        {binaryMedia && !message.id.startsWith("local-") && (
          <button
            type="button"
            aria-label={`Réessayer le média : ${visibleMediaName || typeLabel}`}
            title="Réessayer le téléchargement"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] text-white transition hover:bg-white/10"
            onClick={() => setRetryCount((value) => value + 1)}
          >
            <RefreshCw size={13} /> Réessayer
          </button>
        )}
      </div>
    );
  }

  if (mediaType === "image" || mediaType === "sticker") {
    return (
      <>
        <div className="mb-2 overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Agrandir l’image"
            title="Agrandir l’image"
            className="group relative block w-full cursor-zoom-in text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={message.text || fileName || typeLabel}
              className={mediaType === "sticker" ? "max-h-[220px] max-w-[220px] object-contain p-2" : "max-h-[420px] w-full min-w-[220px] object-cover"}
            />
            <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              <Maximize2 size={15} color="#fff" />
            </span>
          </button>
          {mediaType !== "sticker" && (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-[9px]" style={{ color: MUTED }}>{fileName || "Image"}</span>
              <a href={url} download={fileName || "image"} aria-label="Télécharger la pièce jointe" className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06]" style={{ color: GREEN }}>
                <Download size={14} />
              </a>
            </div>
          )}
        </div>

        {previewOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu de l’image"
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              aria-label="Fermer l’aperçu"
              className="absolute inset-0"
              onClick={() => setPreviewOpen(false)}
            />
            <div className="relative z-10 flex max-h-[94vh] max-w-[96vw] flex-col items-center">
              <button
                type="button"
                aria-label="Fermer l’aperçu"
                title="Fermer"
                onClick={() => setPreviewOpen(false)}
                className="absolute -right-2 -top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <X size={20} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={message.text || fileName || typeLabel}
                className="max-h-[88vh] max-w-[96vw] rounded-lg object-contain shadow-2xl"
              />
              <a
                href={url}
                download={fileName || "image"}
                className="mt-3 flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Download size={15} />
                Télécharger
              </a>
            </div>
          </div>
        )}
      </>
    );
  }

  if (mediaType === "video" || mediaType === "gif") {
    return (
      <div className="mb-2 overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <video
          src={url}
          controls
          playsInline
          loop={mediaType === "gif"}
          className="max-h-[420px] w-full min-w-[240px] bg-black object-contain"
        />
        <MediaFooter url={url} fileName={fileName || "video"} label={fileName || typeLabel} />
      </div>
    );
  }

  if (mediaType === "voice") {
    return <WhatsAppVoiceNotePlayer message={message} url={url} />;
  }

  if (mediaType === "audio") {
    return (
      <div className="mb-2 min-w-[260px] rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}>
        <div className="mb-2 flex items-center gap-2">
          <Music2 size={16} color={GREEN} />
          <span className="truncate text-[10px] font-semibold">{fileName || typeLabel}</span>
        </div>
        <audio src={url} controls preload="metadata" className="h-9 w-full" />
      </div>
    );
  }

  return (
    <a
      href={url}
      download={fileName || "fichier"}
      className="mb-2 flex min-w-[240px] items-center gap-3 rounded-xl border px-3 py-3 transition hover:bg-white/[0.03]"
      style={{ borderColor: BORDER, background: "rgba(0,0,0,.12)" }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]" style={{ color: GREEN }}>
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold">{fileName || typeLabel}</p>
        <p className="mt-0.5 text-[9px]" style={{ color: MUTED }}>{mime || typeLabel}</p>
      </div>
      <Download size={15} color={GREEN} />
    </a>
  );
}

function MediaFooter({ url, fileName, label }: { url: string; fileName: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="min-w-0 truncate text-[9px]" style={{ color: MUTED }}>{label}</span>
      <a href={url} download={fileName} aria-label="Télécharger la pièce jointe" className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.06]" style={{ color: GREEN }}>
        <Download size={14} />
      </a>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  if (type === "image" || type === "sticker") return <ImageIcon size={17} color={GREEN} />;
  if (type === "video" || type === "gif") return <Play size={17} color={GREEN} />;
  if (type === "audio" || type === "voice") return <Music2 size={17} color={GREEN} />;
  return <FileText size={17} color={GREEN} />;
}

function normalizeType(type: string) {
  if (type === "voix") return "voice";
  return type;
}

function typeLabelFallback(type: string) {
  return type === "voice" ? "Message vocal" : labelFor(type);
}

function labelFor(type: string) {
  const labels: Record<string, string> = {
    poll: "Sondage",
    contact: "Contact",
    image: "Image",
    video: "Vidéo",
    gif: "GIF",
    audio: "Audio",
    voice: "Message vocal",
    sticker: "Sticker",
    document: "Document",
  };
  return labels[type] || "Pièce jointe";
}

function defaultFileName(type: string, mime: string) {
  if (type === "image") return mime.includes("png") ? "image.png" : "image.jpg";
  if (type === "video") return "video.mp4";
  if (type === "gif") return "animation.mp4";
  if (type === "audio" || type === "voice") return "audio.ogg";
  if (type === "sticker") return "sticker.webp";
  return "fichier";
}
