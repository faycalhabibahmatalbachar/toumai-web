"use client";

/**
 * UNE CAPTURE D'ÉCRAN RÉELLE, SEULE, À LA PLACE D'UNE REPRODUCTION.
 *
 * CE QUE CE COMPOSANT REMPLACE
 * -----------------------------
 * Les scènes de démonstration étaient des interfaces REDESSINÉES à la main en
 * HTML et CSS : bulles, icônes, cadres, tout imité. C'était habile et c'était
 * un problème — la page affirmait « voici le produit » en montrant une imitation
 * du produit. Quand on la reconnaît comme telle, tout le reste devient suspect.
 *
 * La maquette réelle porte déjà son propre châssis de téléphone, sa barre
 * d'état, ses commandes. Elle ne se pose donc PAS à l'intérieur d'un cadre
 * dessiné : elle prend toute la place. Emboîter une capture dans une
 * reproduction reviendrait à garder l'imitation et à y coller une preuve.
 *
 * POURQUOI PAS DE `fill` NI DE RECADRAGE
 * ---------------------------------------
 * Les panneaux sont en paysage, les captures en portrait. `object-cover`
 * couperait le haut et le bas du téléphone — donc la barre d'état d'un côté et
 * la zone de saisie de l'autre, c'est-à-dire précisément ce qui prouve que
 * c'est une vraie application. On contient, on centre, et on accepte l'espace
 * libre de part et d'autre.
 */

type Props = {
  /** Base du nom de fichier, sans largeur ni extension. */
  base: string;
  /** Ce qu'on VOIT, pas ce que l'image est. Jamais vide : ces captures portent
   *  l'information, elles ne décorent pas. */
  alt: string;
  /** Dimensions de la source, pour réserver la place et éviter un décalage. */
  largeur: number;
  hauteur: number;
  /** Largeur maximale affichée. En style en ligne : ce projet ne génère aucun
   *  utilitaire `max-w-[...]` arbitraire — vérifié dans la CSS construite. */
  maxLargeur?: number;
};

export function MaquetteEcran({ base, alt, largeur, hauteur, maxLargeur = 300 }: Props) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-2">
      <picture>
        <source
          type="image/avif"
          srcSet={`/landing/${base}-460.avif 460w, /landing/${base}-720.avif 720w`}
          sizes={`(min-width: 640px) ${maxLargeur}px, 62vw`}
        />
        <img
          src={`/landing/${base}-460.webp`}
          alt={alt}
          width={largeur}
          height={hauteur}
          loading="lazy"
          decoding="async"
          className="h-full w-auto select-none object-contain"
          style={{ maxWidth: maxLargeur }}
        />
      </picture>
    </div>
  );
}
