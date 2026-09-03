/**
 * SOCLE COMMUN DES SCÈNES ANIMÉES DE TOUMAÏ
 * =========================================
 *
 * Il n'a pas été écrit avant les scènes : il en a été extrait. Chaque fonction
 * ici existe parce qu'elle était recopiée à l'identique dans au moins deux
 * scènes livrées — l'interpolation, le gréement des mains, la boucle, le repli
 * pour mouvement réduit.
 *
 * CE QU'IL APPORTE PAR RAPPORT AU COPIER-COLLER
 * ----------------------------------------------
 * 1. UN SEUL TÉLÉCHARGEMENT. Les cinq scènes livrées portaient 1 090 Ko de
 *    `data:image/png;base64` pour DEUX images distinctes — la même main
 *    recopiée six fois, jamais mise en cache puisqu'elle vivait dans le HTML.
 *    Ici la main est un fichier : chargée une fois, réutilisée par toutes les
 *    scènes, 29 Ko au lieu de 1 068.
 * 2. UN SEUL ENDROIT OÙ CORRIGER. Le repli `prefers-reduced-motion` était
 *    réécrit dans chaque fichier, avec des comportements différents. Il est
 *    ici, et il est le même partout.
 * 3. LE POINT DE PRÉHENSION. C'est le détail qui fait qu'une main *tient* un
 *    objet au lieu de le *pousser* : on ne déplace pas l'image de la main vers
 *    l'objet, on place l'objet là où sont les doigts. Se tromper d'un pixel se
 *    voit tout de suite ; l'avoir écrit une fois évite de le retrouver.
 *
 * CE QU'IL NE FAIT PAS
 * ---------------------
 * Il ne décide rien. Aucune scène ne doit être scriptée depuis ici : la logique
 * (quel courriel classer, quelle colonne jouer, quel fournisseur reprend) reste
 * dans la scène, et elle doit être RÉELLE. Une partie scriptée finit toujours
 * par se voir.
 */

