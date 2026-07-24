"use client";

import { ImageGrid } from "./ImageGrid";
import { ImageViewer } from "./ImageViewer";
import { useImageViewer } from "@/hooks/useImageViewer";
import type { ChatImage } from "./types";

/**
 * Point d'entrée unique pour afficher un ensemble d'images dans un message
 * de chat — grille responsive + lightbox. Conçu pour être le premier cas
 * d'un futur dispatcher `MessageWidget` plus large (vidéo/audio/pdf/…) :
 * aujourd'hui `kind` n'a qu'une valeur possible, mais l'API par tableau
 * d'objets `ChatImage` (pas juste des URLs) permet d'ajouter facilement
 * `width`/`height`/`mimeType` réels sans casser les appelants.
 */
export function MediaMessage({
  images,
  onDelete,
}: {
  images: ChatImage[];
  onDelete?: (index: number) => void;
}) {
  const viewer = useImageViewer(images.length);
  if (images.length === 0) return null;

  return (
    <>
      <ImageGrid images={images} onOpen={viewer.open} onDelete={onDelete} />
      {viewer.isOpen && viewer.index !== null && (
        <ImageViewer
          images={images}
          index={viewer.index}
          zoom={viewer.zoom}
          setZoom={viewer.setZoom}
          pan={viewer.pan}
          setPan={viewer.setPan}
          onClose={viewer.close}
          onNext={viewer.next}
          onPrev={viewer.prev}
          onToggleZoom={viewer.toggleZoom}
        />
      )}
    </>
  );
}

/** Convertit une liste d'URLs simples (format historique) en ChatImage[]. */
export function imagesFromUrls(urls: string[], opts?: Partial<ChatImage>): ChatImage[] {
  return urls.map((url, i) => ({ id: `${url}-${i}`, url, ...opts }));
}
