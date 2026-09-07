import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Sécurité — Toumaï AI", description: "Informations de sécurité, confidentialité des comptes et signalement responsable pour Toumaï AI.", alternates: { canonical: "https://toumaiai.com/security" }, openGraph: { title: "Sécurité Toumaï AI", description: "Protection des comptes, actions confirmées et signalement responsable.", url: "https://toumaiai.com/security", type: "website" } };

export default function SecurityPage() {
  return (
    <LegalLayout title="Sécurité de Toumaï AI" updated="7 septembre 2026">
      <p>
        La sécurité est une pratique continue, pas une promesse absolue. Cette page décrit les
        protections que nous pouvons présenter publiquement et la manière de nous signaler un
        problème.
      </p>
      <h2>Protection des échanges et des comptes</h2>
      <ul>
        <li>Les échanges avec le site sont chiffrés en transit via HTTPS.</li>
        <li>Les comptes et leurs données sont isolés par utilisateur.</li>
        <li>Les jetons de connexion ont une durée de vie limitée.</li>
        <li>Les actions sensibles dans les connecteurs demandent une confirmation explicite.</li>
      </ul>
      <h2>Sécurité des paiements</h2>
      <ul>
        <li>La saisie du moyen de paiement est hébergée par Moneroo et sa passerelle.</li>
        <li>
          Toumaï AI vérifie côté serveur la référence, le statut, le montant, la devise et
          l&apos;environnement avant toute activation.
        </li>
        <li>
          Les notifications entrantes doivent être authentifiées et une même transaction ne peut
          pas activer plusieurs fois un abonnement.
        </li>
        <li>
          Les confirmations sandbox restent isolées et ne peuvent pas accorder un abonnement
          commercial ni produire un reçu réel.
        </li>
      </ul>
      <h2>Vos réflexes</h2>
      <p>
        Ne partagez jamais votre mot de passe, un code de connexion, une clé d&apos;API, un numéro
        complet de carte ou un code de sécurité. Déconnectez les connecteurs que vous
        n&apos;utilisez plus et contrôlez les autorisations depuis les paramètres du compte.
      </p>
      <h2>Signaler une vulnérabilité</h2>
      <p>
        Pour signaler de manière responsable une faiblesse de sécurité, contactez{" "}
        <a className="underline underline-offset-2" href="mailto:contact@toumaiai.com?subject=Signalement%20de%20s%C3%A9curit%C3%A9%20Touma%C3%AF%20AI">
          contact@toumaiai.com
        </a>{" "}
        avec une description reproductible. Évitez d&apos;accéder à des données qui ne vous
        appartiennent pas et ne publiez pas une vulnérabilité avant notre retour.
      </p>
      <p>
        Consultez aussi notre{" "}
        <Link href="/privacy" className="underline underline-offset-2">politique de confidentialité</Link>{" "}
        et nos <Link href="/terms" className="underline underline-offset-2">conditions d&apos;utilisation</Link>.
      </p>
    </LegalLayout>
  );
}
