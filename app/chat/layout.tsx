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
        }
      `}</style>
    </>
  );
}
