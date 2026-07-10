import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";

export function Landing() {
  return (
    <div
      className="flex flex-1 flex-col"
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
          L&apos;assistant qui rédige vos rapports, répond à vos clients et
          automatise vos tâches — en français, en arabe et en anglais.
          Déployez-le sur WhatsApp, sur le web ou pour toute votre équipe.
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

      {/* Différenciation — pourquoi Toumaï AI plutôt qu'un assistant généraliste */}
      <section className="px-6 pt-20">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--landing-terra)" }}
          >
            Pourquoi Toumaï AI
          </p>
          <h2 className="landing-serif max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Conçu pour le Tchad,{" "}
            <em style={{ color: "var(--landing-terra)" }}>pas adapté après coup.</em>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Arabe tchadien, pas seulement l'arabe standard",
                desc: "Comprend et répond dans le dialecte parlé au quotidien, pas uniquement en arabe littéraire formel.",
              },
              {
                title: "Sur WhatsApp, sans rien installer",
                desc: "Fonctionne directement dans l'application que vous utilisez déjà — pas de nouvelle app à télécharger.",
              },
              {
                title: "Paiement Mobile Money",
                desc: "Aucune carte bancaire nécessaire pour les fonctionnalités avancées — Mesomb et Airtel Money acceptés.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[20px] border p-7"
                style={{ borderColor: "var(--landing-line)", background: "var(--landing-card)" }}
              >
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--landing-muted)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--landing-terra)" }}
          >
            Comment ça marche
          </p>
          <h2 className="landing-serif max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Trois façons d&apos;y accéder,{" "}
            <em style={{ color: "var(--landing-terra)" }}>zéro installation.</em>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Sur le web",
                desc: "Ouvrez toumaiai.com et commencez à discuter — aucun compte requis pour essayer.",
              },
              {
                step: "2",
                title: "Sur WhatsApp",
                desc: "Ajoutez le numéro Toumaï AI à vos contacts et écrivez-lui comme à n'importe qui.",
              },
              {
                step: "3",
                title: "Sur mobile",
                desc: "L'application Android reprend votre historique et fonctionne hors ligne pour la lecture.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-[20px] border p-7"
                style={{ borderColor: "var(--landing-line)", background: "var(--landing-card)" }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ background: "var(--landing-terra-soft)", color: "var(--landing-terra)" }}
                >
                  {item.step}
                </span>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--landing-muted)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

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

      {/* FAQ */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-3xl">
          <p
            className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "var(--landing-terra)" }}
          >
            Questions fréquentes
          </p>
          <h2 className="landing-serif max-w-xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Ce qu&apos;on nous demande{" "}
            <em style={{ color: "var(--landing-terra)" }}>le plus souvent.</em>
          </h2>
          <div className="mt-10 divide-y" style={{ borderColor: "var(--landing-line)" }}>
            {[
              {
                q: "Est-ce vraiment gratuit ?",
                a: "Oui — discuter, générer des images et utiliser le mode vocal ne coûte rien. Certaines fonctionnalités avancées (connecteurs professionnels, gros volumes) sont payables via Mobile Money, sans carte bancaire nécessaire.",
              },
              {
                q: "Mes données sont-elles vendues ou utilisées pour de la publicité ?",
                a: "Non. Toumaï AI ne vend aucune donnée et ne fait pas de publicité ciblée à partir de vos conversations. Détails dans la politique de confidentialité.",
              },
              {
                q: "Le connecteur WhatsApp lit-il tous mes messages en permanence ?",
                a: "Non. Chaque capacité (lecture, envoi, résumé…) est désactivable individuellement, une action sensible demande toujours votre confirmation, et vous pouvez restreindre l'accès à des contacts ou groupes précis.",
              },
              {
                q: "Fonctionne-t-il en arabe tchadien, pas seulement en arabe standard ?",
                a: "Oui, c'est l'un des objectifs premiers du projet — comprendre et répondre dans le dialecte parlé au quotidien, en plus du français et de l'anglais.",
              },
              {
                q: "Puis-je supprimer mes conversations ?",
                a: "À tout moment, directement depuis l'interface — suppression immédiate, sans avoir à contacter le support.",
              },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                  {item.q}
                  <span
                    className="shrink-0 text-lg transition group-open:rotate-45"
                    style={{ color: "var(--landing-terra)" }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--landing-muted)" }}>
                  {item.a}
                </p>
              </details>
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
              { label: "Modèles", href: "/models" },
              { label: "Bibliothèque", href: "/library" },
              { label: "Connecteurs", href: "/settings?tab=connectors" },
            ]}
          />
          <FooterCol
            title="Compte & légal"
            links={[
              { label: "Créer un compte", href: "/register" },
              { label: "Se connecter", href: "/login" },
              { label: "Conditions & politiques", href: "/terms" },
              { label: "Politique de confidentialité", href: "/privacy" },
              { label: "Choix de confidentialité", href: "/privacy-choices" },
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
        <div
          className="mx-auto mt-12 flex max-w-5xl flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--landing-line)" }}
        >
          <p className="text-xs" style={{ color: "var(--landing-faint)" }}>
            © {new Date().getFullYear()} Toumaï AI. Tous droits réservés.
          </p>
          <div className="flex items-center gap-1.5" style={{ color: "var(--landing-muted)" }}>
            {[
              { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61591724459792", icon: <FacebookIcon /> },
              { label: "TikTok", href: "https://www.tiktok.com/@toumaiai", icon: <TikTokIcon /> },
              { label: "X (Twitter)", href: "https://x.com/toumaiai", icon: <XIcon /> },
              { label: "LinkedIn", href: "https://www.linkedin.com/company/toumaiai", icon: <LinkedInIcon /> },
              { label: "GitHub", href: "https://github.com/faycalhabibahmatalbachar", icon: <GitHubIcon /> },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-70"
                style={{ background: "var(--landing-card)" }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
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

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.6 2h3a6.3 6.3 0 001.9 4.2 6.5 6.5 0 003 1.5v3.1a9.8 9.8 0 01-4.9-1.6v6.9a6.9 6.9 0 11-6.9-6.9c.3 0 .7 0 1 .1v3.2a3.7 3.7 0 101.9 3.4V2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7 3.7H5.2L17.8 20z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.1a4.2 4.2 0 013.8-2.1c4 0 4.8 2.7 4.8 6.1V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 016.8 8.6a3.6 3.6 0 01.1-2.7s.8-.3 2.8 1a9.6 9.6 0 015 0c1.9-1.3 2.8-1 2.8-1a3.6 3.6 0 01.1 2.7 3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0012 2z" />
    </svg>
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
