"use client";

/**
 * POURQUOI TOUMAÏ AI — la section qui doit se ressentir, pas se lire.
 *
 * Quatre raisons, quatre formes différentes, quatre largeurs différentes.
 * Une grille de huit cartes identiques dit « voici une liste » ; une
 * composition asymétrique dit « voici ce qui compte, dans cet ordre ».
 *
 * Aucune de ces raisons n'avance un chiffre. Ce sont des faits de produit —
 * ce que Toumaï AI fait, où il tourne, ce qu'il ne fait pas de vos données —
 * et chacun est vérifiable dans l'application ou dans les pages légales.
 */

import Link from "next/link";
import { Icons, Waveform } from "./primitives";
import { useLang } from "@/lib/i18n/context";

/* ── Bandeau des langues ─────────────────────────────────────────────────── */

const PHRASES = [
  { t: "Bonjour", s: "français" },
  { t: "مرحبا", s: "arabe", rtl: true },
  { t: "Hello", s: "english" },
  { t: "إنت كيف؟", s: "arabe tchadien", rtl: true, hot: true },
  { t: "Comment ça va ?", s: "français" },
  { t: "ما في مشكلة", s: "arabe tchadien", rtl: true, hot: true },
  { t: "How can I help?", s: "english" },
  { t: "كيف حالك؟", s: "arabe littéraire", rtl: true },
];

/**
 * Transition entre le hero et le récit. Le ruban défile très lentement et se
 * met en pause au survol — ce qui passe doit pouvoir être lu, pas seulement
 * aperçu. Il est purement décoratif : le contenu réel de cette promesse est
 * démontré dans la vitrine, en dessous.
 */
