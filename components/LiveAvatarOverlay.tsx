"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeAudio, synthesizeSpeech } from "@/lib/voice-api";
import { getPreferences } from "@/lib/preferences-api";
import { useMicLevels } from "./Waveform";
import { TalkingAvatar, type AvatarPhase } from "./TalkingAvatar";

/**
 * Conversation vocale en temps réel avec avatar animé. Reprend la pipeline
 * éprouvée de VoiceModeOverlay (calibration bruit, détection de parole
 * soutenue, synthèse phrase par phrase) et y ajoute le LIP-SYNC RÉEL : chaque
 * segment TTS est joué à travers un AnalyserNode Web Audio dont l'amplitude
 * pilote l'ouverture de bouche de l'avatar, frame par frame.
 */

const CALIBRATION_MS = 350;
const SPEAKING_MARGIN = 0.13;
const SILENCE_MS_TO_STOP = 1100;
const MIN_RECORD_MS = 500;
const MAX_RECORD_MS = 20000;
const SUSTAINED_SPEECH_MS = 280;
const MIN_TOTAL_SPEECH_MS = 400;
const RECORDER_TIMESLICE_MS = 250;
const SENTENCE_END = /^([\s\S]*?[.!?…:])(\s+|$)/;

const HALLUCINATION_PATTERNS = [
  /merci d'avoir regard/i,
  /n'oubliez pas de (vous )?abonner/i,
  /sous-titr/i,
  /thank(s| you) for watching/i,
  /^merci[.!?\s]*$/i,
];

function fixPronunciation(text: string): string {
  return text.replace(/fay[cç]al/gi, (m) => (m[0] === "F" ? "Fayssal" : "fayssal"));
}

function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_#|~]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeHallucination(text: string, recordMs: number): boolean {
  const t = text.trim();
  if (!t) return false;
  if (recordMs > 2500) return false;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

