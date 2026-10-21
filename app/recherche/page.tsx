import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, FlaskConical, Languages, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Recherche & développement | Toumaï AI",
  description: "Découvrez les axes de recherche et développement de Toumaï AI : arabe tchadien, méthodes d'évaluation, publications et collaborations.",
  alternates: { canonical: "https://toumaiai.com/recherche" },
};

const AXES = [
  {
    numero: "01",
    titre: "Langues et usages locaux",
    description: "Explorer une intelligence artificielle plus utile en français, en arabe et en arabe tchadien, en tenant compte des usages réels.",
    Icone: Languages,
    ancre: "langues",
  },
  {
    numero: "02",
    titre: "Fiabilité des réponses",
    description: "Évaluer les réponses, identifier les erreurs et rendre les limites du système visibles avant de prétendre à des performances.",
    Icone: ShieldCheck,
    ancre: "evaluation",
  },
  {
    numero: "03",
    titre: "Outils et automatisations",
    description: "Étudier comment des outils logiciels peuvent aider à accomplir des tâches avec des validations humaines adaptées.",
    Icone: FlaskConical,
    ancre: "laboratoire",
  },
];

export default function RecherchePage() {
  return (
    <main className="min-h-screen bg-[#f5f2eb] text-[#191916]">
      <div className="border-b border-[#ded8cf]">
        <header className="mx-auto flex min-h-[84px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight" aria-label="Accueil Toumaï AI">
            <Logo size={34} />
            <span>Toumaï AI</span>
          </Link>
          <div className="flex items-center gap-3 text-sm sm:gap-6">
            <Link href="/entreprises" className="hidden hover:underline sm:block">Entreprises</Link>
            <Link href="/contact" className="hidden hover:underline sm:block">Contact</Link>
            <Link href="/chat" className="rounded-lg bg-[#191916] px-4 py-2.5 font-semibold text-white">Essayer Toumaï</Link>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pt-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#736b60] hover:text-[#191916]">
          <ArrowLeft size={15} aria-hidden="true" /> Retour à l'accueil
        </Link>
        <div className="mt-12 grid gap-8 border-b border-[#d7d0c5] pb-16 lg:grid-cols-[1.35fr_.65fr] lg:gap-20">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[.17em] text-[#a05239]">Toumaï AI / Research</p>
            <h1 className="max-w-3xl font-serif text-5xl leading-[1.03] tracking-[-.045em] sm:text-7xl">
              Construire une IA utile. Mesurer ce qu'elle sait faire.
            </h1>
          </div>
          <div className="flex items-end">
            <p className="max-w-sm text-lg leading-relaxed text-[#69645d]">
              Nous travaillons à rapprocher intelligence artificielle, langues locales et usages concrets.
              Cette page présente nos axes d'exploration — pas une liste de résultats scientifiques déjà validés.
            </p>
          </div>
        </div>

        <section aria-labelledby="axes-title" className="py-16">
          <div className="mb-9 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <h2 id="axes-title" className="font-serif text-4xl tracking-tight sm:text-5xl">Nos axes de travail</h2>
            <p className="max-w-xs text-sm text-[#787167]">Une présentation transparente des sujets explorés, sans résultats inventés.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {AXES.map((axe) => {
              const Icone = axe.Icone;
              return (
                <a key={axe.numero} href={"#" + axe.ancre} className="group flex min-h-[290px] flex-col rounded-2xl border border-[#ded8cf] bg-[#faf8f4] p-7 transition hover:-translate-y-1 hover:border-[#c59a83] hover:shadow-lg">
                  <div className="flex items-start justify-between">
                    <span className="text-sm text-[#8b8071]">{axe.numero}</span>
                    <Icone size={23} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div className="mt-auto">
                    <h3 className="mb-3 font-serif text-2xl leading-tight">{axe.titre}</h3>
                    <p className="text-sm leading-relaxed text-[#69645d]">{axe.description}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section id="langues" aria-labelledby="langues-title" className="scroll-mt-10 grid gap-8 border-t border-[#d7d0c5] py-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-[#a05239]">Construire l'IA</p>
            <h2 id="langues-title" className="font-serif text-4xl tracking-tight">Arabe tchadien et langues africaines</h2>
          </div>
          <div className="space-y-4 text-[#686158]">
            <p>Un axe de travail porte sur le recueil de vocabulaire, de phrases et, à terme, de données vocales adaptées aux variantes réellement parlées au Tchad.</p>
            <p>L'objectif est de mieux comprendre et évaluer la langue. La mise à disposition d'un modèle spécialisé ou d'une qualité de reconnaissance vocale donnée ne doit pas être considérée comme acquise.</p>
          </div>
        </section>

        <section id="evaluation" aria-labelledby="evaluation-title" className="scroll-mt-10 grid gap-8 border-t border-[#d7d0c5] py-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-[#a05239]">Évaluer l'IA</p>
            <h2 id="evaluation-title" className="font-serif text-4xl tracking-tight">Des preuves avant les classements</h2>
          </div>
          <div className="space-y-4 text-[#686158]">
            <p>Nous privilégions des évaluations sur des exemples reproductibles, des erreurs observables et des critères annoncés avant le test : exactitude, robustesse, sécurité et utilité.</p>
            <p>Aucun classement « frontier leaderboard » propriétaire n'est annoncé sur cette page. Un score ne sera publié comme résultat validé que lorsqu'il sera accompagné de sa méthode et de son périmètre.</p>
          </div>
        </section>

        <section id="publications" aria-labelledby="publications-title" className="scroll-mt-10 grid gap-8 border-t border-[#d7d0c5] py-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-[#a05239]">Résultats et transparence</p>
            <h2 id="publications-title" className="font-serif text-4xl tracking-tight">Publications scientifiques</h2>
          </div>
          <div className="rounded-xl border border-[#ded8cf] bg-white/55 p-6">
            <div className="mb-4 flex items-center gap-3"><BookOpen size={20} aria-hidden="true" /><strong>Publications à venir</strong></div>
            <p className="text-sm leading-relaxed text-[#686158]">Aucun article de recherche évalué par les pairs n'est présenté ici à ce jour. Nous préférons une liste vide à des titres ou des résultats non vérifiés.</p>
          </div>
        </section>

        <section id="laboratoire" aria-labelledby="laboratoire-title" className="scroll-mt-10 rounded-3xl bg-[#26231f] p-8 text-[#faf7f1] sm:p-12">
          <p className="mb-4 text-xs uppercase tracking-widest text-[#e29c7e]">Laboratoire & collaborations</p>
          <h2 id="laboratoire-title" className="max-w-2xl font-serif text-4xl tracking-tight sm:text-5xl">Vous travaillez sur ces sujets ? Parlons-en.</h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-[#d5cfc6]">Chercheurs, locuteurs, établissements et développeurs peuvent proposer une collaboration ou un retour d'expérience. Le périmètre, la gestion des données et les engagements doivent être établis avant toute collecte.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg bg-[#e2a087] px-5 py-3 text-sm font-semibold text-[#251915]">
              Proposer une collaboration <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/entreprises" className="inline-flex items-center gap-2 rounded-lg border border-[#77716b] px-5 py-3 text-sm font-semibold text-white">
              Nos solutions entreprises
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
