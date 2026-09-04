"use client";

/**
 * L'INSCRIPTION DE L'AGENT DE SERVICE.
 *
 * Un composant sans rendu, monté une fois dans la mise en page. Tout ce qu'il
 * fait tient en trois précautions, et chacune vient d'un piège connu :
 *
 * 1. **Après le chargement, pas pendant.** L'inscription déclenche le
 *    téléchargement du socle — dix-sept fichiers. Lancée pendant le
 *    chargement de la page, elle se dispute la bande passante avec ce que la
 *    personne est en train d'attendre. Sur une connexion tchadienne, ça se
 *    voit. On attend donc `load`.
 *
 * 2. **Jamais en développement.** Un agent de service qui sert une coquille
 *    en cache par-dessus un serveur de développement donne des heures de
 *    « pourquoi ma modification n'apparaît pas ». Il ne s'inscrit qu'en
 *    production.
 *
 * 3. **Une porte de sortie.** `window.__toumaiHorsLigne.desinstaller()`
 *    efface les caches et retire l'agent. Si un jour une version fautive part
 *    en ligne, c'est une ligne à taper dans la console, pas une réinstallation
 *    du navigateur.
 *
 * L'agent lui-même est dans `public/sw.js`, et c'est là qu'est écrit ce qu'il
 * met en cache et ce qu'il refuse d'y mettre.
 */

import { useEffect } from "react";

declare global {
  interface Window {
    __toumaiHorsLigne?: { desinstaller: () => Promise<void> };
  }
}

export function AgentDeService() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const inscrire = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((erreur) => {
        // Un échec d'inscription n'est pas une panne du site : les affiches
        // couvrent déjà le cas « rien n'arrive ». On le note, on continue.
        console.warn("[toumaï] agent de service non inscrit :", erreur);
      });
    };

    if (document.readyState === "complete") inscrire();
    else window.addEventListener("load", inscrire, { once: true });

    window.__toumaiHorsLigne = {
      async desinstaller() {
        const inscriptions = await navigator.serviceWorker.getRegistrations();
        await Promise.all(inscriptions.map((i) => i.unregister()));
        if ("caches" in window) {
          const noms = await caches.keys();
          await Promise.all(noms.map((n) => caches.delete(n)));
        }
        window.location.reload();
      },
    };

    return () => window.removeEventListener("load", inscrire);
  }, []);

  return null;
}
