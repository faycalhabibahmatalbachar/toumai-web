import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

/**
 * Page de fond sur l'intelligence artificielle au Tchad.
 *
 * POURQUOI UNE PAGE, ET PAS DES MOTS-CLÉS EN PLUS
 * ------------------------------------------------
 * Google ignore la balise `keywords` depuis 2009. Ce qui se classe, c'est une
 * page qui RÉPOND à la question posée, avec assez de matière pour qu'un
 * lecteur reparte informé. Une page d'atterrissage remplie de variantes du
 * même mot est un « doorway page » — Google les dégrade explicitement.
 *
 * Cette page vise « intelligence artificielle Tchad », « IA tchadienne »,
 * « AI Tchad » en traitant réellement le sujet : ce qui existe, dans quelles
 * langues, ce que ça coûte, et où l'essayer.
 */
export const metadata: Metadata = {
  title: "Intelligence artificielle au Tchad — Toumaï AI",
  description:
    "L'intelligence artificielle au Tchad : Toumaï AI, l'IA tchadienne gratuite qui parle français, arabe et arabe tchadien. Chat, images, WhatsApp, voix. Créée à N'Djamena.",
  alternates: { canonical: "https://toumaiai.com/intelligence-artificielle-tchad" },
  openGraph: {
    title: "Intelligence artificielle au Tchad — Toumaï AI",
    description:
      "L'IA tchadienne gratuite : chat en français et arabe tchadien, images, WhatsApp, voix.",
    url: "https://toumaiai.com/intelligence-artificielle-tchad",
    type: "article",
  },
};

/** Questions réellement posées, et réponses réelles. Le balisage FAQPage les
 * rend éligibles aux résultats enrichis — mais il ne vaut que si les réponses
 * existent aussi dans la page, visibles par le lecteur. C'est le cas. */
const FAQ = [
  {
    q: "Existe-t-il une intelligence artificielle tchadienne ?",
    r: "Oui. Toumaï AI est un assistant d'intelligence artificielle conçu au Tchad, à N'Djamena, par Faycal Habib Ahmat. Il est accessible gratuitement sur toumaiai.com et sur Android, et comprend le français, l'arabe et l'arabe tchadien.",
  },
  {
    q: "Toumaï AI est-il gratuit ?",
    r: "Oui. Le chat, la génération d'images, la dictée et le mode vocal sont accessibles gratuitement. Aucune carte bancaire n'est demandée pour commencer.",
  },
  {
    q: "Toumaï AI comprend-il l'arabe tchadien ?",
    r: "Oui, et c'est sa particularité. La plupart des assistants traitent l'arabe standard ; Toumaï AI est développé avec un corpus d'arabe tchadien (dialecte shuwa) collecté sur place, pour comprendre la langue telle qu'elle se parle réellement au Tchad.",
  },
  {
    q: "Que peut faire Toumaï AI ?",
    r: "Répondre à des questions, rédiger et corriger des textes, écrire et exécuter du code, générer et analyser des images, transcrire la voix, lire ses réponses à voix haute, chercher sur le web, créer des sites, et se connecter à WhatsApp, à la messagerie et à l'agenda.",
  },
  {
    q: "Faut-il une connexion rapide pour utiliser Toumaï AI ?",
    r: "Non. L'application est conçue pour les liaisons tchadiennes : elle affiche immédiatement ce qu'elle a déjà en mémoire, mesure la qualité réelle de la connexion, et conserve ce qui est affiché quand le réseau faiblit au lieu de vider l'écran.",
  },
  {
    q: "Quelle différence avec ChatGPT au Tchad ?",
    r: "Toumaï AI est pensé pour le contexte tchadien : l'arabe tchadien, des liaisons lentes, des connecteurs utiles sur place comme WhatsApp, et un accès gratuit sans carte bancaire — condition d'accès qui exclut beaucoup d'utilisateurs des services internationaux.",
  },
];

