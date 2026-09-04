"use client";

/**
 * FIN DE PARCOURS — questions, appel à l'action, pied de page.
 *
 * La FAQ reste bâtie sur `<details>/<summary>` : c'est le seul repli qui
 * fonctionne au clavier, à la recherche dans la page (Ctrl+F ouvre le bon
 * bloc) et sans JavaScript. Aucun accordéon fait main ne fait mieux.
 *
 * Le pied de page reprend TOUS les liens de l'ancien — y compris ceux que le
 * référencement a mis du temps à faire connaître — et en ajoute deux qui
 * manquaient : la version arabe du site, et le tableau de bord WhatsApp.
 */

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RESEAUX } from "@/components/ReseauxSociaux";
import { Icons } from "./primitives";
import { useLang } from "@/lib/i18n/context";

/* ── FAQ ─────────────────────────────────────────────────────────────────── */


export function Faq() {
  const { t } = useLang();
  return (
    <section className="tm-section">
      <div className="tm-wrap grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-16">
        <header data-reveal="left" className="lg:sticky lg:top-28 lg:self-start">
          <p className="tm-eyebrow">{t.faq.eyebrow}</p>
          <h2 className="tm-display tm-h2 mt-4">
            {t.faq.titleA} <em className="tm-em">{t.faq.titleEm}</em>
          </h2>
          <p className="tm-lead mt-4 text-[15px]">
            {t.faq.contactA}{" "}
            <a href="mailto:contact@toumaiai.com" className="tm-link text-[15px]">
              {t.faq.contactLink}
              <span className="tm-arrow" aria-hidden="true">
                <Icons.arrow size={15} />
              </span>
            </a>
          </p>
        </header>

        <div className="tm-faq" data-reveal="right">
          {t.faq.items.map((item) => (
            <details key={item.q} className="group border-b" style={{ borderColor: "var(--tm-line)" }}>
              <summary className="flex cursor-pointer items-center justify-between gap-5 py-5 text-[15.5px] font-medium transition-colors hover:opacity-80">
                {item.q}
                <span className="tm-faq-sign" aria-hidden="true" />
              </summary>
              <p
                className="tm-answer max-w-[62ch] pb-5 text-[14px] leading-relaxed"
                style={{ color: "var(--tm-ink-3)" }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Partenaires, sponsors, collaborations ───────────────────────────────────
 *
 * PLACÉE AVANT L'APPEL À L'ACTION, PAS APRÈS.
 *
 * L'ordre n'est pas un détail de mise en page : une page qui demande de
 * s'inscrire, puis demande de sponsoriser, dilue les deux demandes. Une page
 * qui montre d'abord qu'on peut la soutenir, puis invite à l'essayer, garde une
 * seule action finale. Le skill de conception le formule ainsi : la preuve
 * sociale précède la conversion.
 *
 * PAS DE LOGOS DE PARTENAIRES TANT QU'IL N'Y EN A PAS.
 *
 * La tentation d'une rangée de logos gris « ils nous font confiance » est
 * forte, et c'est exactement ce que la règle maison interdit : rien de simulé
 * en production. La section appelle des partenaires ; elle n'en invente pas.
 * Le jour où il y en aura, leurs logos viendront ici et cette note tombera.
 *
 * UN `mailto:` PLUTÔT QU'UN FORMULAIRE.
 *
 * Un formulaire suppose une route, un stockage, une modération, une réponse.
 * Rien de tout cela n'existe pour ce besoin, et un formulaire qui n'aboutit
 * nulle part est pire que pas de formulaire. Le lien pré-remplit l'objet, ce
 * qui suffit à trier les demandes à l'arrivée.
 */

const PARTENAIRE_MAILTO =
  "mailto:contact@toumaiai.com" +
  "?subject=" +
  encodeURIComponent("Partenariat / Sponsoring — Toumaï AI") +
  "&body=" +
  encodeURIComponent(
    "Bonjour,\n\n" +
      "Organisation : \n" +
      "Type de collaboration envisagée (partenariat, sponsoring, intégration) : \n" +
      "En quelques lignes : \n\n" +
      "Merci,\n"
  );

export function Partners() {
  const { t } = useLang();
  return (
    <section id="partenaires" className="tm-section scroll-mt-24">
      <div className="tm-wrap">
        <div
          data-reveal="scale"
          className="grid items-center gap-8 rounded-[var(--tm-radius-lg)] border px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.7fr_1fr] lg:gap-12"
          style={{ borderColor: "var(--tm-line-2)", background: "var(--tm-bg-2)" }}
        >
          <div>
            <p className="tm-eyebrow">{t.partners.eyebrow}</p>
            <h2 className="tm-display mt-4 max-w-[20ch] text-[clamp(1.6rem,3.6vw,2.5rem)]">
              {t.partners.titleA} <em className="tm-em">{t.partners.titleEm}</em>
            </h2>
            <p className="tm-lead mt-4 max-w-[52ch] text-[15px]">{t.partners.lead}</p>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: "var(--tm-ink-3)" }}>
              {t.partners.kinds.map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="tm-dot" aria-hidden="true" />
                  {k}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:justify-self-end">
            <a href={PARTENAIRE_MAILTO} className="tm-btn tm-btn-primary w-full sm:w-auto">
              {t.partners.cta}
              <span className="tm-arrow" aria-hidden="true">
                <Icons.arrow size={17} />
              </span>
            </a>
            {/* L'adresse est écrite en clair sous le bouton : un `mailto:` ne
              * mène nulle part pour qui n'a pas de client de messagerie
              * configuré — la majorité, sur un téléphone d'occasion. */}
            <p className="mt-3 text-center text-[13px] lg:text-right" style={{ color: "var(--tm-ink-4)" }}>
              <a href="mailto:contact@toumaiai.com" className="tm-link text-[13px]">
                contact@toumaiai.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Appel à l'action ────────────────────────────────────────────────────── */

export function FinalCta() {
  const { t } = useLang();
  return (
    <section className="tm-section">
      <div className="tm-wrap">
        <div
          data-reveal="scale"
          className="relative isolate overflow-hidden rounded-[var(--tm-radius-lg)] border px-6 py-16 text-center sm:px-12 sm:py-24"
          style={{
            borderColor: "var(--tm-line-2)",
            background: "linear-gradient(165deg, var(--tm-bg-3), var(--tm-bg))",
          }}
        >
          {/* La même lumière que le hero, refermée : la page finit là où elle
           * a commencé. */}
          <span
            className="tm-glow tm-breathe"
            aria-hidden="true"
            style={{
              left: "50%",
              bottom: "-40%",
              width: "90%",
              height: "110%",
              transform: "translateX(-50%)",
              background:
                "radial-gradient(ellipse at center, color-mix(in srgb, var(--tm-terra) 40%, transparent), transparent 62%)",
            }}
          />
          <div className="tm-lattice opacity-30" aria-hidden="true" />

          <p className="tm-eyebrow justify-center">{t.cta.eyebrow}</p>
          <h2 className="tm-display mx-auto mt-5 max-w-[16ch] text-[clamp(2.2rem,6vw,4.2rem)]">
            {t.cta.titleA} <em className="tm-em">{t.cta.titleEm}</em>
          </h2>
          <p className="tm-lead mx-auto mt-5 max-w-[44ch]">
            {t.cta.lead}
          </p>

          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/chat" className="tm-btn tm-btn-primary" data-cta="final">
              {t.cta.primary}
              <span className="tm-arrow" aria-hidden="true">
                <Icons.arrow size={17} />
              </span>
            </Link>
            <Link href="/register" className="tm-btn tm-btn-ghost">
              {t.cta.secondary}
            </Link>
          </div>

          <p className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]" style={{ color: "var(--tm-ink-4)" }}>
            {t.cta.notes.map((note) => (
              <span key={note} className="flex items-center gap-1.5">
                <span className="tm-dot" aria-hidden="true" />
                {note}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Pied de page ────────────────────────────────────────────────────────── */

const COLUMNS: { col: "product" | "models" | "connectors" | "legal"; links: { k: keyof typeof import("@/lib/i18n/fr").fr.footer.links; href: string }[] }[] = [
  {
    col: "product",
    links: [
      { k: "chat", href: "/chat" },
      { k: "capabilities", href: "/#capacites" },
      { k: "library", href: "/library" },
      { k: "agent", href: "/agent" },
      { k: "whatsapp", href: "/whatsapp" },
    ],
  },
  {
    col: "models",
    links: [
      { k: "modelsPage", href: "/models" },
      { k: "routing", href: "/#modeles" },
      { k: "aiChad", href: "/intelligence-artificielle-tchad" },
      { k: "arabic", href: "/ar" },
    ],
  },
  {
    col: "connectors",
    links: [
      { k: "overview", href: "/#connecteurs" },
      { k: "manage", href: "/settings?tab=connectors" },
      { k: "settings", href: "/settings" },
    ],
  },
  {
    col: "legal",
    links: [
      { k: "register", href: "/register" },
      { k: "login", href: "/login" },
      { k: "terms", href: "/terms" },
      { k: "privacy", href: "/privacy" },
      { k: "choices", href: "/privacy-choices" },
      { k: "deleteAccount", href: "/delete-account" },
    ],
  },
];

export function Footer() {
  const { t } = useLang();
  return (
    <footer
      id="contact"
      className="scroll-mt-24 border-t px-[var(--tm-pad)] pb-10 pt-14 sm:pt-20"
      style={{ borderColor: "var(--tm-line)" }}
    >
      <div className="tm-wrap">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2.6fr] lg:gap-16">
          {/* Signature */}
          <div>
            <div className="flex items-center gap-2.5 text-[17px] font-semibold">
              <Logo size={28} />
              Toumaï&nbsp;AI
            </div>

            {/* Le spectre du logo, en toutes lettres : c'est la signature de
             * la marque, elle a sa place au bas de la page. */}
            <div
              className="mt-6 h-[3px] w-32 rounded-full"
              style={{ background: "var(--tm-spectrum)" }}
              aria-hidden="true"
            />

            <div className="mt-7 space-y-2.5 text-[13.5px]" style={{ color: "var(--tm-ink-2)" }}>
              <a href="tel:+23568663737" className="flex items-center gap-2.5 transition hover:opacity-70">
                <span style={{ color: "var(--tm-ink-4)" }} aria-hidden="true">
                  <Icons.phone size={15} />
                </span>
                +235 68 66 37 37
              </a>
              <a
                href="https://wa.me/23591912191"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition hover:opacity-70"
              >
                <span style={{ color: "var(--tm-ink-4)" }} aria-hidden="true">
                  <Icons.chat size={15} />
                </span>
                +235 91 91 21 91
                <span className="sr-only">(WhatsApp)</span>
              </a>
              <a href="mailto:contact@toumaiai.com" className="flex items-center gap-2.5 transition hover:opacity-70">
                <span style={{ color: "var(--tm-ink-4)" }} aria-hidden="true">
                  <MailIcon />
                </span>
                contact@toumaiai.com
              </a>
            </div>
          </div>

          {/* Colonnes */}
          <nav aria-label={t.footer.nav} className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={t.footer.cols[col.col]}>
                <h3
                  className="tm-mono mb-4 text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--tm-ink-4)" }}
                >
                  {t.footer.cols[col.col]}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.k}>
                      <Link
                        href={l.href}
                        className="text-[13.5px] transition-colors hover:opacity-100"
                        style={{ color: "var(--tm-ink-3)" }}
                      >
                        {t.footer.links[l.k]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div
          className="mt-14 flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--tm-line)" }}
        >
          <p className="text-[12px]" style={{ color: "var(--tm-ink-4)" }}>
            {t.footer.rights(new Date().getFullYear())}
          </p>
          <div className="flex items-center gap-1.5">
            {RESEAUX.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="grid h-9 w-9 place-items-center rounded-full border transition-[transform,border-color,color] duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: "var(--tm-line)",
                  background: "var(--tm-surface)",
                  color: "var(--tm-ink-3)",
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Icônes de réseaux ───────────────────────────────────────────────────── */

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M21 7.5 12 13.5 3 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
