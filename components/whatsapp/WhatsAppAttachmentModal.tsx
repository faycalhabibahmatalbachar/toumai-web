"use client";

import { FileText, ImageIcon, Loader2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

import { errorMessage } from "@/lib/errors";
import {
  sendWaMedia,
  type WaLiveConversation,
  type WaMediaType,
  type WaUploadedFile,
} from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";

export function WhatsAppAttachmentModal({
  open,
  conversation,
  file,
  uploaded,
  mediaType,
  onClose,
  onSent,
}: {
  open: boolean;
  conversation: WaLiveConversation | null;
  file: File | null;
  uploaded: WaUploadedFile | null;
  mediaType: WaMediaType | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!open || !file) {
      setPreviewUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [open, file]);

  if (!open || !conversation || !file || !uploaded || !mediaType) return null;

  const activeConversation = conversation;
  const activeFile = file;
  const activeUpload = uploaded;
  const activeMediaType = mediaType;

  async function sendNow() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await sendWaMedia({
        to: activeConversation.id,
        type: activeMediaType,
        url: activeUpload.url,
        filename: activeUpload.file_name || activeFile.name,
        mimetype: activeFile.type || undefined,
        caption: caption.trim() || undefined,
        confirmed: true,
      });
      onSent();
      onClose();
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setSending(false);
    }
  }

  const isVisual = ["image", "video", "gif", "sticker"].includes(mediaType);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={sending ? undefined : onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-attachment-title"
        className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
      >
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#073d2c]" style={{ color: GREEN }}>
            {isVisual ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="wa-attachment-title" className="text-[16px] font-semibold">Pièce jointe</h2>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
              {conversation.name}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            disabled={sending}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-5">
          {previewUrl && mediaType === "image" && (
            <div className="mb-4 overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: "#08131c" }}>
              <img src={previewUrl} alt={file.name} className="max-h-[320px] w-full object-contain" />
            </div>
          )}
          {previewUrl && (mediaType === "video" || mediaType === "gif") && (
            <div className="mb-4 overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: "#08131c" }}>
              <video src={previewUrl} controls className="max-h-[320px] w-full" />
            </div>
          )}
          {previewUrl && (mediaType === "audio" || mediaType === "voice") && (
            <div className="mb-4 rounded-xl border p-3" style={{ borderColor: BORDER, background: RAISED }}>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          )}

          <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: RAISED }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                {isVisual ? <ImageIcon size={20} /> : <FileText size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                  {formatBytes(file.size)} · {mediaLabel(mediaType)}
                </p>
              </div>
            </div>
          </div>

          {mediaType !== "sticker" && (
            <div className="mt-4">
              <label htmlFor="wa-media-caption" className="text-[12px] font-semibold">
                Légende <span style={{ color: MUTED }}>(facultatif)</span>
              </label>
              <textarea
                id="wa-media-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value.slice(0, 1024))}
                placeholder="Ajouter une légende…"
                rows={3}
                className="mt-2 w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none focus:border-[#2d8fff]"
                style={{ borderColor: BORDER, background: RAISED }}
              />
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={onClose}
              className="h-11 rounded-xl border px-4 text-sm font-medium disabled:opacity-40"
              style={{ borderColor: BORDER }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => void sendNow()}
              className="flex h-11 min-w-[170px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-55"
              style={{ background: GREEN }}
            >
              {sending ? (
                <><Loader2 size={17} className="animate-spin" /> Envoi…</>
              ) : (
                <><Send size={17} /> Envoyer</>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function mediaLabel(type: WaMediaType) {
  const labels: Record<WaMediaType, string> = {
    image: "Image",
    video: "Vidéo",
    gif: "GIF",
    audio: "Audio",
    voice: "Message vocal",
    sticker: "Sticker",
    document: "Document",
  };
  return labels[type];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} Ko`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} Mo`;
}
