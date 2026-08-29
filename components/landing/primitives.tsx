"use client";

/**
 * Briques communes de la page d'accueil.
 *
 * Trois principes tenus dans tout le dossier `landing/` :
 *
 * 1. UN SEUL OBSERVATEUR pour toutes les apparitions au défilement. Poser un
 *    `IntersectionObserver` par carte, c'est cinquante observateurs sur une
 *    page qui en descend deux mille pixels. Ici, un observateur unique surveille
 *    tout `[data-reveal]`, et se retire de chaque élément une fois révélé.
 *
 * 2. LE TEXTE QUI SE CONSTRUIT EST DU CSS, PAS DU REACT. Un effet de frappe
 *    piloté par `setState` re-rend le composant à chaque caractère — sur un
 *    téléphone d'entrée de gamme, la page se met à saccader pendant qu'on
 *    prétend montrer de la fluidité. Les mots portent un délai d'animation et
 *    arrivent seuls.
 *
 * 3. RIEN NE TOURNE HORS DE L'ÉCRAN. Les démonstrations reçoivent la classe
 *    `tm-paused` dès qu'elles sortent du champ, et leurs minuteries s'arrêtent.
 */

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

/* ── Apparitions au défilement ───────────────────────────────────────────── */

/**
 * Monté une fois par page. Il fait deux choses, avec deux observateurs et pas
 * un de plus :
 *
 * 1. Il révèle tout `[data-reveal]` qui entre dans le champ, puis cesse de le
 *    surveiller.
 * 2. Il ARRÊTE les animations des sections qu'on ne voit pas. Sur une page de
 *    neuf mille pixels, une quarantaine d'animations tournent en permanence si
 *    on ne fait rien — halos qui respirent, ondes, ruban des langues, anneau
 *    des connecteurs. Le lecteur n'en voit jamais plus de six à la fois ; les
 *    trente-quatre autres ne coûtent que de la batterie.
 */
export function RevealRoot() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (els.length === 0) return;

    // Sans IntersectionObserver (navigateurs anciens) : tout est visible
    // immédiatement. Une page lisible vaut mieux qu'une page vide.
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.setAttribute("data-in", ""));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }
      },
      // La marge basse déclenche un peu AVANT l'entrée réelle : l'élément a
      // fini son apparition au moment où l'œil l'atteint, au lieu de démarrer
      // sous ses yeux.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.06 },
    );

    els.forEach((el) => io.observe(el));

    // Filet de sécurité : ce qui est déjà à l'écran au chargement (le hero)
    // ne doit pas attendre un événement de défilement qui ne viendra peut-être
    // jamais sur une page ouverte puis laissée telle quelle.
    const t = window.setTimeout(() => {
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.setAttribute("data-in", "");
        }
      });
    }, 120);

    return () => {
      window.clearTimeout(t);
      io.disconnect();
    };
  }, []);

  /* Porte d'animation : `tm-paused` sur chaque section hors champ. */
  useEffect(() => {
    const zones = Array.from(
      document.querySelectorAll<HTMLElement>(".tm section, .tm footer, .tm [data-anim]"),
    );
    if (zones.length === 0 || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle("tm-paused", !e.isIntersecting);
        }
      },
      // Une marge d'un écran de part et d'autre : l'animation a repris son
      // rythme avant que la section n'arrive, jamais un démarrage à froid
      // sous les yeux du lecteur.
      { rootMargin: "100% 0px 100% 0px", threshold: 0 },
    );
    zones.forEach((z) => io.observe(z));
    return () => io.disconnect();
  }, []);

  return null;
}

/** `true` dès que l'élément entre dans le champ, et le reste ensuite.
 *  Sert à ne démarrer une démonstration que quand elle est regardée. */
export function useInView<T extends HTMLElement>(margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Navigateur sans IntersectionObserver : on tient l'élément pour visible,
      // sinon la démonstration resterait figée pour toujours. Le changement est
      // différé d'un tour de boucle : enchaîner deux rendus dans le corps d'un
      // effet est exactement ce qu'il faut éviter.
      const t = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: margin, threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);

  return { ref, inView };
}

/** Préférence système « moins d'animations ». Les démonstrations s'y plient :
 *  elles montrent leur état final au lieu de le jouer. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/* ── Texte qui se construit ──────────────────────────────────────────────── */

/**
 * Écrit un texte mot à mot, en CSS pur.
 *
 * `still` rend le texte d'un bloc : c'est ce que reçoivent les personnes qui
 * ont demandé moins d'animations, et c'est aussi l'état de repli si la scène
 * est déjà passée.
 */
