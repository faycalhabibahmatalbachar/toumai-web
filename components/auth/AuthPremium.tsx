import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

import "./auth.css";
import "./auth-reference.css";

function CinemaToumai() {
  return (
    <div className="auth-cinema" aria-hidden="true">
      <span className="auth-cinema-glow" />
      <span className="auth-cinema-wave un" />
      <span className="auth-cinema-wave deux" />
      <span className="auth-orbite" />
      <span className="auth-orbite deux" />
      <span className="auth-orbite trois" />
      <span className="auth-planete grande" />
      <span className="auth-planete petite" />
      <span className="auth-planete petite-deux" />
      <span className="auth-planete ivoire" />
      <div className="auth-hero-logo">
        <Logo size={390} />
      </div>
    </div>
  );
}

function MarquePanneau() {
  return (
    <Link href="/" className="auth-brand-lockup" aria-label="Retour à l’accueil Toumaï AI">
      <Logo size={62} />
      <span className="auth-brand-copy">
        <strong>Toumaï AI</strong>
        <small>DES IDÉES PLUS LOIN</small>
      </span>
    </Link>
  );
}

export function AuthPremium({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="auth">
      <section className="auth-vitrine" aria-label="Univers visuel Toumaï AI">
        <CinemaToumai />
      </section>

      <section className="auth-panneau" aria-label="Authentification Toumaï AI">
        <span className="auth-langue" aria-label="Langue actuelle : français">FR</span>

        <div className="auth-panneau-corps">
          <MarquePanneau />
          <h1>{titre}</h1>
          <p className="auth-sous-titre">{intro}</p>
          {children}
        </div>

        <footer className="auth-pied">
          <Link href="/terms/">Conditions d’utilisation</Link>
          <span aria-hidden="true">et notre</span>
          <Link href="/privacy/">Politique de confidentialité</Link>
          <Link href="/contact/">Aide</Link>
        </footer>
      </section>
    </main>
  );
}

export function IconeInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeAlerte() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 4.5 2.8 20h18.4L12 4.5z" strokeLinejoin="round" />
      <path d="M12 10v4.2M12 17.3v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeOeil({ ouvert }: { ouvert: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.5 12S6.8 5.5 12 5.5 21.5 12 21.5 12 17.2 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" />
      {!ouvert && <path d="M4 20 20 4" strokeLinecap="round" />}
    </svg>
  );
}
