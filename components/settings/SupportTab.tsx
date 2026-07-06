import { Panel } from "./Rows";

/** Aide & Support — contact direct (téléphone, WhatsApp, e-mail), réseaux
 * sociaux officiels avec leurs vrais logos SVG (jamais d'emoji), et guide
 * rapide des fonctionnalités. */

const CONTACTS = [
  {
    label: "Téléphone",
    value: "+235 68 66 37 37",
    href: "tel:+23568663737",
    icon: <PhoneGlyph />,
    tile: "tint" as const,
  },
  {
    label: "WhatsApp",
    value: "+235 91 91 21 91",
    href: "https://wa.me/23591912191",
    icon: <WhatsAppGlyph />,
    tile: "white" as const,
  },
  {
    label: "E-mail",
    value: "contact@toumaiai.com",
    href: "mailto:contact@toumaiai.com",
    icon: <MailGlyph />,
    tile: "tint" as const,
  },
];

const SOCIALS = [
  { label: "Facebook", value: "Toumaï AI", href: "https://www.facebook.com/profile.php?id=61591724459792", icon: <FacebookGlyph /> },
  { label: "TikTok", value: "@toumaiai", href: "https://www.tiktok.com/@toumaiai", icon: <TikTokGlyph /> },
  { label: "X (Twitter)", value: "@toumaiai", href: "https://x.com/toumaiai", icon: <XGlyph /> },
  { label: "LinkedIn", value: "Toumaï AI", href: "https://www.linkedin.com/company/toumaiai", icon: <LinkedInGlyph /> },
  { label: "GitHub", value: "faycalhabibahmatalbachar", href: "https://github.com/faycalhabibahmatalbachar", icon: <GitHubGlyph /> },
];

