import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Supprimer mon compte",
  description:
    "Comment supprimer définitivement votre compte Toumaï AI et toutes les données associées.",
};

/**
 * Page publique de suppression de compte.
 *
 * Google Play l'exige depuis 2024 : en plus du chemin de suppression dans
 * l'application, il faut une URL accessible SANS installer l'app ni se
 * connecter, indiquant quelles données sont supprimées et sous quel délai.
 * C'est cette URL qui est déclarée dans la fiche Play Console.
 */
export default function DeleteAccountPage() {
  return (
    <LegalLayout title="Supprimer mon compte" updated="30 juillet 2026">
      <p>
        Vous pouvez supprimer votre compte Toumaï AI à tout moment. La suppression est{" "}
        <strong>définitive</strong> : il n&apos;y a ni corbeille, ni délai pour revenir en arrière.
      </p>

      <h2>Depuis l&apos;application</h2>
      <p>C&apos;est la voie la plus rapide, et elle ne dépend de personne.</p>
      <ol>
        <li>Ouvrez Toumaï AI et connectez-vous.</li>
        <li>
          Allez dans <strong>Profil</strong>.
        </li>
        <li>
          En bas de l&apos;écran, touchez <strong>Supprimer mon compte</strong>.
        </li>
        <li>
          Saisissez <strong>SUPPRIMER</strong> pour confirmer.
        </li>
      </ol>
      <p>
        La suppression est effectuée immédiatement, et vous êtes déconnecté. Aucune intervention de
        notre part n&apos;est nécessaire.
      </p>

      <h2>Sans l&apos;application</h2>
      <p>
        Si vous n&apos;avez plus accès à l&apos;application ou à votre compte, écrivez à{" "}
        <a href="mailto:contact@toumaiai.com?subject=Suppression%20de%20mon%20compte%20Toumai%20AI">
          contact@toumaiai.com
        </a>{" "}
        depuis l&apos;adresse e-mail de votre compte, avec pour objet «&nbsp;Suppression de mon
        compte&nbsp;». Nous traitons la demande sous <strong>30 jours</strong> au plus, et vous
        recevez une confirmation écrite.
      </p>

      <h2>Ce qui est supprimé</h2>
      <ul>
        <li>Vos conversations et l&apos;historique de vos échanges avec l&apos;IA</li>
        <li>Vos documents, images et fichiers générés</li>
        <li>
          Vos connecteurs et leurs jetons d&apos;accès : WhatsApp, Mail, Google Agenda
        </li>
        <li>Vos automatisations, règles, rappels et préférences</li>
        <li>Vos jetons d&apos;appareil pour les notifications</li>
        <li>Votre compte, vos identifiants et votre profil</li>
      </ul>

      <h2>Ce qui peut subsister, et pourquoi</h2>
      <p>
        Certaines données ne sont pas rattachées à votre compte et ne peuvent donc pas être
        supprimées avec lui :
      </p>
      <ul>
        <li>
          <strong>Journaux techniques anonymisés</strong> (codes d&apos;erreur, temps de réponse) :
          conservés jusqu&apos;à 90&nbsp;jours pour la sécurité et le diagnostic. Ils ne
          permettent pas de vous identifier.
        </li>
        <li>
          <strong>Écritures comptables</strong> liées à un éventuel paiement : conservées le temps
          imposé par la loi, sans contenu de conversation.
        </li>
        <li>
          <strong>Messages déjà envoyés</strong> depuis votre WhatsApp restent dans WhatsApp, chez
          vous et chez vos correspondants — nous n&apos;y avons pas accès et ne pouvons pas les
          effacer.
        </li>
      </ul>

      <h2>Déconnecter un connecteur sans supprimer le compte</h2>
      <p>
        Si vous voulez seulement couper l&apos;accès de l&apos;IA à WhatsApp, à votre messagerie ou
        à votre agenda, ce n&apos;est pas la peine de supprimer votre compte : ouvrez{" "}
        <strong>Connecteurs</strong> dans l&apos;application et déconnectez celui qui vous
        concerne. Les jetons correspondants sont détruits immédiatement.
      </p>

      <p>
        Une question sur vos données ? Écrivez-nous à{" "}
        <a href="mailto:contact@toumaiai.com">contact@toumaiai.com</a>. Voir aussi notre{" "}
        <a href="/privacy">politique de confidentialité</a>.
      </p>
    </LegalLayout>
  );
}
