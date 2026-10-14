import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, Bot, Building2, GraduationCap,
  Handshake, Megaphone, ShieldCheck, Store, Workflow,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { DemandePartenariat } from "./DemandePartenariat";

export const metadata: Metadata = {
  title: "Entreprises & partenariats — Toumaï AI",
  description:
    "Proposez un projet à Toumaï AI : assistants pour entreprises, sponsoring clairement identifié et partenariats au Tchad et en Afrique. Demandez un échange sans engagement.",
  alternates: { canonical: "https://toumaiai.com/entreprises" },
  openGraph: {
    title: "Toumaï AI pour les entreprises et les partenaires",
    description: "Assistants IA, visibilité sponsorisée et collaborations : parlez-nous de votre besoin.",
    url: "https://toumaiai.com/entreprises",
    type: "website",
  },
};

const offres = [
  {
    Icon: Bot,
    num: "01",
    titre: "Toumaï Business",
    sousTitre: "Un assistant utile à vos clients et à vos équipes.",
    detail:
      "Étudions ensemble un assistant pour l’accueil, les questions fréquentes, l’orientation ou la préparation de documents, avec un contrôle humain adapté au contexte.",
    exemples: "Écoles, centres de formation, services, PME",
    statut: "Étude de projet sur devis",
  },
  {
    Icon: Megaphone,
    num: "02",
    titre: "Sponsoring",
    sousTitre: "Soutenir un service accessible à tous.",
    detail:
      "Associez votre marque à une initiative, un contenu éditorial ou un espace publicitaire clairement identifié. Les formats et l’audience seront présentés avant toute commande.",
    exemples: "Marques, opérateurs, établissements, événements",
    statut: "Propositions sur mesure",
  },
  {
    Icon: Handshake,
    num: "03",
    titre: "Distribution & partenariats",
    sousTitre: "Créer de la valeur ensemble.",
    detail:
      "Discutons d’une collaboration commerciale ou institutionnelle : déploiement, intégration, apport d’affaires ou accompagnement de publics spécifiques.",
    exemples: "Organisations, réseaux professionnels, institutions",
    statut: "Partenariats à définir",
  },
];

const cas = [
  { Icon: GraduationCap, titre: "Éducation", detail: "Orienter des candidats, répondre aux questions courantes et assister les équipes." },
  { Icon: Store, titre: "Commerce", detail: "Informer sur des services, qualifier des demandes et simplifier la relation client." },
  { Icon: Building2, titre: "Organisations", detail: "Aider à préparer des réponses, retrouver des ressources et structurer le travail." },
  { Icon: Workflow, titre: "Intégrations", detail: "Évaluer les points de connexion techniques, les coûts et la supervision humaine." },
];

export default function EntreprisesPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 text-base font-semibold"><Logo size={30} /> Toumaï AI</Link>
          <nav aria-label="Navigation de la page" className="flex items-center gap-4 text-sm">
            <Link className="hidden hover:underline sm:inline" href="/a-propos">À propos</Link>
            <Link className="hidden hover:underline sm:inline" href="/contact">Contact</Link>
            <Link href="/chat" className="rounded-full border px-4 py-2 font-semibold" style={{ borderColor: "var(--border)" }}>Ouvrir Toumaï</Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--border)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full opacity-20 blur-3xl" style={{ background: "var(--primary)" }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
          <span className="inline-flex rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            Toumaï AI · Entreprises & partenaires
          </span>
          <h1 className="landing-serif mt-8 max-w-4xl text-4xl leading-[1.12] font-semibold tracking-tight sm:text-6xl">
            Mettre l’intelligence artificielle au service de votre organisation.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8" style={{ color: "var(--text-secondary)" }}>
            Toumaï AI, conçu au Tchad, étudie des collaborations avec les entreprises, écoles,
            marques et institutions. Nous partons de votre besoin, puis définissons un périmètre,
            une démonstration et, si le projet est viable, une proposition sur devis.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#demande" className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold" style={{ background: "var(--primary)", color: "#ffffff" }}>
              Proposer un projet <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a href="#offres" className="inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
              Découvrir les collaborations <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-6 text-sm" style={{ color: "var(--text-tertiary)" }}>Première prise de contact gratuite · Aucun engagement · Offres sur étude</p>
        </div>
      </section>

      <section id="offres" className="mx-auto max-w-6xl scroll-mt-12 px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--primary)" }}>Collaborations</p>
          <h2 className="landing-serif mt-4 text-3xl font-semibold sm:text-4xl">Trois façons d’avancer ensemble.</h2>
          <p className="mt-4 leading-7" style={{ color: "var(--text-secondary)" }}>Chaque collaboration est définie selon les capacités réellement disponibles, le besoin et les coûts.</p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {offres.map(({ Icon, num, titre, sousTitre, detail, exemples, statut }) => (
            <article key={titre} className="flex flex-col rounded-2xl border p-7" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between">
                <span className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><Icon size={23} aria-hidden="true" /></span>
                <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{num}</span>
              </div>
              <h3 className="mt-7 text-2xl font-semibold">{titre}</h3>
              <p className="mt-2 font-medium">{sousTitre}</p>
              <p className="mt-5 flex-1 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{detail}</p>
              <div className="mt-8 border-t pt-5 text-sm" style={{ borderColor: "var(--border)" }}>
                <p style={{ color: "var(--text-tertiary)" }}>{exemples}</p>
                <p className="mt-3 font-semibold">{statut}</p>
              </div>
              <a href="#demande" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4">Parler de cette offre <ArrowUpRight size={15} aria-hidden="true" /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="landing-serif max-w-3xl text-3xl font-semibold sm:text-4xl">Des cas d’usage concrets, pas des promesses vagues.</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {cas.map(({ Icon, titre, detail }) => (
              <div key={titre} className="flex items-start gap-4">
                <span className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}><Icon size={22} aria-hidden="true" /></span>
                <div><h3 className="text-lg font-semibold">{titre}</h3><p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16" id="demande">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--primary)" }}>Votre projet</p>
          <h2 className="landing-serif mt-4 text-3xl font-semibold sm:text-4xl">Parlons de votre besoin.</h2>
          <p className="mt-5 leading-8" style={{ color: "var(--text-secondary)" }}>
            Expliquez brièvement ce que vous voulez accomplir. Nous pourrons étudier le périmètre,
            les limites techniques, les responsabilités et un éventuel devis.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
            <ShieldCheck className="mt-1 shrink-0" size={20} aria-hidden="true" />
            <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              Vos échanges privés avec l’assistant ne sont pas vendus aux partenaires.
              Les contenus sponsorisés devront être explicitement signalés et ne modifieront
              pas les réponses de l’IA. Les intégrations WhatsApp restent soumises aux règles applicables de Meta.
            </p>
          </div>
          <p className="mt-7 text-sm" style={{ color: "var(--text-secondary)" }}>
            Autre moyen de contact : <a href="mailto:contact@toumaiai.com" className="font-semibold underline underline-offset-4">contact@toumaiai.com</a>.
          </p>
        </div>
        <DemandePartenariat />
      </section>

      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p style={{ color: "var(--text-secondary)" }}>Toumaï AI — conçu à N’Djamena, Tchad.</p>
          <div className="flex flex-wrap gap-5">
            <Link href="/privacy" className="hover:underline">Confidentialité</Link>
            <Link href="/terms" className="hover:underline">Conditions</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
