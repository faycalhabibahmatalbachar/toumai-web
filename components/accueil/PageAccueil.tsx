"use client";

/**
 * PAGE D'ACCUEIL TOUMAÏ — portage fidèle de la maquette du 3 septembre 2026.
 *
 * CE QUI A ÉTÉ REPRIS TEL QUEL, ET CE QUI NE POUVAIT PAS L'ÊTRE
 * --------------------------------------------------------------
 * La structure, les textes, l'ordre des sections, les classes et la feuille de
 * style viennent de la maquette sans retouche : `app/toumai-accueil.css` est
 * la feuille d'origine, portée mécaniquement sous `.tmh` (voir
 * `outils/porter_css_accueil.py`). Les quatre démonstrations restent des
 * fichiers HTML autonomes, servis depuis `public/accueil-medias/animations/` et
 * affichés en `<iframe>` — exactement comme dans la maquette. Les toucher
 * pour les « intégrer » aurait été la seule façon sûre de casser leurs
 * animations.
 *
 * TROIS CHOSES ONT DÛ CHANGER, ET AUCUNE N'EST UN CHOIX DE DESIGN
 * ----------------------------------------------------------------
 * 1. **Les formulaires marchent.** Dans la maquette, ils faisaient
 *    `GET https://toumaiai.com?q=…` — c'est-à-dire qu'ils rechargeaient la
 *    page d'accueil elle-même. Ici, la question est déposée dans
 *    `sessionStorage` puis la conversation s'ouvre : c'est le mécanisme que
 *    `/chat` lit déjà (`toumai:question`). Un champ d'accueil qui ne fait que
 *    recharger la page est un décor, et un décor qui imite une commande est
 *    pire qu'un lien.
 * 2. **Les liens pointent vers de vraies pages.** « Connexion » va sur
 *    `/login`, « Essayer Toumaï » sur `/chat`, les mentions légales sur
 *    `/privacy` et `/terms`. Dans la maquette ils renvoyaient tous vers
 *    `https://toumaiai.com` ou `#top` — sur le site lui-même, ça donne un
 *    bouton qui ne fait rien.
 * 3. **Le portrait est servi en WebP** : 111 Ko au lieu de 2 097 Ko, pour
 *    la même image. Ce sont deux mégaoctets en moins sur une connexion
 *    tchadienne — le seul endroit où ce portage change ce que voit
 *    l'utilisateur, et il ne le voit pas : il l'attend moins longtemps.
 *
 * POURQUOI CETTE PAGE NE SUIT PAS LE THÈME SOMBRE
 * ------------------------------------------------
 * Elle est composée sur fond crème — c'est la maquette. `.tmh` porte ses
 * propres variables et `color-scheme: light`, donc les champs, les ascenseurs
 * et les menus natifs suivent. Le reste du site garde son thème.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import "@/app/toumai-accueil.css";

/** Où vit la question posée depuis l'accueil, lue ensuite par `/chat`. */
const CLE_QUESTION = "toumai:question";

/** Les trois raccourcis du hero. `prompt` remplit le champ, il ne l'envoie pas. */
const RACCOURCIS = [
  { icone: "✎", nom: "Écrire", prompt: "Rédige un document clair et professionnel." },
  { icone: "▤", nom: "Apprendre", prompt: "Explique-moi un sujet complexe simplement." },
  { icone: "◇", nom: "Créer", prompt: "Aide-moi à créer une nouvelle idée." },
];

