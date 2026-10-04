import type { ReactNode } from "react";
import { SettingsOverlayBridge } from "@/components/settings/SettingsOverlayBridge";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SettingsOverlayBridge />
      {children}
    </>
  );
}
