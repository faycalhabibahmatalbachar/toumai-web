/**
 * Écran d'authentification Toumaï AI.
 *
 * La connexion ordinaire utilise une composition produit dédiée plutôt que le
 * décor du tunnel de paiement. La moitié gauche reste volontairement statique
 * pour cette première version : aucune animation décorative, aucun appel
 * réseau, uniquement une reproduction lisible de l'expérience Toumaï AI.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import {
  BulleUtilisateur,
  CarteConfirmation,
  FenetreProduit,
  LigneActivite,
  ReponseToumai,
  SignatureToumai,
} from "@/components/accueil/demo/primitives";

import "./auth.css";

const CAPACITES = [
  "Conversation",
  "Recherche web",
  "Documents",
  "Images",
  "Arabe tchadien",
  "WhatsApp",
];

function MarqueToumai({ className = "auth-marque" }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="Retour à l'accueil Toumaï AI">
      <Logo size={34} />
      <span>
        Toumaï AI
        <small>Intelligence artificielle</small>
      </span>
    </Link>
  );
}

function Vitrine() {
  return (
    <div className="auth-fenetre">
      <FenetreProduit label="Aperçu statique d'une conversation Toumaï AI">
        <div className="space-y-4">
          <BulleUtilisateur>
            Vérifie les informations utiles sur le web, résume-les et prépare une
            réponse pour Mahamat sur WhatsApp.
          </BulleUtilisateur>

          <div>
            <SignatureToumai />
            <LigneActivite libelle="Recherche web et préparation de la réponse" />
            <ReponseToumai>
              J’ai rassemblé les éléments utiles. La réponse WhatsApp est prête et
              attend votre validation avant l’envoi.
            </ReponseToumai>
            <CarteConfirmation action="Réponse WhatsApp à Mahamat" confirme />
          </div>
        </div>
      </FenetreProduit>
    </div>
  );
}

export function AuthPremium({
  titre,
  intro,
  children,
}: {
  titre: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth">
      <section className="auth-vitrine" aria-labelledby="auth-vitrine-titre">
        <MarqueToumai />

        <div className="auth-vitrine-texte">
          <h1 id="auth-vitrine-titre">
            Demandez. Toumaï fait le travail, <em>vous gardez la main</em>.
          </h1>
          <p className="auth-argument">
            Recherchez, travaillez vos documents, créez et utilisez vos connecteurs
            depuis un seul espace.
          </p>
        </div>

        <Vitrine />

        <ul className="auth-capacites" aria-label="Capacités disponibles dans Toumaï AI">
          {CAPACITES.map((capacite) => (
            <li key={capacite}>{capacite}</li>
          ))}
        </ul>
      </section>

      <section className="auth-panneau" aria-label="Connexion à Toumaï AI">
        <div className="auth-panneau-corps">
          <MarqueToumai className="auth-marque auth-marque-panneau" />
          <h1>{titre}</h1>
          <p className="auth-sous-titre">{intro}</p>
          {children}
        </div>

        <footer className="auth-pied">
          <Link href="/terms/">Conditions d’utilisation</Link>
          <Link href="/privacy/">Confidentialité</Link>
          <Link href="/contact/">Aide</Link>
        </footer>
      </section>
    </div>
  );
}

export function IconeInfo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeAlerte() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 4.5 2.8 20h18.4L12 4.5z" strokeLinejoin="round" />
      <path d="M12 10v4.2M12 17.3v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeOeil({ ouvert }: { ouvert: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M2.5 12S6.8 5.5 12 5.5 21.5 12 21.5 12 17.2 18.5 12 18.5 2.5 12 2.5 12 2.5 12z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" />
      {!ouvert && <path d="M4 20 20 4" strokeLinecap="round" />}
    </svg>
  );
}
