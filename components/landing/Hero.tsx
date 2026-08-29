"use client";

/**
 * HERO — le premier écran.
 *
 * LA PROMESSE TIENT EN TROIS MOTS
 * --------------------------------
 * « Parlez comme chez vous. » C'est la seule chose que Toumaï AI fait mieux que
 * les assistants venus d'ailleurs, et c'est donc la seule chose que le premier
 * écran doit dire. Tout le reste — le Web, WhatsApp, la voix, les images — se
 * démontre à droite, dans la console, au lieu d'être énuméré à gauche.
 *
 * LA PROFONDEUR VIENT DE LA LUMIÈRE, PAS DES BOÎTES
 * --------------------------------------------------
 * Trois plans : le visage-réseau en or, très en retrait ; deux halos chauds qui
 * respirent lentement ; la console posée devant, avec une ombre portée longue.
 * L'œil lit la hiérarchie sans qu'aucun cadre ne la dessine.
 *
 * L'image du visage porte l'alpha dans le fichier (voir design-sources/) : elle
 * se fond sur n'importe quel fond, clair comme sombre, sans rectangle noir.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";
import { ConsoleDemo } from "./ConsoleDemo";
import { Icons } from "./primitives";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-[var(--tm-pad)] pb-16 pt-8 sm:pb-20 sm:pt-12 lg:pb-28 lg:pt-16">
      <HeroBackdrop />

      <div className="tm-wrap grid items-center gap-10 lg:grid-cols-[1.04fr_1fr] lg:gap-14 xl:gap-20">
        {/* ── La promesse ── */}
        <div className="text-center lg:text-left">
          <div data-reveal className="flex justify-center lg:justify-start">
            <span className="tm-chip tm-chip-accent">
              <span className="tm-dot" aria-hidden="true" />
              Conçu à N&apos;Djaména, pour le monde
            </span>
          </div>

          <h1
            data-reveal
            style={{ "--tm-delay": "60ms" } as React.CSSProperties}
            className="tm-display tm-h1 mx-auto mt-6 max-w-[13ch] lg:mx-0"
          >
            Parlez comme{" "}
            <em className="tm-em">chez vous.</em>
          </h1>

          <p
            data-reveal
            style={{ "--tm-delay": "140ms" } as React.CSSProperties}
            className="tm-lead mx-auto mt-6 max-w-[46ch] lg:mx-0"
          >
            Toumaï AI comprend le français, l&apos;anglais et l&apos;arabe — y
            compris <strong style={{ color: "var(--tm-ink)", fontWeight: 550 }}>l&apos;arabe tchadien</strong>,
            celui qu&apos;on parle au marché, pas celui des manuels.
          </p>

          <div
            data-reveal
            style={{ "--tm-delay": "220ms" } as React.CSSProperties}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start"
          >
            <Link href="/chat" className="tm-btn tm-btn-primary" data-cta="hero">
              Commencer gratuitement
              <span className="tm-arrow" aria-hidden="true">
                <Icons.arrow size={17} />
              </span>
            </Link>
            <a href="#capacites" className="tm-btn tm-btn-ghost">
              Voir Toumaï AI à l&apos;œuvre
            </a>
          </div>

          <TrustLine />
        </div>

        {/* ── La preuve ── */}
        <div
          data-reveal="scale"
          style={{ "--tm-delay": "180ms" } as React.CSSProperties}
          className="relative mx-auto w-full max-w-[560px] lg:max-w-none"
        >
          <ConsoleDemo />
          {/* Ancrage lumineux sous la console : elle est POSÉE sur la page,
           * elle n'y flotte pas. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 -bottom-6 -z-10 h-16 rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, var(--tm-accent-soft), transparent 70%)",
              filter: "blur(22px)",
            }}
          />
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}

/* ── Décor ───────────────────────────────────────────────────────────────── */

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Visage-réseau : le motif du logo, en très grand et très en retrait.
       * Il donne l'échelle et le sujet sans jamais concurrencer le titre.
       * `sizes` décrit la largeur RÉELLE d'affichage — un `sizes` trop large
       * ferait descendre la variante 1200 sur des écrans qui n'en ont pas
       * l'usage, et c'est le poids qui décide du temps d'affichage sur une
       * liaison tchadienne, bien avant le JavaScript. */}
      <picture>
        <source
          type="image/avif"
          srcSet="/landing/hero-afrique-800.avif 800w, /landing/hero-afrique-1200.avif 1200w"
          sizes="(min-width: 1280px) 900px, (min-width: 1024px) 700px, 130vw"
        />
        <source srcSet="/landing/hero-afrique-800.webp" type="image/webp" />
        <img
          src="/landing/hero-afrique-800.webp"
          alt=""
          width={1672}
          height={941}
          fetchPriority="high"
          decoding="async"
          className="tm-float absolute right-[-24%] top-[-14%] w-[140%] max-w-none select-none opacity-[0.22] sm:right-[-14%] sm:w-[104%] lg:right-[-20%] lg:top-[-26%] lg:w-[84%] lg:opacity-[0.30]"
          style={{
            // Le masque éteint les bords AVANT qu'ils ne touchent le titre ou
            // la console : ce qui reste est une lueur, pas une photo posée sur
            // la page.
            maskImage: "radial-gradient(ellipse 54% 56% at 60% 40%, #000 24%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 54% 56% at 60% 40%, #000 24%, transparent 72%)",
          }}
        />
      </picture>

      <div className="tm-lattice opacity-[0.35]" />

      {/* Deux soleils bas : l'un chaud à gauche (la terre), l'autre indigo à
       * droite (le ciel de crépuscule). Ensemble ils reconstituent le dégradé
       * du logo à l'échelle de l'écran. */}
      <span
        className="tm-glow tm-breathe"
        style={{
          left: "-14%",
          top: "18%",
          width: "62vw",
          height: "62vw",
          maxWidth: 760,
          maxHeight: 760,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tm-terra) 40%, transparent), transparent 66%)",
        }}
      />
      <span
        className="tm-glow"
        style={{
          right: "-10%",
          top: "-16%",
          width: "50vw",
          height: "50vw",
          maxWidth: 620,
          maxHeight: 620,
          opacity: 0.32,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--tm-indigo) 42%, transparent), transparent 68%)",
        }}
      />

      {/* Horizon : la ligne de sable, puis le filet du spectre. */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--tm-amber) 12%, transparent), transparent)",
        }}
      />
    </div>
  );
}

