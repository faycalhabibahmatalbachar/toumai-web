"use client";

import {
  Copy, Download, Forward, Info, Pencil, Pin, Reply, RotateCw,
  Smile, Star, Trash2, X,
} from "lucide-react";
import { useEffect, useRef } from "react";

export type MessageContextAction =
  | "info" | "reply" | "react" | "download" | "forward" | "copy"
  | "pin" | "star" | "edit" | "delete" | "retry" | "dismiss";

export interface MessageMenuAnchor { x: number; y: number }

interface MessageMenuOptions {
  pending?: boolean;
  own?: boolean;
  media?: boolean;
  text?: boolean;
  canEdit?: boolean;
  starred?: boolean;
  pinned?: boolean;
  retryable?: boolean;
  removable?: boolean;
}

const emojiChoices = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export function WhatsAppMessageContextMenu({
  anchor,
  options,
  onClose,
  onAction,
  onReact,
}: {
  anchor: MessageMenuAnchor;
  options: MessageMenuOptions;
  onClose: () => void;
  onAction: (action: MessageContextAction) => void;
  onReact: (emoji: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    menuRef.current?.focus();
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const width = 248;
  const height = options.pending ? 240 : 478;
  const left = typeof window === "undefined" ? anchor.x : Math.max(8, Math.min(anchor.x, window.innerWidth - width - 8));
  const top = typeof window === "undefined" ? anchor.y : Math.max(8, Math.min(anchor.y, window.innerHeight - height - 8));

  const items: Array<{
    id: MessageContextAction;
    label: string;
    icon: typeof Info;
    destructive?: boolean;
  }> = options.pending
    ? [
        { id: "download", label: "Télécharger le vocal", icon: Download },
        ...(options.retryable ? [{ id: "retry" as const, label: "Réessayer le transfert", icon: RotateCw }] : []),
        ...(options.removable ? [{ id: "dismiss" as const, label: "Retirer l’aperçu", icon: X }] : []),
      ]
    : [
        ...(options.own ? [{ id: "info" as const, label: "Infos du message", icon: Info }] : []),
        { id: "reply", label: "Répondre", icon: Reply },
        { id: "react", label: "Réagir", icon: Smile },
        ...(options.media ? [{ id: "download" as const, label: "Télécharger", icon: Download }] : []),
        ...((options.text || options.media) ? [{ id: "forward" as const, label: "Transférer", icon: Forward }] : []),
        ...(options.text ? [{ id: "copy" as const, label: "Copier le texte", icon: Copy }] : []),
        { id: "pin", label: options.pinned ? "Désépingler dans Toumaï" : "Épingler dans Toumaï", icon: Pin },
        { id: "star", label: options.starred ? "Retirer des favoris Toumaï" : "Favori dans Toumaï", icon: Star },
        ...(options.canEdit ? [{ id: "edit" as const, label: "Modifier / corriger", icon: Pencil }] : []),
        { id: "delete", label: options.own ? "Supprimer pour tous…" : "Masquer dans Toumaï…", icon: Trash2, destructive: true },
      ];

  return (
    <div className="fixed inset-0 z-[125]" data-testid="whatsapp-message-menu-layer">
      <button
        type="button"
        aria-label="Fermer le menu du message"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        tabIndex={-1}
        role="menu"
        aria-label="Actions du message"
        data-testid="whatsapp-message-context-menu"
        className="absolute w-[248px] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-[14px] border border-[#2d3435] bg-[#171b1d] px-2 py-2 text-[#edf1f3] shadow-[0_16px_50px_rgba(0,0,0,.54)] outline-none"
        style={{ left, top }}
      >
        {!options.pending && (
          <div className="mb-2 flex items-center justify-around gap-0.5 border-b border-white/10 pb-2" aria-label="Réactions rapides">
            {emojiChoices.map((emoji) => (
              <button
                type="button"
                role="menuitem"
                key={emoji}
                aria-label={`Réagir avec ${emoji}`}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[22px] transition hover:bg-white/10"
                onClick={() => onReact(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        {items.map(({ id, label, icon: Icon, destructive }) => (
          <button
            key={id}
            type="button"
            role="menuitem"
            className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition hover:bg-white/[0.09] ${destructive ? "text-[#ff9e9e]" : "text-[#f0f1f1]"}`}
            onClick={() => onAction(id)}
          >
            <Icon size={17} strokeWidth={1.9} className="shrink-0" />
            <span className="flex-1">{label}</span>
          </button>
        ))}
        {!options.pending && (
          <p className="border-t border-white/10 px-2 pt-2 text-[10px] leading-4 text-[#a2adb1]">
            Épingles et favoris : visibles uniquement dans Toumaï.
          </p>
        )}
      </div>
    </div>
  );
}