(function (global) {
  "use strict";

  /** Le mouvement réduit n'est pas une option : c'est une consigne du système. */
  const mouvementReduit = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ─── TEMPS ──────────────────────────────────────────────────────────────
   *
   * `attendre` s'appuie sur setTimeout, `tween` sur requestAnimationFrame.
   * La différence compte : hors écran, un navigateur n'accorde aucune image,
   * donc le rAF ne bat pas — mais les minuteries, elles, continuent. Une scène
   * qui mélange les deux se désynchronise dès qu'on la fait défiler. C'est
   * pourquoi TOUTE la chorégraphie passe par `tween` et que `attendre` n'est
   * utilisé que pour les pauses de lecture, jamais pour animer.
   */

  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  const courbes = {
    /** Départ et arrivée en douceur : le geste par défaut d'une main. */
    doux: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    /** Part lentement, finit vite — une chute, un objet lâché. */
    chute: (t) => t * t,
    /** Part vite, s'arrête net — un geste sec, un cordon tiré. */
    freine: (t) => 1 - Math.pow(1 - t, 3),
    /** Dépasse et revient : un ressort, un cordon relâché. */
    ressort: (t) => {
      const c = 1.70158 + 1;
      return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
    },
    lineaire: (t) => t,
  };

  function tween(duree, dessiner, courbe) {
    const ease = courbe || courbes.doux;
    if (mouvementReduit) {
      // On saute à l'état final plutôt que de ne rien faire : une scène figée
      // sur son état initial ne raconte rien, une scène figée sur sa fin
      // raconte encore l'histoire.
      dessiner(1, 1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const debut = performance.now();
      function image(maintenant) {
        const brut = Math.min(1, (maintenant - debut) / duree);
        dessiner(ease(brut), brut);
        if (brut < 1) requestAnimationFrame(image);
        else resolve();
      }
      requestAnimationFrame(image);
    });
  }

  const entre = (a, b, t) => a + (b - a) * t;

  /* ─── ÉLÉMENTS ───────────────────────────────────────────────────────── */

  const el = (id) => document.getElementById(id);

  function place(element, point, echelle, rotation) {
    const e = echelle === undefined ? 1 : echelle;
    const r = rotation === undefined ? 0 : rotation;
    element.setAttribute(
      "transform",
      "translate(" + point.x.toFixed(2) + " " + point.y.toFixed(2) + ") " +
        "rotate(" + r.toFixed(2) + ") scale(" + e.toFixed(4) + ")"
    );
  }

  const opacite = (element, v) => element.style.setProperty("opacity", String(v));

  /* ─── MAINS ──────────────────────────────────────────────────────────────
   *
   * Le gréement d'une main tient en trois nombres : l'échelle, le point de
   * préhension (où sont les doigts dans l'image) et la position de repos.
   * Tout le reste en découle.
   */

  function Main(options) {
    const noeud = el(options.id);
    const echelle = options.echelle === undefined ? 0.84 : options.echelle;
    const grip = {
      x: options.grip.x * echelle,
      y: options.grip.y * echelle,
    };
    const repos = options.repos;
    let position = { x: repos.x, y: repos.y };

    function poser(point, e) {
      position = { x: point.x, y: point.y };
      place(noeud, position, e === undefined ? echelle : e);
    }

    /** Le point où poser la MAIN pour que ses doigts touchent `cible`. */
    const pourToucher = (cible) => ({ x: cible.x - grip.x, y: cible.y - grip.y });

    /**
     * Un déplacement en ligne droite ressemble à un curseur ; un déplacement en
     * arc ressemble à un bras. L'arc est la moitié du réalisme de ces scènes,
     * et il ne coûte qu'un sinus.
     */
    async function aller(cible, duree, arc) {
      const depart = { x: position.x, y: position.y };
      const arrivee = pourToucher(cible);
      const hauteur = arc === undefined ? 26 : arc;
      await tween(duree || 560, (t) => {
        poser({
          x: entre(depart.x, arrivee.x, t),
          y: entre(depart.y, arrivee.y, t) - Math.sin(Math.PI * t) * hauteur,
        });
      });
    }

    /** Le petit resserrement des doigts au moment où l'on saisit. */
    async function serrer(duree) {
      const ancre = { x: position.x, y: position.y };
      await tween(duree || 150, (t) => {
        poser(ancre, echelle * (1 - 0.02 * Math.sin(Math.PI * t)));
      });
    }

    async function rentrer(duree) {
      await aller(
        { x: repos.x + grip.x, y: repos.y + grip.y },
        duree || 640,
        18
      );
    }

    poser(repos);

    return {
      noeud,
      grip,
      aller,
      serrer,
      rentrer,
      poser,
      pourToucher,
      get position() {
        return { x: position.x, y: position.y };
      },
    };
  }

  /* ─── TEXTE QUI S'ÉCRIT ──────────────────────────────────────────────────
   *
   * Le flux de texte est la signature visuelle d'un modèle de langue : c'est le
   * seul geste de l'interface que personne d'autre ne fait. On l'écrit donc au
   * caractère, à une cadence lisible — trop vite, ça ressemble à un
   * copier-coller ; trop lent, on décroche.
   */

  async function ecrire(element, texte, msParCaractere) {
    if (mouvementReduit) {
      element.textContent = texte;
      return;
    }
    const cadence = msParCaractere === undefined ? 34 : msParCaractere;
    element.textContent = "";
    for (let i = 0; i < texte.length; i += 1) {
      element.textContent = texte.slice(0, i + 1);
      // Une virgule ou un point tient la respiration : la pause qui suit rend
      // la lecture humaine au lieu de mécanique.
      const c = texte[i];
      await attendre(c === "." || c === "," ? cadence * 6 : cadence);
    }
  }

  /* ─── BOUCLE ─────────────────────────────────────────────────────────────
   *
   * `runId` protège des relances concurrentes : sans lui, un clic ou un
   * rechargement lance une seconde chorégraphie par-dessus la première et les
   * deux se disputent les mêmes objets. C'est le défaut le plus difficile à
   * diagnostiquer d'une scène animée, parce qu'il ne se voit qu'une fois sur
   * dix et qu'il ressemble à un bug de rendu.
   */

  function jouer(options) {
    const { preparer, sequence, finFixe, boucle } = options;
    let course = 0;

    async function tour() {
      const id = ++course;
      preparer();

      if (mouvementReduit) {
        if (finFixe) finFixe();
        return;
      }

      await sequence(() => id !== course);
      if (id !== course) return;

      if (boucle !== false) {
        await attendre(options.pause === undefined ? 2000 : options.pause);
        if (id !== course) return;
        tour();
      }
    }

    return { tour, relancer: tour };
  }

  global.Scene = {
    mouvementReduit,
    attendre,
    tween,
    courbes,
    entre,
    el,
    place,
    opacite,
    Main,
    ecrire,
    jouer,
  };
})(window);
