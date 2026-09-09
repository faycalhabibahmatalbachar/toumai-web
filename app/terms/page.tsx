import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions & politiques",
  description: "Conditions d'utilisation de Toumaï AI — l'assistant IA tchadien.",
  alternates: { canonical: "https://toumaiai.com/terms/", languages: {} },
  openGraph: { title: "Conditions d’utilisation — Toumaï AI", url: "https://toumaiai.com/terms/", locale: "fr_FR", images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title: "Conditions d’utilisation — Toumaï AI", images: ["/og-image.png"] },
};

export default function TermsPage() {
  return (
    <LegalLayout title="Conditions & politiques" updated="9 septembre 2026" toc path="/terms/">
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
        nécessitent un compte. La disponibilité dépend de la formule, des autorisations et de
        l&apos;état des intégrations ; cette liste ne garantit pas un accès invité à chacune.
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
        Les connecteurs agissent sur vos comptes avec les autorisations accordées. Vérifiez les
        destinataires et les confirmations proposées. Une tâche automatisée peut s&apos;exécuter
        ultérieurement : ne présumez pas une nouvelle confirmation à chaque exécution.
      </p>

      <h2>4. Contenus générés</h2>
      <p>
        Les réponses de l&apos;IA peuvent contenir des erreurs — vérifiez les informations
        importantes. Vous conservez les droits que vous détenez sur les contenus soumis. Les
        résultats peuvent être similaires à ceux obtenus par d&apos;autres utilisateurs. Leur
        exploitation commerciale dépend des droits de tiers, des licences et du droit applicable ;
        la génération ne garantit ni exclusivité ni absence de contrefaçon.
      </p>

      <h2>5. Propriété intellectuelle et modèles</h2>
      <p>
        Toumaï AI ne revendique des droits que sur les éléments qu&apos;elle détient effectivement.
        Les composants open source, modèles tiers, poids et architectures restent soumis aux
        droits de leurs titulaires et à leurs licences. Le nom commercial d&apos;une formule ne
        prouve pas la propriété du modèle sous-jacent. L&apos;accès au service ne transfère pas
        la propriété du code, des marques ou des modèles.
      </p>
      <p>
        Sous réserve des licences tierces applicables, toute utilisation de nos éléments propriétaires par un tiers — partenaire technique, fournisseur de
        données, organisation de recherche ou autre — en dehors de l&apos;usage normal du service,
        y compris le fine-tuning, la redistribution, l&apos;intégration dans un produit tiers ou
        l&apos;accès aux poids du modèle, nécessite un accord écrit distinct et préalable avec
        Toumaï AI. Un tel accord précise systématiquement le périmètre exact d&apos;utilisation
        autorisée, les obligations de conformité aux présentes conditions et à notre politique de
        confidentialité, et notre droit de révoquer l&apos;accès en cas de manquement. L&apos;absence
        d&apos;accord écrit signifie l&apos;absence d&apos;autorisation, quelle que soit la
        correspondance échangée par ailleurs.
      </p>

      <h2>6. Partage de conversations</h2>
      <p>
        Vous pouvez publier une conversation via un lien de partage (secret ou public). Vous en
        choisissez la visibilité et l&apos;anonymat, et pouvez révoquer le lien à tout moment —
        le lien cesse de donner accès au service. Les copies déjà réalisées ne sont pas effacées.
      </p>

      <h2>7. Disponibilité et responsabilité</h2>
      <p>
        Le service est fourni « en l&apos;état », sans garantie de disponibilité continue. Notre
        responsabilité est limitée au montant que vous avez payé au cours des 12 derniers mois
        (zéro pour l&apos;offre gratuite), dans la limite du droit applicable.
      </p>

      <h2>8. Offres payantes et paiements</h2>
      <ul>
        <li>
          Le prix, la devise, la durée et les capacités incluses sont affichés avant la validation
          du paiement. Les offres actuelles sont activées pour 30 jours et ne donnent pas lieu à
          un prélèvement automatique. Essentiel : 3 000 FCFA pour 30 jours ; Toumaï 5 :
          9 000 FCFA pour 30 jours. Le renouvellement est manuel.
        </li>
        <li>
          Le paiement est traité sur la page sécurisée de notre prestataire Moneroo et de la
          passerelle choisie. Toumaï AI ne reçoit ni ne conserve le numéro complet de votre carte,
          votre code de sécurité ou votre code de validation bancaire.
        </li>
        <li>
          L&apos;abonnement est activé uniquement après confirmation technique du paiement. Une
          opération annulée, échouée ou encore en attente n&apos;active pas l&apos;offre. Un test en
          environnement sandbox ne constitue jamais un paiement réel et ne crée aucun droit
          commercial.
        </li>
        <li>
          En cas de difficulté, contactez-nous avec la référence Toumaï AI affichée, sans jamais
          transmettre de données bancaires sensibles. Une demande de remboursement est examinée
          selon la situation, le service effectivement fourni et le droit applicable.
        </li>
      </ul>

      <h2>9. Application et résiliation</h2>
      <p>
        Nous nous réservons le droit de suspendre ou de résilier l&apos;accès de tout compte, ou de
        mettre fin à tout accord tiers portant sur nos modèles ou nos données, en cas de
        manquement aux présentes conditions, à notre politique de confidentialité, ou à tout
        accord écrit distinct — sans préavis lorsque le manquement l&apos;exige.
      </p>
      <p>
        À l&apos;expiration d&apos;une offre payante, le compte revient aux capacités disponibles de
        l&apos;offre gratuite. La fin d&apos;un abonnement ne supprime pas automatiquement vos
        conversations ou votre compte.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Nous pouvons faire évoluer le service et ces conditions ; les changements notables seront
        annoncés sur le site. La poursuite de l&apos;utilisation vaut acceptation.
      </p>

      <h2>11. Droit applicable</h2>
      <p>Ces conditions sont régies par le droit tchadien.</p>
    </LegalLayout>
  );
}
