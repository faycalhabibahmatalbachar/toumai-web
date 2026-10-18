import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Building2, CheckCircle2, Clock3,
  GraduationCap, Handshake, ShieldCheck, Store, Target,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { DemandePartenariat } from "../entreprises/DemandePartenariat";
import { DemoPilotes } from "./DemoPilotes";

export const metadata: Metadata = {
  title: "Partenaires fondateurs — programme pilote | Toumaï AI",
  description:
    "Toumaï AI recherche 3 à 5 organisations pour explorer des pilotes d’assistants IA encadrés et mesurables au Tchad. Présentez votre besoin sans engagement.",
  alternates: { canonical: "https://toumaiai.com/partenaires-fondateurs" },
  openGraph: {
    title: "Founding Partners — construire les premiers pilotes Toumaï AI",
    description: "Un besoin réel, une démonstration, des objectifs mesurables et une décision commune.",
    url: "https://toumaiai.com/partenaires-fondateurs",
    type: "website",
  },
};

const cas = [
  {
    Icon: GraduationCap,
    titre: "Éducation",
    description: "Orientation, questions fréquentes et aide à la préparation de réponses, sous validation de l’établissement.",
  },
  {
    Icon: Store,
    titre: "Commerce & services",
    description: "Information produit, accueil et tri des demandes, sans prétendre accéder à un stock ou à un dossier client réel.",
  },
  {
    Icon: Building2,
    titre: "Organisations",
    description: "Recherche dans une base documentaire autorisée et préparation de synthèses relues par un responsable.",
  },
];

const etapes = [
  { numero: "01", titre: "Qualification", texte: "Un échange pour comprendre le problème, le public, les données et la personne référente." },
  { numero: "02", titre: "Cadrage", texte: "Un objectif, un indicateur, un budget maximal et un périmètre écrit avant tout travail." },
  { numero: "03", titre: "Pilote limité", texte: "Une démonstration puis, si elle est validée, un essai supervisé sur des données autorisées." },
  { numero: "04", titre: "Bilan", texte: "Mesure des résultats, des coûts et des limites ; décision de poursuivre, adapter ou arrêter." },
];

export default function PartenairesFondateursPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold"><Logo size={30} /> Toumaï AI</Link>
          <nav aria-label="Navigation du programme" className="flex items-center gap-4 text-sm">
            <Link href="/entreprises" className="hidden hover:underline sm:inline">Entreprises</Link>
            <Link href="/contact" className="hidden hover:underline sm:inline">Contact</Link>
            <a href="#candidature" className="rounded-full border px-4 py-2 font-semibold" style={{ borderColor: "var(--border)" }}>Candidater</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--border)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--primary)" }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
          <span className="inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.13em]" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            Founding Partners · Programme pilote
          </span>
          <h1 className="landing-serif mt-8 max-w-4xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">
            Votre problème réel. Un pilote IA concret. Des résultats à mesurer.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8" style={{ color: "var(--text-secondary)" }}>
            Toumaï AI souhaite sélectionner 3 à 5 organisations pour concevoir ensemble
            des cas d’usage utiles au Tchad. Pas de promesse de déploiement immédiat :
            nous vérifions d’abord la faisabilité, les coûts et les responsabilités.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#candidature" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold" style={{ background: "var(--primary)", color: "#fff" }}>
              Proposer un pilote <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a href="#demonstration" className="inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
              Voir les exemples <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>
            Candidature gratuite · Sélection sur faisabilité · Aucun partenariat ou financement garanti
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>Terrains d’expérimentation</p>
        <h2 className="landing-serif mt-4 max-w-3xl text-3xl font-semibold sm:text-4xl">Trois points de départ, adaptés à vos contraintes.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cas.map(({ Icon, titre, description }) => (
            <article key={titre} className="rounded-2xl border p-7" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <Icon size={25} aria-hidden="true" />
              <h3 className="mt-5 text-xl font-semibold">{titre}</h3>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demonstration" className="scroll-mt-10 border-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>Aperçu interactif</p>
          <h2 className="landing-serif mt-4 max-w-3xl text-3xl font-semibold sm:text-4xl">Voyez comment un parcours pourrait fonctionner.</h2>
          <p className="mt-4 max-w-3xl leading-7" style={{ color: "var(--text-secondary)" }}>
            Les exemples suivants sont scénarisés et entièrement fictifs. Ils montrent une intention de produit,
            pas un assistant IA connecté ni une capacité déjà validée chez un client.
          </p>
          <div className="mt-10"><DemoPilotes /></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>Méthode</p>
        <h2 className="landing-serif mt-4 text-3xl font-semibold sm:text-4xl">Un essai borné, pas un engagement flou.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {etapes.map(({ numero, titre, texte }) => (
            <div key={numero} className="rounded-2xl border p-6" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{numero}</span>
              <h3 className="mt-4 text-lg font-semibold">{titre}</h3>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{texte}</p>
            </div>
          ))}
        </div>
        <p className="mt-7 flex items-start gap-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
          <Clock3 size={19} className="mt-1 shrink-0" aria-hidden="true" />
          Durée indicative d’un pilote accepté : 30 à 60 jours, à confirmer au cadrage selon les moyens disponibles.
        </p>
      </section>

      <section className="border-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <Target size={25} aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold">Ce que nous cherchons</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {[
                "Un problème fréquent et mesurable.",
                "Un responsable disponible pour valider les réponses.",
                "Des documents de test autorisés ou fictifs.",
                "Un périmètre et un coût d’exploitation maîtrisables.",
              ].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 size={18} className="mt-1 shrink-0" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
          <div>
            <ShieldCheck size={25} aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-semibold">Les règles du pilote</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              {[
                "Pas de données sensibles ou privées sans cadre adapté.",
                "Pas de promesse de gratuité illimitée ni de résultat commercial.",
                "Pas d’action critique sans contrôle humain.",
                "Aucun accès aux conversations privées des utilisateurs de Toumaï.",
              ].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 size={18} className="mt-1 shrink-0" aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section id="candidature" className="mx-auto grid max-w-6xl scroll-mt-10 gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <Handshake size={26} aria-hidden="true" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--primary)" }}>Candidature</p>
          <h2 className="landing-serif mt-4 text-3xl font-semibold sm:text-4xl">Parlez-nous du problème à résoudre.</h2>
          <p className="mt-5 leading-8" style={{ color: "var(--text-secondary)" }}>
            Décrivez le besoin et la façon dont vous mesureriez le succès. Nous examinerons
            la pertinence du projet avant de proposer un échange. Le formulaire ne signe aucun accord.
          </p>
          <p className="mt-7 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
            Une question ? <a className="font-semibold underline underline-offset-4" href="mailto:contact@toumaiai.com?subject=Founding%20Partners%20Toumai">contact@toumaiai.com</a>
          </p>
        </div>
        <DemandePartenariat programme="fondateurs" />
      </section>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p style={{ color: "var(--text-secondary)" }}>Toumaï AI — conçu à N’Djamena, Tchad.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/entreprises" className="hover:underline">Entreprises</Link>
            <Link href="/privacy" className="hover:underline">Confidentialité</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
