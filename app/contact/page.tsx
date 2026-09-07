import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Contact — Toumaï AI", description: "Contactez Toumaï AI pour le support, les partenariats, les besoins d'entreprise ou la presse.", alternates: { canonical: "https://toumaiai.com/contact" }, openGraph: { title: "Contact Toumaï AI", description: "Support, partenariats, entreprise et presse.", url: "https://toumaiai.com/contact", type: "website" } };

export default function ContactPage() {
  return (
    <LegalLayout title="Contacter Toumaï AI" updated="7 septembre 2026">
      <p>
        Une question sur le produit, un besoin d&apos;entreprise, une proposition de partenariat ou
        une demande presse ? Nous lisons les messages envoyés à{" "}
        <a className="underline underline-offset-2" href="mailto:contact@toumaiai.com">contact@toumaiai.com</a>.
      </p>
      <h2>Support produit</h2>
      <p>
        Pour un problème lié au compte ou à l&apos;utilisation de Toumaï AI, décrivez ce qui
        s&apos;est passé, l&apos;appareil ou le navigateur utilisé et, si possible, le moment du
        problème. N&apos;incluez jamais votre mot de passe ou un code de connexion.
      </p>
      <h2>Paiement et abonnement</h2>
      <p>
        Indiquez la référence commençant par « TMI », la date, l&apos;offre choisie et le statut
        affiché. Ne transmettez jamais un numéro complet de carte, un code de sécurité, un code à
        usage unique ou vos identifiants bancaires.
      </p>
      <p>
        <a className="underline underline-offset-2" href="mailto:contact@toumaiai.com?subject=Support%20paiement%20Touma%C3%AF%20AI">
          Contacter le support paiement
        </a>
      </p>
      <h2>Entreprises et partenariats</h2>
      <p>
        Pour un déploiement, une intégration, un besoin d&apos;équipe ou un partenariat, indiquez
        l&apos;organisation, le contexte et le résultat attendu. Cela aide à orienter la demande sans
        collecter plus de données que nécessaire.
      </p>
      <h2>Presse et médias</h2>
      <p>
        Les journalistes et créateurs peuvent utiliser la{" "}
        <a className="underline underline-offset-2" href="/press">page presse</a> pour une
        présentation factuelle de Toumaï AI et de son produit.
      </p>
      <h2>WhatsApp</h2>
      <p>
        Vous pouvez également nous joindre via{" "}
        <a className="underline underline-offset-2" href="https://wa.me/23591912191" target="_blank" rel="noopener noreferrer">WhatsApp</a>.
      </p>
    </LegalLayout>
  );
}