const FAQ_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.r },
  })),
});

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_LD }} />
      <LegalLayout title="L'intelligence artificielle au Tchad">
        <p>
          L&apos;intelligence artificielle est arrivée au Tchad par des services
          conçus ailleurs, en anglais ou en français standard, souvent payants et
          rarement adaptés aux liaisons dont on dispose réellement à N&apos;Djamena,
          Moundou ou Abéché. <strong>Toumaï AI</strong> est né de ce constat : une IA
          tchadienne, gratuite, qui parle les langues du pays et qui fonctionne sur
          le réseau du pays.
        </p>

        <h2>Une IA conçue au Tchad</h2>
        <p>
          Toumaï AI est développé à N&apos;Djamena par Faycal Habib Ahmat. Son nom
          vient de <em>Toumaï</em>, l&apos;hominidé découvert dans le désert du
          Djourab en 2001 — le plus ancien représentant connu de la lignée humaine,
          et l&apos;un des symboles scientifiques du Tchad.
        </p>
        <p>
          L&apos;assistant est accessible sur le web et sur Android. Il ne demande ni
          carte bancaire ni abonnement pour commencer — une condition qui, dans un
          pays où le paiement international reste difficile, décide à elle seule de
          qui peut utiliser l&apos;outil.
        </p>

        <h2>Le français, l&apos;arabe, et l&apos;arabe tchadien</h2>
        <p>
          C&apos;est la différence de fond avec les assistants internationaux. Le
          Tchad a deux langues officielles, le français et l&apos;arabe, et une langue
          véhiculaire parlée par une grande partie de la population :
          l&apos;<strong>arabe tchadien</strong> (dialecte shuwa), qui n&apos;est ni
          l&apos;arabe standard ni un simple accent.
        </p>
        <p>
          Toumaï AI est développé avec un corpus d&apos;arabe tchadien collecté sur
          place — enregistrements, transcriptions, travail lexicographique — pour
          comprendre la langue telle qu&apos;elle se parle, et pas telle qu&apos;elle
          s&apos;écrit dans les manuels.
        </p>

        <h2>Ce que Toumaï AI sait faire</h2>
        <ul>
          <li>
            <strong>Répondre et rédiger</strong> — questions, courriers, résumés,
            traductions, corrections en français comme en arabe.
          </li>
          <li>
            <strong>Écrire et exécuter du code</strong> — dans une trentaine de
            langages, avec exécution réelle et console intégrée.
          </li>
          <li>
            <strong>Créer des images</strong>, et analyser celles qu&apos;on lui
            envoie.
          </li>
          <li>
            <strong>Parler et écouter</strong> — dictée, lecture à voix haute, mode
            vocal en conversation continue.
          </li>
          <li>
            <strong>Consulter le web</strong> quand la question l&apos;exige, et citer
            ce qu&apos;il a lu.
          </li>
          <li>
            <strong>Se connecter à vos outils</strong> — WhatsApp, messagerie,
            agenda — avec une confirmation demandée avant toute action réelle.
          </li>
        </ul>

        <h2>Pensé pour le réseau d&apos;ici</h2>
        <p>
          Une application qui suppose une fibre optique devient inutilisable sur une
          connexion mobile tchadienne. Toumaï AI affiche immédiatement ce qu&apos;il a
          déjà en mémoire, mesure la latence réelle vers ses serveurs plutôt que de
          se fier à l&apos;icône du téléphone, et garde à l&apos;écran ce qui est déjà
          chargé quand le réseau faiblit — au lieu de vider la page.
        </p>

        <h2>Questions fréquentes</h2>
        <dl className="not-prose mt-4 space-y-5">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-[var(--text-primary)]">{f.q}</dt>
              <dd className="mt-1 text-[var(--text-secondary)]">{f.r}</dd>
            </div>
          ))}
        </dl>

        <h2>Essayer</h2>
        <p>
          <Link href="/chat" className="font-semibold underline underline-offset-2">
            Ouvrir Toumaï AI
          </Link>{" "}
          — gratuit, sans installation. Vous pouvez aussi consulter{" "}
          <Link href="/models" className="underline underline-offset-2">
            la famille de modèles
          </Link>{" "}
          ou{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            la politique de confidentialité
          </Link>
          .
        </p>
      </LegalLayout>
    </>
  );
}
