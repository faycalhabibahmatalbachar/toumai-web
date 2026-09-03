"use client";

/**
 * HERO — le premier écran.
 *
 * CE QUI CHANGE, ET POURQUOI
 * ---------------------------
 * L'ancienne version posait la promesse à gauche et la console à droite, sur
 * un fond portant une photo. Trois défauts s'additionnaient :
 *
 * 1. Rien n'alignait la colonne de gauche sur la page : chaque section
 *    trouvait son propre axe, et l'ensemble se lisait comme une pile de
 *    blocs plutôt que comme un produit.
 * 2. La photo de fond, même très atténuée, imposait un poids d'image sur une
 *    liaison tchadienne pour un décor que personne ne regarde.
 * 3. L'apparition dépendait d'un observateur de défilement — donc d'une
 *    hauteur de fenêtre, d'un conteneur qui défile, d'une API. Chacun peut
 *    manquer, et quand il manque le contenu reste invisible.
 *
 * La promesse est maintenant CENTRÉE, la console posée dessous, pleine
 * largeur. L'axe est unique et visible : les rails l'affichent. Le décor est
 * entièrement en CSS. L'entrée est minutée depuis le chargement — elle
 * démarre, elle finit, le contenu est là.
 *
 * LA PROMESSE TIENT TOUJOURS EN TROIS MOTS
 * -----------------------------------------
 * « Parlez comme chez vous. » C'est la seule chose que Toumaï AI fait mieux
 * que les assistants venus d'ailleurs, donc la seule que ce premier écran
 * doit dire. Le reste se démontre dans la console, au lieu d'être énuméré.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";
import { useLang } from "@/lib/i18n/context";
import { ConsoleDemo } from "./ConsoleDemo";
import { Icons } from "./primitives";

export function Hero() {
  const { t } = useLang();
  return (
    <section className="tm-rule relative isolate overflow-hidden px-[var(--tm-pad)] pb-0 pt-10 sm:pt-16 lg:pt-24">
      <HeroBackdrop />

      <div className="tm-wrap flex flex-col items-center gap-10 text-center sm:gap-14">
        <span className="tm-chip tm-chip-accent tm-appear">
          <span className="tm-dot" aria-hidden="true" />
          {t.hero.badge}
        </span>

        {/* Le titre porte le dégradé : un blanc plat sur fond sombre paraît
            dur, le dégradé donne au bas des lettres le poids de l'encre. */}
        <h1
          className="tm-display tm-h1 tm-title-grad tm-appear mx-auto max-w-[15ch] text-balance"
          style={{ "--tm-d": "70ms" } as React.CSSProperties}
        >
          {t.hero.titleA} <em className="tm-em">{t.hero.titleEm}</em>
        </h1>

        <p
          className="tm-lead tm-appear mx-auto max-w-[54ch] text-balance"
          style={{ "--tm-d": "150ms" } as React.CSSProperties}
        >
          {t.hero.leadA}{" "}
          <strong style={{ color: "var(--tm-ink)", fontWeight: 550 }}>
            {t.hero.leadStrong}
          </strong>
          {t.hero.leadB}
        </p>

        <div
          className="tm-appear flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center"
          style={{ "--tm-d": "230ms" } as React.CSSProperties}
        >
          <Link href="/chat" className="tm-btn tm-btn-primary" data-cta="hero">
            {t.hero.ctaPrimary}
            <span className="tm-arrow" aria-hidden="true">
              <Icons.arrow size={17} />
            </span>
          </Link>
          <a href="#capacites" className="tm-btn tm-btn-ghost">
            {t.hero.ctaSecondary}
          </a>
        </div>

        <TrustLine />

        {/* LA PREUVE, PAS UNE CAPTURE.
            La console est vivante : elle tape, elle répond, elle change
            d'onglet. Une image de produit montre à quoi il ressemble ; une
            console qui tourne montre ce qu'il fait — et c'est la question
            que se pose vraiment quelqu'un qui arrive ici. */}
        <div
          className="tm-appear-zoom relative w-full pt-4 sm:pt-8"
          style={{ "--tm-d": "380ms" } as React.CSSProperties}
        >
          <ConsoleDemo />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -bottom-4 -z-10 h-20 rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--tm-accent-soft), transparent 70%)",
              filter: "blur(26px)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

/* ── Décor ───────────────────────────────────────────────────────────────── */

/**
 * Entièrement en CSS.
 *
 * L'ancienne version chargeait une image de 1672 px pour un décor affiché à
 * 22 % d'opacité derrière un masque radial — c'est-à-dire un poids réel pour
 * une lueur que personne ne regarde. Deux dégradés font la même chose pour
 * zéro octet, et se redessinent instantanément au changement de thème, ce
 * qu'une image ne sait pas faire.
 */
function HeroBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      <div className="tm-lattice opacity-[0.3]" />

      {/* Deux soleils bas : le chaud pour la terre, l'indigo pour le ciel de
          crépuscule. Ensemble ils reconstituent le dégradé du logo à
          l'échelle de l'écran. */}
      <span
        className="tm-glow tm-breathe"
        style={{
          insetInlineStart: "-16%",
          top: "8%",
          width: "58vw",
          height: "58vw",
          maxWidth: 720,
          maxHeight: 720,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tm-terra) 38%, transparent), transparent 66%)",
        }}
      />
      <span
        className="tm-glow"
        style={{
          insetInlineEnd: "-12%",
          top: "-18%",
          width: "48vw",
          height: "48vw",
          maxWidth: 600,
          maxHeight: 600,
          opacity: 0.3,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tm-indigo) 42%, transparent), transparent 68%)",
        }}
      />
    </div>
  );
}

/* ── Ligne de confiance ──────────────────────────────────────────────────── */

/**
 * Trois promesses, et les compteurs quand le serveur les donne.
 *
 * Les compteurs ne s'affichent QUE s'ils reviennent réellement. Un « 0
 * inscrit » affiché parce que la requête a échoué serait pire que rien :
 * il annoncerait un produit désert.
 */
function TrustLine() {
  const { t } = useLang();
  const [stats, setStats] = useState<{ users?: number; conversations?: number } | null>(
    null,
  );

  useEffect(() => {
    let vivant = true;
    fetch(`${API_BASE}/public/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (vivant && b?.data) setStats(b.data);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  const nb = (n?: number) =>
    typeof n === "number" && n > 0 ? n.toLocaleString("fr-FR") : null;

  return (
    <ul
      className="tm-appear flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.82rem]"
      style={{ "--tm-d": "300ms" } as React.CSSProperties}
    >
      {nb(stats?.users) && (
        <li className="tm-mono" style={{ color: "var(--tm-ink-2)" }}>
          {nb(stats?.users)} {t.hero.countRegistered}
        </li>
      )}
      {nb(stats?.conversations) && (
        <li className="tm-mono" style={{ color: "var(--tm-ink-2)" }}>
          {nb(stats?.conversations)} {t.hero.countConversations}
        </li>
      )}
      {t.hero.trust.map((s: string) => (
        <li
          key={s}
          className="flex items-center gap-1.5"
          style={{ color: "var(--tm-ink-3)" }}
        >
          <span
            aria-hidden="true"
            className="inline-block h-1 w-1 rounded-full"
            style={{ background: "var(--tm-terra)" }}
          />
          {s}
        </li>
      ))}
    </ul>
  );
}
