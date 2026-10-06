"use client";

import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";

export function WhatsAppEmojiPicker({
  onPick,
  compact = false,
}: {
  onPick: (emoji: string) => void;
  compact?: boolean;
}) {
  function handleEmojiClick(data: EmojiClickData) {
    if (data.emoji) onPick(data.emoji);
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        borderColor: "#23343f",
        background: "#0d1923",
        boxShadow: "0 24px 80px rgba(0,0,0,.45)",
      }}
      data-testid="whatsapp-emoji-picker"
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={Theme.DARK}
        emojiStyle={EmojiStyle.NATIVE}
        width={compact ? 300 : 340}
        height={compact ? 360 : 420}
        searchPlaceHolder="Rechercher un emoji"
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        skinTonesDisabled={false}
      />
    </div>
  );
}
