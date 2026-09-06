import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Assistant IA gratuit — chat, rédaction, voix et recherche",
  description: "Découvrez Toumaï AI, un assistant IA gratuit pour discuter, rédiger, traduire, chercher sur le web, analyser des images et travailler à la voix.",
  alternates: { canonical: "https://toumaiai.com/assistant-ia" },
  openGraph: { title: "Assistant IA gratuit — Toumaï AI", description: "Un assistant IA pratique pour écrire, apprendre, rechercher et créer.", url: "https://toumaiai.com/assistant-ia" },
};

const FAQ = [
  ["Qu’est-ce qu’un assistant IA ?", "Un assistant IA aide à dialoguer, rédiger, synthétiser, traduire ou explorer une question. Sa réponse doit toujours être relue pour les décisions importantes."],
  ["Que peut faire Toumaï AI ?", "Toumaï AI propose notamment le chat, la rédaction, la traduction, la recherche web, les images et la voix selon les fonctionnalités activées."],
  ["Toumaï AI convient-il aux étudiants et aux professionnels ?", "Oui, pour préparer un plan, expliquer une notion, réviser un texte, trouver des pistes ou structurer une tâche. Il ne remplace ni une source primaire ni une vérification humaine."],
];
const faqLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });

export default function AssistantPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /><LegalLayout title="Assistant IA gratuit pour apprendre, créer et travailler"><p><strong>Toumaï AI</strong> est un assistant d’intelligence artificielle utilisable depuis le navigateur. Il aide à clarifier une idée, rédiger, traduire, organiser une recherche et explorer des contenus multimodaux.</p><h2>Un chat IA pour les tâches concrètes</h2><p>Commencez une conversation pour obtenir une explication, un brouillon, un résumé ou une structure. Pour une recherche, demandez des sources et vérifiez-les avant de les réutiliser.</p><h2>Écrire et traduire avec méthode</h2><p>Un assistant IA peut proposer un premier jet, corriger la clarté d’un texte ou comparer des formulations. Toumaï AI est pensé pour les usages en français, en arabe et en arabe tchadien.</p><h2>Voix, images et recherche</h2><p>Selon le besoin, vous pouvez travailler à la voix, analyser une image ou demander une recherche web. N’envoyez pas de données confidentielles dans un prompt et gardez le contrôle sur les actions connectées.</p><h2>Ressources liées</h2><ul><li><Link href="/models">Choisir un modèle Toumaï AI</Link></li><li><Link href="/intelligence-artificielle-tchad">Comprendre l’IA au Tchad</Link></li><li><Link href="/en" hrefLang="en">AI Assistant for Africa</Link></li></ul><h2>Questions fréquentes</h2>{FAQ.map(([q, a]) => <section key={q}><h3>{q}</h3><p>{a}</p></section>)}<p><Link href="/chat" className="font-semibold underline">Essayer l’assistant IA</Link></p></LegalLayout></>;
}
