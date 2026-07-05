import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions & politiques",
  description: "Conditions d'utilisation de Toumaï AI — l'assistant IA tchadien.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions & politiques" updated="5 juillet 2026">
      <p>
        Bienvenue sur Toumaï AI. En utilisant le site toumaiai.com, l&apos;application mobile ou
        l&apos;API, vous acceptez les présentes conditions. Toumaï AI est édité par Faycal Habib
        Ahmat (N&apos;Djamena, Tchad) — contact :{" "}
        <a href="mailto:contact@toumaiai.com">contact@toumaiai.com</a>.
      </p>

      <h2>1. Le service</h2>
      <p>
        Toumaï AI est un assistant d&apos;intelligence artificielle : conversation, génération
        d&apos;images et de documents, mode vocal, recherche web, agent de navigation, et
        connecteurs optionnels (WhatsApp, e-mail, Google Agenda). Certaines fonctionnalités
        nécessitent un compte ; d&apos;autres sont accessibles en session invité.
      </p>

      <h2>2. Votre compte</h2>
      <ul>
        <li>Vous êtes responsable de la confidentialité de vos identifiants.</li>
        <li>Un compte par personne ; vous devez fournir des informations exactes.</li>
        <li>
          Les sessions invité sont temporaires : leurs données peuvent être purgées à tout moment.
        </li>
      </ul>

      <h2>3. Usage acceptable</h2>
      <p>Il est interdit d&apos;utiliser Toumaï AI pour :</p>
      <ul>
        <li>des activités illégales, frauduleuses ou nuisibles ;</li>
        <li>du spam ou des messages non sollicités via les connecteurs (WhatsApp, e-mail) ;</li>
        <li>générer des contenus haineux, diffamatoires ou trompeurs présentés comme factuels ;</li>
        <li>tenter de contourner les limitations techniques ou de sécurité du service.</li>
      </ul>
      <p>
        Les connecteurs agissent sur VOS comptes, en votre nom et sous votre contrôle : chaque
        action sensible demande votre confirmation explicite, et vous pouvez restreindre chaque
        capacité dans Paramètres → Connecteurs.
      </p>

      <h2>4. Contenus générés</h2>
      <p>
        Les réponses de l&apos;IA peuvent contenir des erreurs — vérifiez les informations
        importantes. Vous conservez les droits sur les contenus que vous soumettez ; les images et
        documents générés pour vous sont utilisables librement, y compris commercialement, sous
        votre responsabilité.
      </p>

      <h2>5. Partage de conversations</h2>
      <p>
        Vous pouvez publier une conversation via un lien de partage (secret ou public). Vous en
        choisissez la visibilité et l&apos;anonymat, et pouvez révoquer le lien à tout moment —
        la page devient alors inaccessible.
      </p>

      <h2>6. Disponibilité et responsabilité</h2>
      <p>
        Le service est fourni « en l&apos;état », sans garantie de disponibilité continue. Notre
        responsabilité est limitée au montant que vous avez payé au cours des 12 derniers mois
        (zéro pour l&apos;offre gratuite), dans la limite du droit applicable.
      </p>

      <h2>7. Modifications</h2>
      <p>
        Nous pouvons faire évoluer le service et ces conditions ; les changements notables seront
        annoncés sur le site. La poursuite de l&apos;utilisation vaut acceptation.
      </p>

      <h2>8. Droit applicable</h2>
      <p>Ces conditions sont régies par le droit tchadien.</p>
    </LegalLayout>
  );
}
