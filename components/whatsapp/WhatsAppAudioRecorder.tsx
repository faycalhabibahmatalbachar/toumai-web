"use client";

import { Loader2, Mic, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const RED = "#ff6b6b";

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
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Best-effort cleanup when leaving the conversation.
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function cleanup() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
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
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((value) => value + 1);
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
            ? new File([blob], `audio-${Date.now()}.${extension}`, { type: mime })
            : null;
          cleanup();
          resolve(file);
        },
        { once: true },
      );
      recorder.stop();
    });
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

  async function cancel() {
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/[0.04] disabled:opacity-40"
        style={{ color: MUTED }}
      >
        {preparing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={19} />}
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        aria-label="Annuler l’enregistrement"
        title="Annuler"
        disabled={preparing}
        onClick={() => void cancel()}
        className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-white/[0.04] disabled:opacity-40"
        style={{ color: RED }}
      >
        <X size={17} />
      </button>
      <span className="min-w-[42px] text-center text-[10px] tabular-nums" style={{ color: RED }}>
        ● {formatDuration(seconds)}
      </span>
      <button
        type="button"
        aria-label="Envoyer l’audio"
        title="Envoyer l’audio"
        disabled={preparing}
        onClick={() => void send()}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white disabled:opacity-40"
        style={{ background: GREEN }}
      >
        {preparing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
}

function formatDuration(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
