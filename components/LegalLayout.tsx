import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Gabarit des pages légales et institutionnelles — sobre, lisible, serif. */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex select-none items-center justify-between px-4 py-3">
        <Link href="/" draggable={false} className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="text-sm font-semibold">Toumaï AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/chat"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Ouvrir le chat
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-8">
        <h1 className="landing-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">Dernière mise à jour : {updated}</p>
        )}
        <div className="prose-toumai mt-8 text-[15px] leading-relaxed text-[var(--text-secondary)] [&_h2]:landing-serif [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:text-[var(--text-primary)] [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-[var(--text-primary)] [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
          {children}
        </div>
        <div className="mt-14 flex flex-wrap gap-4 border-t border-[var(--border)] pt-6 text-sm">
          <Link href="/terms" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            Conditions & politiques
          </Link>
          <Link href="/privacy" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            Politique de confidentialité
          </Link>
          <Link href="/privacy-choices" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            Choix de confidentialité
          </Link>
        </div>
      </main>
    </div>
  );
}