export function SupportTab() {
  return (
    <div>
      <Panel title="Contact direct">
        {CONTACTS.map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3.5 border-t border-[var(--cx-border-subtle)] px-5 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--cx-hover-row)]"
          >
            <Tile kind={c.tile}>{c.icon}</Tile>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--cx-text-primary)]">{c.label}</p>
              <p className="truncate text-[13px] tabular-nums text-[var(--cx-text-secondary)]">
                {c.value}
              </p>
            </div>
            <ChevronGlyph />
          </a>
        ))}
      </Panel>

      <Panel title="Réseaux sociaux">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 border-t border-[var(--cx-border-subtle)] px-5 py-3.5 transition-colors first:border-t-0 hover:bg-[var(--cx-hover-row)]"
          >
            <Tile kind="white">{s.icon}</Tile>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--cx-text-primary)]">{s.label}</p>
              <p className="truncate text-[13px] text-[var(--cx-text-secondary)]">{s.value}</p>
            </div>
            <ChevronGlyph />
          </a>
        ))}
      </Panel>

      <Panel title="Guide rapide">
        <ul>
          {[
            {
              t: "Connecteurs",
              d: "Reliez Google Agenda, Mail ou WhatsApp depuis l'onglet Connecteurs pour que Toumaï AI puisse agir dessus.",
            },
            {
              t: "Agent Navigateur",
              d: "Confiez une tâche web (rechercher, remplir un formulaire) depuis le menu « + » du chat.",
            },
            {
              t: "Mode vocal",
              d: "L'icône à côté du micro lance une conversation orale complète.",
            },
            {
              t: "Réflexion",
              d: "Passez sur Toumaï 5 dans le sélecteur de modèle pour un raisonnement plus approfondi sur les tâches complexes.",
            },
          ].map((g) => (
            <li
              key={g.t}
              className="border-t border-[var(--cx-border-subtle)] px-5 py-3.5 first:border-t-0"
            >
              <p className="text-sm font-medium text-[var(--cx-text-primary)]">{g.t}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">
                {g.d}
              </p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Décrire un problème">
        <div className="px-5 py-4">
          <p className="text-[13px] leading-relaxed text-[var(--cx-text-secondary)]">
            Le plus rapide reste de décrire votre problème directement à Toumaï AI dans le chat —
            question sur une fonctionnalité, bug rencontré ou suggestion.
          </p>
          <a
            href="/chat"
            className="mt-3 inline-block rounded-[9px] px-3.5 py-2 text-xs font-semibold text-[#FFF6F1] transition hover:bg-[var(--cx-accent-hover)]"
            style={{ background: "var(--cx-accent)" }}
          >
            Ouvrir le chat
          </a>
        </div>
      </Panel>
    </div>
  );
}

/** Tuile 40×40 — blanche pour les vrais logos de marque, teintée accent pour
 * les icônes génériques (même langage que les connecteurs). */
function Tile({ kind, children }: { kind: "white" | "tint"; children: React.ReactNode }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
      style={
        kind === "white"
          ? { background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }
          : { background: "var(--cx-accent-bg)", color: "var(--cx-accent-text)" }
      }
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/* ---------- Icônes — logos officiels SVG + traits génériques ---------- */

function PhoneGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.13.96.36 1.9.7 2.8a2 2 0 01-.45 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.45c.9.34 1.84.57 2.8.7a2 2 0 011.7 2.05z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M3 7l9 6.5L21 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#25D366" />
      <path
        d="M24 11.5c-6.9 0-12.5 5.6-12.5 12.5 0 2.2.6 4.3 1.6 6.2l-1.7 6.3 6.5-1.7c1.8 1 3.9 1.5 6.1 1.5 6.9 0 12.5-5.6 12.5-12.5S30.9 11.5 24 11.5z"
        fill="#fff"
      />
      <path
        d="M19.6 17.8c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5s-1.5 1.4-1.5 3.5 1.5 4.1 1.7 4.3c.2.3 3 4.7 7.3 6.4 3.6 1.4 4.3 1.1 5.1 1.1.8-.1 2.5-1 2.8-2s.4-1.8.3-2c-.1-.2-.4-.3-.8-.5s-2.5-1.2-2.9-1.4c-.4-.1-.7-.2-.9.2-.3.4-1 1.4-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.2-.4 0-.7.2-.9.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.3-1.3-3.1z"
        fill="#25D366"
      />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#1877F2" />
      <path
        d="M30.7 30.2l.9-5.8h-5.6v-3.7c0-1.6.8-3.1 3.3-3.1h2.5v-4.9s-2.3-.4-4.5-.4c-4.6 0-7.6 2.8-7.6 7.8v4.4h-5.1v5.8h5.1V44a20.3 20.3 0 006.3 0V30.2h4.7z"
        fill="#fff"
      />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M33.6 9.4A9.6 9.6 0 0131.2 3h-6.3v25.4a5.33 5.33 0 11-3.8-8.4V13.6A11.7 11.7 0 1033.2 25v-9.6a15.8 15.8 0 008.8 2.7v-6.4a9.6 9.6 0 01-8.4-2.3z"
        fill="#000"
      />
      <path
        d="M33.6 9.4A9.6 9.6 0 0131.2 3h-1.7v23.9a5.33 5.33 0 01-8.1 4.6 5.33 5.33 0 003.8-2.1V13.6h1.9V11a11.7 11.7 0 00-1.9-.1v2.7"
        fill="#25F4EE"
        opacity=".9"
      />
      <path
        d="M35.5 13a9.6 9.6 0 006.5 2.5v-1.8a9.6 9.6 0 01-6.5-2.6v1.9zM24.9 32.4a5.33 5.33 0 01-5.2-4.2 5.33 5.33 0 107.9-5.6v9a11.6 11.6 0 01-2.7.8z"
        fill="#FE2C55"
        opacity=".85"
      />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.4z"
        fill="#000"
      />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="4" width="40" height="40" rx="6" fill="#0A66C2" />
      <path
        d="M15.4 18.6h-5V38h5V18.6zM12.9 10a2.9 2.9 0 100 5.8 2.9 2.9 0 000-5.8zM28.6 18.2c-2.8 0-4.4 1.5-5.1 2.9h-.1v-2.5h-4.8V38h5V28.4c0-2.5.9-4.2 3.2-4.2 2.2 0 3 1.9 3 4.3V38h5V27.4c0-5.5-2.4-9.2-6.2-9.2z"
        fill="#fff"
      />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 .5A11.5 11.5 0 00.5 12a11.5 11.5 0 007.86 10.92c.58.1.79-.25.79-.55v-2.16c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.34.96.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11 11 0 015.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.2.66.8.55A11.5 11.5 0 0023.5 12 11.5 11.5 0 0012 .5z"
        fill="#181717"
      />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0 text-[var(--cx-text-faint)]"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
