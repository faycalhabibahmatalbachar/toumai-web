"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/config";

/**
 * Widget anti-robot Cloudflare Turnstile.
 *
 * Le jeton produit est à usage unique et expire : on le régénère après chaque
 * envoi raté, sinon la deuxième tentative de connexion échouerait toujours.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
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

type TurnstileAppearance = "always" | "execute" | "interaction-only";
type TurnstileSize = "normal" | "compact" | "flexible";

export function Turnstile({
  onToken,
  onIndisponible,
  poignee,
  language = "auto",
  appearance = "interaction-only",
  size = "flexible",
  unavailableText = "Vérification anti-robot indisponible sur ce navigateur. Vous pouvez continuer.",
}: {
  onToken: (jeton: string | null) => void;
  onIndisponible?: () => void;
  poignee?: React.MutableRefObject<TurnstilePoignee | null>;
  language?: string;
  appearance?: TurnstileAppearance;
  size?: TurnstileSize;
  unavailableText?: string;
}) {
  const conteneur = useRef<HTMLDivElement | null>(null);
  const identifiantWidget = useRef<string | null>(null);
  const rappel = useRef(onToken);
  const [echec, setEchec] = useState(false);
  const idHtml = useId();
  const signalerIndisponible = useRef(onIndisponible);

  rappel.current = onToken;
  signalerIndisponible.current = onIndisponible;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let vivant = true;
    let recu = false;
    setEchec(false);

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
          language,
          appearance,
          size,
          callback: (jeton: string) => accuser(jeton),
          "expired-callback": () => rappel.current(null),
          "error-callback": () => {
            rappel.current(null);
            if (vivant) {
              setEchec(true);
              signalerIndisponible.current?.();
            }
          },
        });
      })
      .catch(() => {
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
          // Le widget a pu être retiré avec le DOM.
        }
      }
      identifiantWidget.current = null;
    };
  }, [appearance, language, size]);

  useEffect(() => {
    if (!poignee) return;
    poignee.current = {
      reinitialiser: () => {
        rappel.current(null);
        if (identifiantWidget.current && window.turnstile) {
          try {
            window.turnstile.reset(identifiantWidget.current);
          } catch {
            // Rien à réinitialiser : le formulaire reste utilisable.
          }
        }
      },
    };
    return () => {
      if (poignee.current) poignee.current = null;
    };
  }, [poignee]);

  if (!TURNSTILE_SITE_KEY) return null;
  if (echec) {
    return (
      <p className="text-xs" style={{ color: "var(--landing-muted)" }}>
        {unavailableText}
      </p>
    );
  }
  return <div ref={conteneur} id={idHtml} className="flex w-full justify-center" />;
}