/** Les quatre démonstrations, dans l'ordre de la maquette. */
const CAPACITES = [
  {
    sequence: "01",
    kicker: "Autocorrection visible",
    titre: "Une erreur devient une information utile.",
    texte:
      "Pour les trois premières pièces, Toumaï teste une empreinte, détecte l’incompatibilité puis recommence au bon endroit. Une fois la logique comprise, les pièces restantes sont placées directement.",
    points: [
      "Trois erreurs réellement testées",
      "Correction après chaque incompatibilité",
      "Apprentissage réutilisé pour la suite",
    ],
    fichier: "01-puzzle-autocorrectif.html",
    resume:
      "Une main teste trois pièces de puzzle, corrige ses erreurs puis place les suivantes directement",
    inverse: false,
    grande: false,
  },
  {
    sequence: "02",
    kicker: "Navigation adaptative",
    titre: "Changer de route sans perdre l’objectif.",
    texte:
      "Toumaï explore le parcours, reconnaît les impasses et réoriente son raisonnement jusqu’à construire un chemin fiable vers la sortie.",
    points: [
      "Détection des voies sans issue",
      "Nouvelle stratégie en temps réel",
      "Progression conservée malgré les détours",
    ],
    fichier: "02-labyrinthe-adaptatif.html",
    resume: "Toumaï explore un labyrinthe, détecte les impasses et adapte sa trajectoire",
    inverse: true,
    grande: false,
  },
  {
    sequence: "03",
    kicker: "Raisonnement concurrentiel",
    titre: "Chaque décision tient compte de l’adversaire.",
    texte:
      "Deux agents observent les coups, ferment les ouvertures dangereuses et construisent leur propre stratégie. L’un finit par gagner, sans que l’autre lui offre la victoire.",
    points: [
      "Analyse de la situation actuelle",
      "Blocage des risques immédiats",
      "Choix du meilleur coup disponible",
    ],
    fichier: "03-morpion-strategique.html",
    resume: "Deux mains jouent une partie stratégique de morpion",
    inverse: false,
    grande: false,
  },
  {
    sequence: "04",
    kicker: "Anticipation à grande échelle",
    titre: "Projeter plusieurs coups avant d’agir.",
    texte:
      "Sur un terrain plus vaste, chaque main répond à l’autre, protège ses lignes et prépare une combinaison gagnante. La scène agrandie rend chaque décision visible.",
    points: [
      "Lecture de plusieurs scénarios possibles",
      "Réponse directe aux menaces concurrentes",
      "Planification jusqu’au coup gagnant",
    ],
    fichier: "04-puissance-quatre.html",
    resume: "Deux mains s’affrontent intelligemment sur un grand plateau de Puissance 4",
    inverse: false,
    grande: true,
  },
];

const SOLUTIONS = [
  {
    index: "A",
    titre: "Comprendre et apprendre",
    texte:
      "Clarifier une idée, approfondir un sujet et transformer une question complexe en explication accessible.",
    action: "Commencer",
  },
  {
    index: "B",
    titre: "Écrire et structurer",
    texte:
      "Préparer des documents, résumer des informations et améliorer un texte sans perdre votre intention.",
    action: "Créer un document",
  },
  {
    index: "C",
    titre: "Planifier et agir",
    texte:
      "Découper un objectif en étapes, anticiper les blocages et garder une direction claire jusqu’au résultat.",
    action: "Préparer un plan",
  },
];

const LIENS_NAV = [
  { href: "#capacites", texte: "Découvrir Toumaï" },
  { href: "#plateforme", texte: "Plateforme" },
  { href: "#solutions", texte: "Solutions" },
  { href: "#tarifs", texte: "Tarifs" },
  { href: "#ressources", texte: "Ressources" },
];

/** Le zip livré par le lien « Télécharger le code » du bandeau et du pied. */
const ARCHIVE_SOURCE = "/accueil-medias/toumai-ai-homepage-source.zip";

