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

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61591724459792", icon: <FacebookIcon /> },
  { label: "TikTok", href: "https://www.tiktok.com/@toumaiai", icon: <TikTokIcon /> },
  { label: "X (Twitter)", href: "https://x.com/toumaiai", icon: <XIcon /> },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/toumaiai", icon: <LinkedInIcon /> },
  { label: "GitHub", href: "https://github.com/Toumai-AI", icon: <GitHubIcon /> },
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
            <p className="mt-4 max-w-[34ch] text-[13.5px] leading-relaxed" style={{ color: "var(--tm-ink-3)" }}>
              {t.footer.blurb}
            </p>

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
            {SOCIALS.map((s) => (
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

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 2h3a6.3 6.3 0 001.9 4.2 6.5 6.5 0 003 1.5v3.1a9.8 9.8 0 01-4.9-1.6v6.9a6.9 6.9 0 11-6.9-6.9c.3 0 .7 0 1 .1v3.2a3.7 3.7 0 101.9 3.4V2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7 3.7H5.2L17.8 20z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.1a4.2 4.2 0 013.8-2.1c4 0 4.8 2.7 4.8 6.1V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 016.8 8.6a3.6 3.6 0 01.1-2.7s.8-.3 2.8 1a9.6 9.6 0 015 0c1.9-1.3 2.8-1 2.8-1a3.6 3.6 0 01.1 2.7 3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0012 2z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M21 7.5 12 13.5 3 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
