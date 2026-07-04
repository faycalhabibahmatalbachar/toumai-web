"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeAudio, synthesizeSpeech } from "@/lib/voice-api";
import { getPreferences } from "@/lib/preferences-api";
import { useMicLevels } from "./Waveform";
import { Logo } from "./Logo";

type Phase = "listening" | "processing" | "speaking" | "error";

// useMicLevels renvoie un plancher artificiel de 0.08 même en silence total
// (pour que les barres restent visibles à l'écran) — un seuil fixe se
// retrouvait donc quasi toujours au-dessus du bruit ambiant réel. On calibre
// désormais le bruit ambiant en tout début d'écoute, puis on exige un
// dépassement net de ce plancher pour considérer que l'utilisateur parle.
const CALIBRATION_MS = 350;
const SPEAKING_MARGIN = 0.13;
const SILENCE_MS_TO_STOP = 1100;
const MIN_RECORD_MS = 500;
const MAX_RECORD_MS = 20000; // garde-fou : ne jamais rester bloqué en écoute
// Le MediaRecorder ne livrait un blob qu'à l'arrêt (aucun timeslice), donc
// chunksRef restait vide pendant toute l'écoute — la condition qui exigeait
// des chunks déjà présents avant d'auto-arrêter ne pouvait donc jamais être
// vraie. C'était la cause réelle de l'arrêt automatique qui ne se déclenchait
// jamais (l'utilisateur devait toujours cliquer un bouton manuel).
const RECORDER_TIMESLICE_MS = 250;
const SLOW_RESPONSE_HINT_MS = 6000;

// Découpe la réponse en phrases complètes dès qu'elles arrivent dans le flux,
// pour lancer la synthèse vocale phrase par phrase (temps réel) plutôt que
// d'attendre la réponse entière avant de commencer à parler.
const SENTENCE_END = /^([\s\S]*?[.!?…:])(\s+|$)/;

// Hallucinations classiques de Whisper sur un audio silencieux/bruité — si la
// transcription ne contient QUE ça, ce n'est pas une vraie question de
// l'utilisateur : on relance l'écoute au lieu d'envoyer du bruit au chat.
const HALLUCINATION_PATTERNS = [
  /merci d'avoir regard/i,
  /n'oubliez pas de (vous )?abonner/i,
  /sous-titr/i,
  /thank(s| you) for watching/i,
  /don't forget to subscribe/i,
  /^(salut|bonjour|allo|coucou)[.!?\s]*$/i,
  /^merci[.!?\s]*$/i,
];

