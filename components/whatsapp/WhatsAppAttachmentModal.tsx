"use client";

import { CheckCircle2, FileText, ImageIcon, Loader2, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { errorMessage } from "@/lib/errors";
import {
  deleteWaOwnMessage,
  getWaMessageStatus,
  sendWaMedia,
  type WaLiveConversation,
  type WaLiveMessage,
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
  correctionTarget,
  onClose,
  onSent,
}: {
  open: boolean;
  conversation: WaLiveConversation | null;
  file: File | null;
  uploaded: WaUploadedFile | null;
  mediaType: WaMediaType | null;
  correctionTarget?: WaLiveMessage | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [caption, setCaption] = useState(() => correctionTarget?.text || "");
  const [sending, setSending] = useState(false);
  const [checkingCorrection, setCheckingCorrection] = useState(false);
  const [deletingOriginal, setDeletingOriginal] = useState(false);
  const [correctionMsgId, setCorrectionMsgId] = useState<string | null>(null);
  const [correctionVerified, setCorrectionVerified] = useState(false);
  const [originalDeleteSubmitted, setOriginalDeleteSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!open || !file) {
      setPreviewUrl("");
      return;
    }
    if (uploaded?.converted && uploaded.url) {
      setPreviewUrl(uploaded.url);
      return;
    }
    const next = URL.createObjectURL(file);
    setPreviewUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [open, file, uploaded]);

  if (!open || !conversation || !file || !uploaded || !mediaType) return null;

  const activeConversation = conversation;
  const activeFile = file;
  const activeUpload = uploaded;
  const activeMediaType = mediaType;
  const activeCorrectionTarget = correctionTarget || null;

  function finishCorrection() {
    onSent();
    onClose();
  }

  async function sendNow() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const trustedMime =
        activeUpload.content_type ||
        activeFile.type ||
        undefined;

      const result = await sendWaMedia({
        to: activeConversation.id,
        type: activeMediaType,
        url: activeUpload.url,
        filename: activeUpload.file_name || activeFile.name,
        mimetype: trustedMime,
        caption: caption.trim() || undefined,
        reply_to_msg_id: activeCorrectionTarget?.id || undefined,
        reply_to_text: activeCorrectionTarget?.text || undefined,
        reply_to_type: activeCorrectionTarget?.type || undefined,
        reply_to_sender: activeCorrectionTarget?.sender_jid || undefined,
        confirmed: true,
      });

      if (activeCorrectionTarget) {
        if (!result.msg_id) {
          setError(
            "La nouvelle pièce jointe a été soumise, mais WhatsApp n’a pas retourné d’identifiant vérifiable. L’ancien message est conservé.",
          );
          return;
        }
        setCorrectionMsgId(result.msg_id);
        return;
      }

      onSent();
      onClose();
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setSending(false);
    }
  }

  async function verifyCorrection() {
    if (!correctionMsgId || checkingCorrection) return false;
    setCheckingCorrection(true);
    setError(null);
    try {
      const status = await getWaMessageStatus(correctionMsgId, activeConversation.id);
      if (status.failed) {
        setError("La correction a échoué côté WhatsApp. L’ancien message a été conservé.");
        return false;
      }
      if (!status.server_ack_confirmed) {
        setError(
          "La correction est acceptée par la passerelle mais pas encore confirmée par le serveur WhatsApp. L’ancien message reste intact ; réessayez dans quelques secondes.",
        );
        return false;
      }
      setCorrectionVerified(true);
      return true;
    } catch (exc) {
      setError(errorMessage(exc, "history"));
      return false;
    } finally {
      setCheckingCorrection(false);
    }
  }

  async function deleteOriginalAfterVerification() {
    if (!activeCorrectionTarget || !correctionMsgId || deletingOriginal) return;
    setDeletingOriginal(true);
    setError(null);
    try {
      let verified = correctionVerified;
      if (!verified) {
        const status = await getWaMessageStatus(correctionMsgId, activeConversation.id);
        if (status.failed) {
          setError("La correction a échoué côté WhatsApp. L’ancien message ne sera pas supprimé.");
          return;
        }
        if (!status.server_ack_confirmed) {
          setError(
            "WhatsApp n’a pas encore confirmé le nouveau message. Par sécurité, Toumaï refuse de supprimer l’ancien.",
          );
          return;
        }
        verified = true;
        setCorrectionVerified(true);
      }

      if (!verified) return;
      const deletion = await deleteWaOwnMessage({
        chat_id: activeConversation.id,
        msg_id: activeCorrectionTarget.id,
        confirmed: true,
      });
      if (!deletion.delete_submitted || !deletion.accepted_by_gateway) {
        setError("La suppression de l’ancien message n’a pas été acceptée par WhatsApp.");
        return;
      }
      setOriginalDeleteSubmitted(true);
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setDeletingOriginal(false);
    }
  }

  const isVisual = ["image", "video", "gif", "sticker"].includes(mediaType);
  const correctionSent = Boolean(activeCorrectionTarget && correctionMsgId);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={
          sending || deletingOriginal || checkingCorrection
            ? undefined
            : correctionSent
              ? finishCorrection
              : onClose
        }
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
            {correctionSent ? <CheckCircle2 size={18} /> : isVisual ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="wa-attachment-title" className="text-[16px] font-semibold">
              {correctionSent
                ? "Correction envoyée"
                : activeCorrectionTarget
                  ? "Envoyer une correction"
                  : "Pièce jointe"}
            </h2>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
              {activeConversation.name}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            disabled={sending || deletingOriginal || checkingCorrection}
            onClick={correctionSent ? finishCorrection : onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-5">
          {activeCorrectionTarget && (
            <div
              className="mb-4 rounded-xl border px-4 py-3 text-[12px] leading-5"
              style={{ borderColor: "rgba(8,200,117,.28)", background: "rgba(8,200,117,.06)", color: MUTED }}
            >
              {correctionSent ? (
                <>
                  La nouvelle pièce jointe a été envoyée comme <strong style={{ color: TEXT }}>nouveau message WhatsApp</strong>.
                  Toumaï ne prétend pas avoir remplacé le média original. Vous pouvez conserver l’ancien message,
                  ou demander sa suppression séparément après confirmation du nouveau message par WhatsApp.
                </>
              ) : (
                <>
                  WhatsApp ne remplace pas le contenu binaire d’un média déjà envoyé.
                  Toumaï enverra donc cette pièce jointe comme <strong style={{ color: TEXT }}>nouveau message de correction lié à l’original</strong>.
                  L’ancien message restera intact tant que vous ne demandez pas explicitement sa suppression.
                </>
              )}
            </div>
          )}

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
                <p className="truncate text-sm font-semibold">{uploaded.file_name || file.name}</p>
                <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                  {formatBytes(uploaded.size || file.size)} · {mediaLabel(mediaType)}
                </p>
                {uploaded.converted && uploaded.original_file_name && uploaded.original_file_name !== uploaded.file_name && (
                  <p className="mt-1 truncate text-[10px]" style={{ color: MUTED }}>
                    Original : {uploaded.original_file_name}
                  </p>
                )}
              </div>
            </div>
            {uploaded.converted && (
              <div
                className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px] leading-5"
                style={{ borderColor: "rgba(8,200,117,.25)", background: "rgba(8,200,117,.055)", color: MUTED }}
              >
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" color={GREEN} />
                <div>
                  <p className="font-semibold" style={{ color: "#c9f7df" }}>Optimisé pour WhatsApp</p>
                  <p>{uploaded.conversion_note || "Le média a été converti dans un format plus compatible."}</p>
                  {typeof uploaded.original_size === "number" && uploaded.original_size !== uploaded.size && (
                    <p className="mt-0.5">
                      {formatBytes(uploaded.original_size)} → {formatBytes(uploaded.size)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {!correctionSent && mediaType !== "sticker" && (
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

          {correctionSent && (
            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: BORDER, background: RAISED }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 size={17} color={GREEN} />
                Nouveau message créé
              </div>
              <p className="mt-2 text-[11px] leading-5" style={{ color: MUTED }}>
                ID : <span className="font-mono" style={{ color: TEXT }}>{correctionMsgId}</span>
              </p>
              <p className="mt-1 text-[11px] leading-5" style={{ color: MUTED }}>
                {originalDeleteSubmitted
                  ? "La suppression de l’ancien message a été soumise à WhatsApp."
                  : correctionVerified
                    ? "Le nouveau message est confirmé par le serveur WhatsApp. La suppression de l’ancien peut maintenant être demandée."
                    : "L’ancien message est conservé. Toumaï le supprimera uniquement après confirmation serveur du nouveau message."}
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {!correctionSent && (
              <>
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
                    <><Send size={17} /> {activeCorrectionTarget ? "Envoyer la correction" : "Envoyer"}</>
                  )}
                </button>
              </>
            )}

            {correctionSent && !originalDeleteSubmitted && (
              <>
                <button
                  type="button"
                  disabled={checkingCorrection || deletingOriginal}
                  onClick={finishCorrection}
                  className="h-11 rounded-xl border px-4 text-sm font-medium disabled:opacity-40"
                  style={{ borderColor: BORDER }}
                >
                  Conserver l’ancien et terminer
                </button>
                {!correctionVerified && (
                  <button
                    type="button"
                    disabled={checkingCorrection || deletingOriginal}
                    onClick={() => void verifyCorrection()}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-45"
                    style={{ borderColor: "rgba(8,200,117,.35)", color: GREEN }}
                  >
                    {checkingCorrection ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Vérifier le nouveau message
                  </button>
                )}
                <button
                  type="button"
                  disabled={checkingCorrection || deletingOriginal}
                  onClick={() => void deleteOriginalAfterVerification()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-45"
                  style={{ background: "#7d2228", color: "#fff" }}
                >
                  {deletingOriginal ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Supprimer l’ancien message
                </button>
              </>
            )}

            {correctionSent && originalDeleteSubmitted && (
              <button
                type="button"
                onClick={finishCorrection}
                className="flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white"
                style={{ background: GREEN }}
              >
                <CheckCircle2 size={16} />
                Terminer
              </button>
            )}
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
