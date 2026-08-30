"use client";

/**
 * L'INTELLIGENCE DERRIÈRE TOUMAÏ — Sao 4, Toumaï 5, et les moteurs dédiés.
 *
 * CE QUE CETTE SECTION DOIT FAIRE COMPRENDRE
 * -------------------------------------------
 * Qu'il n'y a rien à régler. On écrit, et la demande part vers le moteur qui
 * sait la traiter. C'est une mécanique — donc elle se montre, elle ne se
 * raconte pas : une demande traverse le schéma et allume une branche.
 *
 * LES NOMS SONT CEUX DU PRODUIT
 * ------------------------------
 * Sao, Toumaï, Ennedi, Ouaddaï, Tibesti, Kanem, Chari : le patrimoine tchadien
 * — civilisations, massifs, royaumes, fleuve. Les rôles affichés ici sont ceux
 * de `lib/models.ts`, c'est-à-dire exactement ce que l'application propose.
 * Aucun score, aucun classement, aucune comparaison : rien de tout cela n'est
 * démontré, donc rien de tout cela n'est écrit.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icons, useInView, useReducedMotion } from "./primitives";
import { useLang } from "@/lib/i18n/context";

/* Les sept moteurs, dans l'ordre où ils apparaissent sur le schéma. */
/* Les NOMS ne se traduisent pas — Sao, Ennedi, Ouaddaï, Tibesti, Kanem, Chari
 * sont des noms propres tchadiens : une civilisation, trois massifs, un
 * royaume, un fleuve. Seul le RÔLE change de langue. */
const ENGINES = [
  { key: "sao", name: "Sao 4", color: "var(--tm-terra)" },
  { key: "toumai", name: "Toumaï 5", color: "var(--tm-violet)" },
  { key: "ennedi", name: "Ennedi", color: "#e0559b" },
  { key: "ouaddai", name: "Ouaddaï Pro", color: "var(--tm-amber)" },
  { key: "tibesti", name: "Tibesti Code", color: "var(--tm-indigo)" },
  { key: "kanem", name: "Kanem Flash", color: "#e5941f" },
  { key: "chari", name: "Chari", color: "#2f9e6b" },
] as const;

type EngineKey = (typeof ENGINES)[number]["key"];

/* L'AIGUILLAGE est de la logique, pas du texte : quelle famille de demande
 * part vers quel moteur. Il reste donc ici, dans l'ordre du dictionnaire. */
const ROUTES: EngineKey[] = ["sao", "ennedi", "ouaddai", "tibesti", "toumai", "kanem", "chari"];

const STEP_MS = 3400;

