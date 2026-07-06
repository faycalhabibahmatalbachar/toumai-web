"use client";

/** Application des préférences visuelles au DOM — la taille du texte du chat
 * est portée par la variable CSS `--chat-fs` (consommée par ChatMessage). */

const CHAT_FONT_PX: Record<string, string> = {
  small: "14px",
  medium: "15px",
  large: "17px",
};

export function applyChatFontSize(size?: string | null): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--chat-fs", CHAT_FONT_PX[size ?? "medium"] ?? "15px");
}
