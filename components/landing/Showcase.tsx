"use client";

/**
 * TOUMAÏ AI À L'ŒUVRE — la vitrine interactive.
 *
 * CE QUI REMPLACE LES HUIT CARTES IDENTIQUES
 * -------------------------------------------
 * Huit capacités, huit scènes qui ne se ressemblent pas. Le mode vocal n'a
 * aucune raison d'avoir la même forme qu'un éditeur de code, et une image
 * générée n'a pas à tenir dans le même cadre qu'un tableau de permissions.
 * Chaque scène emprunte la forme de ce qu'elle montre : l'éditeur ressemble à
 * un éditeur, le document à un document, la voix à une onde.
 *
 * PILOTAGE
 * --------
 * La scène avance seule tant que personne n'a rien demandé — un visiteur qui
 * ne clique pas voit quand même les huit. Au premier clic, la rotation
 * s'arrête définitivement : à partir de là, c'est lui qui dirige.
 *
 * ACCESSIBILITÉ
 * -------------
 * Vrai motif ARIA d'onglets : `tablist` / `tab` / `tabpanel`, flèches du
 * clavier pour circuler, Origine/Fin pour aller aux extrémités. Chaque scène
 * porte un texte de remplacement lisible par un lecteur d'écran.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Icons, Streamed, useInView, useReducedMotion } from "./primitives";
import { useLang } from "@/lib/i18n/context";
import { MaquetteEcran } from "./MaquetteEcran";

type CapId =
  | "multilingue"
  | "tchadien"
  | "image"
  | "document"
  | "code"
  | "web"
  | "voix"
  | "connecteurs";

interface Cap {
  id: CapId;
  icon: React.ReactNode;
}

const CAPS: Cap[] = [
  { id: "multilingue", icon: <Icons.globe /> },
  { id: "tchadien", icon: <Icons.chat /> },
  { id: "image", icon: <Icons.image /> },
  { id: "document", icon: <Icons.doc /> },
  { id: "code", icon: <Icons.code /> },
  { id: "web", icon: <Icons.agent /> },
  { id: "voix", icon: <Icons.mic /> },
  { id: "connecteurs", icon: <Icons.plug /> },
];

const ROTATE_MS = 7200;

export function Showcase() {
  const { t } = useLang();
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -20% 0px");
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (pinned || reduced || !inView) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % CAPS.length), ROTATE_MS);
    return () => window.clearTimeout(t);
  }, [active, pinned, reduced, inView]);

  const pick = useCallback((i: number, focus = false) => {
    setActive(i);
    setPinned(true);
    if (focus) tabsRef.current[i]?.focus();
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const last = CAPS.length - 1;
    const map: Record<string, number | undefined> = {
      ArrowDown: active === last ? 0 : active + 1,
      ArrowRight: active === last ? 0 : active + 1,
      ArrowUp: active === 0 ? last : active - 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    const next = map[e.key];
    if (next === undefined) return;
    e.preventDefault();
    pick(next, true);
  };

  const cap = CAPS[active];

  return (
    <section id="capacites" className="tm-section scroll-mt-24" ref={ref}>
      <span
        className="tm-glow"
        aria-hidden="true"
        style={{
          left: "50%",
          top: "6%",
          width: "70vw",
          height: "34vw",
          maxWidth: 900,
          transform: "translateX(-50%)",
          opacity: 0.22,
          background: "radial-gradient(ellipse, color-mix(in srgb, var(--tm-indigo) 34%, transparent), transparent 68%)",
        }}
      />

      <div className="tm-wrap">
        <header data-reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="tm-eyebrow">{t.showcase.eyebrow}</p>
            <h2 className="tm-display tm-h2 mt-4">
              {t.showcase.titleA} <em className="tm-em">{t.showcase.titleEm}</em>
              {t.showcase.titleB}
            </h2>
            <p className="tm-lead mt-4">{t.showcase.lead}</p>
          </div>

          {/* Le défilement automatique s'arrête au premier clic sur un onglet ;
            * ce bouton rend l'arrêt explicite et réversible, comme l'exige le
            * critère « Pause, arrêt, masquage ». */}
          <button
            type="button"
            onClick={() => setPinned((v) => !v)}
            className="tm-chip"
            aria-label={pinned ? t.showcase.resume : t.showcase.pause}
          >
            <span aria-hidden="true" style={{ color: "var(--tm-terra-2)" }}>
              {pinned ? (
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
            {pinned ? t.showcase.resumeLabel : t.showcase.pauseLabel}
          </button>
        </header>

        <div
          data-reveal
          style={{ "--tm-delay": "80ms" } as React.CSSProperties}
          className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-[minmax(250px,318px)_1fr] lg:gap-8"
        >
          {/* ── Sélecteur ── */}
          {/* Grand écran : liste verticale, chaque ligne porte son intitulé.
              Petit écran : rail horizontal qui défile DANS sa boîte — la page,
              elle, ne bouge pas d'un pixel sur l'axe horizontal. */}
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label={t.showcase.listAria}
            onKeyDown={onKey}
            className="tm-rail -mx-[var(--tm-pad)] px-[var(--tm-pad)] pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {CAPS.map((c, i) => {
              const on = i === active;
              return (
                <button
                  key={c.id}
                  ref={(el) => {
                    tabsRef.current[i] = el;
                  }}
                  role="tab"
                  type="button"
                  id={`tm-tab-${c.id}`}
                  aria-selected={on}
                  aria-controls={`tm-panel-${c.id}`}
                  aria-label={t.showcase.caps[c.id].label}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(i)}
                  className="tm-cap-item !px-3 py-2.5 lg:!px-4 lg:w-full lg:py-3.5"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors"
                      style={{
                        background: on ? "var(--tm-accent-soft)" : "var(--tm-surface-2)",
                        color: on ? "var(--tm-terra-2)" : "var(--tm-ink-3)",
                      }}
                      aria-hidden="true"
                    >
                      {c.icon}
                    </span>
                    <span
                      className="text-[13.5px] font-medium"
                      style={{ color: on ? "var(--tm-ink)" : "var(--tm-ink-2)" }}
                      aria-hidden="true"
                    >
                      <span className="lg:hidden">{t.showcase.caps[c.id].short}</span>
                      <span className="hidden lg:inline">{t.showcase.caps[c.id].label}</span>
                    </span>
                  </span>
                  {/* La ligne d'explication n'apparaît que sur grand écran :
                   * dans un rail horizontal, elle ferait des colonnes de trois
                   * lignes qu'on ne lit pas. */}
                  <span
                    className="mt-1 hidden pl-[42px] text-[12.5px] leading-snug lg:block"
                    style={{ color: on ? "var(--tm-ink-3)" : "var(--tm-ink-4)" }}
                  >
                    {t.showcase.caps[c.id].line}
                  </span>
                  {on && !pinned && !reduced && inView && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 bottom-1 hidden h-[2px] origin-left rounded-full lg:block"
                      style={{
                        background: "var(--tm-spectrum)",
                        animation: `tm-progress ${ROTATE_MS}ms linear forwards`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Scène ── */}
          <div
            role="tabpanel"
            id={`tm-panel-${cap.id}`}
            aria-labelledby={`tm-tab-${cap.id}`}
            tabIndex={0}
            className="tm-card tm-lit relative min-h-[430px] overflow-hidden sm:min-h-[470px]"
          >
            <div key={cap.id} className="tm-stage-in h-full">
              <Stage id={cap.id} still={reduced} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Les scènes
 * ═══════════════════════════════════════════════════════════════════════════ */

function Stage({ id, still }: { id: CapId; still: boolean }) {
  switch (id) {
    case "multilingue":
      return <StageLangues />;
    case "tchadien":
      return <StageTchadien still={still} />;
    case "image":
      return <StageImage still={still} />;
    case "document":
      return <StageDocument />;
    case "code":
      return <StageCode />;
    case "web":
      return <StageWeb />;
    case "voix":
      return <StageVoix />;
    case "connecteurs":
      return <StageConnecteurs />;
  }
}

function StageHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {note && (
        <span className="tm-mono shrink-0 text-[10px] uppercase tracking-wider" style={{ color: "var(--tm-ink-4)" }}>
          {note}
        </span>
      )}
    </div>
  );
}

/* 1 ── Conversation multilingue ─────────────────────────────────────────────
 * Trois salutations en grand, chacune dans son écriture, avec la réponse
 * correspondante. La scène est TYPOGRAPHIQUE : c'est la langue elle-même qui
 * fait l'image, pas un cadre autour. */

function StageLangues() {
  const { t } = useLang();
  return (
    <MaquetteEcran
      base="ecran-multilingue"
      alt={t.showcase.langues.shotAlt}
      largeur={1024}
      hauteur={1536}
      maxLargeur={280}
      largeurs={[460, 720]}
    />
  );
}

/* 2 ── Arabe tchadien ───────────────────────────────────────────────────────
 * Forme de fiche de terrain : l'expression en grand, sa translittération en
 * monospace sous elle, puis la comparaison avec l'arabe littéraire. C'est la
 * seule scène qui a le droit d'être un peu savante — c'est le cœur du sujet. */

function StageTchadien({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col p-5 sm:p-7">
      <StageHead title={t.showcase.tchadien.title} note={t.showcase.tchadien.note} />

      <div className="flex-1">
        {t.showcase.tchadien.rows.map((r, i) => (
          <div
            key={r.fr}
            className="grid gap-1.5 border-b py-3.5 first:pt-0 last:border-0 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4"
            style={
              still
                ? { borderColor: "var(--tm-line)" }
                : {
                    borderColor: "var(--tm-line)",
                    animation: `tm-word-in 460ms cubic-bezier(.22,1,.36,1) ${160 + i * 240}ms backwards`,
                  }
            }
          >
            <div>
              <p className="text-[12.5px]" style={{ color: "var(--tm-ink-4)" }}>
                {r.fr}
              </p>
              <p
                dir="rtl"
                lang="ar"
                className="tm-display mt-0.5 text-[clamp(1.25rem,2.6vw,1.6rem)]"
                style={{ color: "var(--tm-amber)" }}
              >
                {r.shu}
              </p>
            </div>
            <div className="sm:text-end">
              <p className="tm-mono text-[11px]" style={{ color: "var(--tm-ink-3)" }}>
                {r.tr}
              </p>
              <p dir="rtl" lang="ar" className="mt-0.5 text-[12.5px]" style={{ color: "var(--tm-ink-4)" }}>
                {r.msa}{" "}
                <span className="tm-mono text-[9.5px] uppercase tracking-wide">{t.showcase.tchadien.msaLabel}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Ce que ce travail EST vraiment : un corpus collecté sur le terrain.
       * Pas un score, pas un classement — rien qui ne se démontre. */}
      <div
        className="mt-4 rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed"
        style={{ borderColor: "var(--tm-accent-line)", background: "var(--tm-accent-soft)", color: "var(--tm-ink-2)" }}
      >
        {t.showcase.tchadien.note2}
      </div>
    </div>
  );
}

/* 3 ── Génération d'images ──────────────────────────────────────────────────
 * L'image occupe la scène. Le reste — le prompt, la signature — se range
 * autour d'elle. */
function StageImage({ still }: { still: boolean }) {
  const { t } = useLang();
  return (
    <div className="flex h-full flex-col">
      {/* LA MAQUETTE PRODUIT REMPLACE L'IMAGE SEULE.
        *
        * Ici ne s'affichait que l'image produite, sortie de son contexte. On y
        * voyait un résultat sans voir d'où il venait — la demande, l'écran, le
        * moment. La capture réelle montre les trois d'un coup : la question
        * tapée, l'image rendue en dessous, et l'application autour.
        *
        * L'image est laissée ENTIÈRE. Recadrer un téléphone en portrait pour
        * remplir un panneau en paysage le couperait en deux ; on le centre et
        * on borne sa largeur, ce qui coûte de l'espace vide mais ne ment sur
        * rien. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <picture>
          <source
            type="image/avif"
            srcSet="/landing/image-mobile-420.avif 420w, /landing/image-mobile-640.avif 640w"
            sizes="(min-width: 640px) 240px, 52vw"
          />
          <img
            src="/landing/image-mobile-420.webp"
            alt={t.showcase.image.alt}
            width={945}
            height={1665}
            loading="lazy"
            decoding="async"
            className="h-full w-auto select-none object-contain"
            // Voir la note dans Why.tsx : les `max-w-[...]` arbitraires ne sont
            // pas générés dans ce projet — style en ligne obligatoire.
            style={{ maxWidth: 240 }}
          />
        </picture>
        {!still && <span className="tm-scan pointer-events-none" aria-hidden="true" />}
      </div>

      <div className="px-4 pb-1 sm:px-5">
        <p className="text-[12px]" style={{ color: "var(--tm-ink-4)" }}>
          {t.showcase.image.promptLabel}
        </p>
        <p className="mt-1 text-[14px] leading-snug" style={{ color: "var(--tm-ink)" }}>
          {/* L'écriture en direct reste : c'est elle qui montre le produit en
            * train de travailler. Elle sort simplement du cadre de l'image,
            * qui n'a plus de zone sombre où la poser. */}
          <Streamed still={still} delay={260} speed={46} text={t.showcase.image.prompt} />
        </p>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 border-t p-4 sm:px-5"
        style={{ borderColor: "var(--tm-line)" }}
      >
        {t.showcase.image.chips.map((c, i) => (
          <span key={c} className={i === 0 ? "tm-chip tm-chip-accent text-[11px]" : "tm-chip text-[11px]"}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/* 4 ── Analyse de documents ─────────────────────────────────────────────────
 * Deux moitiés : la page qui entre, ce qui en sort. La flèche entre les deux
 * est le sujet de la scène. */
function StageDocument() {
  const { t } = useLang();
  return (
    <MaquetteEcran
      base="ecran-document"
      alt={t.showcase.document.shotAlt}
      largeur={1024}
      hauteur={1536}
      maxLargeur={280}
      largeurs={[460, 720]}
    />
  );
}

/* 5 ── Programmation ────────────────────────────────────────────────────────
 * Un éditeur. Les lignes se posent l'une après l'autre, puis le résultat de
 * l'exécution apparaît sous elles — parce que Toumaï AI exécute vraiment le
 * code, il ne fait pas que l'écrire. */


function StageCode() {
  const { t } = useLang();
  return (
    <MaquetteEcran
      base="ecran-code"
      alt={t.showcase.code.shotAlt}
      largeur={1024}
      hauteur={1536}
      maxLargeur={280}
      largeurs={[460, 720]}
    />
  );
}

/* 6 ── Agent Navigateur ─────────────────────────────────────────────────────
 * Un vrai navigateur en haut, la progression en bas. Le fil vertical qui relie
 * les étapes se remplit : c'est lui qui dit « ça avance ». */

function StageWeb() {
  const { t } = useLang();
  return (
    <MaquetteEcran
      base="ecran-web"
      alt={t.showcase.web.shotAlt}
      largeur={1024}
      hauteur={1536}
      maxLargeur={280}
      largeurs={[460, 720]}
    />
  );
}

/* 7 ── Mode vocal ───────────────────────────────────────────────────────────
 * Centré, radial, presque sans texte : la voix n'a pas de mise en page. */
function StageVoix() {
  const { t } = useLang();
  return (
    <MaquetteEcran
      base="voix-mobile"
      alt={t.showcase.voix.shotAlt}
      largeur={1024}
      hauteur={1536}
      maxLargeur={280}
      largeurs={[520, 760]}
    />
  );
}

/* 8 ── Connecteurs ──────────────────────────────────────────────────────────
 * Ce que la scène doit faire comprendre : le contrôle est chez l'utilisateur,
 * capacité par capacité. D'où une liste d'interrupteurs, et non un logo
 * accompagné d'une promesse. */
function StageConnecteurs() {
  const { t } = useLang();
  // Capture reelle du fil ou une note vocale est resumee puis une reponse
  // preparee, avec la demande de confirmation avant envoi. C'est exactement ce
  // que la section promet, montre par l'application elle-meme.
  return (
    <MaquetteEcran
      base="ecran-vocal-resume"
      alt={t.showcase.connecteurs.shotAlt}
      largeur={941}
      hauteur={1672}
      maxLargeur={280}
    />
  );
}

