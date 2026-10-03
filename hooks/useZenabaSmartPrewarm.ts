"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { prewarmZenaba } from "@/lib/voice-api";

/**
 * Réveille Zenaba aux vrais changements de disponibilité : connexion,
 * réapparition de l'onglet et retour réseau.
 *
 * PAS de heartbeat et PAS de listener sur chaque clic/touche : ZeroGPU rend le
 * GPU après la fonction, donc simuler de l'activité en continu gaspillerait le
 * quota sans garantir un GPU réservé. Le préchauffage paie seulement le cold
 * start en avance lorsqu'une session redevient réellement active.
 */
export function useZenabaSmartPrewarm(): void {
  const { session, loading } = useAuth();
  const lastNudgeAt = useRef(0);

  useEffect(() => {
    if (loading || !session) return;

    const nudge = () => {
      const now = Date.now();
      // Garde locale très courte contre deux événements lifecycle simultanés.
      // Le throttle navigateur (5 min) puis Redis (15 min) restent les vraies
      // protections contre les doubles réveils.
      if (now - lastNudgeAt.current < 30_000) return;
      lastNudgeAt.current = now;
      void prewarmZenaba();
    };

    // Premier avantage : pendant que l'utilisateur lit l'écran ou prépare sa
    // question, ZeroGPU peut déjà sortir du froid.
    nudge();

    const onVisibility = () => {
      if (document.visibilityState === "visible") nudge();
    };
    const onOnline = () => nudge();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [loading, session]);
}
