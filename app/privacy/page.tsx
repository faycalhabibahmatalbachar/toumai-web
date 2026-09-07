import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Toumaï AI collecte, utilise et protège vos données.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="7 septembre 2026">
      <p>
        Votre confiance est notre actif le plus précieux. Cette politique explique quelles données
        Toumaï AI traite, pourquoi, et les contrôles dont vous disposez. Responsable du
        traitement : Faycal Habib Ahmat — <a href="mailto:contact@toumaiai.com">contact@toumaiai.com</a>.
      </p>

      <h2>1. Données que nous collectons</h2>
      <h3>Compte</h3>
      <ul>
        <li>E-mail, nom affiché, photo de profil (optionnelle).</li>
        <li>Connexion Google : identifiant et e-mail fournis par Google uniquement.</li>
      </ul>
      <h3>Utilisation</h3>
      <ul>
        <li>Conversations, documents importés, images générées — pour vous fournir le service et votre historique.</li>
        <li>Statistiques d&apos;usage (requêtes, tokens) pour le fonctionnement des quotas.</li>
      </ul>
      <h3>Paiements et abonnements</h3>
      <ul>
        <li>
          Référence de transaction, offre choisie, montant, devise, statut, environnement de test
          ou réel et horodatages nécessaires au suivi du paiement et à l&apos;activation du service.
        </li>
        <li>
          Nom, e-mail, montant, devise et référence transmis à Moneroo pour ouvrir la page de
          paiement et rapprocher son retour de votre commande.
        </li>
        <li>
          Les données sensibles de l&apos;instrument de paiement sont saisies auprès de Moneroo ou de
          la passerelle affichée et ne sont pas stockées par Toumaï AI.
        </li>
      </ul>
      <h3>Connecteurs (optionnels, activés par vous)</h3>
      <ul>
        <li>
          WhatsApp : la liaison passe par votre propre session « appareil lié » ; les messages
          transitent pour exécuter vos demandes (lecture, résumé, envoi confirmé) et ne servent
          jamais à d&apos;autres fins.
        </li>
        <li>E-mail et Google Agenda : accès limité aux actions que vous demandez.</li>
      </ul>

      <h2>2. Ce que nous ne faisons PAS</h2>
      <ul>
        <li>Nous ne vendons jamais vos données.</li>
        <li>Pas de publicité ciblée fondée sur vos conversations.</li>
        <li>
          Aucune action sensible (envoi WhatsApp/e-mail, publication de statut) sans votre
          confirmation explicite — et chaque capacité peut être désactivée dans Paramètres →
          Connecteurs.
        </li>
      </ul>

      <h2>3. Sous-traitants techniques</h2>
      <p>
        Pour générer les réponses et faire fonctionner le service, vos messages peuvent être
        traités par des fournisseurs d&apos;intelligence artificielle, ainsi que par nos
        hébergeurs (base de données, stockage de fichiers, infrastructure serveur). Ils agissent
        uniquement comme sous-traitants, sous contrat, et ne sont pas autorisés à réutiliser vos
        données à d&apos;autres fins.
      </p>
      <p>
        Pour les offres payantes, Moneroo et la passerelle de paiement choisie traitent les
        informations nécessaires à l&apos;exécution, à la vérification et, le cas échéant, aux
        obligations réglementaires liées à la transaction.
      </p>

      <h2>4. Partenaires de données et modèles tiers</h2>
      <p>
        Certains contenus utilisés pour entraîner ou améliorer nos modèles proviennent de
        partenaires tiers (par exemple des organisations fournissant des données linguistiques
        sous licence). Ces partenariats sont toujours régis par un accord écrit distinct précisant
        le périmètre autorisé, et n&apos;impliquent jamais le partage de vos conversations ou de
        vos données personnelles avec ces partenaires — seuls les modèles ou données entraînées
        peuvent, le cas échéant, faire l&apos;objet d&apos;un accord de réciprocité, toujours
        conditionné au respect intégral de la présente politique et de nos{" "}
        <a href="/terms">conditions d&apos;utilisation</a>.
      </p>

      <h2>5. Conservation</h2>
      <ul>
        <li>Conversations et fichiers : conservés tant que votre compte existe, supprimables à tout moment depuis l&apos;interface.</li>
        <li>Sessions invité : purge automatique périodique.</li>
        <li>Jetons de connexion : expirent automatiquement.</li>
        <li>
          Références et statuts de paiement : conservés pendant la durée nécessaire au suivi du
          service, à la prévention de la fraude et au respect des obligations applicables.
        </li>
      </ul>

      <h2>6. Partage de conversations</h2>
      <p>
        Une conversation partagée n&apos;est visible que via son lien ; en mode anonyme, votre nom
        n&apos;apparaît pas. La révocation du lien la rend immédiatement inaccessible.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Chiffrement en transit (HTTPS), jetons d&apos;accès à courte durée de vie, isolation des
        données par utilisateur, confirmation obligatoire des actions sensibles.
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Accès, rectification, suppression, portabilité : écrivez-nous à{" "}
        <a href="mailto:contact@toumaiai.com">contact@toumaiai.com</a> ou utilisez les outils
        intégrés (suppression de conversations, de fichiers, déconnexion des connecteurs). Voir
        aussi vos <a href="/privacy-choices">choix de confidentialité</a>.
      </p>
    </LegalLayout>
  );
}
