"use client";

import { useCallback, useState } from "react";
import { ImageBubble } from "./ImageBubble";
import type { ChatImage } from "./types";

/** Grille responsive : 1 image pleine largeur, 2 en côte-à-côte, 3-4 en
 * grille 2x2, 5+ avec une pastille "+N" sur la dernière tuile visible.
 *
 * Les images dont la source ne répond plus sont retirées de la grille, et la
 * mise en page se recompose autour. Le backend vérifie désormais chaque URL
 * avant de l'envoyer, mais un lien peut mourir entre la vérification et
 * l'affichage : ce filet reste nécessaire. Une case « Image indisponible » au
 * milieu d'une réponse ajoutait du bruit sans rien apprendre, et laissait
 * croire à un échec de notre fait alors que c'est la source distante qui a
 * disparu. */
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
  const [rompues, setRompues] = useState<Set<string>>(new Set());

  const signalerEchec = useCallback((id: string) => {
    setRompues((prev) => {
      if (prev.has(id)) return prev;
      const suivant = new Set(prev);
      suivant.add(id);
      return suivant;
    });
  }, []);

  // On filtre en gardant l'INDEX d'origine : la visionneuse plein écran et la
  // suppression s'appuient dessus. Réindexer après filtrage ouvrirait l'image
  // voisine — un bug d'autant plus pénible qu'il n'apparaît qu'en présence
  // d'une image morte.
  const vivantes = images
    .map((image, indexOrigine) => ({ image, indexOrigine }))
    .filter(({ image }) => !rompues.has(image.id));

  if (vivantes.length === 0) return null;

  if (vivantes.length === 1) {
    const { image, indexOrigine } = vivantes[0];
    return (
      <div className="max-w-[420px]">
        <ImageBubble
          image={image}
          onOpen={() => onOpen(indexOrigine)}
          aspectClassName="aspect-video"
          onDelete={onDelete ? () => onDelete(indexOrigine) : undefined}
          onFailed={() => signalerEchec(image.id)}
        />
      </div>
    );
  }

  if (vivantes.length === 2) {
    return (
      <div className="grid max-w-[420px] grid-cols-2 gap-2">
        {vivantes.map(({ image, indexOrigine }) => (
          <ImageBubble
            key={image.id}
            image={image}
            onOpen={() => onOpen(indexOrigine)}
            onDelete={onDelete ? () => onDelete(indexOrigine) : undefined}
            onFailed={() => signalerEchec(image.id)}
          />
        ))}
      </div>
    );
  }

  const visible = vivantes.slice(0, maxVisible);
  const overflow = vivantes.length - maxVisible;

  return (
    <div className="grid max-w-[420px] grid-cols-2 gap-2">
      {visible.map(({ image, indexOrigine }, i) => {
        const isLastVisible = i === maxVisible - 1 && overflow > 0;
        return (
          <div key={image.id} className="relative">
            <ImageBubble
              image={image}
              onOpen={() => onOpen(indexOrigine)}
              onDelete={onDelete ? () => onDelete(indexOrigine) : undefined}
              onFailed={() => signalerEchec(image.id)}
            />
            {isLastVisible && (
              <button
                onClick={() => onOpen(indexOrigine)}
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
