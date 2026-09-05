/**
 * TOUMAÏ — AGENT DE SERVICE
 * =========================
 *
 * CE QU'IL RÉSOUT, ET COMMENT ON L'A SU
 * --------------------------------------
 * Le 4 septembre 2026, réseau coupé, la page d'accueil s'ouvrait encore mais
 * une seule animation s'affichait : les quatre autres étaient des rectangles
 * vides. Rien d'anormal — sans agent de service, ce qui reste hors ligne est
 * ce que le cache HTTP du navigateur a bien voulu garder, c'est-à-dire ce qui
 * venait d'être visité. Le reste n'existe plus.
 *
 * Deux réponses, et il faut les deux :
 *   1. Une AFFICHE en fond de chaque cadre (`outils/fabriquer_affiches.py`) :
 *      même si rien n'arrive, on voit la scène à son dernier instant plutôt
 *      qu'un trou. C'est le filet, il ne dépend d'aucun script.
 *   2. Cet agent, qui met les scènes, le socle, les polices et les affiches
 *      dans un cache PERSISTANT dès la première visite. Au deuxième
 *      chargement, la page entière fonctionne sans réseau, animations
 *      comprises.
 *
 * CE QU'IL NE FAIT PAS, ET POURQUOI
 * ----------------------------------
 * Il ne met JAMAIS en cache les appels à `api.toumaiai.com`. Une réponse
 * d'API porte l'état d'un compte : la resservir depuis un cache, c'est
 * afficher à quelqu'un le solde, les conversations ou les droits d'un autre
 * moment — ou d'un autre compte, sur un poste partagé. Les conversations hors
 * ligne, si on les veut un jour, se font avec un magasin applicatif
 * (IndexedDB) que le code de l'application contrôle, pas avec un cache HTTP
 * qui ne sait rien de qui est connecté.
 *
 * LES QUATRE STRATÉGIES
 * ----------------------
 * | Ce qui est demandé                | Stratégie                  | Pourquoi |
 * |-----------------------------------|----------------------------|----------|
 * | Une page (navigation)             | réseau d'abord, cache sinon| Le contenu doit être frais ; hors ligne, la dernière version vaut mieux qu'une erreur |
 * | `/_next/static/**`, polices       | cache d'abord              | Le nom porte une empreinte : le contenu ne change jamais sous un même nom |
 * | Scènes, affiches, images          | cache d'abord, revalidé    | Servi tout de suite, rafraîchi en arrière-plan pour la prochaine fois |
 * | `api.` et tout autre domaine      | réseau seul                | Jamais de données de compte dans un cache partagé |
 *
 * LE NUMÉRO DE VERSION
 * ---------------------
 * `VERSION` est le SEUL levier : l'incrémenter crée un cache neuf et efface
 * les anciens à l'activation. Un agent de service qui ne sait pas se retirer
 * est la façon la plus sûre de servir un site périmé pendant des semaines —
 * d'où aussi `/sw-kill` plus bas, qui le désinstalle proprement.
 */

// v2 (4 septembre 2026) : la lampe quitte la page, le Puissance 4 la
// remplace. Le socle a change, donc le numero change — sinon les visiteurs
// deja venus garderaient un cache qui precharge une scene disparue et
// ignore la nouvelle.
// v3 (5 septembre 2026) : purge obligatoire. La strategie « cache d abord,
// revalide ensuite » sur /accueil-medias/ a servi une ancienne animation
// pendant une visite entiere apres son remplacement. Les fichiers qu on
// remplace portent desormais leur version dans leur NOM ; ce numero-ci
// efface ce que l ancienne strategie avait deja garde.
const VERSION = "toumai-v3";
const CACHE = `${VERSION}`;

/**
 * Ce qui est mis en cache dès l'installation, sans attendre qu'on le demande.
 * Volontairement court : la coquille, et tout ce dont les animations ont
 * besoin. Les fichiers de Next portent une empreinte dans leur nom, donc on
 * ne peut pas les lister ici — ils entrent au premier chargement, par la
 * stratégie « cache d'abord ».
 */
const SOCLE = [
  "/",
  "/logo.png",
  "/accueil-medias/toumai-thinking-face.webp",
  "/accueil-medias/animations/commun/scene.js",
  "/accueil-medias/animations/commun/scene.css",
  "/accueil-medias/animations/commun/mains/main-1.webp",
  "/accueil-medias/animations/commun/polices/caveat-500.woff2",
  "/accueil-medias/animations/scenes/05-puissance-quatre.html",
  "/accueil-medias/animations/scenes/01-puzzle-autocorrectif.html",
  "/accueil-medias/animations/scenes/02-labyrinthe-adaptatif.html",
  "/accueil-medias/animations/scenes/03-morpion-strategique.html",
  "/accueil-medias/animations/scenes/06-boite-mail.html",
  "/accueil-medias/animations/commun/affiches/05-puissance-quatre.webp",
  "/accueil-medias/animations/commun/affiches/01-puzzle-autocorrectif.webp",
  "/accueil-medias/animations/commun/affiches/02-labyrinthe-adaptatif.webp",
  "/accueil-medias/animations/commun/affiches/03-morpion-strategique.webp",
  "/accueil-medias/animations/commun/affiches/06-boite-mail.webp",
];