export function LangMarquee() {
  const track = [...PHRASES, ...PHRASES];
  return (
    <div
      className="tm-marquee relative overflow-hidden border-y py-5"
      style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface)" }}
      // `data-anim` : ce ruban n'est pas une <section>, la porte d'animation
      // ne le trouverait pas autrement.
      data-anim
      aria-hidden="true"
    >
      <div className="tm-marquee-track" style={{ "--dur": "68s" } as React.CSSProperties}>
        {track.map((p, i) => (
          <span key={i} className="flex shrink-0 items-baseline gap-2.5 px-6 sm:px-9">
            <span
              dir={p.rtl ? "rtl" : undefined}
              lang={p.rtl ? "ar" : undefined}
              className="tm-display text-[clamp(1.15rem,2.3vw,1.6rem)]"
              style={{ color: p.hot ? "var(--tm-amber)" : "var(--tm-ink-3)" }}
            >
              {p.t}
            </span>
            <span className="tm-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: "var(--tm-ink-4)" }}>
              {p.s}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Pourquoi ────────────────────────────────────────────────────────────── */

export function Why() {
  const { t } = useLang();
  return (
    <section id="pourquoi" className="tm-section scroll-mt-24">
      <div className="tm-strata" aria-hidden="true" />

      <div className="tm-wrap">
        <header data-reveal className="max-w-3xl">
          <p className="tm-eyebrow">{t.why.eyebrow}</p>
          <h2 className="tm-display tm-h2 mt-4">
            {t.why.titleA}{" "}
            <em className="tm-em">{t.why.titleEm}</em>
          </h2>
          <p className="tm-lead mt-4 max-w-[54ch]">
            {t.why.lead}
          </p>
        </header>

        {/* Grille asymétrique : 7/5 puis 5/7. Deux rythmes, jamais le même
         * découpage deux fois de suite. */}
        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-12 lg:gap-5">
          <Reason
            n="01"
            title={t.why.r1.title}
            body={t.why.r1.body}
            className="lg:col-span-7"
            reveal="left"
          >
            <LatticeArt />
          </Reason>

          <Reason
            n="02"
            title={t.why.r2.title}
            body={t.why.r2.body}
            className="lg:col-span-5"
            reveal="right"
          >
            <div className="mt-5 space-y-2.5">
              {t.why.r2.rows.map((x) => (
                <div key={x.l} className="flex items-baseline justify-between gap-3">
                  <span
                    dir={x.rtl ? "rtl" : undefined}
                    lang={x.rtl ? "ar" : undefined}
                    className="tm-display text-[1.35rem]"
                    style={{ color: x.hot ? "var(--tm-amber)" : "var(--tm-ink)" }}
                  >
                    {x.w}
                  </span>
                  <span className="tm-mono text-[9.5px] uppercase tracking-wider" style={{ color: "var(--tm-ink-4)" }}>
                    {x.l}
                  </span>
                </div>
              ))}
            </div>
          </Reason>

          <Reason
            n="03"
            title={t.why.r3.title}
            body={t.why.r3.body}
            className="lg:col-span-5"
            reveal="left"
          >
            <div className="mt-5 flex items-end gap-3">
              {[
                <Icons.image key="i" size={17} />,
                <Icons.doc key="d" size={17} />,
                <Icons.mic key="m" size={17} />,
                <Icons.chat key="c" size={17} />,
              ]
                .map((icon, idx) => ({ icon, l: t.why.r3.modes[idx] }))
                .map((m, i) => (
                <div key={m.l} className="flex-1 text-center">
                  <span
                    className="tm-float mx-auto grid h-11 w-full max-w-[54px] place-items-center rounded-xl"
                    style={{
                      background: "var(--tm-surface-2)",
                      border: "1px solid var(--tm-line)",
                      color: "var(--tm-terra-2)",
                      animationDelay: `${i * 900}ms`,
                      animationDuration: "9s",
                    }}
                    aria-hidden="true"
                  >
                    {m.icon}
                  </span>
                  <span className="mt-2 block text-[11px]" style={{ color: "var(--tm-ink-4)" }}>
                    {m.l}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Waveform bars={16} height={22} />
            </div>
          </Reason>

          <Reason
            n="04"
            title={t.why.r4.title}
            body={t.why.r4.body}
            className="lg:col-span-7"
            reveal="right"
          >
            <div className="mt-5 flex flex-wrap gap-2">
              {t.why.r4.chips.map((puce) => (
                <span key={puce} className="tm-chip">
                  {puce}
                </span>
              ))}
            </div>
          </Reason>
        </div>

        {/* Bande de confiance — deux engagements, en très grand, sans carte. */}
        <div
          data-reveal
          className="mt-4 grid gap-4 rounded-[var(--tm-radius-lg)] border p-7 sm:p-10 lg:mt-5 lg:grid-cols-2 lg:gap-12"
          style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface)" }}
        >
          <div>
            <p className="tm-display text-[clamp(1.6rem,3.2vw,2.3rem)]">
              {t.why.freeA} <em className="tm-em">{t.why.freeEm}</em>
            </p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--tm-ink-3)" }}>
              {t.why.freeBody}
            </p>
          </div>
          <div>
            <p className="tm-display text-[clamp(1.6rem,3.2vw,2.3rem)]">
              {t.why.privacyA}{" "}
              <em className="tm-em">{t.why.privacyEm}</em>
            </p>
            <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: "var(--tm-ink-3)" }}>
              {t.why.privacyBody}{" "}
              <Link href="/privacy" className="tm-link text-[13.5px]">
                {t.why.privacyLink}
              </Link>
            </p>
          </div>
        </div>

        {/* L'invitation se place ICI, juste après les deux engagements — c'est
         * le moment où le doute vient d'être levé. La répéter plus tôt aurait
         * demandé de faire confiance avant d'avoir de quoi. */}
        <div data-reveal className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/chat" className="tm-btn tm-btn-primary" data-cta="why">
            {t.why.ctaLabel}
            <span className="tm-arrow" aria-hidden="true">
              <Icons.arrow size={17} />
            </span>
          </Link>
          <span className="text-[13px]" style={{ color: "var(--tm-ink-4)" }}>
            {t.why.ctaNote}
          </span>
        </div>
      </div>
    </section>
  );
}

function Reason({
  n,
  title,
  body,
  className = "",
  children,
  reveal = "up",
}: {
  n: string;
  title: string;
  body: string;
  className?: string;
  children?: React.ReactNode;
  reveal?: "up" | "left" | "right";
}) {
  return (
    <article
      data-reveal={reveal === "up" ? "" : reveal}
      className={`tm-card tm-card-hover tm-lit relative overflow-hidden p-6 sm:p-7 ${className}`}
    >
      <span
        className="tm-display absolute right-5 top-4 text-[2.6rem] leading-none"
        style={{ color: "var(--tm-ink)", opacity: 0.07 }}
        aria-hidden="true"
      >
        {n}
      </span>
      <h3 className="tm-display max-w-[24ch] text-[clamp(1.15rem,2vw,1.45rem)] leading-tight">
        {title}
      </h3>
      <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed" style={{ color: "var(--tm-ink-3)" }}>
        {body}
      </p>
      {children}
    </article>
  );
}

/**
 * Motif sahélien — losanges de claustra, dessinés en SVG et tracés au
 * défilement. Le rendu est celui d'une architecture, pas d'un motif de fond
 * d'écran : rien n'est répété jusqu'aux bords, la trame s'éteint en s'éloignant
 * du centre.
 */
function LatticeArt() {
  const cells: React.ReactElement[] = [];
  const cols = 9;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 20 + c * 34;
      const y = 24 + r * 34;
      const i = r * cols + c;
      cells.push(
        <g key={`${r}-${c}`} style={{ opacity: 0.9 - Math.abs(c - 4) * 0.12 }}>
          <path
            d={`M${x} ${y - 15} L${x + 15} ${y} L${x} ${y + 15} L${x - 15} ${y} Z`}
            fill="none"
            stroke="var(--tm-line-2)"
            strokeWidth="1"
          />
          {(i * 7) % 5 === 0 && <circle cx={x} cy={y} r="2.4" fill="var(--tm-terra)" opacity="0.55" />}
        </g>,
      );
    }
  }
  return (
    <div className="mt-6 overflow-hidden rounded-xl" aria-hidden="true">
      <svg viewBox="0 0 320 128" className="h-[110px] w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="tm-lattice-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="0.3" stopColor="#000" stopOpacity="1" />
            <stop offset="0.75" stopColor="#000" stopOpacity="1" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </linearGradient>
          <mask id="tm-lattice-mask">
            <rect width="320" height="128" fill="url(#tm-lattice-fade)" />
          </mask>
        </defs>
        <g mask="url(#tm-lattice-mask)">{cells}</g>
      </svg>
    </div>
  );
}
