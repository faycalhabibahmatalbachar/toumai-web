"use client";

import { Mic, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { markWaVoicePlayed, type WaLiveMessage } from "@/lib/whatsapp-enterprise-api";

const GREEN = "#08c875";
const BLUE = "#53bdeb";
const MUTED = "#a8b3bb";
const TRACK = "#617078";
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
  const [decodedWaveform, setDecodedWaveform] = useState<number[] | null>(null);

  const waveform = useMemo(() => {
    const provider = normalizeProviderWaveform(message.waveform);
    if (provider.length >= 8) return resample(provider, 48);
    if (decodedWaveform?.length) return resample(decodedWaveform, 48);
    // Pas de fausse waveform : tant que Baileys ou le décodage local n'a
    // pas fourni de niveaux réels, afficher une ligne neutre et uniforme.
    return Array.from({ length: 48 }, () => 0.28);
  }, [decodedWaveform, message.id, message.waveform]);

  const progress = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
  const activeBars = Math.round(progress * waveform.length);
  const voiceColor = played || message.status === "played" ? BLUE : GREEN;

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

  useEffect(() => {
    if (normalizeProviderWaveform(message.waveform).length >= 8) return;
    let cancelled = false;
    let context: AudioContext | null = null;

    async function buildWaveform() {
      try {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        if (cancelled || typeof AudioContext === "undefined") return;
        context = new AudioContext();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        if (cancelled) return;
        const channel = buffer.getChannelData(0);
        const bars = 64;
        const bucket = Math.max(1, Math.floor(channel.length / bars));
        const values = Array.from({ length: bars }, (_, index) => {
          const start = index * bucket;
          const end = Math.min(channel.length, start + bucket);
          if (start >= end) return 0.12;
          let squareSum = 0;
          let samples = 0;
          const stride = Math.max(1, Math.floor((end - start) / 768));
          for (let cursor = start; cursor < end; cursor += stride) {
            const sample = channel[cursor] || 0;
            squareSum += sample * sample;
            samples += 1;
          }
          const rms = samples ? Math.sqrt(squareSum / samples) : 0;
          return Math.max(0.12, Math.min(1, rms * 4.6));
        });
        const peak = Math.max(...values, 0.12);
        setDecodedWaveform(values.map((value) => Math.max(0.12, value / peak)));
      } catch {
        // Playback remains functional even if Web Audio decoding is unavailable.
      } finally {
        if (context && context.state !== "closed") {
          void context.close().catch(() => {});
        }
      }
    }

    void buildWaveform();
    return () => {
      cancelled = true;
      if (context && context.state !== "closed") {
        void context.close().catch(() => {});
      }
    };
  }, [message.waveform, url]);

  function announcePlayed() {
    if (message.from_me || playedReceiptSentRef.current) return;
    playedReceiptSentRef.current = true;
    setPlayed(true);
    void markWaVoicePlayed({
      chat_id: message.chat_id,
      msg_id: message.id,
    }).catch(() => {
      // Listening must never fail because a receipt could not be sent.
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
      className="mb-1 min-w-[270px] max-w-[390px] rounded-2xl px-2.5 py-2"
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

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void togglePlayback()}
          aria-label={playing ? "Mettre le message vocal en pause" : "Lire le message vocal"}
          title={playing ? "Pause" : "Lire"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.07]"
          style={{ color: "#eef4f7" }}
        >
          {playing ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={21} fill="currentColor" className="translate-x-[1px]" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="relative flex h-8 items-center gap-[2px]">
            {waveform.map((level, index) => (
              <span
                key={index}
                className="min-w-[2px] flex-1 rounded-full transition-colors"
                style={{
                  height: `${Math.max(4, Math.round(5 + level * 18))}px`,
                  background: index < activeBars ? voiceColor : TRACK,
                  opacity: index < activeBars ? 1 : 0.78,
                }}
              />
            ))}
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

          <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] tabular-nums" style={{ color: MUTED }}>
            <span className="inline-flex items-center gap-1">
              <Mic size={11} color={voiceColor} />
              {formatDuration(playing || current > 0 ? current : duration)}
            </span>
            <button
              type="button"
              onClick={cycleRate}
              aria-label={`Vitesse de lecture ${formatRate(rate)}`}
              title="Changer la vitesse de lecture"
              className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition hover:bg-white/[0.07]"
              style={{ color: "#d9e3e8" }}
            >
              {formatRate(rate)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeProviderWaveform(values: number[] | null | undefined) {
  if (!Array.isArray(values) || !values.length) return [];
  const safe = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, value));
  if (!safe.length) return [];
  const peak = Math.max(...safe, 1);
  return safe.map((value) => Math.max(0.12, Math.min(1, value / peak)));
}

function resample(values: number[], target: number) {
  if (!values.length) return [];
  if (values.length === target) return values;
  return Array.from({ length: target }, (_, index) => {
    const position = (index / Math.max(1, target - 1)) * (values.length - 1);
    const left = Math.floor(position);
    const right = Math.min(values.length - 1, left + 1);
    const fraction = position - left;
    return values[left] * (1 - fraction) + values[right] * fraction;
  });
}

function formatDuration(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatRate(value: number) {
  return Number.isInteger(value) ? `${value}×` : `${value.toFixed(1)}×`;
}
