"use client";

import { useEffect, useRef, useState } from "react";

/** Analyse l'amplitude du micro en direct pendant que `active` est vrai —
 * flux getUserMedia séparé de celui de SpeechRecognition (qui gère sa
 * propre capture en interne), donc pas de conflit avec la dictée. */
export function useMicLevels(active: boolean, bars = 5): number[] {
  const [levels, setLevels] = useState<number[]>(() => Array(bars).fill(0.08));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setLevels(Array(bars).fill(0.08));
      return;
    }
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const chunk = Math.floor(data.length / bars);
          const next: number[] = [];
          for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = i * chunk; j < (i + 1) * chunk; j++) sum += data[j];
            const avg = sum / chunk / 255;
            next.push(Math.max(0.08, Math.min(1, avg * 1.8)));
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Micro indisponible pour la visualisation — la dictée elle-même
        // (SpeechRecognition) continue de fonctionner indépendamment.
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [active, bars]);

  return levels;
}

export function Waveform({
  active,
  bars = 5,
  height = 16,
  color = "currentColor",
}: {
  active: boolean;
  bars?: number;
  height?: number;
  color?: string;
}) {
  const levels = useMicLevels(active, bars);
  return (
    <div className="flex items-center gap-[3px]" style={{ height }} aria-hidden="true">
      {levels.map((lvl, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full transition-[height] duration-75"
          style={{ height: `${Math.max(3, lvl * height)}px`, background: color }}
        />
      ))}
    </div>
  );
}
