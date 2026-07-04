import Link from "next/link";
import { Fraunces } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});

export default function Home() {
  return (
    <div
      className={`${fraunces.variable} flex flex-1 flex-col`}
      style={{ background: "var(--landing-bg)", color: "var(--landing-ink)" }}
    >
      <Navbar />

      {/* Hero */}
      <section className="px-6 pb-16 pt-24 text-center sm:pt-32">
        <h1 className="landing-serif mx-auto max-w-3xl text-5xl font-medium leading-[1.08] tracking-tight sm:text-7xl">
          L&apos;assistant IA qui parle{" "}
          <em className="font-normal not-italic" style={{ color: "var(--landing-terra)", fontStyle: "italic" }}>
            votre langue.
          </em>
        </h1>
        <p
          className="mx-auto mt-7 max-w-xl text-lg leading-relaxed"
          style={{ color: "var(--landing-muted)" }}
        >
          Discutez, codez, créez des images et parlez à voix haute — en
          français, en arabe et en anglais. Gratuit, sans compte.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/chat"
            className="rounded-full px-8 py-4 text-base font-medium transition hover:opacity-85"
            style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
          >
            Commencer gratuitement
          </Link>
          <a
            href="#capacites"
            className="text-[15px] font-medium transition hover:opacity-70"
          >
            Découvrir les capacités →
          </a>
        </div>
      </section>

      {/* Fenêtre produit */}
      <section className="px-6">
        <ProductWindow />
      </section>

      {/* Faits */}
      <p
        className="px-6 pb-4 pt-14 text-center text-[13px] tracking-[0.08em]"
        style={{ color: "var(--landing-faint)" }}
      >
        GRATUIT&ensp;·&ensp;FRANÇAIS · ARABE · ANGLAIS&ensp;·&ensp;WEB &amp; MOBILE
      </p>

      {/* Capacités */}
      <section id="capacites" className="scroll-mt-24 px-6 pt-24">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--landing-terra)" }}
          >
            Capacités
          </p>
          <h2 className="landing-serif max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Un seul assistant,{" "}
            <em style={{ color: "var(--landing-terra)" }}>tout l&apos;essentiel.</em>
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Mode vocal — tuile haute */}
            <Tile className="lg:row-span-2">
              <h3 className="text-base font-semibold">Mode vocal en temps réel</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Parlez naturellement. Toumaï AI détecte la fin de votre phrase et
                répond à voix haute, phrase par phrase.
              </p>
              <div
                className="relative mx-auto mb-3 mt-10 h-32 w-32 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #e8b48a, var(--landing-terra) 55%, #8c3a1e)",
                  boxShadow: "0 18px 44px -14px color-mix(in srgb, var(--landing-terra) 55%, transparent)",
                }}
                aria-hidden="true"
              />
              <p className="text-center text-xs" style={{ color: "var(--landing-faint)" }}>
                « Je vous écoute… »
              </p>
            </Tile>

            {/* Code — tuile sombre */}
            <Tile dark>
              <h3 className="text-base font-semibold">Code &amp; développement</h3>
              <p className="mt-1.5 text-sm opacity-70">Générez, expliquez, corrigez.</p>
              <pre className="mt-5 overflow-hidden whitespace-pre font-mono text-xs leading-7">
                <span style={{ color: "#7a7264" }}># Tri rapide</span>
                {"\n"}
                <span style={{ color: "#d9a441" }}>def</span>{" "}
                <span style={{ color: "#8fb4e3" }}>quicksort</span>(t):
                {"\n    "}
                <span style={{ color: "#d9a441" }}>if</span> len(t) &lt;= 1:{" "}
                <span style={{ color: "#d9a441" }}>return</span> t
              </pre>
            </Tile>

            {/* Images — vraie image générée par le pipeline */}
            <Tile>
              <h3 className="text-base font-semibold">Génération d&apos;images</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Décrivez, Toumaï AI crée — signature intégrée à l&apos;image.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/showcase.png"
                alt="Dunes de sable au crépuscule — image générée par Toumaï AI"
                className="mt-5 w-full rounded-xl"
                loading="lazy"
              />
            </Tile>

            {/* Agent Navigateur — tuile haute */}
            <Tile className="lg:row-span-2">
              <h3 className="text-base font-semibold">Agent Navigateur</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Confiez une tâche web : Toumaï AI pilote un vrai navigateur,
                étape par étape.
              </p>
              <div
                className="mt-5 overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--landing-line)" }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-2"
                  style={{ background: "color-mix(in srgb, var(--landing-line) 40%, transparent)" }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full"
                      style={{ background: "var(--landing-line)" }}
                    />
                  ))}
                  <span
                    className="ml-2 flex-1 rounded px-2.5 py-0.5 text-[11px]"
                    style={{ background: "var(--landing-card)", color: "var(--landing-faint)" }}
                  >
                    bing.com/search?q=…
                  </span>
                </div>
                <div className="space-y-2 p-3.5">
                  {["80%", "95%", "60%"].map((w) => (
                    <div
                      key={w}
                      className="h-2 rounded"
                      style={{ width: w, background: "color-mix(in srgb, var(--landing-line) 60%, transparent)" }}
                    />
                  ))}
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {["Recherche la page demandée", "Extrait l'information", "Rend compte du résultat"].map(
                  (step, i) => (
                    <li key={step} className="flex items-center gap-2.5 text-xs" style={{ color: "var(--landing-muted)" }}>
                      <span
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                        style={{ background: "var(--landing-terra-soft)", color: "var(--landing-terra)" }}
                      >
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ),
                )}
              </ul>
            </Tile>

            {/* Connecteurs */}
            <Tile>
              <h3 className="text-base font-semibold">Connecteurs</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Vos outils, dans la conversation.
              </p>
              <div className="mt-4">
                {["WhatsApp", "Mail", "Google Agenda"].map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between py-2.5 text-sm"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--landing-line)" : "none",
                    }}
                  >
                    {name}
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px]"
                      style={{
                        background: "color-mix(in srgb, var(--success) 14%, transparent)",
                        color: "var(--success)",
                      }}
                    >
                      Connecté
                    </span>
                  </div>
                ))}
              </div>
            </Tile>

            {/* Multilingue */}
            <Tile>
              <h3 className="text-base font-semibold">Multilingue</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Trois langues, un même assistant.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { word: "Bonjour", lang: "Français" },
                  { word: "مرحبا", lang: "Arabe — y compris tchadien" },
                  { word: "Hello", lang: "Anglais" },
                ].map((l) => (
                  <div key={l.lang}>
                    <p className="landing-serif text-xl">{l.word}</p>
                    <p className="text-[11.5px]" style={{ color: "var(--landing-faint)" }}>
                      {l.lang}
                    </p>
                  </div>
                ))}
              </div>
            </Tile>
          </div>
        </div>
      </section>

      {/* Modèles */}
      <section id="modeles" className="scroll-mt-24 px-6 pt-24">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--landing-terra)" }}
          >
            Modèles
          </p>
          <h2 className="landing-serif max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Deux modèles, <em style={{ color: "var(--landing-terra)" }}>zéro confusion.</em>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "Sao 4",
                tag: "Code & quotidien",
                desc: "Le modèle par défaut — rapide et polyvalent pour la conversation, le code et les tâches courantes.",
                use: "Idéal pour : questions, rédaction, développement.",
              },
              {
                name: "Toumaï 5",
                tag: "Raisonnement profond",
                desc: "Prend le temps de réfléchir, étape par étape, sur les questions complexes qui le méritent.",
                use: "Idéal pour : analyse, problèmes difficiles, décisions.",
              },
            ].map((m) => (
              <div
                key={m.name}
                className="rounded-[20px] border p-9"
                style={{ borderColor: "var(--landing-line)", background: "var(--landing-card)" }}
              >
                <p className="landing-serif text-[28px] font-medium">{m.name}</p>
                <p
                  className="mt-1.5 text-[13px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: "var(--landing-terra)" }}
                >
                  {m.tag}
                </p>
                <p className="mt-3.5 text-[15px]" style={{ color: "var(--landing-muted)" }}>
                  {m.desc}
                </p>
                <p className="mt-5 text-[13px]" style={{ color: "var(--landing-faint)" }}>
                  {m.use}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-28">
        <div
          className="mx-auto max-w-5xl rounded-[28px] px-10 py-20 text-center"
          style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
        >
          <h2 className="landing-serif text-4xl font-medium tracking-tight sm:text-5xl">
            Commencez{" "}
            <em style={{ color: "var(--landing-gold)" }}>la conversation.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md opacity-70">
            Ouvrez le chat et parlez à Toumaï AI maintenant.
          </p>
          <Link
            href="/chat"
            className="mt-9 inline-block rounded-full px-8 py-4 text-base font-medium transition hover:opacity-90"
            style={{ background: "var(--landing-on-ink)", color: "var(--landing-ink)" }}
          >
            Ouvrir Toumaï AI
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t px-6 pb-12 pt-16" style={{ borderColor: "var(--landing-line)" }}>
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-[2fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Logo size={24} />
              Toumaï AI
            </div>
            <p className="mt-3 max-w-[260px] text-[13px]" style={{ color: "var(--landing-faint)" }}>
              Nommé d&apos;après le plus ancien hominidé connu. L&apos;intelligence,
              depuis toujours.
            </p>
          </div>
          <FooterCol
            title="Produit"
            links={[
              { label: "Chat", href: "/chat" },
              { label: "Agent Navigateur", href: "/agent" },
              { label: "Connecteurs", href: "/settings?tab=connectors" },
            ]}
          />
          <FooterCol
            title="Compte"
            links={[
              { label: "Créer un compte", href: "/register" },
              { label: "Se connecter", href: "/login" },
            ]}
          />
          <div>
            <h4 className="mb-3.5 text-[13px] font-semibold">Contact</h4>
            <div className="space-y-2.5 text-[13.5px]" style={{ color: "var(--landing-muted)" }}>
              <a
                href="tel:+23568663737"
                className="flex items-center gap-2.5 transition hover:opacity-70"
              >
                <PhoneIcon />
                +235 68 66 37 37
              </a>
              <a
                href="https://wa.me/23591912191"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition hover:opacity-70"
              >
                <WhatsAppIcon />
                +235 91 91 21 91
              </a>
              <a
                href="mailto:contact@toumaiai.com"
                className="flex items-center gap-2.5 transition hover:opacity-70"
              >
                <MailIcon />
                contact@toumaiai.com
              </a>
            </div>
          </div>
        </div>
        <p
          className="mx-auto mt-12 max-w-5xl border-t pt-6 text-xs"
          style={{ borderColor: "var(--landing-line)", color: "var(--landing-faint)" }}
        >
          © {new Date().getFullYear()} Toumaï AI. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}

/* ---------- Composants locaux ---------- */

function Tile({
  children,
  className = "",
  dark = false,
}: {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border p-7 ${className}`}
      style={
        dark
          ? { background: "#1f1b16", borderColor: "#1f1b16", color: "#e8e2d6" }
          : { background: "var(--landing-card)", borderColor: "var(--landing-line)" }
      }
    >
      {children}
    </div>
  );
}

/** Maquette fidèle de l'application — sidebar, échange réel, composer. */
function ProductWindow() {
  return (
    <div
      className="mx-auto flex h-[420px] max-w-4xl overflow-hidden rounded-2xl border text-left"
      style={{
        borderColor: "var(--landing-line)",
        background: "var(--landing-card)",
        boxShadow: "0 24px 60px -24px rgba(31,27,22,.18)",
      }}
    >
      <div
        className="hidden w-52 shrink-0 border-r p-3 text-xs sm:block"
        style={{
          borderColor: "var(--landing-line)",
          color: "var(--landing-muted)",
          background: "color-mix(in srgb, var(--landing-line) 22%, transparent)",
        }}
      >
        <div
          className="mb-3.5 rounded-lg px-2.5 py-2 font-medium"
          style={{
            background: "color-mix(in srgb, var(--landing-line) 55%, transparent)",
            color: "var(--landing-ink)",
          }}
        >
          + Nouvelle conversation
        </div>
        {[
          { label: "Fonction Fibonacci en Python", on: true },
          { label: "Résumé du royaume du Kanem", on: false },
          { label: "Image — coucher de soleil", on: false },
          { label: "Traduction en arabe", on: false },
        ].map((c) => (
          <div
            key={c.label}
            className="truncate rounded-md px-2.5 py-[7px]"
            style={
              c.on
                ? {
                    background: "color-mix(in srgb, var(--landing-line) 55%, transparent)",
                    color: "var(--landing-ink)",
                  }
                : undefined
            }
          >
            {c.label}
          </div>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-hidden p-6">
          <div
            className="ml-auto mb-4 w-fit max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
            style={{ background: "color-mix(in srgb, var(--landing-line) 45%, transparent)" }}
          >
            Écris une fonction Python qui calcule la suite de Fibonacci.
          </div>
          <div className="max-w-[90%] text-sm">
            Voici une version itérative, simple et efficace :
            <pre
              className="mt-2.5 overflow-hidden whitespace-pre rounded-xl p-4 font-mono text-[12.5px] leading-7"
              style={{ background: "#1f1b16", color: "#e8e2d6" }}
            >
              <span style={{ color: "#d9a441" }}>def</span>{" "}
              <span style={{ color: "#8fb4e3" }}>fibonacci</span>(n):
              {"\n"}    a, b = 0, 1
              {"\n"}    <span style={{ color: "#d9a441" }}>for</span> _{" "}
              <span style={{ color: "#d9a441" }}>in</span> range(n):
              {"\n"}        a, b = b, a + b
              {"\n"}    <span style={{ color: "#d9a441" }}>return</span> a
            </pre>
          </div>
        </div>
        <div
          className="flex items-center gap-3 border-t px-5 py-3.5"
          style={{ borderColor: "var(--landing-line)" }}
        >
          <div
            className="flex-1 rounded-full border px-4 py-2.5 text-[13.5px]"
            style={{ borderColor: "var(--landing-line)", color: "var(--landing-faint)" }}
          >
            Écrivez à Toumaï AI…
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
            aria-hidden="true"
          >
            ↑
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3.5 text-[13px] font-semibold">{title}</h4>
      <div className="space-y-2.5">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="block text-[13.5px] transition hover:opacity-70"
            style={{ color: "var(--landing-muted)" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
