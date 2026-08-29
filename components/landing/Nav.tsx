"use client";

/**
 * Barre de navigation de la vitrine.
 *
 * CE QU'ELLE FAIT DE PLUS QU'UNE BARRE COLLANTE ORDINAIRE
 * -------------------------------------------------------
 * — Elle ne pose son voile qu'une fois qu'on a quitté le haut de page : sur le
 *   hero, elle est invisible et laisse la composition respirer.
 * — Elle indique où l'on se trouve. Un observateur suit les sections et
 *   souligne le lien correspondant : sur une page longue, savoir où l'on est
 *   vaut mieux qu'un menu décoratif.
 * — Un fil du spectre Toumaï, sous la barre, mesure la progression de lecture.
 * — L'action principale reste atteignable partout, y compris sur téléphone où
 *   elle ne disparaît jamais derrière le menu.
 *
 * L'authentification est respectée telle quelle : une session invitée n'est PAS
 * un compte connecté, elle continue de voir Connexion / Inscription.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";

/* Les identifiants sont ceux de l'ancienne page : `#capacites`, `#modeles` et
 * `#contact` circulent déjà dans des liens externes. Une refonte ne casse pas
 * des ancres qui marchent. */
const SECTIONS = [
  { id: "capacites", label: "Capacités" },
  { id: "pourquoi", label: "Pourquoi Toumaï" },
  { id: "modeles", label: "Modèles" },
  { id: "connecteurs", label: "Connecteurs" },
] as const;

export function Nav() {
  const { session, logout } = useAuth();
  const authed = Boolean(session && !session.is_guest);

  const [stuck, setStuck] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);

  /* Défilement : voile + jauge. Lu dans un `requestAnimationFrame` pour ne
   * jamais forcer un recalcul de mise en page depuis l'événement lui-même. */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setStuck(y > 12);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* Section courante — l'entrée la plus haute encore visible sous la barre. */
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (e): e is HTMLElement => Boolean(e),
    );
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Menu mobile : Échap le ferme, et le corps de page ne défile plus derrière. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="tm-nav" data-stuck={stuck}>
      <nav
        className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-[var(--tm-pad)] py-3.5"
        aria-label="Navigation principale"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-[16.5px] font-semibold tracking-tight"
          style={{ color: "var(--tm-ink)" }}
        >
          <Logo size={30} />
          <span className="hidden min-[380px]:inline">Toumaï&nbsp;AI</span>
          <span className="sr-only min-[380px]:hidden">Toumaï AI</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="tm-navlink"
              data-active={active === s.id}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Le sélecteur de thème disparaît sous 640 px : à 320 px, la barre
           * contenait logo + thème + action + menu, et l'action débordait de
           * l'écran. Il reprend sa place dans le panneau mobile, où il a de la
           * largeur. */}
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>

          {authed ? (
            <>
              <button
                onClick={logout}
                className="tm-navlink hidden sm:block"
                style={{ background: "none", border: 0, cursor: "pointer" }}
              >
                Déconnexion
              </button>
              <Link href="/chat" className="tm-btn tm-btn-primary tm-btn-sm">
                <span className="sm:hidden">Ouvrir</span>
                <span className="hidden sm:inline">Ouvrir Toumaï AI</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="tm-navlink hidden md:block">
                Connexion
              </Link>
              <Link
                href="/chat"
                className="tm-btn tm-btn-primary tm-btn-sm"
                data-cta="nav"
              >
                {/* Un seul lien, deux longueurs d'intitulé : sur un petit
                 * écran, « Essayer » suffit et laisse respirer le reste. */}
                <span className="sm:hidden">Essayer</span>
                <span className="hidden sm:inline">Essayer gratuitement</span>
              </Link>
            </>
          )}

          <button
            type="button"
            className="tm-burger flex h-9 w-9 items-center justify-center rounded-lg lg:hidden"
            style={{ color: "var(--tm-ink-2)" }}
            data-open={open}
            aria-expanded={open}
            aria-controls="tm-menu"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div aria-hidden="true">
              <span />
              <span />
            </div>
          </button>
        </div>

        <span className="tm-nav-progress" style={{ "--p": progress } as React.CSSProperties} aria-hidden="true" />
      </nav>

      {/* Panneau mobile. Il reste dans le flux (pas de superposition plein
       * écran) : sur un petit écran, une feuille qui pousse le contenu se
       * referme d'un simple appui n'importe où sur un lien. */}
      <div
        id="tm-menu"
        className="tm-sheet tm-glass absolute inset-x-0 top-full border-b lg:hidden"
        style={{ borderColor: "var(--tm-line)" }}
        data-open={open}
        hidden={!open}
      >
        <div className="px-[var(--tm-pad)] py-4">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b py-3.5 text-[15px]"
              style={{ borderColor: "var(--tm-line)", color: "var(--tm-ink-2)" }}
            >
              {s.label}
              <span aria-hidden="true" style={{ color: "var(--tm-ink-4)" }}>
                →
              </span>
            </a>
          ))}
          <div className="flex flex-col gap-2.5 pt-4">
            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="tm-btn tm-btn-primary w-full"
            >
              Essayer gratuitement
            </Link>
            {!authed && (
              <div className="flex gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="tm-btn tm-btn-ghost flex-1"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="tm-btn tm-btn-ghost flex-1"
                >
                  Inscription
                </Link>
              </div>
            )}
            <div
              className="mt-1 flex items-center justify-between border-t pt-4 text-[14px] sm:hidden"
              style={{ borderColor: "var(--tm-line)", color: "var(--tm-ink-3)" }}
            >
              Apparence
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
