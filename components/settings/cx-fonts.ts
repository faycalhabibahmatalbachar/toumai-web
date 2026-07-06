/** Fontes du langage visuel « Pro » (spec Connecteurs Pro.dc.html) —
 * Newsreader pour le display (titres, chiffres), Instrument Sans pour l'UI.
 * Auto-hébergées via next/font, partagées entre Paramètres et Tableau de bord. */

import { Instrument_Sans, Newsreader } from "next/font/google";

export const cxDisplay = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--cx-font-display",
});

export const cxUi = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--cx-font-ui",
});

/** Classes + style à poser sur le conteneur racine d'une page « Pro ». */
export const cxScopeClass = `cx-scope ${cxDisplay.variable} ${cxUi.variable}`;
export const cxScopeStyle = { fontFamily: "var(--cx-font-ui), system-ui, sans-serif" } as const;
export const cxDisplayStyle = { fontFamily: "var(--cx-font-display), Georgia, serif" } as const;
