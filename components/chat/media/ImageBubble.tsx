"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImageSkeleton } from "./ImageSkeleton";
import { ImageToolbar } from "./ImageToolbar";
import type { ChatImage } from "./types";

/** Une seule image sous forme de carte : coins arrondis, ombre légère,
 * fade-in à la fin du chargement, skeleton pendant. Toolbar flottante au
 * survol (desktop) / toujours visible en bas (mobile, via CSS). */
export function ImageBubble({
  image,
  onOpen,
  aspectClassName = "aspect-[4/3]",
  onDelete,
}: {
  image: ChatImage;
  onOpen: () => void;
  aspectClassName?: string;
  onDelete?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(false);

  return (
    <div
      className={`group/img relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${aspectClassName}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!loaded && !failed && <ImageSkeleton className="absolute inset-0 z-0" />}

      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--card)] text-xs text-[var(--text-tertiary)]">
          Image indisponible
        </div>
      ) : (
        <motion.button
          type="button"
          onClick={onOpen}
          aria-label={image.alt || "Agrandir l'image"}
          className="absolute inset-0 z-[1] cursor-zoom-in"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        >
          <Image
            src={image.thumbnail || image.url}
            alt={image.alt || "Image"}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </motion.button>
      )}

      {image.sourceUrl && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-[2] rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
          {(() => {
            try {
              return new URL(image.sourceUrl!).host.replace(/^www\./, "");
            } catch {
              return "source";
            }
          })()}
        </div>
      )}

      <AnimatePresence>
        {hover && loaded && !failed && (
          <div className="absolute right-2 top-2 z-[3]">
            <ImageToolbar image={image} onDelete={onDelete} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
