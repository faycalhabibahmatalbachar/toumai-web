import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/Logo";

/**
 * LA PAGE 404.
 *
 * Jusqu'ici, une adresse inconnue affichait « This page could not be found. »
 * en anglais, sur fond noir, sans logo et sans issue. Sur un site francophone
 * qui vend un produit tchadien, c'est la seule page qui donnait l'impression
 * qu'il n'y avait personne derrière.
 *
 * CE QU'ELLE DOIT FAIRE, ET RIEN DE PLUS
 * ---------------------------------------
 * Dire que la page n'existe pas, sans accuser la personne : neuf fois sur dix
 * le lien est de nous, pas d'elle. Puis proposer les trois destinations qui
 * couvrent presque tous les cas : la conversation, l'accueil, et nous écrire.
 *
 * Pas de champ de recherche : nous n'avons pas de moteur de recherche interne,
 * et un champ qui ne cherche rien est pire qu'une impasse.
 */

export const metadata: Metadata = {
  title: "Page introuvable",
  // Une 404 ne doit jamais entrer dans un index. Sans cette ligne, une adresse
  // fautive partagée une fois se retrouve dans les résultats de recherche.
  robots: { index: false, follow: true },
};

const ISSUES = [
  { href: "/chat", titre: "Ouvrir Toumaï", texte: "Reprendre une conversation ou en commencer une." },
  { href: "/", titre: "Revenir à l’accueil", texte: "Les capacités, les offres, les modèles." },
  { href: "/models", titre: "Sao 4 et Toumaï 5", texte: "Ce que chaque modèle sait faire." },
];

export default function PageIntrouvable() {
  return (
    <main className="mx-auto flex min-h-[78vh] w-full max-w-xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-5">
        <Logo size={40} />

        {/* Le code est là pour qui saura le lire, en petit. Le titre, lui,
            parle français à tout le monde. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-50">
          Erreur 404
        </p>

        <h1 className="text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.5rem]">
          Cette page n’existe pas.
        </h1>

        <p className="max-w-[42ch] text-[15px] leading-relaxed opacity-70">
          Le lien est peut-être ancien, ou la page a changé d’adresse. Ce n’est
          pas votre faute&nbsp;: neuf fois sur dix, c’est nous qui avons déplacé
          quelque chose.
        </p>
      </div>

      <nav className="flex flex-col divide-y" style={{ borderColor: "var(--tm-line, #2a2a2a)" }}>
        {ISSUES.map((issue) => (
          <Link
            key={issue.href}
            href={issue.href}
            className="group flex items-baseline justify-between gap-4 py-4 transition hover:opacity-70"
            style={{ borderColor: "var(--tm-line, #2a2a2a)" }}
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">{issue.titre}</span>
              <span className="text-[13px] opacity-60">{issue.texte}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 opacity-40 transition group-hover:opacity-80">
              →
            </span>
          </Link>
        ))}
      </nav>

      <p className="text-[13px] opacity-60">
        Vous êtes arrivé ici depuis un lien de notre part&nbsp;?{" "}
        <a
          href="mailto:contact@toumaiai.com?subject=Lien%20cass%C3%A9%20sur%20toumaiai.com"
          className="underline underline-offset-4"
        >
          Dites-le-nous
        </a>
        , nous le réparons.
      </p>
    </main>
  );
}