/** Ce qui ne doit jamais entrer dans un cache partagé. */
function estPrive(url) {
  return (
    url.hostname.startsWith("api.") ||
    url.hostname.startsWith("wa.") ||
    url.pathname.startsWith("/api/")
  );
}

function estImmuable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(woff2?|ttf|otf)$/.test(url.pathname)
  );
}

function estRessourceDeScene(url) {
  return url.pathname.startsWith("/accueil-medias/");
}

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // `Promise.allSettled` et non `cache.addAll` : `addAll` est
      // tout-ou-rien, donc un seul fichier renommé fait échouer l'installation
      // entière et laisse les visiteurs sans aucun cache. Ici, ce qui manque
      // manque, et le reste est en place.
      const resultats = await Promise.allSettled(
        SOCLE.map(async (chemin) => {
          const reponse = await fetch(chemin, { cache: "reload" });
          if (!reponse.ok) throw new Error(`${chemin} → ${reponse.status}`);
          return cache.put(chemin, reponse);
        }),
      );
      const manques = resultats.filter((r) => r.status === "rejected");
      if (manques.length) {
        console.warn(
          `[sw] ${manques.length}/${SOCLE.length} entrées du socle absentes`,
          manques.map((m) => String(m.reason)),
        );
      }
      // On prend la main tout de suite : la version précédente n'a pas de
      // travail en cours à protéger, c'est un site, pas un éditeur.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    (async () => {
      const noms = await caches.keys();
      await Promise.all(
        noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
      );
      // Les onglets déjà ouverts passent sous le nouvel agent sans être
      // rechargés à la main.
      await self.clients.claim();
    })(),
  );
});

/** Met en cache une copie sans bloquer la réponse rendue à la page. */
function memoriser(requete, reponse) {
  if (!reponse || !reponse.ok || reponse.type === "opaque") return;
  const copie = reponse.clone();
  caches.open(CACHE).then((cache) => cache.put(requete, copie)).catch(() => {});
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);

  // Domaines tiers et API : on ne s'en mêle pas du tout. Ne pas répondre
  // laisse le navigateur faire exactement ce qu'il ferait sans agent.
  if (url.origin !== self.location.origin || estPrive(url)) return;

  // 1. Les pages. Réseau d'abord — le contenu doit être frais quand le réseau
  //    est là. Hors ligne, la dernière version connue, et à défaut l'accueil,
  //    qui est toujours dans le socle.
  if (requete.mode === "navigate") {
    evenement.respondWith(
      (async () => {
        try {
          const reponse = await fetch(requete);
          memoriser(requete, reponse);
          return reponse;
        } catch {
          return (
            (await caches.match(requete)) ||
            (await caches.match("/")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  // 2. Ce dont le nom porte une empreinte : cache d'abord, sans revalidation.
  //    Le contenu ne peut pas changer sous ce nom-là.
  if (estImmuable(url)) {
    evenement.respondWith(
      (async () => {
        const enCache = await caches.match(requete);
        if (enCache) return enCache;
        const reponse = await fetch(requete);
        memoriser(requete, reponse);
        return reponse;
      })(),
    );
    return;
  }

  // 3. Les scènes, les affiches, les images : servies depuis le cache tout de
  //    suite, et rafraîchies en arrière-plan pour la visite suivante. C'est ce
  //    qui fait qu'une animation démarre à la milliseconde où elle entre dans
  //    la vue, même sur une connexion tchadienne.
  if (estRessourceDeScene(url)) {
    evenement.respondWith(
      (async () => {
        const enCache = await caches.match(requete);
        const reseau = fetch(requete)
          .then((reponse) => {
            memoriser(requete, reponse);
            return reponse;
          })
          .catch(() => null);
        return enCache || (await reseau) || Response.error();
      })(),
    );
    return;
  }

  // 4. Le reste du même domaine : réseau d'abord, cache en secours.
  evenement.respondWith(
    (async () => {
      try {
        const reponse = await fetch(requete);
        memoriser(requete, reponse);
        return reponse;
      } catch {
        return (await caches.match(requete)) || Response.error();
      }
    })(),
  );
});

/**
 * La porte de sortie. `postMessage({ type: "desinstaller" })` depuis la page
 * efface tout et retire l'agent. Un agent de service sans bouton d'arrêt est
 * un site qu'on ne peut plus corriger chez les gens qui l'ont visité.
 */
self.addEventListener("message", (evenement) => {
  if (evenement.data && evenement.data.type === "desinstaller") {
    evenement.waitUntil(
      (async () => {
        const noms = await caches.keys();
        await Promise.all(noms.map((n) => caches.delete(n)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll();
        clients.forEach((c) => c.navigate(c.url));
      })(),
    );
  }
});
