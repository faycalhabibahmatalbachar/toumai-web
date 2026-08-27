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
  poignee,
}: {
  onToken: (jeton: string | null) => void;
  poignee?: React.MutableRefObject<TurnstilePoignee | null>;
}) {
  const conteneur = useRef<HTMLDivElement | null>(null);
  const identifiantWidget = useRef<string | null>(null);
  const rappel = useRef(onToken);
  const [echec, setEchec] = useState(false);
  const idHtml = useId();

  rappel.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let vivant = true;

    chargerScript()
      .then(() => {
        if (!vivant || !conteneur.current || !window.turnstile) return;
        identifiantWidget.current = window.turnstile.render(conteneur.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "auto",
          language: "fr",
          callback: (jeton: string) => rappel.current(jeton),
          "expired-callback": () => rappel.current(null),
          "error-callback": () => rappel.current(null),
        });
      })
      .catch(() => {
        // Cloudflare injoignable : le serveur laisse alors passer, on ne
        // bloque donc pas le formulaire — mais on le dit.
        if (vivant) setEchec(true);
      });

    return () => {
      vivant = false;
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
          window.turnstile.reset(identifiantWidget.current);
        }
      },
    };
  }, [poignee]);

  if (!TURNSTILE_SITE_KEY) return null;
  if (echec) {
    return (
      <p className="text-xs" style={{ color: "var(--landing-muted)" }}>
        Vérification anti-robot indisponible — vous pouvez continuer.
      </p>
    );
  }
  return <div ref={conteneur} id={idHtml} className="flex justify-center" />;
}
