"use client";

import {
  Archive,
  BellOff,
  Eraser,
  Loader2,
  Mail,
  MailOpen,
  Pin,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { whatsappUiError } from "@/lib/whatsapp-ui-copy";
import {
  applyWaConversationAction,
  type WaConversationAction,
  type WaLiveConversation,
} from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const RED = "#ff6b6b";

export interface ConversationActionRequest {
  action: WaConversationAction;
  duration?: "8h" | "1j" | "7j" | "always";
}

export function WhatsAppConversationActionModal({
  open,
  conversation,
  request,
  onClose,
  onApplied,
}: {
  open: boolean;
  conversation: WaLiveConversation | null;
  request: ConversationActionRequest | null;
  onClose: () => void;
  onApplied: (action: WaConversationAction) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !conversation || !request) return null;

  const activeConversation = conversation;
  const activeRequest = request;
  const destructive = request.action === "clear" || request.action === "delete";
  const copy = actionCopy(request);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await applyWaConversationAction({
        chat_id: activeConversation.id,
        action: activeRequest.action,
        duration: activeRequest.duration,
        confirmed: true,
      });
      onApplied(activeRequest.action);
      onClose();
    } catch (exc) {
      setError(whatsappUiError(exc, "generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={busy ? undefined : onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-action-title"
        className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: destructive ? "rgba(255,107,107,.35)" : BORDER, color: TEXT }}
      >
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: destructive ? "rgba(255,107,107,.10)" : "rgba(8,200,117,.10)",
              color: destructive ? RED : GREEN,
            }}
          >
            {actionIcon(request.action)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="wa-action-title" className="text-[16px] font-semibold">
              {destructive ? "Confirmer l’action" : copy.title}
            </h2>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
              {conversation.name}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-5">
          <div
            className="rounded-xl border p-4 text-sm leading-6"
            style={{
              borderColor: destructive ? "rgba(255,107,107,.24)" : BORDER,
              background: destructive ? "rgba(255,107,107,.05)" : RAISED,
            }}
          >
            <p className="font-semibold">{copy.question}</p>
            <p className="mt-1 text-xs leading-5" style={{ color: destructive ? "#ffb5b5" : MUTED }}>
              {copy.detail}
            </p>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="h-11 rounded-xl border px-4 text-sm font-medium disabled:opacity-40"
              style={{ borderColor: BORDER }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
              className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-55"
              style={{ background: destructive ? "#c74343" : GREEN }}
            >
              {busy ? (
                <><Loader2 size={17} className="animate-spin" /> Application…</>
              ) : (
                destructive ? "Confirmer" : "Appliquer"
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function actionCopy(request: ConversationActionRequest) {
  switch (request.action) {
    case "archive":
      return {
        title: "Archiver la conversation",
        question: "Archiver cette conversation ?",
        detail: "Elle sera retirée de la liste principale WhatsApp, sans supprimer ses messages.",
      };
    case "pin":
      return {
        title: "Épingler la conversation",
        question: "Épingler cette conversation ?",
        detail: "Elle restera plus facilement accessible dans WhatsApp.",
      };
    case "mute":
      return {
        title: "Mettre en sourdine",
        question: "Mettre cette conversation en sourdine ?",
        detail: `Durée : ${muteLabel(request.duration || "8h")}.`,
      };
    case "mark_read":
      return {
        title: "Marquer comme lue",
        question: "Marquer les messages comme lus ?",
        detail: "Les messages actuellement non lus seront considérés comme lus.",
      };
    case "mark_unread":
      return {
        title: "Marquer comme non lue",
        question: "Marquer cette conversation comme non lue ?",
        detail: "Cela sert de rappel visuel dans WhatsApp.",
      };
    case "clear":
      return {
        title: "Vider la conversation",
        question: "Vider tous les messages de cette conversation ?",
        detail: "Cette action supprime le contenu de la conversation sur WhatsApp. Elle est destructive.",
      };
    case "delete":
      return {
        title: "Supprimer la conversation",
        question: "Supprimer cette conversation de WhatsApp ?",
        detail: "Cette action retire la conversation de votre téléphone et ne doit être confirmée que si vous le souhaitez réellement.",
      };
    default:
      return {
        title: "Confirmer l’action",
        question: "Appliquer cette action ?",
        detail: "Cette action sera appliquée à la conversation.",
      };
  }
}

function actionIcon(action: WaConversationAction) {
  switch (action) {
    case "archive": return <Archive size={18} />;
    case "pin": return <Pin size={18} />;
    case "mute": return <BellOff size={18} />;
    case "mark_read": return <MailOpen size={18} />;
    case "mark_unread": return <Mail size={18} />;
    case "clear": return <Eraser size={18} />;
    case "delete": return <Trash2 size={18} />;
    default: return <Archive size={18} />;
  }
}

function muteLabel(duration: "8h" | "1j" | "7j" | "always") {
  if (duration === "8h") return "8 heures";
  if (duration === "1j") return "1 jour";
  if (duration === "7j") return "7 jours";
  return "Toujours";
}
