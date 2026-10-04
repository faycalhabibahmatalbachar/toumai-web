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
        }
      `}</style>
    </>
  );
}
