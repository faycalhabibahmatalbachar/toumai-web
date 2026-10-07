"use client";

import { Check, CheckCheck, Info, Loader2, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";

import type { WaLiveMessage, WaMessageStatus } from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const FAINT = "#6f7f8d";
const GREEN = "#08c875";
const BLUE = "#53bdeb";

export function WhatsAppMessageInfoModal({
  message,
  status,
  loading,
  error,
  onClose,
}: {
  message: WaLiveMessage | null;
  status: WaMessageStatus | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  if (!message) return null;

  const timeline = status?.timeline || {};
  const readAt = timeline.played || timeline.read || null;
  const deliveredAt = timeline.delivered || null;
  const sentAt = timeline.sent || status?.sent_at || timeline.queued || message.timestamp_ms || null;
  const editedAt = status?.edited_at || null;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer les infos du message"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-message-info-title"
        className="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
      >
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#073d2c]" style={{ color: GREEN }}>
            <Info size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="wa-message-info-title" className="text-[16px] font-semibold">Infos du message</h2>
            <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>
              {message.type === "text" || message.type === "texte" ? "Message texte" : mediaLabel(message.type)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5"
            style={{ color: MUTED }}
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-5">
          <div
            className="mb-5 ml-auto max-w-[86%] rounded-[14px] border px-3.5 py-3"
            style={{ background: "linear-gradient(145deg,#0b6447,#0a533d)", borderColor: "rgba(8,200,117,.18)" }}
          >
            {message.text ? (
              <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.65]">{message.text}</p>
            ) : (
              <p className="text-[12px] font-medium">{mediaLabel(message.type)}</p>
            )}
            <div className="mt-1 flex items-center justify-end gap-1.5 text-[9px]" style={{ color: "#b8c6ce" }}>
              <span>{formatTime(message.timestamp_ms)}</span>
              <CheckCheck size={12} color={status?.read_confirmed ? BLUE : "#afbdc7"} />
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-xl border py-8 text-sm" style={{ borderColor: BORDER, color: MUTED }}>
              <Loader2 size={17} className="animate-spin" /> Chargement des accusés…
            </div>
          )}

          {!loading && error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs leading-5 text-red-200">
              {error}
            </p>
          )}

          {!loading && !error && status && (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: RAISED }}>
              <InfoRow
                icon={<CheckCheck size={18} color={BLUE} />}
                label="Lu"
                value={status.read_confirmed ? formatMoment(readAt) || "Confirmé" : "Pas encore lu"}
                active={status.read_confirmed}
              />
              <InfoRow
                icon={<CheckCheck size={18} color="#afbdc7" />}
                label="Distribué"
                value={status.delivery_confirmed ? formatMoment(deliveredAt) || "Confirmé" : "Pas encore distribué"}
                active={status.delivery_confirmed}
              />
              <InfoRow
                icon={<Check size={18} color="#afbdc7" />}
                label="Envoyé"
                value={formatMoment(sentAt) || (status.known ? "Confirmé" : "Statut indisponible")}
                active={status.known}
              />
              {editedAt ? (
                <InfoRow
                  icon={<Pencil size={17} color={GREEN} />}
                  label="Modifié"
                  value={formatMoment(editedAt) || "Oui"}
                  active
                  last
                />
              ) : null}
            </div>
          )}

          {!loading && !error && !status && (
            <p className="rounded-xl border px-4 py-3 text-xs leading-5" style={{ borderColor: BORDER, color: MUTED }}>
              Les informations de remise ne sont pas disponibles pour ce message.
            </p>
          )}

          {!loading && !error && status && !status.known && (
            <p className="mt-3 text-[10px] leading-4" style={{ color: FAINT }}>
              WhatsApp n’a pas fourni d’historique exploitable pour ce message, par exemple après un redémarrage de la passerelle.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  active,
  last = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  active: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b"}`} style={{ borderColor: BORDER }}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold" style={{ color: active ? TEXT : MUTED }}>{label}</p>
        <p className="mt-0.5 text-[10px]" style={{ color: FAINT }}>{value}</p>
      </div>
    </div>
  );
}

function formatTime(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatMoment(value?: number | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mediaLabel(type: string) {
  const labels: Record<string, string> = {
    image: "Image",
    video: "Vidéo",
    gif: "GIF",
    audio: "Audio",
    voice: "Message vocal",
    voix: "Message vocal",
    sticker: "Sticker",
    document: "Document",
  };
  return labels[type] || "Message";
}
