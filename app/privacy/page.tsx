import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Toumaï AI collecte, utilise et protège vos données.",
  alternates: { canonical: "https://toumaiai.com/privacy/", languages: {} },
  openGraph: { title: "Confidentialité — Toumaï AI", url: "https://toumaiai.com/privacy/", locale: "fr_FR", images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title: "Confidentialité — Toumaï AI", images: ["/og-image.png"] },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité" updated="9 septembre 2026" toc path="/privacy/">
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
          transitent pour les fonctions demandées (lecture, résumé, envoi et automatisations
          autorisées). Les destinataires reçoivent les messages effectivement envoyés.
        </li>
        <li>E-mail et Google Agenda : les autorisations de connexion permettent les fonctions disponibles. Vérifiez leur périmètre sur le service tiers et révoquez-les lorsque vous n&apos;en avez plus besoin.</li>
      </ul>

      <h2>2. Ce que nous ne faisons PAS</h2>
      <ul>
        <li>Nous ne vendons jamais vos données.</li>
        <li>Pas de publicité ciblée fondée sur vos conversations.</li>
        <li>
          Examinez les autorisations des connecteurs et les confirmations proposées. Une
          automatisation autorisée peut agir ultérieurement : une confirmation distincte avant
          chaque exécution ne doit pas être présumée. Désactivez les tâches et déconnectez les
          services que vous ne souhaitez plus utiliser.
        </li>
      </ul>

      <h2>3. Sous-traitants techniques</h2>
      <p>
        Pour générer les réponses et faire fonctionner le service, vos messages peuvent être
        traités par des fournisseurs d&apos;intelligence artificielle, ainsi que par nos
        hébergeurs (base de données, stockage de fichiers, infrastructure serveur). Les conditions
        de traitement dépendent du fournisseur et de la configuration utilisés. Cette page ne
        garantit pas une absence de conservation ou de réutilisation chez tous les fournisseurs.
      </p>
      <p>
        Pour les offres payantes, Moneroo et la passerelle de paiement choisie traitent les
        informations nécessaires à l&apos;exécution, à la vérification et, le cas échéant, aux
        obligations réglementaires liées à la transaction.
      </p>

      <h2>4. Partenaires de données et modèles tiers</h2>
      <p>
        L&apos;utilisation du service ne constitue pas une autorisation générale de céder vos
        conversations à des partenaires linguistiques. Aucun partenariat, corpus sous licence
        ou accord de réciprocité n&apos;est attesté par cette page. Les droits sur les données
        d&apos;entraînement doivent être établis séparément. La génération d&apos;une réponse
        ne prouve pas à elle seule un entraînement sur votre message.
      </p>

      <h2>5. Conservation</h2>
      <ul>
        <li>Les outils de gestion permettent de demander la suppression des conversations, des fichiers et du compte. Ce sont des opérations distinctes.</li>
        <li>Une session temporaire ou une déconnexion ne prouve pas un effacement. Aucun délai uniforme de purge automatique n&apos;est garanti ici.</li>
        <li>Jetons de connexion : expirent automatiquement.</li>
        <li>
          Références et statuts de paiement : conservés pendant la durée nécessaire au suivi du
          service, à la prévention de la fraude et au respect des obligations applicables.
        </li>
      </ul>

      <h2>6. Partage de conversations</h2>
      <p>
        Toute personne possédant un lien actif peut consulter le contenu partagé. Le mode
        anonyme masque le nom du propriétaire, pas les données personnelles contenues dans les
        messages. La révocation désactive ce lien sur le service ; elle n&apos;efface pas les
        copies ou captures déjà réalisées.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Le site utilise HTTPS et des contrôles d&apos;authentification. Aucune mesure ne garantit
        une sécurité absolue. Protégez vos identifiants et vérifiez les destinataires et les
        autorisations avant de transmettre des données ou de lancer une action.
      </p>

      <h2>8. Stockage local et mesure d&apos;audience</h2>
      <p>Le navigateur conserve des préférences, des ressources du site et certaines données
        déjà consultées pour accélérer l&apos;affichage. Sur un appareil partagé, déconnectez-vous
        et effacez les données locales du site si nécessaire. Une copie locale ne garantit pas
        l&apos;accès hors ligne à la génération de nouvelles réponses.</p>
      <p>Le domaine public charge Cloudflare Web Analytics pour mesurer la fréquentation et
        les performances. Les informations techniques de navigation sont distinctes du contenu
        des conversations envoyé aux services de génération.</p>
      <h2>9. Voix, recherche et fichiers</h2>
      <p>Une demande vocale peut transmettre de l&apos;audio pour transcription et génération
        de réponse. Une recherche web transmet des termes de recherche ; un fichier peut être
        extrait et transmis au modèle pour analyse. N&apos;incluez que les informations utiles
        à la tâche et pour lesquelles vous disposez des autorisations nécessaires.</p>
      <h2>10. Traitements internationaux et demandes particulières</h2>
      <p>Un produit conçu au Tchad ne signifie pas que les données restent exclusivement au
        Tchad. Les infrastructures et fournisseurs utilisés peuvent traiter des données à
        l&apos;étranger. Contactez-nous avant un usage soumis à des exigences particulières de
        localisation, de confidentialité professionnelle ou concernant des mineurs.</p>
      <h2>11. Vos droits et demandes de suppression</h2>
      <p>
        Accès, rectification, suppression, portabilité : écrivez-nous à{" "}
        <a href="mailto:contact@toumaiai.com">contact@toumaiai.com</a> ou utilisez les outils
        intégrés (suppression de conversations, de fichiers, déconnexion des connecteurs). Voir
        aussi vos <a href="/privacy-choices">choix de confidentialité</a>.
      </p>
    </LegalLayout>
  );
}