function ScrollCue() {
  return (
    <div className="mt-12 flex justify-center lg:mt-16" aria-hidden="true">
      <span
        className="tm-float block h-10 w-[1.5px] rounded-full"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--tm-line-2), transparent)",
          animationDuration: "4.5s",
        }}
      />
    </div>
  );
}

/* ── Ligne de confiance ──────────────────────────────────────────────────── */

interface PublicStats {
  registered_users: number | null;
  conversations: number | null;
  languages: number | null;
  countries: number | null;
}

function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`.replace(".0k", "k");
  return String(n);
}

/**
 * Chiffres RÉELS, servis par le backend — jamais de valeur par défaut.
 *
 * Les seuils sont volontaires : sous cent inscrits ou cinq cents conversations,
 * afficher un compteur affaiblit la crédibilité au lieu de la renforcer. En
 * dessous, la ligne de capacités suffit — elle, elle est toujours vraie.
 */
function TrustLine() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/app/public-stats`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j?.success) setStats(j.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const counters: { value: string; label: string }[] = [];
  if (stats?.registered_users && stats.registered_users >= 100) {
    counters.push({ value: `${fmtCompact(stats.registered_users)}+`, label: "inscrits" });
  }
  if (stats?.conversations && stats.conversations >= 500) {
    counters.push({ value: `${fmtCompact(stats.conversations)}+`, label: "conversations" });
  }

  return (
    <div
      data-reveal
      style={{ "--tm-delay": "300ms" } as React.CSSProperties}
      className="mt-10 border-t pt-6"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 lg:justify-start">
        {counters.map((c) => (
          <span key={c.label} className="flex items-baseline gap-1.5">
            {/* Chiffres à chasse fixe : quand le compteur passe de 700 à 800,
              * la ligne ne doit pas se décaler d'un demi-caractère. */}
            <span
              className="tm-display text-[1.55rem]"
              style={{ color: "var(--tm-ink)", fontVariantNumeric: "tabular-nums" }}
            >
              {c.value}
            </span>
            <span className="text-[12px]" style={{ color: "var(--tm-ink-4)" }}>
              {c.label}
            </span>
          </span>
        ))}
        {[
          "Gratuit, sans carte bancaire",
          "Web · WhatsApp · Android",
          "Aucune revente de données",
        ].map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 text-[12.5px]"
            style={{ color: "var(--tm-ink-3)" }}
          >
            <span style={{ color: "var(--tm-terra-2)" }} aria-hidden="true">
              <Icons.check size={13} />
            </span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
