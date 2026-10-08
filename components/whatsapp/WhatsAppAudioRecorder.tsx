"use client";

import { Loader2, Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const RED = "#ff7185";
const RAISED = "#17201f";
const BORDER = "#26332f";

export function WhatsAppAudioRecorder({
  disabled = false,
  onRecorded,
  onError,
}: {
  disabled?: boolean;
  onRecorded: (file: File) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => Array.from({ length: 34 }, () => 0.12));

  useEffect(() => {
    return () => cleanup(true);
    // The recorder owns browser resources; cleanup only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopVisualizer() {
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    analyserRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  }

  function cleanup(stopRecorder = false) {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stopRecorder) {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Best-effort cleanup.
        }
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    pausedRef.current = false;
    stopVisualizer();
    setRecording(false);
    setPaused(false);
    setSeconds(0);
    setLevels(Array.from({ length: 34 }, () => 0.12));
  }

  function startVisualizer(stream: MediaStream) {
    try {
      const AudioContextCtor = window.AudioContext;
      const context = new AudioContextCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        const active = analyserRef.current;
        if (!active) return;
        active.getByteFrequencyData(data);
        const bars = 34;
        const stride = Math.max(1, Math.floor(data.length / bars));
        const next = Array.from({ length: bars }, (_, index) => {
          const value = data[Math.min(data.length - 1, index * stride)] || 0;
          return Math.max(0.12, Math.min(1, value / 170));
        });
        setLevels(next);
        animationRef.current = window.requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Recording still works if Web Audio visualization is unavailable.
    }
  }

  async function start() {
    if (disabled || preparing || recording) return;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError("L’enregistrement audio n’est pas disponible dans ce navigateur.");
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ];
      const mimeType = candidates.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      recorder.start(250);
      pausedRef.current = false;
      setRecording(true);
      setPaused(false);
      setSeconds(0);
      startVisualizer(stream);
      timerRef.current = window.setInterval(() => {
        if (!pausedRef.current) setSeconds((value) => value + 1);
      }, 1000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      const name = error instanceof DOMException ? error.name : "";
      onError(
        name === "NotAllowedError"
          ? "Autorisez l’accès au microphone pour enregistrer un audio."
          : "Impossible d’ouvrir le microphone.",
      );
    }
  }

  async function stopAsFile(): Promise<File | null> {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanup();
      return null;
    }
    return new Promise((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          const mime = recorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mime });
          const extension = mime.includes("ogg") ? "ogg" : "webm";
          const file = blob.size
            ? new File([blob], `vocal-${Date.now()}.${extension}`, { type: mime })
            : null;
          cleanup();
          resolve(file);
        },
        { once: true },
      );
      recorder.stop();
    });
  }

  function togglePause() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive" || preparing) return;

    if (recorder.state === "recording") {
      recorder.pause();
      pausedRef.current = true;
      setPaused(true);
      return;
    }
    if (recorder.state === "paused") {
      recorder.resume();
      pausedRef.current = false;
      setPaused(false);
    }
  }

  async function send() {
    if (!recording || preparing) return;
    setPreparing(true);
    try {
      const file = await stopAsFile();
      if (!file) {
        onError("L’enregistrement audio est vide.");
        return;
      }
      await onRecorded(file);
    } finally {
      setPreparing(false);
    }
  }

  async function discard() {
    if (!recording || preparing) return;
    await stopAsFile();
  }

  if (!recording) {
    return (
      <button
        type="button"
        aria-label="Enregistrer un audio"
        title="Enregistrer un audio"
        disabled={disabled || preparing}
        onClick={() => void start()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/[0.06] disabled:opacity-40"
        style={{ color: MUTED }}
      >
        {preparing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={19} />}
      </button>
    );
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center gap-3 rounded-[26px] border px-3 shadow-[0_10px_35px_rgba(0,0,0,.22)]"
      style={{ background: RAISED, borderColor: BORDER }}
    >
      <button
        type="button"
        aria-label="Supprimer l’enregistrement"
        title="Supprimer"
        disabled={preparing}
        onClick={() => void discard()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/[0.05] disabled:opacity-40"
        style={{ color: "#eef3f5" }}
      >
        <Trash2 size={18} />
      </button>

      <span className="flex min-w-[58px] shrink-0 items-center gap-2 text-[12px] tabular-nums text-white">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: RED, opacity: paused ? 0.45 : 1 }} />
        {formatDuration(seconds)}
      </span>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-[2px] overflow-hidden" aria-label="Niveau audio">
        {levels.map((level, index) => (
          <span
            key={index}
            className="w-[3px] shrink-0 rounded-full bg-white/55 transition-[height] duration-75"
            style={{ height: `${Math.round(8 + level * 22)}px`, opacity: paused ? 0.35 : 0.85 }}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label={paused ? "Reprendre l’enregistrement" : "Mettre l’enregistrement en pause"}
        title={paused ? "Reprendre" : "Pause"}
        disabled={preparing}
        onClick={togglePause}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/[0.05] disabled:opacity-40"
        style={{ color: "#ff9ab0" }}
      >
        {paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}
      </button>

      <button
        type="button"
        aria-label="Envoyer l’audio"
        title="Envoyer"
        disabled={preparing}
        onClick={() => void send()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#062015] shadow-[0_8px_24px_rgba(8,200,117,.25)] disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {preparing ? <Loader2 size={17} className="animate-spin" /> : <Send size={20} fill="currentColor" />}
      </button>
    </div>
  );
}

function formatDuration(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
