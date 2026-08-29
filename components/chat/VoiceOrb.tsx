"use client";

import { useEffect, useRef } from "react";

/**
 * L'orbe du mode vocal — port fidèle du visualiseur de l'application mobile
 * (`lib/features/chat/widgets/voice_orb.dart`).
 *
 * POURQUOI PAS UN ÉGALISEUR
 * --------------------------
 * Des barres qui montent et descendent disent « lecteur audio ». Ce qu'on veut
 * dire ici est autre chose : quelque chose écoute, réfléchit et répond. D'où la
 * sphère — un volume, pas un graphique — traversée par une onde qui la déborde,
 * comme si la voix passait à travers elle.
 *
 * POURQUOI LE MOUVEMENT SUIT DU SON RÉEL
 * ---------------------------------------
 * `level` est le volume mesuré au micro. Une animation branchée sur une simple
 * minuterie continuerait de danser sur du silence : au bout de dix secondes on
 * comprend que ça ne répond à rien, et l'écran redevient un décor.
 */

export type VoiceOrbPhase = "ecoute" | "reflexion" | "parole" | "repos";

/** Ambre, cuivre, ivoire sur noir profond. Volontairement séparée du thème de
 * l'application : le mode vocal n'est pas un écran parmi d'autres, c'est un
 * espace où l'on entre. Il ne suit pas le mode clair/sombre — on n'éclaire pas
 * une salle de projection parce qu'il fait jour dehors. */
