"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "@/lib/voice-api";
import { getPreferences, type Preferences } from "@/lib/preferences-api";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import { errorMessage } from "@/lib/errors";

export type SpeechState = "idle" | "loading" | "playing";

/** Retire le balisage Markdown : lu tel quel, il donne « étoile étoile titre ». */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (bloc de code) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, " ")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Lecture à voix haute d'une réponse, avec la voix choisie dans les réglages —
 * le même moteur et la même voix que sur mobile et que le mode vocal.
 */
export function useSpeakText() {
  const [state, setState] = useState<SpeechState>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<string | undefined>(
    cacheSeed<Preferences>("user:prefs")?.tts_voice ?? undefined,
  );

  useEffect(() => {
    // Arrête la lecture si le message disparaît (navigation, nouveau chat).
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setState("idle");
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (state !== "idle") {
        stop();
        return;
      }
      const clean = stripMarkdownForSpeech(text);
      if (!clean) return;
      setError(null);
      setState("loading");
      try {
        if (voiceRef.current === undefined) {
          const prefs = await getPreferences().catch(() => null);
          if (prefs) {
            cacheWrite("user:prefs", prefs);
            voiceRef.current = prefs.tts_voice ?? undefined;
          }
        }
        const { audio_base64, mime_type } = await synthesizeSpeech(clean, voiceRef.current);
        const audio = new Audio(`data:${mime_type};base64,${audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => setState("idle");
        audio.onerror = () => {
          setState("idle");
          setError("La lecture audio n'a pas pu démarrer sur cet appareil.");
        };
        await audio.play();
        setState("playing");
      } catch (err) {
        setState("idle");
        setError(errorMessage(err, "voice"));
      }
    },
    [state, stop],
  );

  return { state, error, speak, stop, clearError: () => setError(null) };
}