function looksLikeHallucination(text: string, recordMs: number): boolean {
  const t = text.trim();
  if (!t) return false;
  // Ces phrases n'apparaissent quasi jamais sur un enregistrement de plus de
  // 2.5s avec une vraie voix dedans — seulement sur du silence/bruit bref.
  if (recordMs > 2500) return false;
  return HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

export function VoiceModeOverlay({
  onSend,
  onClose,
}: {
  /** Envoie le texte transcrit dans la conversation ; `onChunk` est appelé
   * pour chaque fragment de la réponse dès qu'il arrive (streaming), et la
   * promesse se résout avec le texte complet une fois le flux terminé. */
  onSend: (text: string, onChunk?: (chunk: string) => void) => Promise<string>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [caption, setCaption] = useState("");
  const [replyCaption, setReplyCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | undefined>(undefined);
  const [slowHint, setSlowHint] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const startedAtRef = useRef(0);
  const silenceSinceRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);
  const noiseFloorRef = useRef<number | null>(null);
  const calibrationSamplesRef = useRef<number[]>([]);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listening = phase === "listening";
  const levels = useMicLevels(listening, 24);
  const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;

  useEffect(() => {
    getPreferences()
      .then((p) => setVoice(p.tts_voice))
      .catch(() => {});
  }, []);

  useEffect(() => {
    closedRef.current = false;
    startListening();
    return () => {
      closedRef.current = true;
      stopRecorderTracks();
      audioElRef.current?.pause();
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calibration du bruit ambiant + détection de silence après prise de parole.
  useEffect(() => {
    if (phase !== "listening") return;
    const elapsed = Date.now() - startedAtRef.current;

    if (elapsed < CALIBRATION_MS) {
      calibrationSamplesRef.current.push(avgLevel);
      return;
    }
    if (noiseFloorRef.current === null) {
      const samples = calibrationSamplesRef.current;
      noiseFloorRef.current = samples.length
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0.08;
    }

    const speakingThreshold = noiseFloorRef.current + SPEAKING_MARGIN;
    const isSpeaking = avgLevel > speakingThreshold;

    if (isSpeaking) {
      hasSpokenRef.current = true;
      silenceSinceRef.current = null;
    } else if (hasSpokenRef.current) {
      if (silenceSinceRef.current === null) silenceSinceRef.current = Date.now();
      else if (
        elapsed > MIN_RECORD_MS &&
        Date.now() - silenceSinceRef.current > SILENCE_MS_TO_STOP &&
        chunksRef.current.length > 0
      ) {
        stopListening();
      }
    }

    if (elapsed > MAX_RECORD_MS && chunksRef.current.length > 0) {
      stopListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgLevel, phase]);

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
    setSlowHint(false);
    chunksRef.current = [];
    silenceSinceRef.current = null;
    hasSpokenRef.current = false;
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
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Joue une file de segments audio (base64) dans l'ordre, en attendant que
   * chaque synthèse soit prête — mais celles-ci tournent en parallèle en
   * arrière-plan pendant que le segment précédent joue encore. */
  async function playQueueInOrder(
    queue: Promise<{ audio_base64: string; mime_type: string } | null>[],
  ) {
    for (const p of queue) {
      if (closedRef.current) return;
      const result = await p.catch(() => null);
      if (!result || closedRef.current) continue;
      await playAudio(result.audio_base64, result.mime_type);
    }
  }

  function playAudio(audioBase64: string, mimeType: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
      audioElRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
  }

  async function handleRecordingStopped() {
    if (closedRef.current) return;
    if (!chunksRef.current.length) return;
    const recordMs = Date.now() - startedAtRef.current;
    setPhase("processing");
    slowTimerRef.current = setTimeout(() => setSlowHint(true), SLOW_RESPONSE_HINT_MS);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const { text } = await transcribeAudio(blob);
      if (!text.trim() || looksLikeHallucination(text, recordMs)) {
        if (!closedRef.current) startListening();
        return;
      }
      setCaption(text);

      // Synthèse phrase par phrase : dès qu'une phrase complète arrive dans
      // le flux, on lance sa synthèse vocale immédiatement en arrière-plan,
      // sans attendre la fin de la réponse — c'est ce qui rend la conversation
      // perceptiblement instantanée plutôt que d'attendre le texte entier.
      let buffer = "";
      let spokenAnything = false;
      let playbackPromise: Promise<void> | null = null;
      const audioQueue: Promise<{ audio_base64: string; mime_type: string } | null>[] = [];

      function flushSentence(sentence: string) {
        const trimmed = sentence.trim();
        if (!trimmed) return;
        spokenAnything = true;
        audioQueue.push(synthesizeSpeech(trimmed, voice).catch(() => null));
        if (audioQueue.length === 1) {
          if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
          setSlowHint(false);
          setPhase("speaking");
          playbackPromise = playQueueInOrder(audioQueue);
        }
      }

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

      // playQueueInOrder consomme la file au fur et à mesure qu'elle se
      // remplit (même tableau référencé) ; on attend juste sa fin réelle
      // pour rouvrir le micro seulement une fois la dernière phrase jouée.
      if (playbackPromise) await playbackPromise;
      if (!closedRef.current) startListening();
    } catch (err) {
      if (closedRef.current) return;
      setError(err instanceof Error ? err.message : "Erreur pendant la conversation vocale.");
      setPhase("error");
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    }
  }

  function close() {
    closedRef.current = true;
    stopRecorderTracks();
    audioElRef.current?.pause();
    onClose();
  }

  const phaseLabel: Record<Phase, string> = {
    listening: "Je vous écoute…",
    processing: slowHint ? "Ça prend un peu plus de temps que prévu…" : "Toumaï AI réfléchit…",
    speaking: "Toumaï AI répond…",
    error: "Erreur",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--background)]">
      <button
        onClick={close}
        aria-label="Fermer le mode vocal"
        className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/5"
      >
        <CloseIcon />
      </button>

      <VoiceOrb phase={phase} level={avgLevel} />

      <p className="mb-2 mt-8 text-sm text-[var(--text-tertiary)]">{phaseLabel[phase]}</p>
      {caption && phase !== "speaking" && (
        <p className="max-w-md px-6 text-center text-sm text-[var(--text-secondary)]">
          « {caption} »
        </p>
      )}
      {phase === "speaking" && replyCaption && (
        <p className="max-w-md px-6 text-center text-sm text-[var(--text-secondary)]">
          {replyCaption}
        </p>
      )}
      {error && (
        <p className="mt-2 max-w-md px-6 text-center text-sm text-[var(--error)]">{error}</p>
      )}

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

/** Orbe centrale — anneau dégradé qui respire au rythme de l'amplitude vocale
 * en écoute, pulse doucement pendant la réflexion, et vibre pendant la
 * lecture de la réponse. Remplace les barres plates par une présence plus
 * organique, dans l'esprit de la maquette de la page d'accueil. */
function VoiceOrb({ phase, level }: { phase: Phase; level: number }) {
  const scale = phase === "listening" ? 1 + Math.min(level, 1) * 0.35 : 1;
  const ringAnimation =
    phase === "processing"
      ? "voice-orb-breathe 1.6s ease-in-out infinite"
      : phase === "speaking"
        ? "voice-orb-speak 0.7s ease-in-out infinite"
        : "none";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-xl transition-transform duration-100"
        style={{
          background:
            "conic-gradient(from 0deg, var(--primary), var(--thinking), var(--primary))",
          transform: `scale(${phase === "error" ? 0.9 : scale})`,
          animation: ringAnimation,
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-3 rounded-full transition-transform duration-100"
        style={{
          background:
            phase === "error"
              ? "var(--card)"
              : "conic-gradient(from 90deg, var(--primary), var(--thinking), var(--primary))",
          transform: `scale(${phase === "error" ? 1 : 0.9 + Math.min(level, 1) * 0.08})`,
        }}
        aria-hidden="true"
      />
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: "var(--background)" }}
      >
        {phase === "error" ? <span className="text-3xl">⚠️</span> : <Logo size={40} />}
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