export function PageAccueil() {
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [questionHero, setQuestionHero] = useState("");
  const [questionFinale, setQuestionFinale] = useState("");
  const champHero = useRef<HTMLInputElement>(null);

  /** Pose la question et part vers la conversation.
   *
   * `sessionStorage` plutôt qu'un paramètre d'adresse : une question peut
   * faire trois cents caractères et contenir des accents. Dans une URL, elle
   * se retrouverait dans l'historique du navigateur, dans les journaux du
   * serveur et dans le référent envoyé aux pages suivantes.
   */
  const poser = useCallback(
    (texte: string) => {
      const t = texte.trim();
      if (!t) {
        router.push("/chat");
        return;
      }
      try {
        window.sessionStorage.setItem(CLE_QUESTION, t);
      } catch {
        // Stockage refusé (navigation privée stricte) : on emmène quand même
        // vers la conversation, où la personne pourra retaper. Mieux vaut un
        // geste perdu qu'un bouton qui ne répond pas.
      }
      router.push("/chat");
    },
    [router],
  );

  // Le menu mobile se referme quand la fenêtre redevient large — sinon il
  // reste ouvert, invisible, et vole les clics de la navigation de bureau.
  useEffect(() => {
    const surRedimensionnement = () => {
      if (window.innerWidth > 1080) setMenuOuvert(false);
    };
    window.addEventListener("resize", surRedimensionnement);
    return () => window.removeEventListener("resize", surRedimensionnement);
  }, []);

  const remplir = (prompt: string) => {
    setQuestionHero(prompt);
    const champ = champHero.current;
    if (!champ) return;
    champ.focus();
    // Le curseur va à la fin : la personne complète la phrase au lieu de
    // devoir d'abord déplacer le curseur. C'est le comportement de la maquette.
    window.requestAnimationFrame(() => {
      champ.setSelectionRange(prompt.length, prompt.length);
    });
  };

  return (
    <div className="tmh">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      <header className="site-header" id="top">
        <div className="primary-nav shell">
          <a className="brand" href="#top" aria-label="Toumaï AI, accueil">
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            <span className="brand-name">Toumaï</span>
          </a>

          <nav className="desktop-nav" aria-label="Navigation principale">
            {LIENS_NAV.map((l) => (
              <a key={l.href} href={l.href}>
                {l.texte}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <Link className="text-link desktop-only" href="/login">
              Connexion
            </Link>
            <a className="button button-quiet desktop-only" href={ARCHIVE_SOURCE} download>
              Télécharger le code
            </a>
            <Link className="button button-dark" href="/chat">
              Essayer Toumaï
            </Link>
            <button
              className="menu-button"
              type="button"
              aria-expanded={menuOuvert}
              aria-controls="mobile-nav"
              onClick={() => setMenuOuvert((o) => !o)}
            >
              <span></span>
              <span></span>
              <span className="sr-only">
                {menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
              </span>
            </button>
          </div>
        </div>

        <nav
          className="mobile-nav"
          id="mobile-nav"
          aria-label="Navigation mobile"
          hidden={!menuOuvert}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setMenuOuvert(false);
          }}
        >
          {LIENS_NAV.map((l) => (
            <a key={l.href} href={l.href}>
              {l.texte}
            </a>
          ))}
          <a href="#entreprise">Nous contacter</a>
        </nav>

        <div className="product-bar">
          <div className="shell product-bar-inner">
            <span>Produit</span>
            <a href="#capacites">
              Explorer les capacités <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </header>

      <main id="contenu">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Intelligence adaptative</p>
            <h1 id="hero-title">
              Pensez plus loin.
              <br />
              Agissez avec justesse.
            </h1>
            <p className="hero-intro">
              Toumaï analyse les situations, anticipe les obstacles et améliore son
              raisonnement jusqu’à trouver une réponse solide.
            </p>

            <form
              className="prompt-box"
              onSubmit={(e) => {
                e.preventDefault();
                poser(questionHero);
              }}
            >
              <label className="sr-only" htmlFor="hero-prompt">
                Votre demande à Toumaï
              </label>
              <input
                id="hero-prompt"
                ref={champHero}
                name="q"
                type="text"
                placeholder="Comment Toumaï peut-il vous aider ?"
                autoComplete="off"
                value={questionHero}
                onChange={(e) => setQuestionHero(e.target.value)}
              />
              <button type="submit">
                Demander <span aria-hidden="true">↗</span>
              </button>
            </form>

            <div className="quick-actions" aria-label="Exemples d’utilisation">
              {RACCOURCIS.map((r) => (
                <button key={r.nom} type="button" onClick={() => remplir(r.prompt)}>
                  <span aria-hidden="true">{r.icone}</span> {r.nom}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-visual" aria-label="Portrait original de Toumaï en réflexion">
            <div className="hero-art">
              {/* LE PORTRAIT EST SERVI EN WEBP, ET LE PNG NE SUIT PAS.
                *
                * L'original pèse 2 097 Ko, le WebP 111 Ko — dix-neuf fois moins
                * pour la même image. Garder le PNG en repli coûterait deux
                * mégaoctets dans le dépôt et dans le déploiement au bénéfice
                * de navigateurs qui n'existent plus : WebP est servi partout
                * depuis 2020. Le PNG d'origine reste dans l'archive du code
                * source, à côté, pour qui veut la maquette d'origine. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/accueil-medias/toumai-thinking-face.webp"
                alt="Portrait illustré d’un jeune homme sahélien qui réfléchit, entouré de trois fragments représentant l’itération"
                width={1448}
                height={1086}
              />
              <span className="hero-art-note" aria-hidden="true">
                Observer · essayer · affiner
              </span>
            </div>

            <article className="update-card">
              <div className="update-copy">
                <span className="update-label">
                  <span aria-hidden="true">◉</span> À découvrir
                </span>
                <h2>Une IA qui affine son raisonnement</h2>
                <p>Toumaï ne s’arrête pas à sa première réponse.</p>
                <a href="#capacites">
                  Voir comment <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="update-tile" aria-hidden="true">
                <span className="tile-orbit"></span>
                <strong>T</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="principles" aria-label="Principes de Toumaï AI">
          <div className="shell principles-inner">
            <span>Réflexion</span>
            <span>Mémoire</span>
            <span>Anticipation</span>
            <span>Autocorrection</span>
            <span>Action</span>
          </div>
        </section>

        <section className="manifesto shell" id="plateforme">
          <p className="section-kicker">Un partenaire de raisonnement</p>
          <h2>
            Une intelligence utile ne donne pas seulement une réponse. Elle comprend le
            problème, mesure les possibilités et sait changer d’approche.
          </h2>
        </section>

        <section className="capability-list" id="capacites" aria-label="Capacités animées de Toumaï">
          {CAPACITES.map((c) => (
            <article
              key={c.sequence}
              className={[
                "capability",
                c.inverse ? "capability-reverse" : "",
                c.grande ? "capability-featured" : "",
                "shell",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="capability-copy">
                <span className="sequence">{c.sequence}</span>
                <p className="section-kicker">{c.kicker}</p>
                <h2>{c.titre}</h2>
                <p>{c.texte}</p>
                <ul className="feature-points">
                  {c.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div
                className={
                  c.grande ? "animation-shell animation-shell-large" : "animation-shell"
                }
              >
                <iframe
                  loading="lazy"
                  src={`/accueil-medias/animations/${c.fichier}`}
                  title={c.resume}
                />
              </div>
            </article>
          ))}
        </section>

        <section className="solutions-section" id="solutions">
          <div className="shell">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Dans votre quotidien</p>
                <h2>Un même niveau de réflexion, pour des besoins très différents.</h2>
              </div>
              <p>
                Toumaï vous accompagne du premier questionnement jusqu’au travail terminé,
                sans vous perdre dans une interface compliquée.
              </p>
            </div>

            <div className="solution-grid">
              {SOLUTIONS.map((s) => (
                <article key={s.index}>
                  <span className="solution-index">{s.index}</span>
                  <h3>{s.titre}</h3>
                  <p>{s.texte}</p>
                  <Link href="/chat">
                    {s.action} <span aria-hidden="true">↗</span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="enterprise shell" id="entreprise">
          <div className="enterprise-copy">
            <p className="section-kicker">Toumaï pour les organisations</p>
            <h2>Une intelligence conçue pour travailler avec votre équipe.</h2>
            <p>
              Déployez une expérience cohérente pour la rédaction, l’analyse, la recherche
              et l’organisation du travail.
            </p>
            <a className="button button-light" href="mailto:contact@toumaiai.com">
              Parler à notre équipe
            </a>
          </div>
          <div className="enterprise-principles" aria-label="Principes pour les organisations">
            <div>
              <span>01</span>
              <strong>Contrôle humain</strong>
              <p>Les décisions importantes restent sous votre supervision.</p>
            </div>
            <div>
              <span>02</span>
              <strong>Contexte utile</strong>
              <p>Toumaï suit le fil du travail au lieu de repartir de zéro.</p>
            </div>
            <div>
              <span>03</span>
              <strong>Expérience simple</strong>
              <p>Une interface claire pour avancer sans friction.</p>
            </div>
          </div>
        </section>

        <section className="pricing shell" id="tarifs">
          <div className="section-heading pricing-heading">
            <div>
              <p className="section-kicker">Des offres lisibles</p>
              <h2>Commencez simplement. Évoluez lorsque vous en avez besoin.</h2>
            </div>
            <p>
              Une base accessible pour découvrir Toumaï, puis davantage de capacité pour un
              usage régulier ou collectif.
            </p>
          </div>

          <div className="pricing-grid">
            <article className="price-card">
              <p className="plan">Découverte</p>
              <h3>Gratuit</h3>
              <p>Pour découvrir Toumaï et réaliser vos premières tâches.</p>
              <ul>
                <li>Conversations essentielles</li>
                <li>Aide à la rédaction</li>
                <li>Explications et résumés</li>
              </ul>
              <Link className="button button-quiet button-full" href="/register">
                Commencer
              </Link>
            </article>
            <article className="price-card price-card-featured">
              <p className="plan">Professionnel</p>
              <h3>Plus de capacité</h3>
              <p>Pour un travail quotidien plus long, plus avancé et plus fluide.</p>
              <ul>
                <li>Usage étendu</li>
                <li>Raisonnement approfondi</li>
                <li>Création et analyse avancées</li>
              </ul>
              <Link className="button button-dark button-full" href="/chat">
                Essayer Toumaï
              </Link>
            </article>
            <article className="price-card">
              <p className="plan">Organisation</p>
              <h3>Sur mesure</h3>
              <p>Pour connecter Toumaï aux besoins et aux processus de votre équipe.</p>
              <ul>
                <li>Accompagnement dédié</li>
                <li>Déploiement adapté</li>
                <li>Support pour les équipes</li>
              </ul>
              <a className="button button-quiet button-full" href="mailto:contact@toumaiai.com">
                Nous contacter
              </a>
            </article>
          </div>
        </section>

        <section className="resources shell" id="ressources">
          <div>
            <p className="section-kicker">Ressources</p>
            <h2>Découvrez ce que Toumaï peut accomplir avec vous.</h2>
          </div>
          <div className="resource-links">
            <a href="#capacites">
              <span>Voir les capacités</span>
              <strong>→</strong>
            </a>
            <a href="#solutions">
              <span>Explorer les solutions</span>
              <strong>→</strong>
            </a>
            <a href={ARCHIVE_SOURCE} download>
              <span>Télécharger tout le code source</span>
              <strong>↓</strong>
            </a>
            <a href="https://github.com/Toumai-AI" target="_blank" rel="noopener noreferrer">
              <span>Suivre le projet ouvert</span>
              <strong>→</strong>
            </a>
          </div>
        </section>

        <section className="final-cta">
          <div className="shell final-cta-inner">
            <p className="section-kicker">Votre prochaine idée peut commencer ici</p>
            <h2>
              Travaillez avec une intelligence qui sait réfléchir, s’adapter et progresser.
            </h2>
            <form
              className="final-prompt"
              onSubmit={(e) => {
                e.preventDefault();
                poser(questionFinale);
              }}
            >
              <label className="sr-only" htmlFor="final-prompt">
                Demander à Toumaï
              </label>
              <input
                id="final-prompt"
                name="q"
                type="text"
                placeholder="Écrivez votre première demande…"
                value={questionFinale}
                onChange={(e) => setQuestionFinale(e.target.value)}
              />
              <button type="submit" aria-label="Envoyer à Toumaï">
                ↗
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell footer-top">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              T
            </span>
            <span className="brand-name">Toumaï</span>
          </a>
          <p>Une intelligence créée au Tchad, pensée pour le monde.</p>
        </div>
        <div className="shell footer-links">
          <div>
            <strong>Produit</strong>
            <a href="#capacites">Capacités</a>
            <a href="#tarifs">Tarifs</a>
            <Link href="/chat">Essayer Toumaï</Link>
          </div>
          <div>
            <strong>Solutions</strong>
            <a href="#solutions">Particuliers</a>
            <a href="#entreprise">Organisations</a>
            <a href="#ressources">Ressources</a>
          </div>
          <div>
            <strong>Entreprise</strong>
            <a href="https://github.com/Toumai-AI" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href={ARCHIVE_SOURCE} download>
              Code source
            </a>
            <a href="mailto:contact@toumaiai.com">Contact</a>
          </div>
          <div>
            <strong>Informations</strong>
            <Link href="/privacy">Confidentialité</Link>
            <Link href="/terms">Conditions</Link>
            <Link href="/privacy">Sécurité</Link>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© {new Date().getFullYear()} Toumaï AI</span>
          <span>N’Djamena · Tchad</span>
        </div>
      </footer>
    </div>
  );
}