export function Streamed({
  text,
  delay = 0,
  speed = 42,
  still = false,
  className = "",
  caret = false,
  lang,
  dir,
}: {
  text: string;
  /** Attente avant le premier mot, en millisecondes. */
  delay?: number;
  /** Écart entre deux mots, en millisecondes. */
  speed?: number;
  still?: boolean;
  className?: string;
  caret?: boolean;
  lang?: string;
  dir?: "rtl" | "ltr";
}) {
  const words = text.split(" ");

  if (still) {
    return (
      <span className={className} lang={lang} dir={dir}>
        {text}
      </span>
    );
  }

  return (
    <span className={className} lang={lang} dir={dir}>
      {words.map((w, i) => (
        /* L'ESPACE EST UN VRAI NŒUD DE TEXTE, PAS UNE MARGE.
         *
         * Chaque mot est un `inline-block` pour pouvoir être animé. Collés les
         * uns aux autres, ils formaient un seul mot pour qui copie la phrase ou
         * l'écoute avec un lecteur d'écran : « C'estlaformulationduquotidien ».
         * Une marge gauche corrigeait l'apparence sans corriger le texte. Un
         * espace réel, lui, se copie, se lit à voix haute, et coupe les lignes
         * au bon endroit. */
        <Fragment key={`${w}-${i}`}>
          <span
            className="tm-word"
            style={
              {
                "--i": i,
                "--tm-t": `${delay}ms`,
                animationDelay: `calc(${delay}ms + ${i * speed}ms)`,
              } as React.CSSProperties
            }
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      {caret && (
        <span
          className="tm-caret"
          style={{ animationDelay: `${delay + words.length * speed}ms` }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}

/* ── Petits éléments partagés ────────────────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="tm-eyebrow">{children}</p>;
}

/** Points de réflexion — « Toumaï AI réfléchit ». */
export function Thinking({ label = "Toumaï AI réfléchit" }: { label?: string }) {
  return (
    <span
      className="tm-think inline-flex items-center gap-[3px]"
      style={{ color: "var(--tm-ink-3)" }}
      aria-label={label}
    >
      <span />
      <span />
      <span />
    </span>
  );
}

/** Amplitude vocale. Les hauteurs et vitesses sont fixes et volontairement
 *  irrégulières : une courbe régulière ressemble à un égaliseur de démo, pas
 *  à une voix. */
const WAVE = [
  [0.42, 780], [0.86, 640], [0.3, 900], [1, 560], [0.58, 720], [0.24, 980],
  [0.74, 600], [0.44, 860], [0.96, 540], [0.34, 940], [0.66, 700], [0.5, 820],
  [0.9, 580], [0.28, 960], [0.7, 660], [0.4, 880], [0.82, 620], [0.32, 1000],
] as const;

export function Waveform({
  bars = 18,
  height = 34,
  className = "",
}: {
  bars?: number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-[3px] ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, i) => {
        const [amp, dur] = WAVE[i % WAVE.length];
        return (
          <span
            key={i}
            className="tm-wave-bar"
            style={
              {
                "--d": `${dur}ms`,
                "--dl": `${(i * 73) % 620}ms`,
                height: `${Math.round(amp * 100)}%`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/* ── Icônes (trait 1,6 px, jamais d'emoji) ───────────────────────────────── */

function Ico({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export const Icons = {
  chat: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 20.5l1.6-4.4A8.4 8.4 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
    </Ico>
  ),
  globe: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
    </Ico>
  ),
  image: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 4.6-4.6a2 2 0 0 1 2.8 0L20 21" />
    </Ico>
  ),
  doc: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Ico>
  ),
  code: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="m9 17-5-5 5-5M15 7l5 5-5 5" />
    </Ico>
  ),
  mic: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" />
    </Ico>
  ),
  agent: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <rect x="2.5" y="4" width="19" height="15" rx="2.5" />
      <path d="M2.5 8.5h19M6 6.2h.01M8.6 6.2h.01" />
    </Ico>
  ),
  plug: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M9 2.5v6M15 2.5v6M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0ZM12 17v4.5" />
    </Ico>
  ),
  shield: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M12 2.8 4.5 6v6c0 4.5 3.1 8.2 7.5 9.3 4.4-1.1 7.5-4.8 7.5-9.3V6Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Ico>
  ),
  spark: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M12 2.8 13.9 9l6.1 1.9-6.1 1.9L12 19l-1.9-6.2L4 10.9 10.1 9Z" />
    </Ico>
  ),
  phone: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.8 18.6h2.4" />
    </Ico>
  ),
  arrow: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M4.5 12h15M13 5.5 19.5 12 13 18.5" />
    </Ico>
  ),
  bolt: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12Z" />
    </Ico>
  ),
  brain: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="M9.5 3.5a2.8 2.8 0 0 0-2.8 2.8 2.8 2.8 0 0 0-1.4 5.2A2.9 2.9 0 0 0 6.8 17a2.8 2.8 0 0 0 5.2 1.5V4.9a2.8 2.8 0 0 0-2.5-1.4Z" />
      <path d="M14.5 3.5a2.8 2.8 0 0 1 2.8 2.8 2.8 2.8 0 0 1 1.4 5.2 2.9 2.9 0 0 1-1.5 5.5 2.8 2.8 0 0 1-5.2 1.5" />
    </Ico>
  ),
  search: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Ico>
  ),
  check: (p?: { size?: number }) => (
    <Ico size={p?.size}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Ico>
  ),
};
