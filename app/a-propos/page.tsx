import type { Metadata } from "next";
import Link from "next/link";
import { EditorialDocument } from "@/components/editorial/EditorialDocument";

export const metadata: Metadata = {
  title: { absolute: "À propos de Toumaï AI — IA conçue au Tchad" },
  twitter: { card: "summary_large_image", title: "À propos de Toumaï AI", description: "Notre mission, notre origine et notre produit conçu à N’Djamena.", images: ["/og-image.png"] },
  description:
    "Toumaï AI est un assistant d’intelligence artificielle conçu à N’Djamena, pour écrire, chercher, apprendre et travailler dans plusieurs langues.",
  alternates: {
    canonical: "https://toumaiai.com/a-propos",
    languages: { fr: "https://toumaiai.com/a-propos", en: "https://toumaiai.com/en/about", ar: "https://toumaiai.com/ar/about", "x-default": "https://toumaiai.com/a-propos" },
  },
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
      <EditorialDocument title="À propos de Toumaï AI" intro="Conçu à N’Djamena, ouvert sur le monde. Notre mission : rendre l’intelligence artificielle utile dans les langues et les tâches du quotidien.">
        <p>
          <strong>Toumaï AI</strong> est un assistant d&apos;intelligence artificielle
          conçu à N&apos;Djamena, au Tchad. Il réunit chat, rédaction, code, images,
          voix, recherche web et connecteurs, afin de rendre l&apos;IA utile au quotidien
          sans imposer une carte bancaire pour commencer.
        </p>

        <h2>Notre histoire</h2>
        <p>
          Toumaï AI est parti d&apos;un constat simple : les outils d&apos;IA les plus connus
          ne sont pas toujours pensés pour les langues, les usages et les conditions
          de connexion rencontrés au Tchad. Le projet a donc été construit comme un
          produit de travail réel : on doit pouvoir poser une question, préparer un
          message, relire un document ou chercher une information depuis le même
          espace, puis garder la possibilité de vérifier et de décider soi-même.
        </p>

        <h2>Notre mission</h2>
        <p>
          Rendre l&apos;intelligence artificielle plus accessible aux personnes, aux
          étudiants, aux équipes et aux entreprises du Tchad et d&apos;Afrique. Cela veut
          dire concevoir pour les langues utilisées ici, pour les conditions réelles
          de connexion et pour des tâches qui ont un résultat concret.
        </p>

        <h2>Notre vision</h2>
        <p>
          Nous voulons faire évoluer Toumaï AI en une plateforme capable de réunir
          conversation, voix, images, recherche et outils connectés, sans perdre la
          clarté nécessaire à leur utilisation. L&apos;ancrage tchadien fait partie de ce
          travail ; il n&apos;empêche pas une ambition plus large, africaine et internationale.
        </p>

        <h2>Langues et contexte local</h2>
        <p>
          Toumaï AI est pensé pour le français, l&apos;arabe et l&apos;arabe tchadien. Le
          produit s&apos;attache à fournir une expérience utilisable sur le web et via
          WhatsApp, plutôt qu&apos;une démonstration réservée à un seul
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
      </EditorialDocument>
    </>
  );
}