export const ORB = {
  fond: "#0F0C09",
  surface: "#17120E",
  cuivre: [200, 122, 74] as const,
  ambre: [243, 181, 98] as const,
  ivoire: [247, 244, 240] as const,
};

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, a))})`;

const lerp = (a: readonly number[], b: readonly number[], t: number) =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as const;

const TAU = Math.PI * 2;

const NB_POINTS = 1000;
const NB_COUCHES = 5;
const NB_POUSSIERES = 70;

/** Répartition régulière sur la sphère par spirale de Fibonacci : un tirage
 * aléatoire laisse des amas et des trous, qui se voient immédiatement sur une
 * surface qui tourne. */
function construireSphere() {
  const x = new Float32Array(NB_POINTS);
  const y = new Float32Array(NB_POINTS);
  const z = new Float32Array(NB_POINTS);
  const or = 2.399963229728653; // π (3 − √5)
  for (let i = 0; i < NB_POINTS; i++) {
    const yy = 1 - (i / (NB_POINTS - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - yy * yy));
    const theta = or * i;
    x[i] = Math.cos(theta) * r;
    y[i] = yy;
    z[i] = Math.sin(theta) * r;
  }
  return { x, y, z };
}

/** Générateur à graine fixe : la poussière doit être LA MÊME à chaque ouverture
 * de l'écran. Une disposition qui change d'une fois sur l'autre se remarque, et
 * donne l'impression d'un écran mal fini. */
function construirePoussiere() {
  let graine = 0xc87a4a;
  const alea = () => {
    graine = (graine * 1664525 + 1013904223) >>> 0;
    return graine / 0x100000000;
  };
  const angle = new Float32Array(NB_POUSSIERES);
  const rayon = new Float32Array(NB_POUSSIERES);
  const vitesse = new Float32Array(NB_POUSSIERES);
  const taille = new Float32Array(NB_POUSSIERES);
  const phase = new Float32Array(NB_POUSSIERES);
  for (let i = 0; i < NB_POUSSIERES; i++) {
    angle[i] = alea() * TAU;
    // Racine carrée : sans elle les particules s'entassent au centre, la
    // surface d'un anneau croissant avec le carré du rayon.
    rayon[i] = 0.62 + Math.sqrt(alea()) * 1.05;
    vitesse[i] = (alea() - 0.5) * 0.6 + 0.18;
    taille[i] = 0.6 + alea() * 1.5;
    phase[i] = alea() * TAU;
  }
  return { angle, rayon, vitesse, taille, phase };
}

export function VoiceOrb({
  phase,
  level,
  className,
}: {
  phase: VoiceOrbPhase;
  /** Volume capté au micro, 0 à 1. */
  level: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Refs plutôt que props dans la boucle : redémarrer l'animation à chaque
  // variation de niveau ferait sauter le mouvement soixante fois par seconde.
  const phaseRef = useRef(phase);
  const levelRef = useRef(level);
  useEffect(() => {
    phaseRef.current = phase;
    levelRef.current = level;
  }, [phase, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sphere = construireSphere();
    const poussiere = construirePoussiere();
    // Un tampon de coordonnées par couche de profondeur, réutilisé d'une image
    // à l'autre : mille allocations par image feraient tousser le ramasse-miettes.
    const tampons = Array.from({ length: NB_COUCHES }, () => new Float32Array(NB_POINTS * 2));
    const remplis = new Array<number>(NB_COUCHES).fill(0);

    let raf = 0;
    let energie = 0;
    let largeur = 0;
    let hauteur = 0;
    const debut = performance.now();

    const redimensionner = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      largeur = r.width;
      hauteur = r.height;
      canvas.width = Math.round(largeur * dpr);
      canvas.height = Math.round(hauteur * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    redimensionner();
    const observer = new ResizeObserver(redimensionner);
    observer.observe(canvas);

    const dessiner = (maintenant: number) => {
      raf = requestAnimationFrame(dessiner);
      if (largeur === 0 || hauteur === 0) return;

      // Une seule horloge, très longue, dont tout dérive par multiplication :
      // plusieurs périodes indépendantes finiraient par se resynchroniser à
      // intervalles réguliers, et le mouvement se mettrait à battre la mesure.
      const t = ((maintenant - debut) / 60000) % 1;
      const ph = phaseRef.current;

      // L'énergie suit le niveau, mais avec de l'inertie : branchée en direct,
      // la sphère tressaute à chaque syllabe au lieu de respirer.
      const cible =
        ph === "reflexion" ? 0.32 : ph === "repos" ? 0.06 : Math.min(1, levelRef.current);
      energie += (cible - energie) * 0.12;

      ctx.clearRect(0, 0, largeur, hauteur);

      // Légèrement au-dessus du centre géométrique : l'œil situe le centre
      // d'une composition plus haut que son centre mesuré, et le décalage
      // libère le bas, où se pose la flaque de lumière.
      const cx = largeur / 2;
      const cy = hauteur * 0.455;
      const rayon = Math.min(largeur * 0.31, hauteur * 0.29);

      peindreHalo(ctx, cx, cy, rayon, t, energie);
      peindreAnneaux(ctx, cx, cy, rayon, t, energie);
      peindreSphere(ctx, cx, cy, rayon, t, energie, sphere, tampons, remplis);
      peindreOnde(ctx, largeur, cx, cy, rayon, t, energie, ph);
      peindrePoussiere(ctx, cx, cy, rayon, t, energie, poussiere, ph);
      peindreLimbe(ctx, cx, cy, rayon, energie);
      peindreReflet(ctx, hauteur, cx, cy, rayon, energie);
    };
    raf = requestAnimationFrame(dessiner);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

// ── Halo ────────────────────────────────────────────────────────────────────

function peindreHalo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rayon: number,
  t: number,
  energie: number,
) {
  const intensite = 0.16 + 0.3 * energie;
  // Respiration très lente et très faible : un halo qui pulse visiblement
  // devient un gyrophare ; on cherche l'impression d'être vivant.
  const souffle = 1 + 0.045 * Math.sin(t * TAU * 5);
  const r = rayon * 1.75 * souffle;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(ORB.ambre, intensite * 0.6));
  g.addColorStop(0.52, rgba(ORB.cuivre, intensite * 0.24));
  g.addColorStop(1, rgba(ORB.cuivre, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
}

// ── Anneaux concentriques ───────────────────────────────────────────────────

function peindreAnneaux(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rayon: number,
  t: number,
  energie: number,
) {
  // Sept anneaux extrêmement fins. Leur rôle n'est pas d'être vus un par un
  // mais de créer la profondeur : ce sont eux qui font qu'on lit un objet dans
  // un espace, et pas un disque posé sur un fond.
  const nb = 7;
  for (let i = 0; i < nb; i++) {
    const progression = i / (nb - 1);
    const base = 1.06 + progression * 0.62;
    // Chaque anneau respire à sa fréquence : synchronisés, ils formeraient une
    // cible qui se dilate d'un bloc.
    const battement =
      1 + 0.018 * Math.sin(t * TAU * (3 + i * 1.37) + i * 0.9) * (0.4 + energie);
    const r = rayon * base * battement;
    const opacite = (0.085 - progression * 0.055) * (0.55 + 0.75 * energie);
    if (opacite <= 0.002) continue;
    ctx.strokeStyle = rgba(lerp(ORB.ambre, ORB.cuivre, progression), opacite);
    ctx.lineWidth = 0.6 + (1 - progression) * 0.5;
    ctx.beginPath();
    // Légèrement aplatis : une ellipse suggère un plan vu de biais, un cercle
    // parfait reste une forme à plat.
    ctx.ellipse(cx, cy, r, r * 0.97, 0, 0, TAU);
    ctx.stroke();
  }
}

// ── Sphère de points ────────────────────────────────────────────────────────

function peindreSphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rayon: number,
  t: number,
  energie: number,
  sphere: { x: Float32Array; y: Float32Array; z: Float32Array },
  tampons: Float32Array[],
  remplis: number[],
) {
  for (let c = 0; c < NB_COUCHES; c++) remplis[c] = 0;

  // Rotation lente sur l'axe vertical, plus une oscillation d'inclinaison :
  // une rotation pure sur un seul axe se lit comme un globe terrestre.
  const angle = t * TAU * 1.6;
  const inclinaison = 0.17 + 0.06 * Math.sin(t * TAU * 2.3);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cosI = Math.cos(inclinaison);
  const sinI = Math.sin(inclinaison);
  // La sphère respire avec l'énergie sans jamais grossir beaucoup : au-delà de
  // quelques pour cent, on voit un objet qui gonfle, pas qui respire.
  const echelle = rayon * (1 + 0.055 * energie + 0.012 * Math.sin(t * TAU * 7));

  for (let i = 0; i < NB_POINTS; i++) {
    const x0 = sphere.x[i];
    const y0 = sphere.y[i];
    const z0 = sphere.z[i];
    const x1 = x0 * cosA + z0 * sinA;
    const z1 = -x0 * sinA + z0 * cosA;
    const y1 = y0 * cosI - z1 * sinI;
    const z2 = y0 * sinI + z1 * cosI;
    // Perspective légère : les points de devant s'écartent un peu du centre.
    const perspective = 1 + z2 * 0.13;
    const sx = cx + x1 * echelle * perspective;
    const sy = cy + y1 * echelle * perspective;

    // Profondeur 0 (derrière) à 1 (devant), puis renforcement du bord : sur une
    // vraie sphère éclairée, la densité apparente augmente vers le limbe, et
    // c'est ce détail qui fait que l'œil lit un volume.
    const profondeur = (z2 + 1) / 2;
    const distance = Math.sqrt(x1 * x1 + y1 * y1);
    const limbe = Math.pow(distance, 2.2);
    const poids = Math.max(0, Math.min(1, profondeur * 0.72 + limbe * 0.55));
    let couche = Math.round(poids * (NB_COUCHES - 1));
    if (couche < 0) couche = 0;
    if (couche >= NB_COUCHES) couche = NB_COUCHES - 1;
    const n = remplis[couche];
    tampons[couche][n * 2] = sx;
    tampons[couche][n * 2 + 1] = sy;
    remplis[couche] = n + 1;
  }

  for (let c = 0; c < NB_COUCHES; c++) {
    const n = remplis[c];
    if (n === 0) continue;
    const progression = c / (NB_COUCHES - 1);
    // Cuivre au fond, ambre au premier plan, ivoire seulement sur la couche la
    // plus lumineuse : garder l'ivoire rare est ce qui l'empêche de délaver
    // l'ensemble.
    const couleur =
      progression < 0.72
        ? lerp(ORB.cuivre, ORB.ambre, progression / 0.72)
        : lerp(ORB.ambre, ORB.ivoire, (progression - 0.72) / 0.28);
    const opacite = (0.1 + progression * 0.72) * (0.55 + 0.45 * energie);
    const taille = 0.7 + progression * 1.35 + energie * 0.35;
    ctx.fillStyle = rgba(couleur, opacite);
    const buf = tampons[c];
    // Un `arc` par point coûterait mille chemins par image. Des carrés de
    // sous-pixel rendus en `fillRect` tiennent la cadence, et à cette taille
    // l'œil ne distingue plus la forme du grain.
    const d = taille;
    for (let i = 0; i < n; i++) {
      ctx.fillRect(buf[i * 2] - d / 2, buf[i * 2 + 1] - d / 2, d, d);
    }
  }
}

// ── Limbe incandescent ──────────────────────────────────────────────────────

/** Le liseré qui cercle la sphère : c'est lui qui donne l'impression d'une
 * source lumineuse ENFERMÉE dans la sphère plutôt que posée devant. */
function peindreLimbe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rayon: number,
  energie: number,
) {
  const r = rayon * (1 + 0.055 * energie);
  const intensite = 0.42 + 0.48 * energie;
  // Éclairage venu du haut : l'arc supérieur est franc, le bas ne reçoit qu'un
  // reflet. Un anneau d'intensité constante ressemble à un contour tracé, pas
  // à de la lumière.
  const degrade = (alpha: number) => {
    const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    g.addColorStop(0, rgba(ORB.ivoire, alpha));
    g.addColorStop(0.45, rgba(ORB.ambre, alpha * 0.72));
    g.addColorStop(1, rgba(ORB.cuivre, alpha * 0.45));
    return g;
  };
  for (const [epaisseur, alpha] of [
    [7 + energie * 5, intensite * 0.13],
    [2.6 + energie * 1.6, intensite * 0.42],
    [0.9, intensite * 0.95],
  ] as const) {
    ctx.strokeStyle = degrade(alpha);
    ctx.lineWidth = epaisseur;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
}

// ── Onde ────────────────────────────────────────────────────────────────────

/** L'onde qui traverse l'orbe de part en part.
 *
 * Ce n'est pas une courbe mais un FAISCEAU de courbes légèrement décalées :
 * c'est l'écart entre elles, qui s'ouvre et se referme le long de l'axe, qui
 * produit le rendu de fil de soie. Une ligne seule, si épaisse soit-elle,
 * reste un trait. */
function peindreOnde(
  ctx: CanvasRenderingContext2D,
  largeur: number,
  cx: number,
  cy: number,
  rayon: number,
  t: number,
  energie: number,
  phase: VoiceOrbPhase,
) {
  // Écoute et réponse ont la MÊME plage : dans les deux cas quelqu'un parle, et
  // rien ne justifie que l'onde soit plus timide quand c'est l'utilisateur.
  const amplitude =
    phase === "ecoute" || phase === "parole"
      ? 0.08 + 0.92 * energie
      : phase === "reflexion"
        ? 0.06 + 0.1 * energie
        : 0.035;

  // 28 lignes, pas 15 : c'est le NOMBRE qui fait la matière. En dessous d'une
  // vingtaine, l'œil compte les traits et voit un empilement ; au-delà, il lit
  // une seule surface soyeuse.
  const nbLignes = 28;
  const nbPoints = 140;
  const hauteurMax = rayon * 1.12 * amplitude;
  const ecartMax = rayon * 0.44 * (0.3 + amplitude);

  // Trois porteuses de fréquences non harmoniques : des multiples entiers
  // produiraient une figure qui se referme sur elle-même, reconnaissable et
  // mécanique. Ici le motif ne se répète jamais tout à fait.
  const phase1 = t * TAU * 9.0;
  const phase2 = t * TAU * 5.7;
  const phase3 = t * TAU * 14.3;

  const degrade = (opacite: number) => {
    const o = Math.max(0, Math.min(1, opacite));
    const g = ctx.createLinearGradient(0, cy, largeur, cy);
    g.addColorStop(0, rgba(ORB.cuivre, 0));
    g.addColorStop(0.16, rgba(ORB.cuivre, o * 0.65));
    g.addColorStop(0.36, rgba(ORB.ambre, o));
    g.addColorStop(0.5, rgba(ORB.ivoire, o));
    g.addColorStop(0.64, rgba(ORB.ambre, o));
    g.addColorStop(0.84, rgba(ORB.cuivre, o * 0.65));
    g.addColorStop(1, rgba(ORB.cuivre, 0));
    return g;
  };

  const ordonnee = (d: number) =>
    Math.sin(d * 1.55 + phase1) * 0.62 +
    Math.sin(d * 0.83 - phase2) * 0.3 +
    Math.sin(d * 2.9 + phase3) * 0.13;

  // Groupement par opacité : quatre tracés au lieu de vingt-huit, pour la même
  // texture — ce sont les mêmes courbes, seule l'opacité est quantifiée.
  const nbGroupes = 4;
  const chemins = Array.from({ length: nbGroupes }, () => new Path2D());
  const opacites = new Array<number>(nbGroupes).fill(0);
  const epaisseurs = new Array<number>(nbGroupes).fill(0);

  for (let l = 0; l < nbLignes; l++) {
    const part = l / (nbLignes - 1);
    const decalage = (part - 0.5) * 2; // −1 à 1
    // Les lignes du bord du faisceau s'effacent : un faisceau à opacité
    // constante a une arête, et une arête se lit comme une bande.
    const bord = 1 - Math.abs(decalage);
    const opacite = (0.14 + 0.72 * bord) * (0.4 + 0.8 * amplitude);
    if (opacite <= 0.004) continue;
    const groupe = Math.max(0, Math.min(nbGroupes - 1, Math.round(bord * (nbGroupes - 1))));
    if (opacite > opacites[groupe]) opacites[groupe] = opacite;
    const epaisseur = 0.5 + bord * 0.55;
    if (epaisseur > epaisseurs[groupe]) epaisseurs[groupe] = epaisseur;

    const chemin = chemins[groupe];
    for (let i = 0; i < nbPoints; i++) {
      const u = i / (nbPoints - 1);
      const x = u * largeur;
      const d = (x - cx) / rayon;
      // Enveloppe gaussienne : l'onde naît et meurt dans le noir, sans jamais
      // toucher les bords. Une onde coupée net fait apparaître le cadre, et le
      // cadre casse l'immersion.
      const enveloppe = Math.exp(-(d * d) / 3.4);
      // L'écart entre les lignes se module le long de l'axe : c'est ce
      // resserrement/évasement qui donne la texture.
      const ouverture = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(d * 1.1 - phase2 * 0.6));
      const py =
        cy + ordonnee(d) * hauteurMax * enveloppe + decalage * ecartMax * enveloppe * ouverture;
      if (i === 0) chemin.moveTo(x, py);
      else chemin.lineTo(x, py);
    }
  }

  for (let g = 0; g < nbGroupes; g++) {
    if (opacites[g] <= 0.004) continue;
    ctx.strokeStyle = degrade(opacites[g]);
    ctx.lineWidth = epaisseurs[g];
    ctx.stroke(chemins[g]);
  }

  // La lumière volumétrique : le halo qui fait que l'onde ÉCLAIRE le noir
  // autour d'elle au lieu d'être posée dessus. Sans lui, le faisceau reste un
  // dessin sur un fond et l'effet holographique s'effondre.
  if (amplitude > 0.1) {
    const lueur = new Path2D();
    for (let i = 0; i < nbPoints; i++) {
      const u = i / (nbPoints - 1);
      const x = u * largeur;
      const d = (x - cx) / rayon;
      const enveloppe = Math.exp(-(d * d) / 3.4);
      const py = cy + ordonnee(d) * hauteurMax * enveloppe;
      if (i === 0) lueur.moveTo(x, py);
      else lueur.lineTo(x, py);
    }
    ctx.lineCap = "round";
    for (const [epaisseur, alpha] of [
      [10.0, 0.055],
      [6.0, 0.085],
      [2.4, 0.16],
    ] as const) {
      ctx.strokeStyle = degrade(alpha * (0.5 + amplitude));
      ctx.lineWidth = epaisseur * (0.5 + amplitude * 0.8);
      ctx.stroke(lueur);
    }
    ctx.lineCap = "butt";
    // Le cœur : un trait fin, ivoire, au milieu du faisceau. Sans lui il ne
    // reste qu'une lueur, jamais un filament.
    ctx.strokeStyle = degrade(0.3 + 0.55 * amplitude);
    ctx.lineWidth = 0.9;
    ctx.stroke(lueur);
  }
}

// ── Poussière lumineuse ─────────────────────────────────────────────────────

function peindrePoussiere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rayon: number,
  t: number,
  energie: number,
  p: ReturnType<typeof construirePoussiere>,
  phase: VoiceOrbPhase,
) {
  // En réflexion, les particules tournent nettement plus vite : c'est le seul
  // signal de cet état, puisque l'onde y est presque plate.
  const vitesse =
    phase === "reflexion" ? 3.4 : phase === "parole" ? 1.7 : phase === "ecoute" ? 1.0 : 0.45;

  for (let i = 0; i < NB_POUSSIERES; i++) {
    const angle = p.angle[i] + t * TAU * p.vitesse[i] * vitesse;
    const r = rayon * p.rayon[i];
    // Aplatissement vertical : les particules occupent un disque autour de la
    // sphère, pas une bulle. C'est ce qui les rattache au sol invisible sur
    // lequel l'orbe est posé.
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.78;
    // Scintillement : chaque grain a sa propre phase, sans quoi tout le champ
    // clignote ensemble comme une guirlande.
    const scintille = 0.5 + 0.5 * Math.sin(t * TAU * 11 + p.phase[i]);
    const opacite = (0.06 + 0.34 * scintille) * (0.35 + 0.75 * energie);
    if (opacite <= 0.006) continue;
    const couleur = scintille > 0.82 ? ORB.ivoire : scintille > 0.5 ? ORB.ambre : ORB.cuivre;
    ctx.fillStyle = rgba(couleur, opacite);
    ctx.beginPath();
    ctx.arc(x, y, p.taille[i] * (0.7 + 0.5 * scintille), 0, TAU);
    ctx.fill();
  }
}

// ── Reflet au sol ───────────────────────────────────────────────────────────

/** La flaque de lumière sous l'orbe. Il n'y a pas de sol dessiné, et c'est
 * justement l'intérêt : cette tache suffit à faire comprendre que l'orbe flotte
 * AU-DESSUS de quelque chose. Sans elle, la sphère est collée sur un fond noir
 * et perd tout ancrage. */
function peindreReflet(
  ctx: CanvasRenderingContext2D,
  hauteur: number,
  cx: number,
  cy: number,
  rayon: number,
  energie: number,
) {
  const y = cy + rayon * 1.82;
  if (y > hauteur + rayon) return;
  const largeurTache = rayon * (1.3 + 0.3 * energie);
  const hauteurTache = rayon * (0.095 + 0.035 * energie);
  const intensite = Math.min(0.7, 0.26 + 0.4 * energie);

  ctx.save();
  for (const [echelle, alpha, flou] of [
    [1.0, intensite * 0.42, 18],
    [0.45, intensite * 0.55, 9],
  ] as const) {
    ctx.filter = `blur(${flou}px)`;
    ctx.fillStyle = rgba(echelle > 0.7 ? ORB.cuivre : ORB.ambre, alpha);
    ctx.beginPath();
    ctx.ellipse(cx, y, largeurTache * echelle, hauteurTache * echelle, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
