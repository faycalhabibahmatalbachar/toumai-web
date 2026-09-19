"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Pause, Play } from "lucide-react";
import {
  getPreferences,
  updatePreferences,
  type Preferences,
} from "@/lib/preferences-api";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import {
  getToumaiVoiceServerSnapshot,
  getToumaiVoiceSnapshot,
  playToumaiVoice,
  stopToumaiVoice,
  subscribeToumaiVoice,
} from "@/lib/toumai-voice-player";
import { Panel, Row, Segmented } from "./Rows";

const PREVIEW_OWNER = "settings:zenaba";
const PREVIEW_TEXT =
  "Bonjour Fayçal, comment puis-je vous aider aujourd’hui ? " +
  "Je peux lire vos réponses, vos rappels et vos notifications " +
  "avec une voix naturelle et agréable.";

export function VoiceSection() {
  const [speed, setSpeed] = useState<number>(
    () => cacheSeed<Preferences>("user:prefs")?.tts_speed ?? 1.0,
  );
  const [error, setError] = useState<string | null>(null);

  const voice = useSyncExternalStore(
    subscribeToumaiVoice,
    getToumaiVoiceSnapshot,
    getToumaiVoiceServerSnapshot,
  );
  const phase = voice.owner === PREVIEW_OWNER ? voice.phase : "idle";
  const voiceError = voice.owner === PREVIEW_OWNER ? voice.error : null;

  useEffect(() => {
    getPreferences()
      .then((prefs) => {
        const normalized = { ...prefs, tts_voice: "zenaba" };
        setSpeed(prefs.tts_speed ?? 1.0);
        cacheWrite("user:prefs", normalized);
        if (prefs.tts_voice !== "zenaba") {
          void updatePreferences({ tts_voice: "zenaba" }).catch(() => {});
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Chargement impossible");
      });

    return () => {
      stopToumaiVoice(PREVIEW_OWNER);
    };
  }, []);

  async function saveSpeed(v: string) {
    const value = Number(v);
    const previous = speed;
    setSpeed(value);
    setError(null);
    try {
      await updatePreferences({ tts_speed: value, tts_voice: "zenaba" });
      const cached = cacheSeed<Preferences>("user:prefs");
      if (cached) {
        cacheWrite("user:prefs", {
          ...cached,
          tts_voice: "zenaba",
          tts_speed: value,
        });
      }
    } catch (err) {
      setSpeed(previous);
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement");
    }
  }

  function togglePreview() {
    setError(null);
    void playToumaiVoice(PREVIEW_TEXT, PREVIEW_OWNER, speed);
  }

  return (
    <div>
      <Panel title="Voix Toumaï">
        <div className="flex items-center justify-between gap-4 border-t border-[var(--border)] px-5 py-4 first:border-t-0">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              <span>Zenaba</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                  color: "var(--primary-light)",
                }}
              >
                <Check size={10} />
                Voix Toumaï
              </span>
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Voix officielle de Toumaï · Français
            </p>
          </div>

          <button
            type="button"
            onClick={togglePreview}
            aria-label={phase === "idle" ? "Écouter Zenaba" : "Arrêter Zenaba"}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:text-[var(--text-primary)]"
          >
            {phase === "loading" ? (
              <span className="h-3 w-3 animate-pulse rounded-full bg-current" />
            ) : phase === "playing" ? (
              <Pause size={13} fill="currentColor" />
            ) : (
              <Play size={13} fill="currentColor" />
            )}
            {phase === "playing" ? "Arrêter" : phase === "loading" ? "Annuler" : "Écouter"}
          </button>
        </div>
      </Panel>

      <Panel title="Vitesse de lecture">
        <Row label="Vitesse" description="Rythme de Zenaba pendant la lecture.">
          <Segmented
            options={[
              { value: "0.75", label: "0,75×" },
              { value: "1", label: "1×" },
              { value: "1.25", label: "1,25×" },
            ]}
            value={String(speed) as "0.75" | "1" | "1.25"}
            onChange={saveSpeed}
          />
        </Row>
      </Panel>

      {(error || voiceError) && (
        <p className="text-sm text-[var(--error)]">{error || voiceError}</p>
      )}
    </div>
  );
}
