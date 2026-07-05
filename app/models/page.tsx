import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Modèles",
  description:
    "La famille de modèles Toumaï AI : Sao 4 pour le quotidien et le code, Toumaï 5 pour le raisonnement profond.",
};

const MODELS = [
  {
    name: "Sao 4",
    role: "Le modèle du quotidien",
    desc: "Rapide et polyvalent : conversation, rédaction, code, traduction, résumés. C'est le modèle par défaut de Toumaï AI — il route automatiquement chaque demande vers le meilleur moteur disponible.",
    points: ["Réponses instantanées en streaming", "Excellent en code et en français", "Comprend l'arabe et le parler tchadien"],
  },
  {
    name: "Toumaï 5",
    role: "Réflexion — raisonnement profond",
    desc: "Pour les problèmes qui demandent de la rigueur : mathématiques, planification, analyse, décisions complexes. Toumaï 5 prend le temps de réfléchir avant de répondre.",
    points: ["Raisonnement étape par étape", "Meilleure fiabilité sur les tâches complexes", "Sélectionnable dans le chat via le sélecteur de modèle"],
  },
  {
    name: "Moteurs spécialisés",
    role: "Sous le capot",
    desc: "Toumaï AI orchestre aussi des moteurs dédiés : génération d'images, transcription vocale (Whisper), synthèse vocale naturelle, vision (analyse d'images), et l'Agent Navigateur qui pilote un vrai navigateur web.",
    points: ["Images : génération et analyse", "Voix : dictée, mode vocal temps réel", "Web : recherche et navigation autonome"],
  },
];

export default function ModelsPage() {
  return (
    <LegalLayout title="Les modèles Toumaï AI">
      <p>
        Nommés d&apos;après le patrimoine tchadien — Sao, la civilisation ; Toumaï, le plus ancien
        hominidé connu — nos modèles sont choisis et orchestrés pour offrir la meilleure
        intelligence possible en français, en arabe et dans le parler tchadien.
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
          Essayer les modèles gratuitement
        </Link>
      </div>
    </LegalLayout>
  );
}