export function LiveAvatarOverlay({
  onSend,
  onClose,
}: {
  onSend: (text: string, onChunk?: (chunk: string) => void) => Promise<string>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<AvatarPhase>("listening");
  const [caption, setCaption] = useState("");
  const [replyCaption, setReplyCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [speakAmp, setSpeakAmp] = useState(0);
  const speedRef = useRef(1.0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const startedAtRef = useRef(0);
  const silenceSinceRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const speechRunStartRef = useRef<number | null>(null);
  const totalSpeechMsRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const noiseFloorRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);

  // Web Audio — un seul AudioContext réutilisé pour analyser chaque segment TTS.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ampRafRef = useRef<number | null>(null);

  const listening = phase === "listening";
  const levels = useMicLevels(listening, 24);
  const micAvg = levels.reduce((a, b) => a + b, 0) / levels.length;

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setVoice(p.tts_voice);
        if (p.tts_speed) speedRef.current = p.tts_speed;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    closedRef.current = false;
    startListening();
    return () => {
      closedRef.current = true;
      stopRecorderTracks();
      audioElRef.current?.pause();
      if (ampRafRef.current) cancelAnimationFrame(ampRafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calibration + détection de silence (identique à VoiceModeOverlay).
  useEffect(() => {
    if (phase !== "listening") return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < CALIBRATION_MS) {
      calibrationSamplesRef.current.push(micAvg);
      return;
    }
    if (noiseFloorRef.current === null) {
      const s = calibrationSamplesRef.current;
      noiseFloorRef.current = s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0.08;
    }
    const threshold = noiseFloorRef.current + SPEAKING_MARGIN;
    const now = Date.now();
    const frameMs = lastFrameAtRef.current ? Math.min(now - lastFrameAtRef.current, 200) : 0;
    lastFrameAtRef.current = now;

    if (micAvg > threshold) {
      if (speechRunStartRef.current === null) speechRunStartRef.current = now;
      totalSpeechMsRef.current += frameMs;
      if (now - speechRunStartRef.current >= SUSTAINED_SPEECH_MS) hasSpokenRef.current = true;
      silenceSinceRef.current = null;
    } else {
      speechRunStartRef.current = null;
      if (hasSpokenRef.current) {
        if (silenceSinceRef.current === null) silenceSinceRef.current = now;
        else if (
          elapsed > MIN_RECORD_MS &&
          now - silenceSinceRef.current > SILENCE_MS_TO_STOP &&
          chunksRef.current.length > 0
        ) {
          stopListening();
        }
      }
    }
    if (elapsed > MAX_RECORD_MS) stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micAvg, phase]);

  function stopRecorderTracks() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* déjà arrêté */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startListening() {
    setError(null);
    setCaption("");
    setReplyCaption("");
    setSpeakAmp(0);
    chunksRef.current = [];
    silenceSinceRef.current = null;
    hasSpokenRef.current = false;
    speechRunStartRef.current = null;
    totalSpeechMsRef.current = 0;
    lastFrameAtRef.current = 0;
    noiseFloorRef.current = null;
    calibrationSamplesRef.current = [];
    startedAtRef.current = Date.now();
    setPhase("listening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => handleRecordingStopped();
      recorder.start(RECORDER_TIMESLICE_MS);
    } catch {
      setError("Accès au microphone refusé.");
      setPhase("error");
    }
  }

  function stopListening() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function playQueueInOrder(
    queue: Promise<{ audio_base64: string; mime_type: string } | null>[],
  ) {
    for (const p of queue) {
      if (closedRef.current) return;
      const result = await p.catch(() => null);
      if (!result || closedRef.current) continue;
      await playWithLipSync(result.audio_base64, result.mime_type);
    }
  }

  /** Joue un segment TTS EN analysant son amplitude en direct pour piloter la
   * bouche de l'avatar. */
  function playWithLipSync(audioBase64: string, mimeType: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audio.playbackRate = speedRef.current;
      audio.crossOrigin = "anonymous";
      audioElRef.current = audio;

      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const src = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (closedRef.current) return;
          analyser.getByteTimeDomainData(data);
          // RMS autour de 128 (silence) → amplitude 0..1.
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          setSpeakAmp(Math.min(rms * 3.2, 1)); // gain pour une bouche expressive
          ampRafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        // Web Audio indisponible : on joue quand même le son, bouche neutre.
      }

      const cleanup = () => {
        if (ampRafRef.current) cancelAnimationFrame(ampRafRef.current);
        setSpeakAmp(0);
        resolve();
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
    });
  }

  async function handleRecordingStopped() {
    if (closedRef.current) return;
    if (!chunksRef.current.length) return;
    if (!hasSpokenRef.current || totalSpeechMsRef.current < MIN_TOTAL_SPEECH_MS) {
      if (!closedRef.current) startListening();
      return;
    }
    const recordMs = Date.now() - startedAtRef.current;
    setPhase("processing");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { text } = await transcribeAudio(blob);
      if (!text.trim() || looksLikeHallucination(text, recordMs)) {
        if (!closedRef.current) startListening();
        return;
      }
      setCaption(text);

      let spokenAnything = false;
      let playbackPromise: Promise<void> | null = null;
      const audioQueue: Promise<{ audio_base64: string; mime_type: string } | null>[] = [];

      function flushSentence(sentence: string) {
        const trimmed = fixPronunciation(stripMarkdownForSpeech(sentence));
        if (!trimmed) return;
        spokenAnything = true;
        audioQueue.push(synthesizeSpeech(trimmed, voice).catch(() => null));
        if (audioQueue.length === 1) {
          setPhase("speaking");
          playbackPromise = playQueueInOrder(audioQueue);
        }
      }

      let buffer = "";
      const reply = await onSend(text, (chunk) => {
        if (closedRef.current) return;
        setReplyCaption((prev) => prev + chunk);
        buffer += chunk;
        let match: RegExpExecArray | null;
        while ((match = SENTENCE_END.exec(buffer))) {
          flushSentence(match[1]);
          buffer = buffer.slice(match[0].length);
        }
      });
      if (closedRef.current) return;
      if (buffer.trim()) flushSentence(buffer);
      if (!reply.trim() && !spokenAnything) {
        startListening();
        return;
      }
      if (playbackPromise) await playbackPromise;
      if (!closedRef.current) startListening();
    } catch (err) {
      if (closedRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur pendant la conversation.");
      setPhase("error");
    }
  }

  function close() {
    closedRef.current = true;
    stopRecorderTracks();
    audioElRef.current?.pause();
    onClose();
  }

  const amplitude = phase === "speaking" ? speakAmp : phase === "listening" ? Math.min(micAvg, 1) : 0;

  const phaseLabel: Record<AvatarPhase, string> = {
    idle: "",
    listening: "Je vous écoute…",
    processing: "Toumaï AI réfléchit…",
    speaking: "Toumaï AI répond…",
    error: "Erreur",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)]">
      <button
        onClick={close}
        aria-label="Quitter la conversation en direct"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--hover)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>

      <TalkingAvatar phase={phase} amplitude={amplitude} />

      <p className="mb-2 mt-6 text-sm text-[var(--text-tertiary)]">{phaseLabel[phase]}</p>
      {caption && phase !== "speaking" && (
        <p className="max-w-md px-6 text-center text-sm text-[var(--text-secondary)]">« {caption} »</p>
      )}
      {phase === "speaking" && replyCaption && (
        <p className="max-h-32 max-w-md overflow-y-auto px-6 text-center text-sm text-[var(--text-secondary)]">
          {stripMarkdownForSpeech(replyCaption)}
        </p>
      )}
      {error && <p className="mt-2 max-w-md px-6 text-center text-sm text-[var(--error)]">{error}</p>}
      {phase === "error" && (
        <button
          onClick={startListening}
          className="mt-6 rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
