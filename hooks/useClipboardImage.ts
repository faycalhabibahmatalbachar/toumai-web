"use client";
import { useEffect } from "react";

/** Écoute Ctrl+V sur toute la page et transmet les fichiers image collés
 * (capture d'écran, image copiée depuis un autre onglet…) au callback fourni.
 * `enabled` permet de désactiver l'écoute quand ce n'est pas pertinent (ex.
 * un champ texte normal a le focus mais on ne veut pas intercepter). */
export function useClipboardImage(onImages: (files: File[]) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) onImages(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onImages, enabled]);
}
