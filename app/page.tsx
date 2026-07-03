import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const FEATURES = [
  {
    title: "Sao 4 & Toumaï 5",
    desc: "Sao 4 pour le code et le quotidien, Toumaï 5 pour le raisonnement profond sur les tâches complexes.",
    icon: "🧠",
  },
  {
    title: "Réponses en temps réel",
    desc: "Les réponses s'écrivent en direct sous vos yeux — aucune attente inutile.",
    icon: "⚡",
  },
  {
    title: "Génération d'images",
    desc: "Décrivez un visuel, Toumaï AI le crée pour vous.",
    icon: "🎨",
  },
  {
    title: "Agent Navigateur",
    desc: "Toumaï AI pilote un vrai navigateur : il navigue, clique, remplit des formulaires pour accomplir vos tâches web.",
    icon: "🌐",
  },
  {
    title: "Connecteurs",
    desc: "WhatsApp, Mail et Google Agenda — lisez, résumez et envoyez directement depuis la conversation.",
    icon: "🔗",
  },
  {
    title: "Multilingue",
    desc: "Français, arabe et anglais — Toumaï AI s'adapte à votre langue, y compris le tchadien familier.",
    icon: "🗣️",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-28 text-center sm:py-40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 900px 500px at 50% -10%, color-mix(in srgb, var(--primary) 18%, transparent), transparent 70%)",
          }}
        />
        <p className="mb-5 inline-block rounded-full border border-[var(--border)] px-4 py-1 text-xs font-medium text-[var(--text-secondary)]">
          Conçu et développé par Faycal Habib Ahmat
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">
          Votre assistant IA,{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--primary), var(--thinking))",
            }}
          >
            toujours là.
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg text-[var(--text-secondary)]">
          Toumaï AI discute, code, génère des images, navigue le web et gère vos
          WhatsApp/Mail/Agenda — tout ce que fait l&apos;app mobile, directement
          dans votre navigateur.
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/chat"
            className="rounded-full px-8 py-3.5 text-base font-medium text-white shadow-lg shadow-[var(--primary)]/25 transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Discuter maintenant — sans compte
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-[var(--border)] px-8 py-3.5 text-base font-medium text-[var(--text-primary)] transition hover:border-[var(--primary)]"
          >
            Créer un compte
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-32 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 transition hover:border-[var(--primary)]/50"
          >
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-xl"
              style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
              aria-hidden="true"
            >
              {f.icon}
            </div>
            <h3 className="mb-2 text-[15px] font-semibold">{f.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-8 text-center text-sm text-[var(--text-tertiary)]">
        Toumaï AI — conçu et développé par Faycal Habib Ahmat.
      </footer>
    </div>
  );
}
