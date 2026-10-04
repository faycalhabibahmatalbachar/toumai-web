"use client";

import { useEffect } from "react";

/**
 * Compatibilité avec `trailingSlash: true` de Next.
 *
 * Next rend les liens internes `/settings/` alors que le bridge historique
 * des paramètres du chat reconnaît `/settings`. Ce composant s'exécute sur
 * `window` en phase capture, donc AVANT le listener `document` du bridge : il
 * normalise uniquement le lien cliqué, puis le bridge peut empêcher la
 * navigation et ouvrir la fenêtre de paramètres au-dessus du chat.
 */
export function SettingsTrailingSlashCompat() {
  useEffect(() => {
    function normalizeSettingsHref(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const url = new URL(anchor.href, window.location.href);
      const pathname = url.pathname.replace(/\/+$/, "") || "/";
      if (url.origin !== window.location.origin || pathname !== "/settings") return;

      if (url.pathname !== "/settings") {
        anchor.setAttribute("href", `/settings${url.search}${url.hash}`);
      }
    }

    window.addEventListener("click", normalizeSettingsHref, true);
    return () => window.removeEventListener("click", normalizeSettingsHref, true);
  }, []);

  return null;
}
