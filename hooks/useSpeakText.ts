"use client";

import { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { getPreferences } from "@/lib/preferences-api";
import {
  clearToumaiVoiceError,
  getToumaiVoiceServerSnapshot,
  getToumaiVoiceSnapshot,
  playToumaiVoice,
  stopToumaiVoice,
  subscribeToumaiVoice,
  textForToumaiVoice,
} from "@/lib/toumai-voice-player";

export type SpeechState = "idle" | "loading" | "playing";

/** Compatibilité avec les tests/imports existants. */
export const stripMarkdownForSpeech = textForToumaiVoice;

/**
 * Lecture d'une réponse avec le lecteur global Zenaba.
 * Deux instances de message ne peuvent jamais parler en même temps.
 */
export function useSpeakText() {
  const reactId = useId();
  const owner = "chat-read:" + reactId;
  const speedRef = useRef(1);

  const global = useSyncExternalStore(
    subscribeToumaiVoice,
    getToumaiVoiceSnapshot,
    getToumaiVoiceServerSnapshot,
  );

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        if (prefs.tts_speed) speedRef.current = prefs.tts_speed;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      stopToumaiVoice(owner);
    };
  }, [owner]);

  const state: SpeechState =
    global.owner === owner ? global.phase : "idle";
  const error = global.owner === owner ? global.error : null;

  const stop = useCallback(() => {
    stopToumaiVoice(owner);
  }, [owner]);

  const speak = useCallback(
    async (text: string) => {
      await playToumaiVoice(text, owner, speedRef.current);
    },
    [owner],
  );

  return {
    state,
    error,
    speak,
    stop,
    clearError: () => clearToumaiVoiceError(owner),
  };
}
