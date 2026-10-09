"use client";

import { CircleAlert, Clock3, Loader2, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

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
}: {
  voices: PendingWhatsAppVoice[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
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
        />
      ))}
    </div>
  );
}

function PendingVoiceBubble({
  voice,
  onRetry,
  onDismiss,
}: {
  voice: PendingWhatsAppVoice;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    const next = URL.createObjectURL(voice.file);
    setLocalUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [voice.file]);

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
  const label =
    voice.phase === "uploading"
      ? "Préparation et transfert du vocal…"
      : voice.phase === "sending"
        ? "Envoi à la passerelle WhatsApp…"
        : voice.phase === "accepted"
          ? "Accepté par la passerelle · livraison non confirmée"
          : voice.phase === "upload_failed"
            ? "Préparation du vocal échouée · aucun envoi lancé"
            : "Envoi non confirmé · vérifiez WhatsApp avant de renvoyer";

  return (
    <div data-testid="whatsapp-pending-voice" data-voice-phase={voice.phase} className="flex justify-end">
      <div className="max-w-[92%] rounded-[10px] bg-[#144d37] px-3 py-2 text-[#f4f7f9] shadow-sm">
        {localUrl ? (
          <WhatsAppVoiceNotePlayer message={message} url={localUrl} />
        ) : (
          <div className="flex h-[72px] min-w-[240px] items-center gap-2 text-xs">
            <Loader2 size={16} className="animate-spin" />
            Préparation de l’aperçu…
          </div>
        )}
        <div role="status" aria-live="polite" className="mt-1 flex items-start gap-1.5 text-[11px] text-[#c4d6d0]">
          {pending ? <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin" /> : voice.phase === "accepted" ? (
            <Clock3 size={13} className="mt-0.5 shrink-0" />
          ) : (
            <CircleAlert size={13} className="mt-0.5 shrink-0 text-[#ffc0bf]" />
          )}
          <div className="min-w-0 flex-1">
            <span>{label}</span>
            {voice.detail && <p className="mt-1 text-[#ffd5d5]">{voice.detail}</p>}
          </div>
        </div>
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
