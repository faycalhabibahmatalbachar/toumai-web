import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "À propos de Toumaï AI — IA conçue au Tchad",
  description:
    "Découvrez Toumaï AI, l'assistant d'intelligence artificielle conçu à N'Djamena : sa mission, ses langues, ses capacités et son fondateur.",
  alternates: { canonical: "https://toumaiai.com/a-propos" },
  openGraph: {
    title: "À propos de Toumaï AI",
    description:
      "Un assistant d'intelligence artificielle conçu au Tchad, pour des usages concrets en français, arabe et arabe tchadien.",
    url: "https://toumaiai.com/a-propos",
    type: "website",
  },
};

const ABOUT_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  mainEntity: {
    "@id": "https://toumaiai.com/#organisation",
    "@type": "Organization",
    name: "Toumaï AI",
    url: "https://toumaiai.com/",
    foundingLocation: { "@type": "Place", name: "N'Djamena, Tchad" },
    founder: { "@id": "https://toumaiai.com/#createur" },
  },
});

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ABOUT_LD }} />
      <LegalLayout title="À propos de Toumaï AI">
        <p>
          <strong>Toumaï AI</strong> est un assistant d&apos;intelligence artificielle
          conçu à N&apos;Djamena, au Tchad. Il réunit chat, rédaction, code, images,
          voix, recherche web et connecteurs, afin de rendre l&apos;IA utile au quotidien
          sans imposer une carte bancaire pour commencer.
        </p>

        <h2>Notre mission</h2>
        <p>
          Faire de l&apos;intelligence artificielle un outil accessible, concret et
          compréhensible pour les personnes, les étudiants, les équipes et les
          entreprises du Tchad et d&apos;Afrique. Cela signifie aussi concevoir pour les
          langues utilisées ici et pour les conditions réelles de connexion.
        </p>

        <h2>Langues et contexte local</h2>
        <p>
          Toumaï AI est pensé pour le français, l&apos;arabe et l&apos;arabe tchadien. Le
          produit s&apos;attache à fournir une expérience utilisable sur le web, sur
          Android et via WhatsApp, plutôt qu&apos;une démonstration réservée à un seul
          environnement technique.
        </p>

        <h2>Le produit</h2>
        <p>
          L&apos;assistant aide à explorer une question, rédiger, traduire, analyser des
          contenus, programmer, générer ou analyser des images, utiliser la voix et
          rechercher des informations sur le web lorsque cela est nécessaire. Les
          capacités et les modèles disponibles sont présentés de façon détaillée dans
          la <Link href="/models" className="underline underline-offset-2">page des modèles</Link>.
        </p>

        <h2>Origine du nom</h2>
        <p>
          Le nom Toumaï fait référence à l&apos;hominidé découvert dans le désert du
          Djourab en 2001, un symbole scientifique associé au Tchad. Il exprime une
          ambition simple : faire grandir une technologie ancrée localement et ouverte
          sur le monde.
        </p>

        <h2>Fondateur et contact</h2>
        <p>
          Toumaï AI a été créé par Faycal Habib Ahmat. Pour une question, une
          collaboration ou un besoin d&apos;entreprise, écrivez à{" "}
          <a className="underline underline-offset-2" href="mailto:contact@toumaiai.com">
            contact@toumaiai.com
          </a>.
        </p>

        <h2>Pour aller plus loin</h2>
        <p>
          Découvrez <Link href="/assistant-ia" className="underline underline-offset-2">l&apos;assistant IA Toumaï</Link>,
          notre page sur <Link href="/intelligence-artificielle-tchad" className="underline underline-offset-2">l&apos;intelligence artificielle au Tchad</Link>,
          ou <Link href="/chat" className="font-semibold underline underline-offset-2">essayez le chat</Link>.
        </p>
      </LegalLayout>
    </>
  );
}
