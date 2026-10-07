"use client";

import dynamic from "next/dynamic";
import type { EmojiClickData, PickerProps } from "emoji-picker-react";

const EmojiPicker = dynamic<PickerProps>(
  () => import("emoji-picker-react"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center text-xs text-white/55">
        Chargement…
      </div>
    ),
  },
);

export function WhatsAppEmojiPicker({
  onPick,
}: {
  onPick: (emoji: string) => void;
}) {
  return (
    <EmojiPicker
      theme={"dark" as PickerProps["theme"]}
      width="100%"
      height={340}
      lazyLoadEmojis
      previewConfig={{ showPreview: false }}
      searchPlaceholder="Rechercher un emoji"
      onEmojiClick={(data: EmojiClickData) => onPick(data.emoji)}
    />
  );
}
