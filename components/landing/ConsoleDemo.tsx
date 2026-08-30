"use client";

/**
 * LA CONSOLE — démonstration jouée du produit, au centre du hero.
 *
 * POURQUOI PAS UNE CAPTURE D'ÉCRAN
 * ---------------------------------
 * Une capture prouve qu'une interface existe. Elle ne prouve pas qu'elle
 * répond. Ici, cinq scènes s'enchaînent et montrent le produit en train de
 * faire son travail : une question qui arrive, une réflexion, une réponse qui
 * se construit mot à mot, un passage du français à l'arabe tchadien, une image
 * qui se développe, une voix, un agent qui parcourt le Web.
 *
 * COMMENT ELLE RESTE LÉGÈRE
 * --------------------------
 * Le texte n'est PAS animé par React : chaque mot porte un délai CSS et arrive
 * seul (voir `Streamed`). Le seul état React est le NUMÉRO de la scène — cinq
 * rendus toutes les quarante secondes, pas trois mille.
 *
 * La minuterie ne tourne que si la console est visible. Sortie de l'écran, elle
 * s'arrête net : rien ne doit consommer du processeur pour personne.
 *
 * CE QU'ELLE MONTRE EST VRAI
 * ---------------------------
 * Les scènes reprennent des capacités réellement livrées (chat multilingue,
 * arabe tchadien, génération d'images signée, mode vocal, Agent Navigateur).
 * L'image affichée est celle que le pipeline produit vraiment, avec sa
 * signature. Aucun chiffre, aucun score, aucune performance n'est avancé.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Streamed, Thinking, Waveform, useInView, useReducedMotion } from "./primitives";
import { useLang } from "@/lib/i18n/context";

type SceneId = "fr" | "shu" | "image" | "voice" | "agent";

const SCENES: { id: SceneId; ms: number }[] = [
  { id: "fr", ms: 7600 },
  { id: "shu", ms: 8600 },
  { id: "image", ms: 7800 },
  { id: "voice", ms: 7200 },
  { id: "agent", ms: 9200 },
];

export function ConsoleDemo() {
  const { t } = useLang();
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -8% 0px");
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  // Une scène choisie à la main met la rotation en pause : on regarde ce qu'on
  // a demandé à voir, pas ce que la minuterie impose.
  const [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const go = useCallback((next: number) => {
    setI(((next % SCENES.length) + SCENES.length) % SCENES.length);
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!inView || reduced || held) return;
    timer.current = window.setTimeout(() => go(i + 1), SCENES[i].ms);
    return () => window.clearTimeout(timer.current);
  }, [i, inView, reduced, held, go]);

  const scene = SCENES[i];
  const still = reduced;

  return (
    <div
      ref={ref}
      className={`tm-console ${!inView && !reduced ? "tm-paused" : ""}`}
      // La console est une démonstration, pas un contenu à lire : les lecteurs
      // d'écran reçoivent le résumé ci-dessous, pas la chorégraphie.
      role="group"
      aria-roledescription="démonstration"
      aria-label={t.console.aria}
    >
      <div className="tm-console-bar">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: "var(--tm-line-2)" }}
            />
          ))}
        </span>
        <span
          className="tm-mono ml-1 truncate rounded-md px-2 py-0.5 text-[10.5px]"
          style={{ background: "var(--tm-surface-2)", color: "var(--tm-ink-4)" }}
        >
          toumaiai.com
        </span>
        {/* ARRÊTER LA DÉMONSTRATION.
          *
          * Une animation qui se relance seule pendant plus de cinq secondes,
          * à côté d'un texte à lire, doit pouvoir être arrêtée : c'est un
          * critère d'accessibilité de niveau A, pas une politesse. Choisir une
          * scène dans le rail l'arrête déjà — mais rien ne le disait. Ce bouton
          * le dit, et le remet en marche. */}
        <button
          type="button"
          onClick={() => setHeld((v) => !v)}
          className="ms-auto flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] transition-colors hover:text-[var(--tm-ink-2)]"
          style={{ color: "var(--tm-ink-4)" }}
          aria-label={held ? t.console.resume : t.console.pause}
        >
          <span aria-hidden="true">
            {held ? (
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                <path d="M0 0.5 8.5 5 0 9.5Z" />
              </svg>
            ) : (
              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                <rect width="2.6" height="10" rx="0.6" />
                <rect x="5.4" width="2.6" height="10" rx="0.6" />
              </svg>
            )}
          </span>
          {held ? t.console.paused : t.console.live}
        </button>
      </div>

      {/* Hauteur fixe : une scène plus courte que la précédente ne doit jamais
       * faire remonter le bas de page. */}
      <div className="relative h-[336px] overflow-hidden px-4 py-4 sm:h-[352px] sm:px-5 sm:py-5">
        <div key={scene.id} className="tm-stage-in h-full">
          {scene.id === "fr" && <SceneFr still={still} />}
          {scene.id === "shu" && <SceneShu still={still} />}
          {scene.id === "image" && <SceneImage still={still} />}
          {scene.id === "voice" && <SceneVoice still={still} />}
          {scene.id === "agent" && <SceneAgent still={still} />}
        </div>
      </div>

      {/* Rail des scènes — cliquable : la démonstration devient dirigeable. */}
      <div
        className="tm-rail border-t px-3 py-1.5"
        style={{ borderColor: "var(--tm-line)" }}
        role="tablist"
        aria-label={t.console.scenesAria}
      >
        {SCENES.map((s, idx) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={idx === i}
            aria-label={t.console.sceneAria(idx + 1, SCENES.length, t.console.tabs[s.id])}
            className="tm-tab px-2"
            onClick={() => {
              go(idx);
              setHeld(true);
            }}
          >
            {t.console.tabs[s.id]}
            {idx === i && !held && !reduced && inView && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left rounded-full"
                style={{
                  background: "var(--tm-spectrum)",
                  animation: `tm-progress ${s.ms}ms linear forwards`,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Scènes ──────────────────────────────────────────────────────────────── */

function UserBubble({
  children,
  delay = 0,
  still,
  dir,
  lang,
}: {
  children: React.ReactNode;
  delay?: number;
  still: boolean;
  dir?: "rtl";
  lang?: string;
}) {
  return (
    <div
      className="tm-bubble"
      dir={dir}
      lang={lang}
      style={
        still
          ? undefined
          : {
              animation: `tm-word-in 420ms cubic-bezier(.22,1,.36,1) ${delay}ms backwards`,
            }
      }
    >
      {children}
    </div>
  );
}

/** Bloc qui apparaît à une date donnée dans la scène. */
function At({
  ms,
  still,
  children,
  className = "",
}: {
  ms: number;
  still: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={
        still
          ? undefined
          : {
              animation: `tm-word-in 420ms cubic-bezier(.22,1,.36,1) ${ms}ms backwards`,
            }
      }
    >
      {children}
    </div>
  );
}

function SceneFr({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col gap-3.5">
      <UserBubble delay={120} still={still}>
        {t.console.fr.ask}
      </UserBubble>

      <At ms={900} still={still} className="flex items-center gap-2 text-[12px]">
        <Thinking />
        <span style={{ color: "var(--tm-ink-4)" }}>{t.console.fr.thinking}</span>
      </At>

      <div className="text-[13.5px] leading-[1.65]" style={{ color: "var(--tm-ink-2)" }}>
        <Streamed
          delay={1700}
          still={still}
          speed={40}
          text={t.console.fr.answer}
        />
      </div>

      <At ms={4600} still={still} className="mt-auto flex flex-wrap gap-1.5">
        {t.console.fr.chips.map((s) => (
          <span key={s} className="tm-chip text-[11.5px]">
            {s}
          </span>
        ))}
      </At>
    </div>
  );
}

function SceneShu({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col gap-3">
      <UserBubble delay={120} still={still}>
        {t.console.shu.ask}
      </UserBubble>

      <At ms={900} still={still} className="flex items-center gap-2 text-[12px]">
        <Thinking />
        <span style={{ color: "var(--tm-ink-4)" }}>{t.console.shu.thinking}</span>
      </At>

      {/* Bloc de réponse en écriture arabe : il s'aligne à droite, et la
        * translittération latine suit la même arête. Deux alignements opposés
        * pour une même phrase, ce serait deux phrases. */}
      <At ms={1700} still={still} className="text-end">
        <p
          dir="rtl"
          lang="ar"
          className="tm-display text-[clamp(1.6rem,4.4vw,2.15rem)]"
          style={{ color: "var(--tm-amber)" }}
        >
          إنت كيف اليوم؟
        </p>
        <p className="tm-mono mt-1 text-[11px]" style={{ color: "var(--tm-ink-4)" }} dir="ltr">
          inta kēf al-yōm&nbsp;?
        </p>
      </At>

      <div className="text-[13px] leading-[1.6]" style={{ color: "var(--tm-ink-2)" }}>
        <Streamed
          delay={2600}
          still={still}
          speed={38}
          text={t.console.shu.answer}
        />
      </div>

      <At ms={5600} still={still} className="mt-auto flex flex-wrap items-center gap-2">
        <span className="tm-chip tm-chip-accent text-[11px]">Arabe tchadien</span>
        <span className="tm-chip text-[11px]">Arabe littéraire</span>
        <span className="tm-chip text-[11px]">Français</span>
      </At>
    </div>
  );
}

function SceneImage({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col gap-3">
      <UserBubble delay={120} still={still}>
        {t.console.image.ask}
      </UserBubble>

      <At ms={900} still={still} className="flex items-center gap-2 text-[12px]">
        <Thinking />
        <span style={{ color: "var(--tm-ink-4)" }}>{t.console.image.thinking}</span>
      </At>

      <At ms={1500} still={still} className="relative min-h-0 flex-1 overflow-hidden rounded-xl">
        <picture>
          <source srcSet="/landing/showcase.avif" type="image/avif" />
          <img
            src="/landing/showcase.webp"
            alt={t.console.image.alt}
            width={760}
            height={570}
            loading="lazy"
            decoding="async"
            className="h-full w-full rounded-xl object-cover"
          />
        </picture>
        {/* Le balayage « développe » l'image, puis disparaît : ce qui reste à
         * l'écran est le résultat, pas l'effet. */}
        {!still && (
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
            style={{ animation: "tm-word-in 300ms 1500ms both, tm-word-in 400ms 4300ms reverse forwards" }}
            aria-hidden="true"
          >
            <span className="tm-scan" />
          </span>
        )}
      </At>

      <At ms={4800} still={still} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span style={{ color: "var(--tm-ink-4)" }}>{t.console.image.caption}</span>
        <span className="tm-chip text-[10.5px]">{t.console.image.chip}</span>
      </At>
    </div>
  );
}

function SceneVoice({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <At ms={100} still={still} className="relative">
        <span
          className="tm-breathe absolute left-1/2 top-1/2 -z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, var(--tm-accent-soft), transparent 70%)", filter: "blur(14px)" }}
          aria-hidden="true"
        />
        <Waveform bars={22} height={44} />
      </At>

      <At ms={700} still={still}>
        <p className="text-[13.5px]" style={{ color: "var(--tm-ink-2)" }}>
          «&nbsp;
          <Streamed
            delay={900}
            still={still}
            speed={52}
            text={t.console.voice.ask}
          />
          &nbsp;»
        </p>
      </At>

      <At ms={3200} still={still} className="w-full">
        <div
          className="mx-auto max-w-[26rem] rounded-2xl border px-4 py-3 text-start text-[13px] leading-[1.6]"
          style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface)", color: "var(--tm-ink-2)" }}
        >
          <span className="tm-mono mb-1.5 block text-[10px]" style={{ color: "var(--tm-ink-4)" }}>
            {t.console.voice.engine}
          </span>
          <Streamed
            delay={3500}
            still={still}
            speed={44}
            text={t.console.voice.answer}
          />
        </div>
      </At>

      <At ms={5400} still={still} className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
        {t.console.voice.chips.map((c) => (
          <span key={c} className="tm-chip text-[10.5px]">
            {c}
          </span>
        ))}
      </At>
    </div>
  );
}

/* Seules les DATES restent ici : le texte des étapes vit dans le dictionnaire,
 * la chronologie est de la mise en scène. */
const AGENT_STEP_MS = [1400, 2700, 4000, 5300];

function SceneAgent({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col gap-3">
      <UserBubble delay={120} still={still}>
        {t.console.agent.ask}
      </UserBubble>

      <At ms={800} still={still}>
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--tm-line)", background: "var(--tm-surface)" }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: "var(--tm-line-2)" }}
                aria-hidden="true"
              />
            ))}
            <span
              className="tm-mono ml-1 flex-1 truncate rounded px-2 py-0.5 text-[10px]"
              style={{ background: "var(--tm-bg)", color: "var(--tm-ink-4)" }}
            >
              {t.console.agent.searching}
            </span>
          </div>
        </div>
      </At>

      <ol className="flex flex-col gap-2">
        {t.console.agent.steps.map((s, idx) => (
          <li key={s.label}>
            <At ms={AGENT_STEP_MS[idx]} still={still} className="flex items-center gap-2.5">
              <span
                className="tm-mono flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{ background: "var(--tm-accent-soft)", color: "var(--tm-terra-2)" }}
              >
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: "var(--tm-ink-2)" }}>
                {s.label}
              </span>
              <span className="tm-mono shrink-0 text-[9.5px] uppercase tracking-wider" style={{ color: "var(--tm-ink-4)" }}>
                {s.meta}
              </span>
            </At>
          </li>
        ))}
      </ol>

      <At ms={6600} still={still} className="mt-auto">
        <div
          className="rounded-xl border px-3.5 py-2.5 text-[12.5px]"
          style={{ borderColor: "var(--tm-accent-line)", background: "var(--tm-accent-soft)", color: "var(--tm-ink-2)" }}
        >
          {t.console.agent.note}
        </div>
      </At>
    </div>
  );
}
