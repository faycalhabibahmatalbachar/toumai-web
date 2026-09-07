"use client";

/**
 * IL FAUT UN COMPTE — ce qui remplace la connexion invité automatique.
 *
 * CE QU'IL Y AVAIT AVANT
 * ======================
 * Cinq pages portaient le même bloc :
 *
 *     useEffect(() => {
 *       if (loading || session || guestAttempted.current) return;
 *       guestAttempted.current = true;
 *       loginAsGuest().catch(() => {});
 *     }, [loading, session, loginAsGuest]);
 *
 * Personne ne cliquait sur rien : arriver sur /chat ouvrait un compte anonyme.
 * L'essai sans compte n'était plus un essai, c'était la porte d'entrée. Et un
 * compte anonyme ne peut rien porter — ni conversation reprise sur un autre
 * appareil, ni abonnement, ni connecteur WhatsApp, qui se relie à une
 * personne et non à un navigateur.
 *
 * POURQUOI UN CROCHET ET NON CINQ REDIRECTIONS
 * =============================================
 * Le bloc recopié cinq fois avait déjà divergé : trois pages avalaient
 * l'erreur en silence, une affichait un message, une autre non. Une sixième
 * page ajoutée demain doit hériter du comportement sans qu'on y pense.
 *
 * ON GARDE L'ENDROIT OÙ ON ALLAIT. `?next=` ramène la personne sur la page
 * qu'elle voulait, avec ses paramètres — un lien de conversation partagé
 * atterrit sur la bonne conversation après connexion, pas sur l'accueil.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export function useExigerCompte(): { pret: boolean } {
  const { session, loading } = useAuth();
  const router = useRouter();
  // Une seule redirection : `router.replace` ne change pas `session`, donc
  // l'effet se rejouerait à chaque rendu et empilerait les navigations.
  const partie = useRef(false);

  useEffect(() => {
    if (loading || session || partie.current) return;
    partie.current = true;
    const ici =
      typeof window === "undefined"
        ? "/"
        : window.location.pathname + window.location.search;
    router.replace(`/login?next=${encodeURIComponent(ici)}`);
  }, [loading, session, router]);

  // `pret` dit à la page si elle peut afficher son contenu. Pendant la
  // redirection, elle ne doit rien monter : lancer les requêtes d'une page
  // qu'on quitte produit une volée de 401 dans la console, et parfois un
  // message d'erreur qui clignote avant que l'écran ne change.
  return { pret: Boolean(session) };
}
