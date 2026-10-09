"use client";

import { Mic, Pause, Play, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WhatsAppProfileAvatar } from "@/components/whatsapp/WhatsAppProfileAvatar";
import { markWaVoicePlayed, type WaLiveMessage } from "@/lib/whatsapp-enterprise-api";

const GREEN = "#21c063";
const BLUE = "#53bdeb";
const MUTED = "#aebac1";
const RAIL = "#2b7565";
const EVENT_NAME = "toumai:whatsapp-voice-play";

export function WhatsAppVoiceNotePlayer({
  message,
  url,
}: {
  message: WaLiveMessage;
  url: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playedReceiptSentRef = useRef(Boolean(message.played));
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(
    Number.isFinite(Number(message.duration_seconds))
      ? Math.max(0, Number(message.duration_seconds))
      : 0,
  );
  const [rate, setRate] = useState(1);
  const [played, setPlayed] = useState(Boolean(message.played) || message.status === "played");

  const progress = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
  const voiceColor = played || message.status === "played" ? BLUE : GREEN;
  const senderInitials = voiceInitials(message.sender || "");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const onOtherVoicePlay = (event: Event) => {
      const custom = event as CustomEvent<{ id?: string }>;
      if (custom.detail?.id === message.id) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) audio.pause();
    };
    window.addEventListener(EVENT_NAME, onOtherVoicePlay);
    return () => window.removeEventListener(EVENT_NAME, onOtherVoicePlay);
  }, [message.id]);

  function announcePlayed() {
    if (message.from_me || playedReceiptSentRef.current) return;
    playedReceiptSentRef.current = true;
    setPlayed(true);
    void markWaVoicePlayed({
      chat_id: message.chat_id,
      msg_id: message.id,
    }).catch(() => {
      // L'écoute locale ne doit jamais échouer à cause d'un receipt réseau.
    });
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id: message.id } }));
      announcePlayed();
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
    }
  }

  function cycleRate() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const safe = Math.max(0, Math.min(duration, value));
    audio.currentTime = safe;
    setCurrent(safe);
  }

  return (
    <div
      data-testid="whatsapp-voice-note"
      className="w-[433px] max-w-[calc(88vw-42px)]"
      aria-label="Message vocal WhatsApp"
    >
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration;
          if (Number.isFinite(next) && next > 0) setDuration(next);
        }}
        onDurationChange={(event) => {
          const next = event.currentTarget.duration;
          if (Number.isFinite(next) && next > 0) setDuration(next);
        }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />

      <div className="flex h-[74px] items-center gap-[18px]">
        <VoiceAvatar
          outbound={message.from_me}
          name={message.sender || senderInitials}
          pictureUrl={message.sender_picture_url}
          color={voiceColor}
          playing={playing || current > 0}
          rate={rate}
          onRate={cycleRate}
        />

        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={playing ? "Mettre le message vocal en pause" : "Lire le message vocal"}
          title={playing ? "Pause" : "Lire"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-black/[0.06]"
          style={{ color: "#f0f2f5" }}
        >
          {playing ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={23} fill="currentColor" className="translate-x-[1px]" />
          )}
        </button>

        <div className="mr-[12px] min-w-0 flex-1 self-stretch pt-[20px]">
          <div
            data-testid="voice-progress-track"
            className="relative h-[18px]"
          >
            <div
              className="absolute left-0 right-0 top-[8px] h-[4px] rounded-full"
              style={{ background: RAIL }}
            />
            <div
              className="absolute left-0 top-[8px] h-[4px] rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: voiceColor,
              }}
            />
            <span
              className="absolute top-[1px] h-[18px] w-[18px] -translate-x-1/2 rounded-full shadow-sm"
              style={{
                left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                background: voiceColor,
              }}
            />
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.1)}
              step={0.05}
              value={Math.min(current, Math.max(duration, 0.1))}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Position dans le message vocal"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          <div
            className="mt-[3px] flex items-center text-[12px] leading-none tabular-nums"
            style={{ color: MUTED }}
          >
            <span>{formatDuration(playing || current > 0 ? current : duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Match the exact voice-player geometry while the encrypted attachment
 * is being fetched. This is a passive shell, not a fake playable recording.
 * A failed request stays here with an explicit retry action.
 */
export function WhatsAppVoiceNotePlaceholder({
  message,
  status,
  onRetry,
}: {
  message: WaLiveMessage;
  status: "loading" | "failed";
  onRetry?: () => void;
}) {
  const seconds = Number(message.duration_seconds);
  const duration = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return (
    <div
      data-testid={status === "loading" ? "whatsapp-media-loading" : "whatsapp-media-failed"}
      className="w-[433px] max-w-[calc(88vw-42px)]"
      aria-label={status === "loading" ? "Préparation du message vocal" : "Message vocal indisponible"}
    >
      <div className="flex h-[74px] items-center gap-[18px]">
        <VoiceAvatar
          outbound={message.from_me}
          name={message.sender || ""}
          pictureUrl={message.sender_picture_url}
          color={GREEN}
          playing={false}
          rate={1}
          onRate={() => undefined}
        />
        {status === "failed" && onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Réessayer le média : Message vocal"
            title="Réessayer le message vocal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#f0f2f5] transition hover:bg-black/[0.08]"
          >
            <RefreshCw size={22} />
          </button>
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-white/60"
          >
            <Play size={23} fill="currentColor" />
          </span>
        )}
        <div className="mr-[12px] min-w-0 flex-1 self-stretch pt-[20px]">
          <div className="relative h-[18px]" aria-hidden="true">
            <div className="absolute left-0 right-0 top-[8px] h-[4px] rounded-full" style={{ background: RAIL }} />
            <span className="absolute left-0 top-[1px] h-[18px] w-[18px] rounded-full bg-[#2b7565]" />
          </div>
          <div className="mt-[3px] text-[12px] leading-none tabular-nums" style={{ color: MUTED }}>
            {formatDuration(duration)}
          </div>
        </div>
      </div>
      <span role="status" className="sr-only">
        {status === "loading" ? "Préparation du message vocal" : "Le message vocal est indisponible. Vous pouvez réessayer."}
      </span>
    </div>
  );
}

function VoiceAvatar({
  outbound,
  name,
  pictureUrl,
  color,
  playing,
  rate,
  onRate,
}: {
  outbound: boolean;
  name: string;
  pictureUrl?: string | null;
  color: string;
  playing: boolean;
  rate: number;
  onRate: () => void;
}) {
  return (
    <div
      data-testid="voice-avatar"
      className="relative h-[74px] w-[74px] shrink-0"
    >
      <WhatsAppProfileAvatar
        name={name}
        kind="contact"
        pictureUrl={pictureUrl}
        size={74}
        eager
        fallbackBackground={outbound ? "#ffffff" : "#dfe5e7"}
      />

      {playing ? (
        <button
          type="button"
          onClick={onRate}
          aria-label={`Vitesse de lecture ${formatRate(rate)}`}
          title="Changer la vitesse de lecture"
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20 text-[12px] font-bold text-white transition hover:bg-black/30"
        >
          {formatRate(rate)}
        </button>
      ) : null}

      <span
        className="absolute bottom-[2px] right-[3px] flex h-[24px] w-[24px] items-center justify-center rounded-full shadow-sm"
        style={{ background: outbound ? "#ffffff" : "#dfe5e7" }}
      >
        <Mic size={20} strokeWidth={2.6} color={color} />
      </span>
    </div>
  );
}

function voiceInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDuration(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatRate(value: number) {
  return Number.isInteger(value) ? `${value}×` : `${value.toFixed(1)}×`;
}
