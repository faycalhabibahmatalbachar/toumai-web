"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

/** Barre de navigation de la page d'accueil — jetons éditoriaux `--landing-*`
 * (ivoire/charbon chaud), volontairement distincte du violet de l'app. */
export function Navbar() {
  const { session, logout } = useAuth();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--landing-line)",
        background: "color-mix(in srgb, var(--landing-bg) 88%, transparent)",
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[17px] font-semibold"
          style={{ color: "var(--landing-ink)" }}
        >
          <Logo size={28} />
          Toumaï AI
        </Link>

        <div
          className="hidden items-center gap-7 text-sm md:flex"
          style={{ color: "var(--landing-muted)" }}
        >
          <a href="/#capacites" className="transition hover:opacity-70">
            Capacités
          </a>
          <a href="/#modeles" className="transition hover:opacity-70">
            Modèles
          </a>
          <a href="/#contact" className="transition hover:opacity-70">
            Contact
          </a>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          {session ? (
            <>
              <button
                onClick={logout}
                className="hidden px-2 py-2 transition hover:opacity-70 sm:block"
                style={{ color: "var(--landing-muted)" }}
              >
                Déconnexion
              </button>
              <Link
                href="/chat"
                className="rounded-full px-5 py-2.5 font-medium transition hover:opacity-85"
                style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
              >
                Ouvrir Toumaï AI
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden px-2 py-2 transition hover:opacity-70 sm:block"
                style={{ color: "var(--landing-muted)" }}
              >
                Se connecter
              </Link>
              <Link
                href="/chat"
                className="rounded-full px-5 py-2.5 font-medium transition hover:opacity-85"
                style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
              >
                Ouvrir Toumaï AI
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
