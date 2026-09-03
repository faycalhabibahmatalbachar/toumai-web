"use client";

/**
 * LE TRACÉ — l'illustration de l'accueil simple.
 *
 * POURQUOI UN DESSIN AU TRAIT PLUTÔT QU'UNE IMAGE
 * ------------------------------------------------
 * Un trait vectoriel pèse deux kilo-octets, reste net sur n'importe quel
 * écran, suit le thème sans qu'on ait à produire deux fichiers, et se laisse
 * animer. Une illustration bitmap ne fait aucune de ces quatre choses — et sur
 * une liaison tchadienne, c'est le poids qui décide du temps d'affichage bien
 * avant le JavaScript.
 *
 * CE QUE LE DESSIN RACONTE
 * -------------------------
 * Une seule ligne continue qui part du bas, s'enroule, hésite, puis remonte et
 * se résout en trois points qui s'éloignent. C'est le geste d'une pensée qui
 * cherche puis trouve — et c'est le motif du produit : on entre avec un
 * embrouillamini, on ressort avec quelque chose de clair.
 *
 * Aucun élément n'est repris d'ailleurs : la courbe est écrite à la main ici,
 * en coordonnées, et les trois disques reprennent la terre cuite de la marque.
 */

export function Trace({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 560"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ overflow: "visible" }}
    >
      {/* La ligne longue : elle monte depuis le bas, s'emmêle au centre, puis
          se dénoue vers la droite. Le tracé se dessine au chargement. */}
      <path
        className="ac-trait"
        d="M96 552 C96 452 92 392 118 352 C148 306 214 318 220 366
           C226 412 168 428 148 396 C124 358 168 300 226 296
           C286 292 300 344 268 372 C238 398 196 372 208 336
           C222 294 292 274 330 236 C368 198 356 138 316 122"
        stroke="var(--landing-ink)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />

      {/* La seconde courbe, plus calme : le contrepoint. Elle ne s'emmêle
          jamais — c'est ce qui donne son sens à l'autre. */}
      <path
        className="ac-trait ac-trait-2"
        d="M446 540 C446 452 402 420 404 360 C406 300 462 286 470 226
           C476 178 452 150 448 120"
        stroke="var(--landing-ink)"
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Les trois points : la résolution. Ils arrivent après le trait, du
          plus gros au plus petit, comme une idée qui se précise. */}
      <ellipse className="ac-pt" cx="290" cy="90" rx="22" ry="19" fill="var(--landing-accent)" style={{ "--ac-i": 0 } as React.CSSProperties} />
      <circle className="ac-pt" cx="252" cy="42" r="13" fill="var(--landing-accent)" style={{ "--ac-i": 1 } as React.CSSProperties} />
      <circle className="ac-pt" cx="228" cy="14" r="8" fill="var(--landing-accent)" style={{ "--ac-i": 2 } as React.CSSProperties} />
    </svg>
  );
}
