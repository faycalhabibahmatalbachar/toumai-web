"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/config";

/**
 * Widget anti-robot Cloudflare Turnstile.
 *
 * Le jeton produit est à usage unique et expire : on le régénère après chaque
 * envoi raté, sinon la deuxième tentative de connexion échouerait toujours
 * avec un message incompréhensible pour la personne devant l'écran.
 *
 * Si la clé publique n'est pas configurée, le composant ne rend rien et
 * n'appelle jamais `onToken` — le serveur n'exige alors rien non plus.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const DELAI_MAX_MS = 12_000;

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function chargerScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  const existant = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existant) {
    return new Promise((resoudre) => {
      existant.addEventListener("load", () => resoudre(), { once: true });
      // Le script peut déjà être chargé sans que « load » ne se redéclenche.
      if (window.turnstile) resoudre();
    });
  }
  return new Promise((resoudre, rejeter) => {
    const balise = document.createElement("script");
    balise.id = SCRIPT_ID;
    balise.src = SCRIPT_SRC;
    balise.async = true;
    balise.defer = true;
    balise.onload = () => resoudre();
    balise.onerror = () => rejeter(new Error("Turnstile injoignable"));
    document.head.appendChild(balise);
  });
}

export type TurnstilePoignee = { reinitialiser: () => void };

export function Turnstile({
  onToken,
  onIndisponible,
  poignee,
}: {
  onToken: (jeton: string | null) => void;
  /** Le widget ne produira pas de jeton. Voir DELAI_MAX_MS. */
  onIndisponible?: () => void;
  poignee?: React.MutableRefObject<TurnstilePoignee | null>;
}) {
  const conteneur = useRef<HTMLDivElement | null>(null);
  const identifiantWidget = useRef<string | null>(null);
  const rappel = useRef(onToken);
  const [echec, setEchec] = useState(false);
  const idHtml = useId();
  const signalerIndisponible = useRef(onIndisponible);

  rappel.current = onToken;
  signalerIndisponible.current = onIndisponible;

  /** Au-delà de ce délai sans jeton, on considère que le widget ne viendra pas.
   *
   * IL NE SUFFIT PAS D'ÉCOUTER `error-callback`. Mesuré sur toumaiai.com le
   * 07/09/2026 : `render()` rend un identifiant, ne crée aucune iframe, et
   * n'appelle jamais aucun rappel — ni succès, ni erreur. Le formulaire
   * attendait donc un jeton qui n'arrivait pas, et le serveur refusait toute
   * connexion. Une panne silencieuse est la seule qu'un délai puisse
   * rattraper.
   *
   * Douze secondes : Turnstile répond en moins de deux en temps normal, même
   * sur un réseau lent, et un défi interactif reste sous les dix.
   */

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let vivant = true;
    let recu = false;

    const minuterie = setTimeout(() => {
      if (!vivant || recu) return;
      setEchec(true);
      signalerIndisponible.current?.();
    }, DELAI_MAX_MS);

    const accuser = (jeton: string | null) => {
      if (jeton) recu = true;
      rappel.current(jeton);
    };

    chargerScript()
      .then(() => {
        if (!vivant || !conteneur.current || !window.turnstile) return;
        identifiantWidget.current = window.turnstile.render(conteneur.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "auto",
          language: "fr",
          callback: (jeton: string) => accuser(jeton),
          // Un jeton expire : on en redemande un, le widget s'en charge.
          "expired-callback": () => rappel.current(null),
          "error-callback": () => {
            rappel.current(null);
            // Clé de site refusée sur ce domaine, réseau coupé : dans les deux
            // cas il n'y aura pas de jeton, et attendre ne changera rien.
            if (vivant) {
              setEchec(true);
              signalerIndisponible.current?.();
            }
          },
        });
      })
      .catch(() => {
        // Cloudflare injoignable : le serveur laisse alors passer, on ne
        // bloque donc pas le formulaire — mais on le dit.
        if (vivant) {
          setEchec(true);
          signalerIndisponible.current?.();
        }
      });

    return () => {
      vivant = false;
      clearTimeout(minuterie);
      if (identifiantWidget.current && window.turnstile) {
        try {
          window.turnstile.remove(identifiantWidget.current);
        } catch {
          /* le widget a pu être retiré avec le DOM */
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!poignee) return;
    poignee.current = {
      reinitialiser: () => {
        rappel.current(null);
        if (identifiantWidget.current && window.turnstile) {
          try {
            window.turnstile.reset(identifiantWidget.current);
          } catch {
            // « Nothing to reset found for provided container » : le widget a
            // rendu un identifiant sans créer sa boîte (voir DELAI_MAX_MS).
            // Le formulaire reste utilisable, l'exception n'apporte rien.
          }
        }
      },
    };
  }, [poignee]);

  if (!TURNSTILE_SITE_KEY) return null;
  if (echec) {
    return (
      <p className="text-xs" style={{ color: "var(--landing-muted)" }}>
        Vérification anti-robot indisponible sur ce navigateur. Vous pouvez continuer.
      </p>
    );
  }
  return <div ref={conteneur} id={idHtml} className="flex justify-center" />;
}
