"use client";

import { useEffect, useState } from "react";

/**
 * État réseau du navigateur.
 *
 * `navigator.onLine` ne détecte que la perte d'interface (Wi-Fi coupé, mode
 * avion) — pas un réseau présent mais sans accès. C'est volontairement le seul
 * signal utilisé ici : il est fiable et immédiat. Le cas « connecté mais le
 * serveur ne répond pas » est traité à l'endroit où la requête échoue, par
 * `describeError`.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
