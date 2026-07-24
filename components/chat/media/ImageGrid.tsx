"use client";

import { ImageBubble } from "./ImageBubble";
import type { ChatImage } from "./types";

/** Grille responsive : 1 image pleine largeur, 2 en côte-à-côte, 3-4 en
 * grille 2x2, 5+ avec une pastille "+N" sur la dernière tuile visible. */
export function ImageGrid({
  images,
  onOpen,
  maxVisible = 4,
  onDelete,
}: {
  images: ChatImage[];
  onOpen: (index: number) => void;
  maxVisible?: number;
  onDelete?: (index: number) => void;
}) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="max-w-[420px]">
        <ImageBubble
          image={images[0]}
          onOpen={() => onOpen(0)}
          aspectClassName="aspect-video"
          onDelete={onDelete ? () => onDelete(0) : undefined}
        />
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="grid max-w-[420px] grid-cols-2 gap-2">
        {images.map((img, i) => (
          <ImageBubble key={img.id} image={img} onOpen={() => onOpen(i)} onDelete={onDelete ? () => onDelete(i) : undefined} />
        ))}
      </div>
    );
  }

  const visible = images.slice(0, maxVisible);
  const overflow = images.length - maxVisible;

  return (
    <div className="grid max-w-[420px] grid-cols-2 gap-2">
      {visible.map((img, i) => {
        const isLastVisible = i === maxVisible - 1 && overflow > 0;
        return (
          <div key={img.id} className="relative">
            <ImageBubble image={img} onOpen={() => onOpen(i)} onDelete={onDelete ? () => onDelete(i) : undefined} />
            {isLastVisible && (
              <button
                onClick={() => onOpen(i)}
                aria-label={`Voir ${overflow} image(s) de plus`}
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/55 text-lg font-semibold text-white backdrop-blur-sm transition hover:bg-black/65"
              >
                +{overflow}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
