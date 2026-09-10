"use client";

import { useEffect, useId, useRef } from "react";

const CYCLE = 1400;
const IDLE = 1800;
const THINK = 5600;
const DONE = 1200;
const TOTAL = IDLE + THINK + DONE;

const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

function mkRibbon(t: number, amplitude: number) {
  const s = Math.sin(t * Math.PI * 2);
  const c = Math.cos(t * Math.PI * 2);

  const topL = 55 + c * amplitude * 6;
  const cp1y = 33 + s * amplitude * 13;
  const cp2y = 25 + c * amplitude * 9;
  const topR = 27 + c * amplitude * 6;
  const rh = 34;
  const bcp2 = 60 + s * amplitude * 8;
  const bcp1 = 81 + c * amplitude * 11;
  const foldB = 112 + s * amplitude * 18;
  const foldT = 97 + s * amplitude * 11;

  return [
    `M 15,${topL}`,
    `C 76,${cp1y} 210,${cp2y} 360,${topR}`,
    `L 490,${topR}`,
    `L 490,${topR + rh}`,
    `C 360,${bcp2} 196,${bcp1} 45,${foldB}`,
    `C 30,${foldB + 5} 15,${foldT + 7} 15,${foldT}`,
    `C 14,${foldT - 5} 14,${topL + 9} 15,${topL}`,
    "Z",
  ].join(" ");
}

function mkFold(t: number, amplitude: number) {
  const s = Math.sin(t * Math.PI * 2);
  const foldB = 112 + s * amplitude * 18;
  const foldT = 97 + s * amplitude * 11;

  return [
    `M 18,${foldT + 4}`,
    `C 24,${foldT + 14} 36,${foldB - 6} 50,${foldB - 10}`,
    `C 36,${foldB - 4} 22,${foldT + 18} 18,${foldT + 4}`,
    "Z",
  ].join(" ");
}

function mkProfile(t: number, amplitude: number) {
  const s = Math.sin(t * Math.PI * 2 + 1.1);
  const scale = 1 + s * amplitude * 0.013;
  const cy = 282;
  const y = (value: number) => +(cy + (value - cy) * scale).toFixed(2);

  return [
    `M 180,${y(490)} L 180,${y(86)}`,
    `C 200,${y(84)} 232,${y(78)} 262,${y(77)}`,
    `C 275,${y(76)} 286,${y(79)} 294,${y(86)}`,
    `C 304,${y(93)} 310,${y(105)} 311,${y(118)}`,
    `C 312,${y(131)} 309,${y(144)} 304,${y(155)}`,
    `C 300,${y(165)} 299,${y(175)} 304,${y(183)}`,
    `C 309,${y(191)} 318,${y(198)} 321,${y(207)}`,
    `C 323,${y(215)} 319,${y(225)} 311,${y(231)}`,
    `C 304,${y(237)} 297,${y(241)} 297,${y(247)}`,
    `C 297,${y(253)} 300,${y(259)} 297,${y(266)}`,
    `C 294,${y(272)} 288,${y(278)} 280,${y(284)}`,
    `C 272,${y(289)} 262,${y(294)} 256,${y(299)}`,
    `C 248,${y(305)} 240,${y(314)} 236,${y(326)}`,
    `C 232,${y(338)} 228,${y(355)} 226,${y(373)}`,
    `L 226,${y(490)}`,
    "Z",
  ].join(" ");
}

export function ToumaiLogoMotion() {
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ribbonRef = useRef<SVGPathElement>(null);
  const profileRef = useRef<SVGPathElement>(null);
  const foldRef = useRef<SVGPathElement>(null);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = (time: number) => {
      if (!startRef.current) startRef.current = time;
      const elapsed = time - startRef.current;
      const cycle = elapsed % TOTAL;
      let amplitude = 0.038;
      let phase = 0;

      if (cycle < IDLE) {
        amplitude = 0.038;
        phase = (elapsed % 4200) / 4200;
      } else if (cycle < IDLE + THINK) {
        const progress = (cycle - IDLE) / THINK;
        const ramp =
          ease(Math.min(1, progress / 0.1)) *
          (1 - ease(Math.max(0, (progress - 0.9) / 0.1)));
        amplitude = 0.038 + ramp * 0.962;
        phase = (elapsed % CYCLE) / CYCLE;
      } else {
        const progress = (cycle - IDLE - THINK) / DONE;
        amplitude = (1 - ease(progress)) * 0.38;
        phase = (elapsed % CYCLE) / CYCLE;
      }

      ribbonRef.current?.setAttribute("d", mkRibbon(phase, amplitude));
      profileRef.current?.setAttribute("d", mkProfile(phase, amplitude));
      foldRef.current?.setAttribute("d", mkFold(phase, amplitude));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const ribbonGradient = `toumai-ribbon-${uid}`;
  const foldGradient = `toumai-fold-${uid}`;
  const profileGradient = `toumai-profile-${uid}`;

  return (
    <svg
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Toumaï AI"
      role="img"
      style={{
        width: "100%",
        maxWidth: "460px",
        height: "auto",
        display: "block",
        filter:
          "drop-shadow(0 0 18px rgba(255,168,107,.34)) drop-shadow(0 0 64px rgba(240,91,47,.14))",
      }}
    >
      <defs>
        <linearGradient id={ribbonGradient} x1="0" y1="0" x2="500" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D99012" />
          <stop offset="22%" stopColor="#C86030" />
          <stop offset="62%" stopColor="#2138A8" />
          <stop offset="100%" stopColor="#0E1898" />
        </linearGradient>

        <linearGradient id={foldGradient} x1="15" y1="0" x2="55" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#90500A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#90500A" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={profileGradient} x1="0" y1="77" x2="0" y2="490" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D99012" />
          <stop offset="38%" stopColor="#E06220" />
          <stop offset="72%" stopColor="#CB2018" />
          <stop offset="100%" stopColor="#B81414" />
        </linearGradient>
      </defs>

      <path ref={profileRef} d={mkProfile(0, 0.038)} fill={`url(#${profileGradient})`} />
      <path ref={ribbonRef} d={mkRibbon(0, 0.038)} fill={`url(#${ribbonGradient})`} />
      <path ref={foldRef} d={mkFold(0, 0.038)} fill={`url(#${foldGradient})`} />
    </svg>
  );
}
