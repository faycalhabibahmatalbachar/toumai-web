import type { ReactNode } from "react";
import { SettingsOverlayBridge } from "@/components/settings/SettingsOverlayBridge";
import { SettingsTrailingSlashCompat } from "@/components/settings/SettingsTrailingSlashCompat";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsTrailingSlashCompat />
      <SettingsOverlayBridge />
      {children}
      <style>{`
        @media (min-width: 768px) {
          [role="dialog"][aria-label="Paramètres"] > div {
            width: min(1000px, calc(100vw - 64px)) !important;
            max-width: 1000px !important;
            height: min(78dvh, 720px) !important;
          }

          [role="dialog"][aria-label="Paramètres"] > div > aside {
            width: 220px !important;
          }

          /* La modale est plus petite que la page /settings complète :
             son contenu doit donc adopter une densité de vraie fenêtre,
             sans modifier la page de paramètres autonome. */
          [role="dialog"][aria-label="Paramètres"] .animate-fade-in {
            padding: 28px 32px 48px !important;
          }

          [role="dialog"][aria-label="Paramètres"] .cx-scope {
            zoom: 0.9;
          }

          [role="dialog"][aria-label="Paramètres"] aside nav button {
            min-height: 40px !important;
            font-size: 12.5px !important;
          }

          /* ── Connecteurs : vue SaaS verticale ──────────────────────────
             La logique réelle de ConnectorsTab reste intacte. On aplatit
             seulement sa composition dans la fenêtre du chat : une ligne
             autonome par connecteur, actions à droite, actions rapides en bas.
             La navigation de gauche n'est jamais touchée. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:first-child {
            align-items: center !important;
            margin-bottom: 18px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:first-child h2 {
            font-size: 0 !important;
            line-height: 1 !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:first-child h2::after {
            content: "Connecteurs";
            display: inline-block;
            font-family: var(--cx-font-ui), system-ui, sans-serif;
            font-size: 28px;
            font-weight: 650;
            line-height: 1.1;
            letter-spacing: -0.025em;
            color: var(--cx-text-primary);
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:first-child p {
            display: none !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2) {
            display: block !important;
          }

          /* Cartes de synthèse : 3 connectés / erreurs / chiffrement. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:first-child {
            margin-bottom: 14px !important;
            padding-bottom: 0 !important;
            border-bottom: 0 !important;
            gap: 10px 12px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:first-child > span {
            display: none !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:first-child > div {
            min-height: 52px;
            padding: 9px 14px !important;
            border: 1px solid var(--cx-border-subtle);
            border-radius: 12px;
            background: color-mix(in srgb, var(--cx-surface) 92%, transparent);
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:first-child > div > span:first-child {
            font-family: var(--cx-font-ui), system-ui, sans-serif !important;
            font-size: 18px !important;
            font-weight: 650 !important;
          }

          /* Recherche compacte ; les filtres restent disponibles ailleurs
             mais ne surchargent plus cette vue orientée produit SaaS. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(2) {
            justify-content: flex-end !important;
            margin-bottom: 14px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(2) > div:first-child {
            flex: 0 1 300px !important;
            max-width: 300px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(2) > [role="tablist"] {
            display: none !important;
          }

          /* Une seule liste verticale. Les anciens groupes restent dans le
             DOM pour préserver leurs états et leurs fonctions, mais leurs
             conteneurs deviennent transparents visuellement. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) {
            display: grid !important;
            gap: 10px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) > section:not([hidden]) {
            display: contents !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) > section[hidden] {
            display: none !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) > section > p {
            display: none !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows {
            display: contents !important;
            overflow: visible !important;
            border: 0 !important;
            background: transparent !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows > div:not([hidden]) {
            display: contents !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows > div[hidden] {
            display: none !important;
          }

          /* Carte de chaque connecteur. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows
            > div:not([hidden]) > div:first-child {
            overflow: visible !important;
            border: 1px solid var(--cx-border-subtle) !important;
            border-radius: 14px !important;
            background: var(--cx-surface) !important;
            box-shadow: 0 1px 0 rgba(255,255,255,0.018), 0 8px 24px rgba(0,0,0,0.08);
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows
            > div:not([hidden]) > div:first-child > div:first-child {
            min-height: 78px;
            flex-wrap: nowrap !important;
            gap: 14px !important;
            padding: 14px 16px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows
            > div:not([hidden]) > div:first-child > div:first-child > div:first-child {
            width: 50px !important;
            height: 50px !important;
            border-radius: 12px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows
            > div:not([hidden]) > div:first-child > div:first-child > div:nth-child(2) {
            flex: 1 1 auto !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(3) .cx-rows
            > div:not([hidden]) > div:first-child > div:first-child > div:last-child {
            margin-left: auto !important;
            flex: 0 0 auto !important;
            justify-content: flex-end !important;
          }

          /* Le long texte pédagogique n'est plus nécessaire dans cette vue. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > div:first-child > div:nth-child(4) {
            display: none !important;
          }

          /* Le rail droit devient la barre d'actions rapides en bas. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2) > aside {
            display: block !important;
            width: 100% !important;
            margin-top: 14px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2) > aside > div {
            position: static !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px !important;
            padding: 12px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:first-child > p {
            grid-column: 1 / -1;
            margin: 0 2px 2px !important;
            font-size: 12px !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:first-child > button {
            min-height: 42px;
            justify-content: center !important;
            border: 1px solid var(--cx-border-strong);
            border-radius: 10px !important;
            background: var(--cx-input);
            padding: 8px 12px !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:first-child > button:first-of-type {
            border-color: var(--cx-accent-border) !important;
            color: var(--cx-accent-text) !important;
            background: var(--cx-accent-bg) !important;
          }

          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:first-child > button > svg {
            display: none !important;
          }

          /* Suppression de Sécurité + Besoin d'aide, conformément à la maquette. */
          [role="dialog"][aria-label="Paramètres"]
            .animate-fade-in > .cx-scope > .cx-scope > div:nth-child(2)
            > aside > div > div:nth-child(n + 2) {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
