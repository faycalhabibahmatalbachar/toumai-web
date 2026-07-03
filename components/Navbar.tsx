"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

export function Navbar() {
  const { session, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <Logo size={30} />
          Toumaï AI
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/chat"
                className="rounded-lg px-4 py-2 font-medium text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Ouvrir le chat
              </Link>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Se connecter
              </Link>
              <Link
                href="/chat"
                className="rounded-lg px-4 py-2 font-medium text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Essayer gratuitement
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
