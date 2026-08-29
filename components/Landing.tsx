"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Logo } from "@/components/Logo";
import { API_BASE } from "@/lib/config";

export function Landing() {
  return (
    <div
      className="flex flex-1 flex-col"
      style={{ background: "var(--landing-bg)", color: "var(--landing-ink)" }}
    >
      <Navbar />

      {/* Hero — deux colonnes : la promesse à gauche, la preuve à droite.
       *
       * L'ancienne version empilait titre, sous-titre et boutons sur toute la
       * largeur, centrés : la première capture d'écran du produit n'arrivait
       * qu'à 956 px, donc jamais avant le premier défilement. Ici la fenêtre
       * de l'application est visible d'emblée, à côté des boutons. */}
      <section className="px-6 pb-14 pt-10 sm:pt-16 lg:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="text-center lg:text-left">
            {/* Sur un écran de 375 px, 2.75rem faisait quatre lignes et
             * repoussait les boutons sous la ligne de flottaison. */}
            <h1 className="landing-serif mx-auto max-w-xl text-[2.1rem] font-medium leading-[1.08] tracking-tight sm:text-5xl lg:mx-0 lg:text-6xl">
              L&apos;intelligence artificielle qui parle{" "}
              <em className="font-normal" style={{ color: "var(--landing-terra)", fontStyle: "italic" }}>
                votre arabe.
              </em>
            </h1>
            <p
              className="mx-auto mt-6 max-w-xl text-lg leading-relaxed lg:mx-0"
              style={{ color: "var(--landing-muted)" }}
            >
              Toumaï AI répond en arabe tchadien, en français et en anglais.
              Sur le Web ou directement dans WhatsApp — sans rien installer.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link
                href="/chat"
                className="rounded-full px-8 py-4 text-base font-medium transition hover:opacity-85"
                style={{ background: "var(--landing-ink)", color: "var(--landing-on-ink)" }}
              >
                Commencer gratuitement
              </Link>
              <a
                href="#capacites"
                className="rounded-full border px-8 py-4 text-base font-medium transition hover:opacity-70"
                style={{ borderColor: "var(--landing-line)" }}
              >
                Voir les capacités
              </a>
            </div>
            <StatsBar />
          </div>

          <HeroVisuel />
        </div>
      </section>

      {/* Fenêtre produit — déplacée hors du hero, qui porte désormais le
       * visuel. La preuve produit garde sa place, juste en dessous. */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-4xl">
          <ProductWindow />
        </div>
      </section>

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
            Pensé pour{" "}
            <em style={{ color: "var(--landing-terra)" }}>le Tchad.</em>
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "L'arabe tel qu'on le parle ici",
                desc: "Le dialecte tchadien du quotidien, au-delà de l'arabe littéraire des manuels.",
              },
              {
                title: "Déjà dans votre WhatsApp",
                desc: "Rien à télécharger. Vous lui écrivez comme à n'importe quel autre contact.",
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
            Disponible là où{" "}
            <em style={{ color: "var(--landing-terra)" }}>vous êtes déjà.</em>
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
            <em style={{ color: "var(--landing-terra)" }}>toute l&apos;entreprise.</em>
          </h2>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Mode vocal — tuile haute */}
            <Tile className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
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
            <Tile dark className="lg:col-start-2 lg:row-start-1">
              <h3 className="text-base font-semibold">Code &amp; développement</h3>
              <p className="mt-1.5 text-sm opacity-70">Générez, expliquez, corrigez.</p>
              {/* La fonction est complète : une tuile qui s'arrête au milieu
               * d'un algorithme laissait 142 px de vide et donnait l'impression
               * d'un exemple inachevé. */}
              <pre className="mt-5 overflow-x-auto whitespace-pre font-mono text-xs leading-[1.85]">
                <span style={{ color: "#7a7264" }}># Tri rapide</span>
                {"\n"}
                <span style={{ color: "#d9a441" }}>def</span>{" "}
                <span style={{ color: "#8fb4e3" }}>quicksort</span>(t):
                {"\n    "}
                <span style={{ color: "#d9a441" }}>if</span> len(t) &lt;= 1:{" "}
                <span style={{ color: "#d9a441" }}>return</span> t
                {"\n    "}pivot = t[len(t) {"//"} 2]
                {"\n    "}
                <span style={{ color: "#d9a441" }}>return</span> (
                {"\n        "}quicksort([x <span style={{ color: "#d9a441" }}>for</span> x{" "}
                <span style={{ color: "#d9a441" }}>in</span> t <span style={{ color: "#d9a441" }}>if</span> x &lt; pivot])
                {"\n        "}+ [x <span style={{ color: "#d9a441" }}>for</span> x{" "}
                <span style={{ color: "#d9a441" }}>in</span> t <span style={{ color: "#d9a441" }}>if</span> x == pivot]
                {"\n        "}+ quicksort([x <span style={{ color: "#d9a441" }}>for</span> x{" "}
                <span style={{ color: "#d9a441" }}>in</span> t <span style={{ color: "#d9a441" }}>if</span> x &gt; pivot])
                {"\n    "})
              </pre>
            </Tile>

            {/* Images — vraie image générée par le pipeline */}
            <Tile className="lg:col-start-3 lg:row-start-1 flex flex-col">
              <h3 className="text-base font-semibold">Génération d&apos;images</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Décrivez ce que vous voulez, Toumaï AI le crée avec sa signature intégrée.
              </p>
              <picture>
                <source srcSet="/landing/showcase.avif" type="image/avif" />
                <img
                  src="/landing/showcase.webp"
                  alt="Dunes de sable au crépuscule — image générée par Toumaï AI"
                  width={760}
                  height={570}
                  className="mt-5 w-full flex-1 rounded-xl object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </Tile>

            {/* Agent Navigateur — tuile haute */}
            <Tile className="lg:col-start-2 lg:row-start-2 lg:row-span-2">
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
            <Tile className="lg:col-start-3 lg:row-start-2 lg:row-span-2">
              <h3 className="text-base font-semibold">Connecteurs</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--landing-muted)" }}>
                Vos outils, dans la conversation.
              </p>
              <div className="mt-4">
                {[
                  { name: "WhatsApp", icon: <WhatsAppBrandIcon /> },
                  { name: "Gmail", icon: <GmailBrandIcon /> },
                  { name: "Google Agenda", icon: <GoogleAgendaBrandIcon /> },
                ].map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--landing-line)" : "none",
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {c.icon}
                      <span className="truncate">{c.name}</span>
                    </span>
                    {/* « Disponible » et non « Connecté » : sur la vitrine, le
                     * visiteur n'est pas authentifié — annoncer un état de
                     * connexion qui n'existe pas serait un décor mensonger.
                     * L'état réel s'affiche dans l'application. */}
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]"
                      style={{
                        background: "color-mix(in srgb, var(--landing-line) 55%, transparent)",
                        color: "var(--landing-muted)",
                      }}
                    >
                      Disponible
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10.5px] leading-snug" style={{ color: "var(--landing-faint)" }}>
                WhatsApp est une marque de Meta ; Gmail et Google Agenda, de Google.
                Toumaï AI s&apos;y connecte sans lien de partenariat.
              </p>
            </Tile>

            {/* Multilingue */}
            <Tile className="lg:col-start-1 lg:row-start-3">
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
        {/* Deux colonnes : le texte tenait dans un max-w-lg et le schéma
         * flottait, centré, en dessous — tout le flanc droit restait vide. */}
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p
              className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--landing-terra)" }}
            >
              Sous le capot
            </p>
            <h2 className="landing-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Un routeur choisit{" "}
              <em style={{ color: "var(--landing-terra)" }}>le bon modèle</em> pour chaque tâche.
            </h2>
            <p className="mt-4 text-[15px]" style={{ color: "var(--landing-muted)" }}>
              Vous écrivez naturellement. Toumaï AI détecte s&apos;il s&apos;agit de
              code, d&apos;une image, d&apos;un document ou d&apos;une question qui
              demande de réfléchir — et envoie la requête au modèle le mieux
              préparé pour y répondre. Aucun réglage requis.
            </p>

            {/* Les quatre familles de requêtes que le routeur distingue —
             * elles rendent concret ce que le paragraphe décrit. */}
            <div className="mt-7 flex flex-wrap gap-2">
              {["Écrire du code", "Générer une image", "Lire un document", "Raisonner"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border px-3.5 py-1.5 text-[13px]"
                  style={{ borderColor: "var(--landing-line)", color: "var(--landing-muted)" }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Schéma de routage : hub central → les deux modèles proposés.
              On n'affiche que ce que l'utilisateur peut réellement choisir dans
              le sélecteur — annoncer des modèles indisponibles serait une
              promesse non tenue. */}
          <div className="rounded-[20px] border p-7" style={{ borderColor: "var(--landing-line)", background: "var(--landing-card)" }}>
            <div className="mx-auto flex w-fit items-center gap-2.5 rounded-full border px-5 py-2.5" style={{ borderColor: "var(--landing-line)", background: "var(--landing-bg)" }}>
              <Logo size={16} />
              <span className="text-sm font-semibold">Toumaï AI</span>
            </div>
            <div className="mx-auto mt-1 h-8 w-px" style={{ background: "var(--landing-line)" }} aria-hidden="true" />

            <div className="mt-3 grid gap-3">
              {[
                { name: "Sao 4", tag: "Code & quotidien", badge: "S4", default: true },
                { name: "Toumaï 5", tag: "Raisonnement profond", badge: "T5" },
              ].map((m) => (
                <div
                  key={m.name}
                  className="rounded-[16px] border p-5"
                  style={{ borderColor: "var(--landing-line)", background: "var(--landing-bg)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{ background: "var(--landing-terra-soft)", color: "var(--landing-terra)" }}
                    >
                      {m.badge}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{m.name}</p>
                      {m.default && (
                        <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--landing-faint)" }}>
                          Par défaut
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-[13px]" style={{ color: "var(--landing-muted)" }}>
                    {m.tag}
                  </p>
                </div>
              ))}
            </div>
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
                a: "Oui, entièrement. Discuter, générer des images, utiliser le mode vocal, les agents et les connecteurs — tout est gratuit, sans abonnement ni carte bancaire.",
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
            Commencez à{" "}
            <em style={{ color: "var(--landing-gold)" }}>construire.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-md opacity-70">
            Ouvrez Toumaï AI et voyez ce qu&apos;il peut faire pour votre activité.
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
              // Lien interne depuis la page la plus forte du site : c'est ainsi
              // qu'une page de fond reçoit de l'autorité, pas en répétant des
              // mots-clés.
              { label: "L'IA au Tchad", href: "/intelligence-artificielle-tchad" },
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
              { label: "GitHub", href: "https://github.com/Toumai-AI", icon: <GitHubIcon /> },
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

interface PublicStats {
  registered_users: number | null;
  conversations: number | null;
  languages: number | null;
  countries: number | null;
}

function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`.replace(".0k", "k");
  return String(n);
}

/** Chiffres réels (utilisateurs, conversations, langues, pays) — jamais de
 * valeur par défaut inventée : un champ absent est simplement omis. */
function StatsBar() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/app/public-stats`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.success) setStats(j.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Seuils volontaires : un chiffre de croissance en dessous de ce seuil
  // affaiblirait la crédibilité plutôt que de la renforcer. En dessous, on
  // garde la ligne de capacités (toujours vraie) sans afficher de compteur.
  const items: { value: string; label: string }[] = [];
  if (stats?.registered_users && stats.registered_users >= 100) {
    items.push({ value: `${fmtCompact(stats.registered_users)}+`, label: "utilisateurs inscrits" });
  }
  if (stats?.conversations && stats.conversations >= 500) {
    items.push({ value: `${fmtCompact(stats.conversations)}+`, label: "conversations" });
  }

  return (
    <div className="pt-10 text-center lg:text-left">
      {items.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 lg:justify-start">
          {items.map((it) => (
            <div key={it.label}>
              <p className="landing-serif text-3xl font-medium">{it.value}</p>
              <p className="mt-0.5 text-[12px] tracking-[0.06em]" style={{ color: "var(--landing-faint)" }}>
                {it.label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[13px] tracking-[0.08em]" style={{ color: "var(--landing-faint)" }}>
        GRATUIT&ensp;·&ensp;FRANÇAIS · ARABE · ANGLAIS&ensp;·&ensp;WEB &amp; MOBILE
      </p>
    </div>
  );
}

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

/** Visuel du hero.
 *
 * L'image est sur fond quasi noir (coins mesurés à ~(10,8,5), 68 % des pixels
 * sous 24). Posée telle quelle, elle afficherait un rectangle sombre sur le
 * fond chaud de la page. En fusion `screen`, le noir devient transparent et
 * seul l'or subsiste : plus aucun bord visible, l'image se fond dans le fond.
 *
 * Un halo ambré posé derrière lui donne de la profondeur, et une dérive lente
 * l'empêche d'être tout à fait figée — coupée si la personne a demandé moins
 * d'animations.
 */
function HeroVisuel() {
  return (
    <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none lg:scale-[1.08]" aria-hidden="true">
      {/* Halo : chaleur derrière l'image, jamais un contour net */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[112%] w-[112%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--landing-terra) 26%, transparent), transparent 72%)",
          filter: "blur(26px)",
        }}
      />
      {/* DEUX TAILLES, ET L'AVIF D'ABORD.
       *
       * Le fichier servi faisait 1672 px de large pour une image affichée à
       * 600 px : on payait quatre fois la surface utile. Et l'AVIF de secours
       * pesait 256 Ko — sur une liaison tchadienne, c'est la seule chose qui
       * décidait du temps d'affichage, bien avant le JavaScript.
       *
       * L'alpha est INDISPENSABLE : sans lui, l'image devient un rectangle noir
       * en thème clair. ffmpeg le perd en AVIF ; les variantes sont donc
       * produites avec Pillow (voir design-sources/README.md).
       *
       * Le WebP reste en secours pour les navigateurs sans AVIF — une seule
       * taille pour lui : l'alpha y coûte cher, et ces navigateurs sont rares. */}
      <picture>
        <source
          type="image/avif"
          srcSet="/landing/hero-afrique-800.avif 800w, /landing/hero-afrique-1200.avif 1200w"
          // Décrit la largeur RÉELLE d'affichage, pas la fenêtre : le visuel
          // est plafonné à 600 px sur petit écran et n'excède guère 640 px sur
          // grand. Un `sizes` trop large fait choisir la variante 1200 à des
          // écrans qui n'en ont pas besoin.
          sizes="(min-width: 1024px) 640px, (min-width: 640px) 600px, 92vw"
        />
        <source srcSet="/landing/hero-afrique-800.webp" type="image/webp" />
        <img
          src="/landing/hero-afrique-800.webp"
          alt="Visage de profil composé d'un réseau de points lumineux, épousant la carte de l'Afrique"
          width={1672}
          height={941}
          // C'est l'élément le plus grand de l'écran d'accueil, donc celui que
          // Google chronomètre (LCP). Le navigateur doit le savoir avant de
          // découvrir tout le reste.
          fetchPriority="high"
          decoding="async"
          className="hero-derive w-full select-none"
          style={{
            // Aucun mode de fusion, aucun masque : la transparence est gravée
            // dans le fichier, l'alpha suivant la luminosité. Les bords se
            // dissolvent d'eux-mêmes sur n'importe quel fond.
            filter: "drop-shadow(0 0 42px color-mix(in srgb, var(--landing-terra) 22%, transparent))",
          }}
        />
      </picture>
    </div>
  );
}

/** Maquette fidèle de l'application — sidebar, échange réel, composer. */
function ProductWindow() {
  return (
    <div
      className="mx-auto flex h-[400px] w-full max-w-2xl overflow-hidden rounded-2xl border text-left lg:max-w-none"
      style={{
        borderColor: "var(--landing-line)",
        background: "var(--landing-card)",
        boxShadow: "0 24px 60px -24px rgba(31,27,22,.35)",
      }}
    >
      <div
        className="hidden w-48 shrink-0 border-r p-3 text-xs sm:block"
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
          { label: "Traduction en arabe tchadien", on: true },
          { label: "Résumé du royaume du Kanem", on: false },
          { label: "Fonction Fibonacci en Python", on: false },
          { label: "Image — coucher de soleil", on: false },
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
          {/* L'échange montré doit prouver la promesse du titre : on affiche
           * donc l'arabe tchadien, pas un exemple de code générique. */}
          <div
            className="ml-auto mb-4 w-fit max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
            style={{ background: "color-mix(in srgb, var(--landing-line) 45%, transparent)" }}
          >
            Comment on dit « Comment vas-tu aujourd&apos;hui ? » en arabe tchadien ?
          </div>
          <div className="max-w-[92%] text-sm leading-relaxed">
            <p
              dir="rtl"
              lang="ar"
              className="landing-serif mb-2.5 text-2xl"
              style={{ color: "var(--landing-terra)" }}
            >
              إنت كيف اليوم؟
            </p>
            <p>
              C&apos;est la formulation du quotidien. L&apos;arabe littéraire
              dirait «&nbsp;كيف حالك اليوم؟&nbsp;», mais personne ne parle comme
              ça au marché de N&apos;Djaména.
            </p>
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

/* Logos de marque des connecteurs.
 *
 * Tracés issus de Simple Icons (CC0). Les couleurs officielles sont conservées
 * telles quelles : les chartes de Meta et de Google interdisent de recolorer ou
 * de déformer leurs logos. Taille fixe, aucune transformation. */
function WhatsAppBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="#25D366" aria-hidden="true" className="shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function GmailBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="#EA4335" aria-hidden="true" className="shrink-0">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  );
}

function GoogleAgendaBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="#4285F4" aria-hidden="true" className="shrink-0">
      <path d="M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z" />
    </svg>
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
