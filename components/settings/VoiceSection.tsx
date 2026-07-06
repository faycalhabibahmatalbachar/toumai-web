"use client";

import { useEffect, useRef, useState } from "react";
import {
  getPreferences,
  listVoices,
  updatePreferences,
  type Preferences,
  type Voice,
} from "@/lib/preferences-api";
import { synthesizeSpeech } from "@/lib/voice-api";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import { Panel, Row, Segmented } from "./Rows";

const LANG_LABEL: Record<string, string> = {
  fr: "Français",
  ar: "Arabe",
  en: "Anglais",
};

export function VoiceSection() {
  const [voices, setVoices] = useState<Voice[]>(() => cacheSeed<Voice[]>("voices:list") ?? []);
  const [selected, setSelected] = useState<string | undefined>(
    () => cacheSeed<Preferences>("user:prefs")?.tts_voice,
  );
  const [speed, setSpeed] = useState<number>(
    () => cacheSeed<Preferences>("user:prefs")?.tts_speed ?? 1.0,
  );
  const [playing, setPlaying] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => (cacheSeed<Voice[]>("voices:list") ?? []).length === 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all([listVoices(), getPreferences()])
      .then(([v, p]) => {
        setVoices(v.voices);
        cacheWrite("voices:list", v.voices);
        setSelected(p.tts_voice);
        setSpeed(p.tts_speed ?? 1.0);
        cacheWrite("user:prefs", p);
      })
      .catch((err) =>
        setVoices((c) => {
          if (c.length === 0) setError(err instanceof Error ? err.message : "Chargement impossible");
          return c;
        }),
      )
      .finally(() => setLoading(false));
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function pick(voiceId: string) {
    const prev = selected;
    setSelected(voiceId);
    setError(null);
    try {
      await updatePreferences({ tts_voice: voiceId });
    } catch (err) {
      setSelected(prev);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  async function saveSpeed(v: string) {
    const value = Number(v);
    const prev = speed;
    setSpeed(value);
    setError(null);
    try {
      await updatePreferences({ tts_speed: value });
    } catch (err) {
      setSpeed(prev);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  /** Joue le VRAI échantillon via le moteur TTS du backend — même pipeline
   * que le mode vocal, pas un extrait préenregistré. */
  async function playSample(voice: Voice) {
    audioRef.current?.pause();
    if (playing === voice.id) {
      setPlaying(null);
      return;
    }
    setLoadingSample(voice.id);
    setError(null);
    try {
      const { audio_base64, mime_type } = await synthesizeSpeech(voice.sample, voice.id);
      const audio = new Audio(`data:${mime_type};base64,${audio_base64}`);
      audioRef.current = audio;
      setPlaying(voice.id);
      audio.onended = () => setPlaying(null);
      audio.onerror = () => setPlaying(null);
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Écoute impossible pour le moment");
      setPlaying(null);
    } finally {
      setLoadingSample(null);
    }
  }

  if (loading) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-[var(--card)]" aria-hidden="true" />;
  }

  const langs = [...new Set(voices.map((v) => v.lang))];

  return (
    <div>
      <Panel title="Vitesse de lecture">
        <Row label="Vitesse" description="Rythme de la voix en mode vocal.">
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

      {langs.map((lang) => (
        <Panel key={lang} title={LANG_LABEL[lang] ?? lang.toUpperCase()}>
          {voices
            .filter((v) => v.lang === lang)
            .map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3.5 first:border-t-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => playSample(v)}
                    disabled={loadingSample !== null && loadingSample !== v.id}
                    aria-label={`Écouter ${v.label}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--primary)] transition hover:border-[var(--primary)] disabled:opacity-40"
                  >
                    {loadingSample === v.id ? (
                      <span
                        className="h-3 w-3 animate-pulse rounded-full"
                        style={{ background: "var(--primary)" }}
                      />
                    ) : playing === v.id ? (
                      <PauseIcon />
                    ) : (
                      <PlayIcon />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{v.label}</span>
                      {v.recommended && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                            color: "var(--primary-light)",
                          }}
                        >
                          Recommandée
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[var(--text-tertiary)]">{v.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => pick(v.id)}
                  aria-label={`Choisir ${v.label}`}
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition"
                  style={{ borderColor: selected === v.id ? "var(--primary)" : "var(--border)" }}
                >
                  {selected === v.id && (
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--primary)" }} />
                  )}
                </button>
              </div>
            ))}
        </Panel>
      ))}

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}
