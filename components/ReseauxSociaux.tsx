/**
 * Les comptes officiels de Toumaï AI, et leurs pictogrammes.
 *
 * Cette liste vivait dans `landing/Closing.tsx`. La nouvelle page d'accueil a
 * elle aussi un pied de page, avec les mêmes comptes : recopier six liens et
 * six tracés SVG dans un second fichier, c'était se garantir qu'un jour l'un
 * des deux pointerait vers un compte fermé. Une seule liste, deux pieds de
 * page.
 *
 * Les tracés sont monochromes et héritent la couleur du texte (`currentColor`) :
 * ils s'adaptent au fond clair de la page d'accueil comme au fond sombre du
 * pied de page. Un dégradé Instagram jurerait au milieu d'une rangée
 * monochrome — d'où l'icône au trait.
 */

import type { ReactNode } from "react";

export function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 2h3a6.3 6.3 0 001.9 4.2 6.5 6.5 0 003 1.5v3.1a9.8 9.8 0 01-4.9-1.6v6.9a6.9 6.9 0 11-6.9-6.9c.3 0 .7 0 1 .1v3.2a3.7 3.7 0 101.9 3.4V2z" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7 3.7H5.2L17.8 20z" />
    </svg>
  );
}

export function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.1a4.2 4.2 0 013.8-2.1c4 0 4.8 2.7 4.8 6.1V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z" />
    </svg>
  );
}

export function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 016.8 8.6a3.6 3.6 0 01.1-2.7s.8-.3 2.8 1a9.6 9.6 0 015 0c1.9-1.3 2.8-1 2.8-1a3.6 3.6 0 01.1 2.7 3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0012 2z" />
    </svg>
  );
}

export const RESEAUX: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61591724459792",
    icon: <FacebookIcon />,
  },
  { label: "Instagram", href: "https://www.instagram.com/toumaiai/", icon: <InstagramIcon /> },
  { label: "TikTok", href: "https://www.tiktok.com/@toumaiai", icon: <TikTokIcon /> },
  { label: "X (Twitter)", href: "https://x.com/ToumaiAI", icon: <XIcon /> },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/toumai-ai", icon: <LinkedInIcon /> },
  { label: "GitHub", href: "https://github.com/Toumai-AI", icon: <GitHubIcon /> },
];

/* ── Les points de contact ─────────────────────────────────────────────────
 *
 * Les trois lignes s'affichaient jusqu'ici comme trois liens nus posés côte à
 * côte : un numéro, un autre numéro, une adresse. Rien ne disait lequel est le
 * standard et lequel est WhatsApp, et un numéro sans étiquette ne se compose
 * pas — on hésite. Chaque point porte donc son pictogramme, son étiquette et
 * sa valeur, et le pied de page les présente en colonnes.
 */

export function TelephoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.1-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42h-.47c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.18 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
  );
}

export function CourrielIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export const CONTACTS: {
  libelle: string;
  valeur: string;
  href: string;
  externe?: boolean;
  icon: ReactNode;
}[] = [
  {
    libelle: "Téléphone",
    valeur: "+235 68 66 37 37",
    href: "tel:+23568663737",
    icon: <TelephoneIcon />,
  },
  {
    libelle: "WhatsApp",
    valeur: "+235 91 91 21 91",
    href: "https://wa.me/23591912191",
    externe: true,
    icon: <WhatsAppIcon />,
  },
  {
    libelle: "E-mail",
    valeur: "contact@toumaiai.com",
    href: "mailto:contact@toumaiai.com",
    icon: <CourrielIcon />,
  },
];
