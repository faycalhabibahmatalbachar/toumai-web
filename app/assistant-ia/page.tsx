import type { Metadata } from "next";
import Link from "next/link";
import { EditorialDocument } from "@/components/editorial/EditorialDocument";

export const metadata: Metadata = {
  title: "Assistant IA gratuit — chat, rédaction, voix et recherche",
  description: "Toumaï AI aide à poser une question, préparer un texte, traduire, chercher sur le web, analyser une image ou utiliser la voix.",
  alternates: { canonical: "https://toumaiai.com/assistant-ia/", languages: {} },
  twitter: { card: "summary_large_image", title: "Assistant IA gratuit — Toumaï AI", description: "Écrire, chercher et travailler avec une vérification humaine.", images: ["/og-image.png"] },
  openGraph: { title: "Assistant IA gratuit — Toumaï AI", description: "Un espace pour écrire, chercher, traduire et travailler avec l’IA.", url: "https://toumaiai.com/assistant-ia" },
};

const FAQ = [
  ["Qu’est-ce qu’un assistant IA ?", "Un assistant IA aide à dialoguer, rédiger, synthétiser, traduire ou explorer une question. Sa réponse doit toujours être relue pour les décisions importantes."],
  ["Que peut faire Toumaï AI ?", "Toumaï AI propose notamment le chat, la rédaction, la traduction, la recherche web, les images et la voix selon les fonctionnalités activées."],
  ["Toumaï AI convient-il aux étudiants et aux professionnels ?", "Oui, pour préparer un plan, expliquer une notion, réviser un texte, trouver des pistes ou structurer une tâche. Il ne remplace ni une source primaire ni une vérification humaine."],
];
const faqLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });

export default function AssistantPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /><EditorialDocument title="Un assistant IA pour vos tâches." intro="Une question, un texte, un document : donnez un point de départ à Toumaï AI et gardez la main sur le résultat."><p><strong>Toumaï AI</strong> fonctionne dans le navigateur. Posez une question, envoyez une image, préparez un texte ou demandez une recherche sans passer d’un outil à l’autre.</p><h2>Commencer par une tâche concrète</h2><p>Vous pouvez demander une explication, un plan, un résumé ou un premier brouillon. Pour une recherche, demandez les sources puis vérifiez-les avant de les reprendre dans votre travail.</p><h2>Écrire, traduire, reformuler</h2><p>Donnez le contexte et ce que vous voulez obtenir. Toumaï peut proposer une version, comparer deux formulations ou rendre un texte plus clair. Il est conçu pour les usages en français, arabe et arabe tchadien.</p><h2>Voix, images et recherche</h2><p>Selon la tâche, vous pouvez parler à voix haute, analyser une image ou lancer une recherche web. Ne mettez pas d’informations confidentielles dans un prompt et relisez toute action préparée pour un outil connecté.</p><h2>Ressources liées</h2><ul><li><Link href="/models">Voir les modèles disponibles</Link></li><li><Link href="/intelligence-artificielle-tchad">Lire notre page sur l’IA au Tchad</Link></li><li><Link href="/en" hrefLang="en">Read about Toumaï AI in English</Link></li></ul><h2>Questions fréquentes</h2>{FAQ.map(([q, a]) => <section key={q}><h3>{q}</h3><p>{a}</p></section>)}<p><Link href="/chat" className="font-semibold underline">Ouvrir le chat</Link></p></EditorialDocument></>;
}
