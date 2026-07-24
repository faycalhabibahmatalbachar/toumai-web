"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ChatImage } from "./types";

function Icon({ d, viewBox = "0 0 24 24" }: { d: string; viewBox?: string }) {
  return (
    <svg width="15" height="15" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  download: "M12 3v13m0 0l-4-4m4 4l4-4M4 20h16",
  copy: "M9 9h12v12H9zM5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  share: "M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13",
  link: "M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L11.5 4.5M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 107.07 7.07L12.5 19.5",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z",
  check: "M20 6L9 17l-5-5",
};

async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copyImageToClipboard(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  // ClipboardItem exige un type MIME connu — on retombe sur le lien si le
  // navigateur ou le type d'image n'est pas supporté (ex. GIF sur certains).
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    await navigator.clipboard.writeText(url);
    return true;
  }
}

/** Barre d'actions flottante affichée au survol d'une image (desktop) ou en
 * permanence sur mobile. `variant="dark"` pour un fond sombre (utilisé dans
 * le lightbox), `variant="light"` pour une carte claire dans le flux du chat. */
export function ImageToolbar({
  image,
  variant = "light",
  onDelete,
}: {
  image: ChatImage;
  variant?: "light" | "dark";
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState<"image" | "link" | null>(null);

  async function handleCopy() {
    const ok = await copyImageToClipboard(image.url).catch(() => false);
    if (ok) {
      setCopied("image");
      setTimeout(() => setCopied(null), 1500);
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(image.url);
    setCopied("link");
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ url: image.url, title: image.alt || "Image" });
        return;
      } catch {
        // annulé par l'utilisateur ou non supporté — repli sur copie du lien
      }
    }
    await handleCopyLink();
  }

  const btnCls =
    variant === "dark"
      ? "flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      : "flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-center gap-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={() => downloadImage(image.url, image.alt || "image")} title="Télécharger" aria-label="Télécharger" className={btnCls}>
        <Icon d={ICONS.download} />
      </button>
      <button onClick={handleCopy} title="Copier l'image" aria-label="Copier l'image" className={btnCls}>
        <Icon d={copied === "image" ? ICONS.check : ICONS.copy} />
      </button>
      <a
        href={image.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Ouvrir dans un nouvel onglet"
        aria-label="Ouvrir dans un nouvel onglet"
        className={btnCls}
      >
        <Icon d={ICONS.external} />
      </a>
      <button onClick={handleShare} title="Partager" aria-label="Partager" className={btnCls}>
        <Icon d={ICONS.share} />
      </button>
      <button onClick={handleCopyLink} title="Copier le lien" aria-label="Copier le lien" className={btnCls}>
        <Icon d={copied === "link" ? ICONS.check : ICONS.link} />
      </button>
      {image.isUserAttachment && onDelete && (
        <button
          onClick={onDelete}
          title="Supprimer"
          aria-label="Supprimer"
          className={`${btnCls} hover:!bg-[var(--error)]/80`}
        >
          <Icon d={ICONS.trash} />
        </button>
      )}
    </motion.div>
  );
}
