import type { ReactNode } from "react";
import { SettingsOverlayBridge } from "@/components/settings/SettingsOverlayBridge";
import { SettingsTrailingSlashCompat } from "@/components/settings/SettingsTrailingSlashCompat";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsTrailingSlashCompat />
      <SettingsOverlayBridge />
      {children}
    </>
  );
}
