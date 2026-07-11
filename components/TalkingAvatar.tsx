"use client";

import { useEffect, useRef, useState } from "react";

export type AvatarPhase = "idle" | "listening" | "processing" | "speaking" | "error";

/**
 * Avatar animé « maison » — visage SVG dont la bouche est synchronisée en
 * temps réel sur l'amplitude audio (lip-sync réel, pas une animation
 * aléatoire), avec clignement des yeux, micro-mouvements de tête et respiration.
 *
 * `amplitude` (0→1) est fourni par l'appelant à chaque frame :
 *  - en écoute : niveau du micro (l'avatar « penche l'oreille ») ;
 *  - en parole : amplitude du flux TTS analysé (bouche synchronisée).
 *
 * Pas de dépendance externe, pas de service payant, thème-aware.
 */
export function TalkingAvatar({
  phase,
  amplitude,
}: {
  phase: AvatarPhase;
  amplitude: number;
}) {
  // Lissage de l'amplitude : évite les à-coups de bouche entre deux frames.
  const [smooth, setSmooth] = useState(0);
  // Phase de balancement de tête, avancée dans la boucle rAF (jamais Date.now()
  // pendant le rendu — sinon désynchro serveur/client à l'hydratation).
  const [bobPhase, setBobPhase] = useState(0);
  const smoothRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const speakingRef = useRef(false);

  useEffect(() => {
    targetRef.current = phase === "speaking" || phase === "listening" ? amplitude : 0;
    speakingRef.current = phase === "speaking";
  }, [amplitude, phase]);

  useEffect(() => {
    let bob = 0;
    function tick() {
      // Attaque rapide (la bouche s'ouvre vite), relâchement plus doux.
      const t = targetRef.current;
      const cur = smoothRef.current;
      const k = t > cur ? 0.55 : 0.25;
      smoothRef.current = cur + (t - cur) * k;
      setSmooth(smoothRef.current);
      bob += 0.08;
      setBobPhase(bob);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Clignement périodique + micro-mouvement de tête (indépendants de l'audio).
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let alive = true;
    function scheduleBlink() {
      const delay = 2200 + Math.random() * 2600;
      return setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        timer = scheduleBlink();
      }, delay);
    }
    let timer = scheduleBlink();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // Ouverture de bouche : en parole surtout, très légère en écoute.
  const speaking = phase === "speaking";
  const mouthOpen = speaking ? Math.min(smooth, 1) : phase === "listening" ? smooth * 0.12 : 0;

  // Géométrie de la bouche (ellipse) : hauteur pilotée par l'ouverture,
  // largeur qui se resserre légèrement quand la bouche s'ouvre (plus naturel).
  const mouthH = 3 + mouthOpen * 26;
  const mouthW = 34 - mouthOpen * 8;

  // États visuels par phase.
  const eyeOpen = blink ? 0.12 : phase === "processing" ? 0.55 : 1;
  const headBob = speaking ? Math.sin(bobPhase) * (1.2 + mouthOpen * 2) : 0;
  const glow =
    phase === "speaking"
      ? "var(--primary)"
      : phase === "listening"
        ? "var(--thinking, #d9a441)"
        : phase === "error"
          ? "var(--error)"
          : "var(--primary)";

  return (
    <div className="relative flex items-center justify-center">
      {/* Halo réactif */}
      <div
        aria-hidden="true"
        className="absolute rounded-full blur-2xl transition-opacity duration-300"
        style={{
          width: 260,
          height: 260,
          background: glow,
          opacity: 0.18 + (speaking ? mouthOpen * 0.4 : phase === "listening" ? smooth * 0.3 : 0.05),
          transform: `scale(${1 + (speaking ? mouthOpen * 0.15 : 0)})`,
        }}
      />
      <svg
        viewBox="0 0 240 240"
        width="240"
        height="240"
        role="img"
        aria-label="Avatar Toumaï AI"
        style={{ transform: `translateY(${headBob}px)`, transition: "transform 0.05s linear" }}
      >
        <defs>
          <radialGradient id="faceGrad" cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#3a2419" />
            <stop offset="55%" stopColor="#2a1a12" />
            <stop offset="100%" stopColor="#1c110b" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--thinking, #d9a441)" />
          </linearGradient>
        </defs>

        {/* Anneau externe */}
        <circle cx="120" cy="120" r="108" fill="none" stroke="url(#ringGrad)" strokeWidth="3" opacity="0.5" />

        {/* Tête */}
        <circle cx="120" cy="120" r="94" fill="url(#faceGrad)" />

        {/* Sourcils — se lèvent légèrement en parole */}
        <g stroke="#e8c9a8" strokeWidth="4" strokeLinecap="round" opacity="0.85">
          <line x1="80" y1={100 - mouthOpen * 3} x2="104" y2={96 - mouthOpen * 3} />
          <line x1="136" y1={96 - mouthOpen * 3} x2="160" y2={100 - mouthOpen * 3} />
        </g>

        {/* Yeux — clignent, se ferment un peu en réflexion */}
        <g fill="#f3e3d0">
          <ellipse cx="92" cy="116" rx="11" ry={11 * eyeOpen} />
          <ellipse cx="148" cy="116" rx="11" ry={11 * eyeOpen} />
        </g>
        {eyeOpen > 0.4 && (
          <g fill="#1c110b">
            <circle cx="94" cy="117" r="4.5" />
            <circle cx="150" cy="117" r="4.5" />
          </g>
        )}

        {/* Nez */}
        <path d="M118 128 q -4 10 -1 16" fill="none" stroke="#e8c9a8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />

        {/* Bouche — lip-sync : ellipse dont la hauteur suit l'amplitude */}
        <ellipse
          cx="120"
          cy="168"
          rx={mouthW / 2}
          ry={mouthH / 2}
          fill="#3a1512"
          stroke="#e8956f"
          strokeWidth="2.5"
        />
        {/* Lèvre inférieure éclairée quand la bouche s'ouvre */}
        {mouthOpen > 0.15 && (
          <ellipse cx="120" cy={168 + mouthH / 4} rx={mouthW / 2.6} ry={mouthH / 6} fill="#7a2f26" opacity="0.7" />
        )}
      </svg>
    </div>
  );
}
