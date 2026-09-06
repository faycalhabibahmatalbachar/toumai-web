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
          <Link href="/a-propos" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            À propos
          </Link>
          <Link href="/contact" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            Contact
          </Link>
          <Link href="/security" className="text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]">
            Sécurité
          </Link>
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
        <div className="mt-5 flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
          <a
            href="https://wa.me/23591912191"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition hover:text-[var(--text-primary)]"
            aria-label="WhatsApp"
          >
            <WhatsAppIcon />
            +235 91 91 21 91
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61591724459792"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition hover:text-[var(--text-primary)]"
            aria-label="Facebook"
          >
            <FacebookIcon />
            Facebook
          </a>
        </div>
      </main>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z" />
    </svg>
  );
}
