/**
 * L'ÉCRAN DE CONNEXION — LA STRUCTURE.
 *
 * POURQUOI PAS `AuthShell`
 * -------------------------
 * `AuthShell` habille le tunnel de paiement : « Retour aux offres » en haut,
 * « Compte → Paiement → Confirmation » à côté, et le formulaire dans une carte
 * posée au milieu d'un grand vide. Quand on arrive d'un tarif, ce décor est
 * juste : il dit où l'on est et ce qui reste à faire. Quand on vient
 * simplement se reconnecter, il annonce une transaction qui n'aura pas lieu.
 *
 * Les deux coexistent donc, et `app/login/page.tsx` choisit : un plan en
 * cours → `AuthShell` ; une connexion ordinaire → celui-ci.
 *
 * CE QUE MONTRE LA MOITIÉ GAUCHE
 * -------------------------------
 * Une conversation Toumaï figée, construite avec les pièces de
 * `components/accueil/demo/primitives.tsx` — les mêmes que la page d'accueil,
 * relevées dans `ChatMessage.tsx`. Rien n'y bouge et rien n'appelle le réseau :
 * sur un écran de connexion, une animation détourne l'attention du seul geste
 * qu'on est venu faire.
 *
 * C'est une reproduction, et le libellé accessible le dit.
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

/** Les capacités nommées sous la fenêtre. Chacune existe réellement dans le
 *  produit et se retrouve dans les offres. */
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
    <Link href="/" className={className}>
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
      <FenetreProduit label="Exemple de conversation dans Toumaï AI">
        <div className="space-y-4">
          <BulleUtilisateur>
            Vois ce qu’écrit Mahamat sur WhatsApp, vérifie l’horaire, et prépare la
            réponse.
          </BulleUtilisateur>

          <div>
            <SignatureToumai />
            <LigneActivite libelle="Lecture de la conversation, puis du web" />
            <ReponseToumai>
              La formation de samedi est maintenue : 9 h, salle B.
            </ReponseToumai>
            <CarteConfirmation action="Réponse WhatsApp à Mahamat" confirme />
          </div>
        </div>
      </FenetreProduit>
    </div>
  );
}

/**
 * @param titre     Le grand titre de la colonne de droite.
 * @param intro     La ligne sous le titre.
 * @param children  Le contenu du formulaire.
 */
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
            Une intelligence qui travaille <em>avec vous</em>.
          </h1>
          <p className="auth-argument">
            Tout part du même endroit, et rien d’irréversible ne se fait sans vous.
          </p>
        </div>

        <Vitrine />

        <ul className="auth-capacites">
          {CAPACITES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="auth-panneau">
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

/* ── Petites icônes du formulaire ────────────────────────────────────────── */

export function IconeInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.6v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeAlerte() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 4.5 2.8 20h18.4L12 4.5z" strokeLinejoin="round" />
      <path d="M12 10v4.2M12 17.3v.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconeOeil({ ouvert }: { ouvert: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.5 12S6.8 5.5 12 5.5 21.5 12 21.5 12 17.2 18.5 12 18.5 2.5 12 2.5 12z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3.1" />
      {!ouvert && <path d="M4 20 20 4" strokeLinecap="round" />}
    </svg>
  );
}