export function Intelligence() {
  const { t } = useLang();
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -25% 0px");
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const timer = window.setTimeout(() => setI((v) => (v + 1) % ROUTES.length), STEP_MS);
    return () => window.clearTimeout(timer);
  }, [i, inView, reduced]);

  const req = t.intelligence.requests[i];
  const target = ENGINES.findIndex((e) => e.key === ROUTES[i]);

  return (
    <section id="modeles" className="tm-section scroll-mt-24" ref={ref}>
      <span
        className="tm-glow"
        aria-hidden="true"
        style={{
          right: "-8%",
          top: "12%",
          width: "48vw",
          height: "48vw",
          maxWidth: 640,
          maxHeight: 640,
          opacity: 0.28,
          background: "radial-gradient(circle, color-mix(in srgb, var(--tm-violet) 34%, transparent), transparent 68%)",
        }}
      />

      <div className="tm-wrap">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-12">
        <header data-reveal className="max-w-2xl">
          <p className="tm-eyebrow">{t.intelligence.eyebrow}</p>
          <h2 className="tm-display tm-h2 mt-4">
            {t.intelligence.titleA}{" "}
            <em className="tm-em">{t.intelligence.titleEm}</em>
          </h2>
          <p className="tm-lead mt-4 max-w-[52ch]">
            {t.intelligence.lead}
          </p>
        </header>

        {/* Une lumière entre, plusieurs sortent : l'aiguillage se comprend d'un
         * regard, avant même la phrase qui l'explique. Décoratif — le sens
         * réel est porté par le texte et par la chaîne animée en dessous, qui
         * eux se traduisent. */}
        <div
          data-reveal="scale"
          style={{ "--tm-delay": "120ms" } as React.CSSProperties}
          className="relative order-first lg:order-none"
        >
          {/* Le prisme abstrait cède la place à l'écran vocal réel. Une image
            * de synthèse ne prouve rien d'un produit ; une capture, si — et
            * c'est la seule chose que cette colonne avait à faire. */}
          <picture>
            <source
              type="image/avif"
              srcSet="/landing/voix-mobile-520.avif 520w, /landing/voix-mobile-760.avif 760w"
              sizes="(min-width: 1024px) 320px, 66vw"
            />
            <img
              src="/landing/voix-mobile-520.webp"
              alt={t.intelligence.shotAlt}
              width={1024}
              height={1536}
              loading="lazy"
              decoding="async"
              // Voir la note dans Why.tsx : les `max-w-[...]` arbitraires ne
              // sont pas generes dans ce projet, le style en ligne est le seul
              // qui prenne. La valeur suit celle de `sizes`.
              className="mx-auto h-auto w-full select-none"
              style={{ maxWidth: 320 }}
            />
          </picture>
        </div>
        </div>

        {/* ── Les deux modèles de tête ── */}
        <div
          data-reveal
          style={{ "--tm-delay": "60ms" } as React.CSSProperties}
          className="mt-10 grid gap-4 lg:mt-14 lg:grid-cols-2 lg:gap-5"
        >
          <FlagshipCard
            badge="S4"
            name="Sao 4"
            tag={t.intelligence.sao.tag}
            desc={t.intelligence.sao.desc}
            points={t.intelligence.sao.points}
            accent="var(--tm-terra)"
            defaultOne
          />
          <FlagshipCard
            badge="T5"
            name="Toumaï 5"
            tag={t.intelligence.toumai.tag}
            desc={t.intelligence.toumai.desc}
            points={t.intelligence.toumai.points}
            accent="var(--tm-violet)"
          />
        </div>

        {/* ── L'aiguillage ── */}
        <div
          data-reveal
          style={{ "--tm-delay": "120ms" } as React.CSSProperties}
          className="tm-card tm-lit mt-4 overflow-hidden p-6 sm:p-8 lg:mt-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-semibold">{t.intelligence.routerTitle}</h3>
            <span className="tm-mono text-[10px] uppercase tracking-wider" style={{ color: "var(--tm-ink-4)" }}>
              {t.intelligence.routerFlow}
            </span>
          </div>

          {/* Chaîne lisible sur tous les écrans : c'est elle qui porte le sens,
           * le schéma en dessous n'est qu'une illustration. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div
              key={`q-${i}`}
              className="tm-stage-in rounded-2xl border px-4 py-3.5"
              style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface-2)" }}
            >
              <span className="tm-mono block text-[9.5px] uppercase tracking-wider" style={{ color: "var(--tm-ink-4)" }}>
                {t.intelligence.yourRequest}
              </span>
              <span className="mt-1 block text-[14px]" style={{ color: "var(--tm-ink)" }}>
                {t.intelligence.requests[i]?.text ?? req.text}
              </span>
            </div>

            <span className="hidden justify-self-center sm:block" style={{ color: "var(--tm-ink-4)" }} aria-hidden="true">
              <Icons.arrow size={18} />
            </span>

            <div
              key={`a-${i}`}
              className="tm-stage-in rounded-2xl border px-4 py-3.5"
              style={{
                borderColor: "var(--tm-accent-line)",
                background: "var(--tm-accent-soft)",
              }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ENGINES[target].color }}
                  aria-hidden="true"
                />
                <span className="text-[14px] font-medium">{ENGINES[target].name}</span>
              </span>
              <span className="mt-1 block text-[12.5px]" style={{ color: "var(--tm-ink-3)" }}>
                {t.intelligence.requests[i]?.out ?? req.out}
              </span>
            </div>
          </div>

          <RoutingDiagram target={target} still={reduced || !inView} />

          <p className="mt-5 text-[12px]" style={{ color: "var(--tm-ink-4)" }}>
            {t.intelligence.foot}{" "}
            <Link href="/models" className="tm-link text-[12px]">
              {t.intelligence.footLink}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Carte de modèle de tête ─────────────────────────────────────────────── */

function FlagshipCard({
  badge,
  name,
  tag,
  desc,
  points,
  accent,
  defaultOne = false,
}: {
  badge: string;
  name: string;
  tag: string;
  desc: string;
  points: string[];
  accent: string;
  defaultOne?: boolean;
}) {
  const { t } = useLang();
  return (
    <article
      className="tm-card tm-card-hover tm-lit relative overflow-hidden p-6 sm:p-8"
      style={{ background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 9%, transparent), transparent 58%), var(--tm-surface)` }}
    >
      {/* Filet de couleur en tête de carte : chaque modèle a sa signature. */}
      <span
        className="tm-model-rule absolute inset-x-0 top-0 h-[2px]"
        style={{ "--tm-model-accent": accent } as React.CSSProperties}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3">
        <span
          className="tm-mono grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[12px] font-bold"
          style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent }}
          aria-hidden="true"
        >
          {badge}
        </span>
        <div className="min-w-0">
          <h3 className="tm-display text-[clamp(1.5rem,3vw,2rem)] leading-none">{name}</h3>
          <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--tm-ink-3)" }}>
            {tag}
          </p>
        </div>
        {defaultOne && (
          <span className="tm-chip ms-auto shrink-0 text-[10px]">{t.intelligence.defaultBadge}</span>
        )}
      </div>

      <p className="mt-5 text-[14px] leading-relaxed" style={{ color: "var(--tm-ink-2)" }}>
        {desc}
      </p>

      <ul className="mt-5 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--tm-ink-3)" }}>
            <span className="mt-[3px] shrink-0" style={{ color: accent }} aria-hidden="true">
              <Icons.check size={14} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ── Le schéma ───────────────────────────────────────────────────────────── */

/**
 * Moyeu à gauche, sept moteurs à droite, une branche allumée à la fois.
 *
 * Le schéma est décoratif au sens strict : tout ce qu'il illustre est déjà
 * écrit juste au-dessus, en texte. Il est donc masqué aux lecteurs d'écran,
 * qui n'ont pas à parcourir sept chemins SVG pour apprendre ce qu'une phrase
 * leur a déjà dit.
 */
function RoutingDiagram({ target, still }: { target: number; still: boolean }) {
  const { t, dir } = useLang();
  const H = 300;
  const W = 1000;
  const rows = ENGINES.length;
  const gap = H / rows;
  const y = (i: number) => gap / 2 + i * gap;

  /* LE SCHÉMA SE RETOURNE AVEC LA LANGUE.
   *
   * En arabe, un flux qui part de la gauche se lit à contresens : le moyeu
   * doit être à DROITE et les moteurs à gauche, sinon la flèche remonte le
   * texte. On ne miroite pas l'image (les libellés arabes se retrouveraient à
   * l'envers) : on miroite les COORDONNÉES, et les textes s'ancrent de l'autre
   * côté. Le dessin change de sens, l'écriture reste lisible. */
  const rtl = dir === "rtl";
  const X = (v: number) => (rtl ? W - v : v);
  const anchor = rtl ? "end" : "start";

  /* AFFICHÉ SEULEMENT À PARTIR DE 1024 px.
   *
   * Le schéma garde ses proportions (`meet`) : dans une carte étroite, il se
   * réduit tout entier, y compris ses libellés — à 600 px de large, « Kanem
   * Flash » tombait à sept pixels. Sous cette largeur, la chaîne en texte
   * au-dessus dit déjà tout ; le schéma n'ajouterait qu'une image illisible. */
  return (
    <div className="mt-8 hidden lg:block" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[300px] w-full" role="presentation">
        <defs>
          <linearGradient id="tm-hub-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--tm-indigo)" />
            <stop offset="0.55" stopColor="var(--tm-amber)" />
            <stop offset="1" stopColor="var(--tm-terra)" />
          </linearGradient>
        </defs>

        {/* Les sept branches */}
        {ENGINES.map((e, i) => {
          const on = i === target;
          const d = `M${X(166)} 150 C ${X(380)} 150, ${X(430)} ${y(i)}, ${X(618)} ${y(i)}`;
          return (
            <g key={e.key}>
              <path
                d={d}
                fill="none"
                stroke={on ? e.color : "var(--tm-line)"}
                strokeWidth={on ? 1.7 : 1}
                opacity={on ? 1 : 0.55}
                style={{ transition: "stroke 500ms ease, opacity 500ms ease, stroke-width 500ms ease" }}
              />
              {on && !still && (
                <circle r="3.4" fill={e.color}>
                  <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Le moyeu */}
        <circle cx={X(120)} cy="150" r="40" fill="var(--tm-bg-2)" stroke="url(#tm-hub-grad)" strokeWidth="1.8" />
        <circle cx={X(120)} cy="150" r="54" fill="none" stroke="var(--tm-line)" strokeWidth="1" opacity="0.6" />
        <text
          x={X(120)}
          y="147"
          textAnchor="middle"
          fill="var(--tm-ink)"
          style={{ font: "600 12.5px var(--font-geist-sans), sans-serif" }}
        >
          {t.intelligence.hubLabel}
        </text>
        <text
          x={X(120)}
          y="162"
          textAnchor="middle"
          fill="var(--tm-ink-4)"
          style={{ font: "500 8px var(--font-geist-mono), monospace", letterSpacing: "0.1em" }}
        >
          {t.intelligence.hubSub}
        </text>

        {/* Les moteurs */}
        {ENGINES.map((e, i) => {
          const on = i === target;
          return (
            <g key={`n-${e.key}`} style={{ transition: "opacity 500ms ease" }} opacity={on ? 1 : 0.5}>
              <circle
                cx={X(626)}
                cy={y(i)}
                r={on ? 5 : 3.4}
                fill={on ? e.color : "var(--tm-line-2)"}
                style={{ transition: "r 400ms ease, fill 500ms ease" }}
              />
              <text
                x={X(646)}
                y={y(i) - 1}
                textAnchor={anchor}
                fill={on ? "var(--tm-ink)" : "var(--tm-ink-3)"}
                style={{ font: "550 11.5px var(--font-geist-sans), sans-serif", transition: "fill 500ms ease" }}
              >
                {e.name}
              </text>
              <text
                x={X(646)}
                y={y(i) + 11}
                textAnchor={anchor}
                fill="var(--tm-ink-4)"
                style={{ font: "400 9.5px var(--font-geist-sans), sans-serif" }}
              >
                {t.intelligence.engines[e.key]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
