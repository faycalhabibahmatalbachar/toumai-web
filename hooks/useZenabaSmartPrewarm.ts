"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { prewarmZenaba } from "@/lib/voice-api";

/**
 * Réveille Zenaba au moment utile : connexion, retour sur l'onglet et activité
 * utilisateur. Aucun heartbeat 24/7 n'est envoyé quand personne n'utilise
 * Toumaï AI.
 *
 * La fonction réseau possède son propre throttle navigateur (5 min) et le
 * backend un throttle global Redis (15 min), donc les événements fréquents ne
 * se transforment jamais en rafale ZeroGPU.
 */
export function useZenabaSmartPrewarm(): void {
  const { session, loading } = useAuth();
  const lastNudgeAt = useRef(0);

  useEffect(() => {
    if (loading || !session) return;

    const nudge = () => {
      const now = Date.now();
      // Évite même la lecture de localStorage à chaque clic/touche. Le vrai
      // throttle demeure dans prewarmZenaba et côté Redis.
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
    window.addEventListener("pointerdown", nudge, { passive: true });
    window.addEventListener("keydown", nudge);
    window.addEventListener("touchstart", nudge, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pointerdown", nudge);
      window.removeEventListener("keydown", nudge);
      window.removeEventListener("touchstart", nudge);
    };
  }, [loading, session]);
}
