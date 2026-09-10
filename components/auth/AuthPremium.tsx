"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { ToumaiLogoMotion } from "@/components/auth/ToumaiLogoMotion";
import { LANG_META, LANGS, useLang, type Lang } from "@/lib/i18n/context";

import "./auth.css";
import "./auth-reference.css";
import "./auth-compact.css";

const LANG_SHORT: Record<Lang, string> = {
  fr: "FR",
  "ar-td": "TD",
  ar: "AR",
  en: "EN",
};

const SHELL_COPY: Record<Lang, {
  language: string;
  authLabel: string;
  continuing: string;
  terms: string;
  and: string;
  privacy: string;
}> = {
  fr: {
    language: "Langue",
    authLabel: "Authentification Toumaï AI",
    continuing: "En continuant, vous acceptez nos",
    terms: "Conditions d’utilisation",
    and: "et notre",
    privacy: "Politique de confidentialité",
  },
  "ar-td": {
    language: "اللغة",
    authLabel: "الدخول إلى Toumaï AI",
    continuing: "بالمواصلة، إنت موافق على",
    terms: "شروط الاستخدام",
    and: "و",
    privacy: "سياسة الخصوصية",
  },
  ar: {
    language: "اللغة",
    authLabel: "تسجيل الدخول إلى Toumaï AI",
    continuing: "بالمتابعة، فإنك توافق على",
    terms: "شروط الاستخدام",
    and: "و",
    privacy: "سياسة الخصوصية",
  },
  en: {
    language: "Language",
    authLabel: "Toumaï AI authentication",
    continuing: "By continuing, you agree to our",
    terms: "Terms of Use",
    and: "and",
    privacy: "Privacy Policy",
  },
};

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
        <ToumaiLogoMotion />
      </div>
    </div>
  );
}

function MarquePanneau() {
  return (
    <Link href="/" className="auth-brand-lockup" aria-label="Retour à l’accueil Toumaï AI">
      <Logo size={52} />
      <span className="auth-brand-copy">
        <strong>Toumaï AI</strong>
        <small>DES IDÉES PLUS LOIN</small>
      </span>
    </Link>
  );
}

function AuthLanguageMenu() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const copy = SHELL_COPY[lang];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeEscape);
    };
  }, [open]);

  return (
    <div className="auth-langue" ref={rootRef} dir="ltr">
      <button
        type="button"
        className="auth-langue-bouton"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${copy.language}: ${LANG_META[lang].native}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{LANG_SHORT[lang]}</span>
        <svg viewBox="0 0 12 8" aria-hidden="true" className={open ? "ouvert" : ""}>
          <path d="m1.5 1.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul id={menuId} role="listbox" className="auth-langue-menu" aria-label={copy.language}>
          {LANGS.map((option) => {
            const meta = LANG_META[option];
            const active = option === lang;
            return (
              <li key={option}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  lang={meta.htmlLang}
                  dir={meta.dir}
                  className={active ? "actif" : ""}
                  onClick={() => {
                    setLang(option);
                    setOpen(false);
                  }}
                >
                  <span>{meta.native}</span>
                  {active && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AuthPremium({
  titre,
  intro,
  children,
  langueActive = false,
  variante,
}: {
  titre: string;
  intro?: ReactNode;
  children: ReactNode;
  langueActive?: boolean;
  variante?: "register";
}) {
  const { lang, dir } = useLang();
  const copy = SHELL_COPY[lang];

  return (
    <main
      className={[
        "auth",
        langueActive ? "auth-login" : "",
        variante === "register" ? "auth-register" : "",
      ].filter(Boolean).join(" ")}
      dir="ltr"
    >
      <section className="auth-vitrine" aria-label="Univers visuel Toumaï AI">
        <CinemaToumai />
      </section>

      <section className="auth-panneau" aria-label={copy.authLabel} dir={dir}>
        {langueActive && <AuthLanguageMenu />}

        <div className="auth-panneau-corps">
          <MarquePanneau />
          <h1>{titre}</h1>
          {intro ? <p className="auth-sous-titre">{intro}</p> : null}
          {children}
        </div>

        <footer className="auth-pied">
          <span>{copy.continuing}</span>
          <Link href="/terms/">{copy.terms}</Link>
          <span>{copy.and}</span>
          <Link href="/privacy/">{copy.privacy}</Link>
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
