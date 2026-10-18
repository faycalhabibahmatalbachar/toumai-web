"use client";

import { useState } from "react";
import { ArrowRight, MessageSquareText, ShieldCheck } from "lucide-react";

const SCENARIOS = [
  {
    id: "education",
    label: "Éducation",
    contexte: "Accueil d’un établissement fictif",
    questions: [
      {
        question: "Quels documents préparer pour une inscription ?",
        reponse: "Dans cet exemple fictif, le candidat prépare un formulaire, une pièce d’identité et un justificatif de niveau. La liste officielle doit être confirmée par l’établissement.",
      },
      {
        question: "À qui demander un rendez-vous ?",
        reponse: "Un assistant pourrait orienter vers le secrétariat et proposer les coordonnées publiées par l’établissement, après vérification humaine.",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    contexte: "Accueil d’un commerce fictif",
    questions: [
      {
        question: "Comment connaître la disponibilité d’un produit ?",
        reponse: "Un assistant pourrait consulter un catalogue explicitement connecté et autorisé. Ici, aucun stock réel n’est consulté : la disponibilité reste à confirmer par le commerçant.",
      },
      {
        question: "Comment transmettre une demande de devis ?",
        reponse: "Le client décrit son besoin ; une équipe valide les informations avant d’établir un devis. Aucun prix réel n’est généré dans cette démonstration.",
      },
    ],
  },
  {
    id: "organisation",
    label: "Organisation",
    contexte: "Base documentaire fictive",
    questions: [
      {
        question: "Comment retrouver une procédure interne ?",
        reponse: "Un assistant pourrait rechercher dans les documents autorisés, citer la version pertinente et signaler les incertitudes. Aucun document privé n’est utilisé ici.",
      },
      {
        question: "Comment préparer un compte rendu ?",
        reponse: "À partir de notes autorisées, un brouillon pourrait présenter décisions, actions et points à confirmer. Un responsable relit avant toute diffusion.",
      },
    ],
  },
] as const;

export function DemoPilotes() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const scenario = SCENARIOS[scenarioIndex];
  const exemple = scenario.questions[questionIndex];

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
      <div className="border-b p-5 sm:p-7" style={{ borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText size={18} aria-hidden="true" /> Démonstrateur de parcours</p>
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Simulation — sans appel IA</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Choisir un secteur">
          {SCENARIOS.map((item, index) => (
            <button
              key={item.id}
              id={`scenario-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={scenarioIndex === index}
              aria-controls="scenario-panel"
              onClick={() => { setScenarioIndex(index); setQuestionIndex(0); }}
              className="rounded-full border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: scenarioIndex === index ? "var(--primary)" : "var(--border)",
                background: scenarioIndex === index ? "var(--primary)" : "transparent",
                color: scenarioIndex === index ? "#fff" : "var(--text-primary)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div id="scenario-panel" role="tabpanel" aria-labelledby={`scenario-tab-${scenario.id}`} className="grid gap-6 p-5 sm:p-7 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{scenario.contexte}</p>
          <h3 className="mt-3 text-xl font-semibold">Choisissez une question</h3>
          <div className="mt-5 space-y-3">
            {scenario.questions.map((item, index) => (
              <button
                key={item.question}
                type="button"
                aria-pressed={questionIndex === index}
                onClick={() => setQuestionIndex(index)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left text-sm"
                style={{
                  borderColor: questionIndex === index ? "var(--primary)" : "var(--border)",
                  background: "var(--surface)",
                }}
              >
                {item.question} <ArrowRight size={17} className="shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div aria-live="polite" aria-atomic="true">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Réponse illustrative</p>
            <p className="mt-4 text-sm font-semibold">{exemple.question}</p>
            <p className="mt-4 leading-8" style={{ color: "var(--text-secondary)" }}>{exemple.reponse}</p>
          </div>
          <p className="mt-8 flex items-start gap-2 border-t pt-4 text-xs leading-6" style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}>
            <ShieldCheck size={16} className="mt-1 shrink-0" aria-hidden="true" />
            Réponses écrites à l’avance, données fictives, aucun envoi ni collecte. Les capacités d’un pilote réel doivent être testées et approuvées.
          </p>
        </div>
      </div>
    </div>
  );
}
