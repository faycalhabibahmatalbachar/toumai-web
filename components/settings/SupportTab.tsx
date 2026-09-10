"use client";

import { useState } from "react";
import { ChevronRight, Mail, Phone } from "lucide-react";
import {
  FaFacebookF,
  FaGithub,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
} from "react-icons/fa6";
import { Signalement } from "@/components/Signalement";
import { Panel, Row } from "./Rows";

/** Aide & Support — contact direct (téléphone, WhatsApp, e-mail), réseaux
 * sociaux officiels avec leurs vrais logos SVG (jamais d'emoji), et guide
 * rapide des fonctionnalités. */

const CONTACTS = [
  {
    label: "Téléphone",
    value: "+235 68 66 37 37",
    href: "tel:+23568663737",
    icon: <Phone size={17} strokeWidth={1.8} />,
    tile: "tint" as const,
  },
  {
    label: "WhatsApp",
    value: "+235 91 91 21 91",
    href: "https://wa.me/23591912191",
    icon: <FaWhatsapp size={22} color="#25D366" />,
    tile: "white" as const,
  },
  {
    label: "E-mail",
    value: "contact@toumaiai.com",
    href: "mailto:contact@toumaiai.com",
    icon: <Mail size={17} strokeWidth={1.8} />,
    tile: "tint" as const,
  },
];

const SOCIALS = [
  { label: "Facebook", value: "Toumaï AI", href: "https://www.facebook.com/profile.php?id=61591724459792", icon: <FaFacebookF size={19} color="#1877F2" /> },
  { label: "Instagram", value: "@toumaiai", href: "https://www.instagram.com/toumaiai/", icon: <FaInstagram size={20} color="#E4405F" /> },
  { label: "TikTok", value: "@toumaiai", href: "https://www.tiktok.com/@toumaiai", icon: <FaTiktok size={19} color="#111111" /> },
  { label: "X (Twitter)", value: "@ToumaiAI", href: "https://x.com/ToumaiAI", icon: <FaXTwitter size={18} color="#111111" /> },
  { label: "LinkedIn", value: "Toumaï AI", href: "https://www.linkedin.com/company/toumai-ai", icon: <FaLinkedinIn size={20} color="#0A66C2" /> },
  { label: "GitHub", value: "faycalhabibahmatalbachar", href: "https://github.com/faycalhabibahmatalbachar", icon: <FaGithub size={21} color="#181717" /> },
];

export function SupportTab() {
  const [signalement, setSignalement] = useState(false);
  return (
    <div>
      {signalement && <Signalement onClose={() => setSignalement(false)} />}

      {/* EN PREMIER, ET C'EST VOULU.
          Les liens de contact demandent d'ouvrir un autre outil, de retrouver
          une adresse, et de décrire soi-même le contexte. Un formulaire posé
          ici recueille le contexte tout seul — la page, l'appareil, ce qui
          était à l'écran — et ne demande que la phrase que nous ne pouvons
          pas deviner. */}
      <Panel title="Un problème ?">
        <Row
          label="Signaler ce qui ne va pas"
          description="Un bouton qui ne répond pas, une page figée, une réponse absurde. Nous récupérons automatiquement la page et l'appareil : vous n'avez qu'à décrire ce qui s'est passé."
        >
          <button
            onClick={() => setSignalement(true)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
            style={{ background: "var(--primary)" }}
          >
            Signaler
          </button>
        </Row>
      </Panel>

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
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-[var(--cx-text-faint)]" />
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
            <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-[var(--cx-text-faint)]" />
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
