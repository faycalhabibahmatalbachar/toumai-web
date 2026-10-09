"use client";

import { CircleAlert, Clock3, Loader2, MoreHorizontal, RefreshCw, X } from "lucide-react";
import { WhatsAppVoiceNotePlayer } from "./WhatsAppVoiceNotePlayer";
import type { WaLiveMessage } from "@/lib/whatsapp-enterprise-api";

export type PendingVoicePhase =
  | "uploading"
  | "sending"
  | "accepted"
  | "unconfirmed"
  | "upload_failed";

export interface PendingWhatsAppVoice {
  id: string;
  chatId: string;
  file: File;
  localUrl: string;
  createdAt: number;
  phase: PendingVoicePhase;
  msgId?: string | null;
  detail?: string;
  replyTo?: { id: string; text: string; type: string; senderJid: string } | null;
}

/** Local-only voice preview: never claim delivery from a browser upload.
 * The blob stays in memory and is not persisted in the JSON/localStorage cache. */
export function WhatsAppPendingVoiceList({
  voices,
  onRetry,
  onDismiss,
  onMenu,
}: {
  voices: PendingWhatsAppVoice[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onMenu: (id: string, x: number, y: number) => void;
}) {
  if (!voices.length) return null;
  return (
    <div className="mx-auto mt-2 flex w-full max-w-[980px] flex-col gap-3" data-testid="whatsapp-pending-voices">
      {voices.map((voice) => (
        <PendingVoiceBubble
          key={voice.id}
          voice={voice}
          onRetry={() => onRetry(voice.id)}
          onDismiss={() => onDismiss(voice.id)}
          onMenu={(x, y) => onMenu(voice.id, x, y)}
        />
      ))}
    </div>
  );
}

function PendingVoiceBubble({
  voice,
  onRetry,
  onDismiss,
  onMenu,
}: {
  voice: PendingWhatsAppVoice;
  onRetry: () => void;
  onDismiss: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  const message: WaLiveMessage = {
    id: voice.id,
    chat_id: voice.chatId,
    text: "",
    from_me: true,
    sender: "",
    type: "voice",
    timestamp_ms: voice.createdAt,
    status: voice.phase === "upload_failed" ? "failed" : "sending",
    mime_type: voice.file.type || "audio/webm",
  };
  const pending = voice.phase === "uploading" || voice.phase === "sending";
  const canDismiss = !pending;
  const statusLabel = voice.phase === "uploading" || voice.phase === "sending"
    ? "Envoi en cours"
    : voice.phase === "accepted" ? "Envoi accepté, livraison en attente"
      : voice.phase === "upload_failed" ? "Erreur de préparation"
        : "Envoi non confirmé";

  return (
    <div
      data-testid="whatsapp-pending-voice"
      data-voice-phase={voice.phase}
      className="flex justify-end"
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(event.clientX, event.clientY);
      }}
    >
      <div className="relative max-w-[92%] rounded-[10px] bg-[#144d37] px-3 py-2 text-[#f4f7f9] shadow-sm">
        <button type="button" aria-label="Options du vocal" title="Options du vocal" className="absolute right-2 top-1 z-20 rounded-md bg-black/25 p-1 text-[#dceee5] opacity-0 hover:bg-black/40 focus:opacity-100 group-hover:opacity-100" onClick={(event) => { const box = event.currentTarget.getBoundingClientRect(); onMenu(box.right, box.bottom); }}><MoreHorizontal size={16} /></button>
        <WhatsAppVoiceNotePlayer message={message} url={voice.localUrl} />
        <div role="status" aria-live="polite" aria-label={statusLabel} title={statusLabel} className="mt-1 flex min-h-[13px] items-center justify-end gap-1 text-[#c4d6d0]">
          {pending ? <Loader2 size={12} className="animate-spin" /> : voice.phase === "accepted" ? (
            <Clock3 size={12} />
          ) : (
            <CircleAlert size={13} className="text-[#ffc0bf]" />
          )}
          <span className="sr-only">{statusLabel}</span>
        </div>
        {voice.detail && !pending && <p className="mt-1 text-[11px] text-[#ffd5d5]">{voice.detail}</p>}
        {canDismiss && (
          <div className="mt-2 flex items-center justify-end gap-3 text-[11px]">
            {voice.phase === "upload_failed" && (
              <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold text-white" aria-label="Réessayer la préparation du vocal">
                <RefreshCw size={13} /> Réessayer
              </button>
            )}
            <button type="button" onClick={onDismiss} className="inline-flex items-center gap-1 text-[#d2e1da]" aria-label="Retirer l’aperçu du vocal">
              <X size={13} /> Retirer l’aperçu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
