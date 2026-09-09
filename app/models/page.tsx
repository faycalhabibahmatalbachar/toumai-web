import type { Metadata } from "next";
import Link from "next/link";
import { EditorialDocument } from "@/components/editorial/EditorialDocument";

export const metadata: Metadata = {
  title: "Modèles IA — Sao 4 et Toumaï 5",
  description:
    "Les modèles utilisés par Toumaï AI : Sao 4 pour les tâches courantes et Toumaï 5 lorsqu’une demande nécessite plus d’analyse.",
  alternates: { canonical: "https://toumaiai.com/models/", languages: {} },
  twitter: { card: "summary_large_image", title: "Modèles IA — Toumaï AI", description: "Comprendre les modèles et leurs limites.", images: ["/og-image.png"] },
  openGraph: {
    title: "Modèles IA — Sao 4 et Toumaï 5 | Toumaï AI",
    description: "Comprendre quel modèle Toumaï AI est choisi selon la tâche : chat, code, analyse, voix ou images.",
    url: "https://toumaiai.com/models",
  },
};

const MODELS = [
  {
    name: "Sao 4",
    role: "Le modèle du quotidien",
    desc: "C’est le modèle utilisé pour de nombreuses demandes courantes : conversation, rédaction, code, traduction et résumés. Toumaï AI peut l’orienter vers un autre moteur lorsque la tâche le demande.",
    points: ["Réponses affichées progressivement", "Aide pour le code et les textes en français", "Demandes multilingues : qualité à vérifier selon la langue"],
  },
  {
    name: "Toumaï 5",
    role: "Réflexion — raisonnement profond",
    desc: "Pour les questions qui demandent davantage de raisonnement : mathématiques, planification ou analyse. Prenez le temps de vérifier la réponse, surtout lorsqu’une décision a des conséquences importantes.",
    points: ["Explications et démarche lorsque pertinentes", "Pour explorer des demandes longues ou complexes", "Disponibilité selon votre compte et votre formule"],
  },
  {
    name: "Moteurs spécialisés",
    role: "Sous le capot",
    desc: "Toumaï AI peut mobiliser des moteurs dédiés aux images, à la transcription, à la synthèse vocale et à la navigation. Leur disponibilité dépend des outils activés ; les fournisseurs peuvent évoluer.",
    points: ["Images : génération et analyse", "Voix : dictée, mode vocal temps réel", "Web : recherche et navigation autonome"],
  },
];

export default function ModelsPage() {
  return (
    <EditorialDocument title="Les modèles Toumaï AI" intro="Un modèle pour une demande, des outils pour aller plus loin. Comprenez les choix proposés sans confondre un nom de produit avec une garantie de résultat.">
      <p>
        Les noms Sao et Toumaï font référence au patrimoine tchadien. Dans le chat, Toumaï AI
        choisit ou vous laisse choisir un modèle selon la demande. Aucun modèle n&apos;est infaillible :
        gardez une vérification humaine pour les informations importantes.
      </p>
      <div className="mt-8 space-y-5">
        {MODELS.map((m) => (
          <div key={m.name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="landing-serif !m-0 text-2xl text-[var(--text-primary)]">{m.name}</h2>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
                {m.role}
              </span>
            </div>
            <p className="mt-3 !mb-3 text-sm leading-relaxed">{m.desc}</p>
            <ul className="!mb-0">
              {m.points.map((p) => (
                <li key={p} className="text-sm">{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/chat"
          className="inline-block rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          Ouvrir le chat
        </Link>
      </div>
    </EditorialDocument>
  );
}
