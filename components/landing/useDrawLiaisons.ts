"use client";

/**
 * TRACÉ DES LIAISONS DU MOYEU — DrawSVG, chargé seulement s'il sert.
 *
 * CE QU'ON ANIME, ET POURQUOI CELUI-LÀ
 * -------------------------------------
 * Les trois traits qui relient Toumaï AI à WhatsApp, Mail et Agenda existent
 * déjà en `<path stroke>` dans `Connectors.tsx`. Les faire se tracer depuis le
 * centre vers l'extérieur, à l'entrée dans le champ de vision, dit exactement
 * ce que la section affirme : la connexion s'établit. Le mouvement porte donc
 * du sens — il ne décore pas.
 *
 * C'est aussi le seul endroit de la page où le tracé ne demande AUCUN dessin
 * nouveau. Le logo, lui, est un PNG en aplats : il n'a pas de contour, donc
 * rien à tracer. Le vérifier avant a évité de promettre l'impossible.
 *
 * LES 36 Ko NE PARTENT PAS DANS LE PAQUET INITIAL
 * ------------------------------------------------
 * La page d'accueil a été allégée délibérément — code propre ~15 Ko gzip.
 * GSAP et DrawSVG pèsent à eux deux davantage. Ils sont donc chargés par
 * `import()` dynamique, et UNIQUEMENT quand la section approche : une personne
 * qui ne descend jamais jusqu'aux connecteurs ne les télécharge jamais.
 *
 * TROIS GARDE-FOUS, PAS UN
 * -------------------------
 * 1. `prefers-reduced-motion` : la timeline ne vit que dans la branche
 *    `no-preference` de `gsap.matchMedia()`. Un simple `if` ne suffirait pas —
 *    la préférence peut changer pendant la session, `matchMedia` rejoue la
 *    configuration.
 * 2. Sans JavaScript, les traits restent VISIBLES. C'est la raison pour
 *    laquelle l'état « non tracé » est posé par le script (`fromTo`) et jamais
 *    dans le balisage : un dessin non tracé est un dessin invisible, et la
 *    règle vaut aussi pour les robots d'indexation.
 * 3. Une seule fois par montage. Retracer à chaque passage transformerait une
 *    intention en tic.
 */

import { useEffect, useRef } from "react";

export function useDrawLiaisons(actif: boolean) {
  const zone = useRef<SVGSVGElement>(null);
  const dejaJoue = useRef(false);

  useEffect(() => {
    if (!actif || dejaJoue.current || !zone.current) return;

    const racine = zone.current;
    const traits = racine.querySelectorAll<SVGPathElement>("[data-tm-draw]");
    if (!traits.length) return;

    // LE GARDE SE POSE APRÈS COUP, PAS AVANT.
    //
    // Posé ici avant le chargement, il entrait en contradiction directe avec le
    // nettoyage. En développement, React monte, démonte puis remonte chaque
    // effet : le démontage appelait `mm.revert()`, qui ANNULE le tracé et
    // restaure l'état d'origine — puis le remontage trouvait `dejaJoue` déjà
    // vrai et sortait aussitôt. Résultat : plugin bien enregistré, branche bien
    // exécutée, et pourtant aucun trait tracé. Mesuré avec une durée poussée à
    // six secondes : `stroke-dasharray` n'apparaissait à aucun instant.
    //
    // Le garde est donc levé quand on annule, et la paire monte/démonte
    // redevient neutre.
    let nettoyer: (() => void) | undefined;
    let annule = false;

    (async () => {
      // Chargés ensemble : DrawSVG sans le cœur ne sert à rien, et deux
      // requêtes séquentielles retarderaient le tracé d'un aller-retour.
      const [coeur, plugin] = await Promise.all([
        import("gsap"),
        import("gsap/DrawSVGPlugin"),
      ]);
      if (annule) return;

      const gsap = coeur.gsap ?? coeur.default;

      // L'EXPORT EST PAR DÉFAUT, ET S'EN APERCEVOIR COÛTE CHER.
      //
      // `DrawSVGPlugin.js` se termine par `export { DrawSVGPlugin as default }`
      // — il n'y a PAS d'export nommé. Une déstructuration `{ DrawSVGPlugin }`
      // sur un `import()` dynamique rend donc `undefined`,
      // `registerPlugin(undefined)` ne fait rien, `drawSVG` devient une
      // propriété inconnue... et GSAP l'ignore SANS erreur. Rien dans la
      // console, rien dans le réseau : le trait reste simplement fixe.
      //
      // Mesuré ainsi : GSAP bien téléchargé, mouvement réduit désactivé, et
      // pourtant aucun `stroke-dasharray` posé sur les chemins.
      //
      // L'import nommé fonctionne en statique (interop du bundler) mais pas
      // ici. On accepte les deux formes : le jour où le paquet ajoute l'export
      // nommé, rien ne casse.
      const DrawSVG = plugin.DrawSVGPlugin ?? plugin.default;
      if (!DrawSVG) return;
      gsap.registerPlugin(DrawSVG);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          traits,
          { drawSVG: "0% 0%" },
          {
            // « 0% 100% » décrit le SEGMENT VISIBLE finalement atteint, pas une
            // progression : le trait part du moyeu et va jusqu'au nœud.
            drawSVG: "0% 100%",
            duration: 0.9,
            ease: "power2.out",
            // Trois traits seulement : bien en deçà des huit au-delà desquels
            // les derniers paraissent en retard.
            stagger: 0.16,
          }
        );
      });

      dejaJoue.current = true;
      nettoyer = () => {
        mm.revert();
        // `revert()` remet les traits dans leur etat d'origine : le garde doit
        // tomber avec lui, sinon un remontage laisserait des traits non traces
        // sans jamais rejouer.
        dejaJoue.current = false;
      };
    })();

    return () => {
      annule = true;
      nettoyer?.();
    };
  }, [actif]);

  return zone;
}
