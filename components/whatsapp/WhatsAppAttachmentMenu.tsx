"use client";

import {
  Camera,
  ContactRound,
  FileText,
  Headphones,
  Images,
  ListChecks,
  Sticker,
} from "lucide-react";
import type { ReactNode } from "react";

const BORDER = "#23333e";
const BG = "#111b22";
const TEXT = "#eef3f5";
const MUTED = "#a6b0b7";

export type WhatsAppAttachmentChoice =
  | "document"
  | "media"
  | "camera"
  | "audio"
  | "contact"
  | "poll"
  | "sticker";

export function WhatsAppAttachmentMenu({
  open,
  onChoose,
}: {
  open: boolean;
  onChoose: (choice: WhatsAppAttachmentChoice) => void;
}) {
  if (!open) return null;

  const items: Array<{
    key: WhatsAppAttachmentChoice;
    label: string;
    icon: ReactNode;
    accent: string;
  }> = [
    { key: "document", label: "Document", icon: <FileText size={19} />, accent: "#8b5cf6" },
    { key: "media", label: "Photos et vidéos", icon: <Images size={19} />, accent: "#1da1f2" },
    { key: "camera", label: "Caméra", icon: <Camera size={19} />, accent: "#ff2d75" },
    { key: "audio", label: "Audio", icon: <Headphones size={19} />, accent: "#ff7a1a" },
    { key: "contact", label: "Contact", icon: <ContactRound size={19} />, accent: "#20a7e8" },
    { key: "poll", label: "Sondage", icon: <ListChecks size={19} />, accent: "#ffbe2e" },
    { key: "sticker", label: "Nouveau sticker", icon: <Sticker size={19} />, accent: "#20d6ad" },
  ];

  return (
    <div
      role="menu"
      aria-label="Pièces jointes WhatsApp"
      className="absolute bottom-12 left-0 z-50 w-[224px] rounded-2xl border p-2 shadow-[0_24px_70px_rgba(0,0,0,.52)]"
      style={{ borderColor: BORDER, background: BG, color: TEXT }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          onClick={() => onChoose(item.key)}
          className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-white/[0.055]"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ color: item.accent, background: `${item.accent}18` }}
          >
            {item.icon}
          </span>
          <span className="text-[13px] font-medium" style={{ color: MUTED }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
