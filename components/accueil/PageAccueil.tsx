"use client";

/**
 * PAGE D'ACCUEIL TOUMAÏ — portage fidèle de la maquette du 3 septembre 2026.
 *
 * CE QUI A ÉTÉ REPRIS TEL QUEL, ET CE QUI NE POUVAIT PAS L'ÊTRE
 * --------------------------------------------------------------
 * La structure, les textes, l'ordre des sections, les classes et la feuille de
 * style viennent de la maquette sans retouche : `app/toumai-accueil.css` est
 * la feuille d'origine, portée mécaniquement sous `.tmh` (voir
 * `outils/porter_css_accueil.py`). Les démonstrations animées restent des
 * fichiers HTML autonomes, servis depuis `public/accueil-medias/animations/` et
 * affichés en `<iframe>` — exactement comme dans la maquette. Les toucher
 * pour les « intégrer » aurait été la seule façon sûre de casser leurs
 * animations. Voir `CadreAnime` pour la seule chose qui les entoure : le
 * moment où on les démarre.
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

import { API_BASE } from "@/lib/config";
import { Logo } from "@/components/Logo";
import { CONTACTS, RESEAUX } from "@/components/ReseauxSociaux";
import { useAuth } from "@/lib/auth-context";

import "@/app/toumai-accueil.css";

/** Où vit la question posée depuis l'accueil, lue ensuite par `/chat`. */
const CLE_QUESTION = "toumai:question";

/** Les trois raccourcis du hero. `prompt` remplit le champ, il ne l'envoie pas. */
const RACCOURCIS = [
  { icone: "✎", nom: "Écrire", prompt: "Rédige un document clair et professionnel." },
  { icone: "▤", nom: "Apprendre", prompt: "Explique-moi un sujet complexe simplement." },
  { icone: "◇", nom: "Créer", prompt: "Aide-moi à créer une nouvelle idée." },
];

/** Les démonstrations, dans l'ordre où elles se lisent.
 *
 * L'ORDRE N'EST PAS CELUI DE LEUR ÉCRITURE, ET IL COMPTE.
 *
 * Le morpion ouvre : c'est la scène la plus lisible en deux secondes — deux
 * mains, une grille, un gagnant. Une section de démonstrations qui commence
 * par sa scène la plus subtile perd les gens avant la deuxième.
 *
 * Puis l'autocorrection, puis le labyrinthe, puis le Puissance 4 : la
 * difficulté du raisonnement montre, plateau après plateau.
 *
 * La boîte mail ferme, en grand format. C'est la seule qui ne montre pas un
 * jeu mais un TRAVAIL — lire un courrier, écrire la réponse, demander
 * l'accord. Une section qui se termine sur un jeu se termine sur « ça
 * réfléchit » ; celle-ci se termine sur « ça travaille, et ça demande ».
 *
 * La scène de la lampe est sortie de la page le 4 septembre 2026 : elle
 * disait la même chose que le Puissance 4 — il réfléchit avant d'agir — en
 * moins démonstratif. Son fichier reste dans l'historique du dépôt.
 */
const CAPACITES = [
  {
    sequence: "01",
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
    sequence: "02",
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
    inverse: true,
    grande: false,
  },
  {
    sequence: "03",
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
    inverse: false,
    grande: false,
  },
  {
    sequence: "04",
    kicker: "Anticipation à grande échelle",
    titre: "Projeter plusieurs coups avant d’agir.",
    texte:
      "Sur un terrain plus vaste, chaque main répond à l’autre, protège ses lignes et prépare une combinaison gagnante. Chaque décision se lit sur le plateau.",
    points: [
      "Lecture de plusieurs scénarios possibles",
      "Réponse directe aux menaces concurrentes",
      "Planification jusqu’au coup gagnant",
    ],
    fichier: "05-puissance-quatre.html",
    resume: "Deux mains s’affrontent intelligemment sur un grand plateau de Puissance 4",
    inverse: true,
    grande: false,
  },
  {
    sequence: "05",
    kicker: "Travail réel, accord demandé",
    titre: "Il prépare tout. Vous décidez d’envoyer.",
    texte:
      "Un rendez-vous à décaler, une facture, un devis : Toumaï ouvre le courrier, comprend la demande et écrit la réponse. Puis il s’arrête et demande. Rien ne part avant que vous ayez appuyé sur Envoyer.",
    points: [
      "Trois courriers lus, compris et répondus",
      "Une confirmation obligatoire avant chaque envoi",
      "Le même garde-fou sur le mail, WhatsApp et l’agenda",
    ],
    fichier: "06-boite-mail.html",
    resume:
      "Une main vide une boîte de courrier : pour chacune des trois lettres, elle lit la question, écrit la réponse à la main, puis appuie sur « Envoyer » et un avion de papier s’envole",
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
  { href: "#fondateur", texte: "Fondateur" },
];


/** LES PLANS.
 *
 * Ce tableau est un REPLI, pas la source de vérité : la vraie grille vit dans
 * la table `plans` du serveur, et `SectionTarifs` la recharge à l'ouverture de
 * la page. Deux raisons de garder une copie ici :
 *
 * 1. La page est un export statique. Sans repli, la grille tarifaire serait
 *    vide le temps de l'aller-retour — et vide pour de bon si l'API ne répond
 *    pas. C'est exactement le défaut des cadres d'animation vides qu'on vient
 *    de supprimer avec les affiches ; la réponse est la même.
 * 2. Les prix affichés doivent être ceux du serveur. Si les deux divergent,
 *    c'est le serveur qui gagne, et la divergence se voit à l'écran.
 *
 * Les lignes de capacité sont écrites en clair plutôt que dérivées du jsonb
 * `limites` : « 200 messages par jour » se lit, « messages.jour = 200 » non.
 */
type Plan = {
  code: string;
  nom: string;
  prix_xaf: number;
  periode: string;
  accroche: string;
  capacites: string[];
  action: { texte: string; href: string; externe?: boolean };
  /** Le ton de la carte. Quatre teintes prises dans la palette de la page,
   *  du plus sobre au plus soutenu : l'oeil doit lire la montée en gamme
   *  avant même de lire les prix. */
  ton: "sable" | "ambre" | "terracotta" | "encre";
  /** Le plan que tout le monde a déjà. Son bouton ne s'enfonce pas : il
   *  n'y a rien à souscrire, et un bouton qui ne mène nulle part est une
   *  promesse en l'air. */
  actuel?: boolean;
  mis_en_avant?: boolean;
};

const PLANS_DE_REPLI: Plan[] = [
  {
    code: "gratuit",
    nom: "Découverte",
    prix_xaf: 0,
    periode: "aucune",
    accroche: "Pour essayer Toumaï et faire vos premières tâches.",
    capacites: [
      "20 messages par jour",
      "5 images par mois",
      "3 documents analysés par mois",
      "1 connecteur",
      "50 Mo de fichiers",
    ],
    action: { texte: "Votre plan actuel", href: "/register" },
    ton: "sable",
    actuel: true,
  },
  {
    code: "essentiel",
    nom: "Essentiel",
    prix_xaf: 3000,
    periode: "mois",
    accroche: "Pour un usage quotidien, avec la voix et les connecteurs.",
    capacites: [
      "200 messages par jour",
      "60 images et 40 documents par mois",
      "30 min de voix par mois",
      "5 connecteurs, 5 automatisations",
      "500 messages WhatsApp par mois",
      "1 Go de fichiers",
    ],
    action: { texte: "Passer à Essentiel", href: "/register?plan=essentiel" },
    ton: "ambre",
  },
  {
    code: "pro",
    nom: "Toumaï 5",
    prix_xaf: 9000,
    periode: "mois",
    accroche: "Messages illimités, l’agent navigateur, tout le raisonnement.",
    capacites: [
      "Messages et documents illimités",
      "300 images par mois",
      "2 h 30 de voix par mois",
      "200 tâches de l’agent navigateur",
      "Connecteurs illimités, 30 automatisations",
      "10 Go de fichiers",
    ],
    action: { texte: "Passer à Toumaï 5", href: "/register?plan=pro" },
    ton: "terracotta",
    mis_en_avant: true,
  },
  {
    code: "entreprise",
    nom: "Entreprise",
    prix_xaf: 0,
    periode: "mois",
    accroche: "Pour une équipe, une école, une administration.",
    capacites: [
      "Tout illimité",
      "Comptes et rôles gérés",
      "Facturation sur devis",
      "Accompagnement au déploiement",
    ],
    action: {
      texte: "Demander un devis",
      href: "mailto:contact@toumaiai.com?subject=Toumai%20AI%20:%20offre%20Entreprise",
      externe: true,
    },
    ton: "encre",
  },
];

/** 9000 → « 9 000 ». L'espace est insécable : un prix coupé en fin de ligne
 *  se lit comme deux nombres. */
function enFrancs(montant: number): string {
  return montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}
const COLONNES_PIED = [
  {
    titre: "Produit",
    liens: [
      { texte: "Chat", href: "/chat" },
      { texte: "Capacités", href: "#capacites" },
      { texte: "Bibliothèque", href: "/library" },
      { texte: "Agent Navigateur", href: "/agent" },
      { texte: "Tableau de bord WhatsApp", href: "/whatsapp" },
    ],
  },
  {
    titre: "Modèles",
    liens: [
      { texte: "Sao 4 & Toumaï 5", href: "/models" },
      { texte: "L’IA au Tchad", href: "/intelligence-artificielle-tchad" },
      { texte: "النسخة العربية", href: "/ar" },
      { texte: "GitHub", href: "https://github.com/Toumai-AI" },
    ],
  },
  {
    titre: "Connecteurs",
    liens: [
      { texte: "Gérer mes connecteurs", href: "/settings?tab=connectors" },
      { texte: "Paramètres", href: "/settings" },
    ],
  },
  {
    titre: "Compte & légal",
    liens: [
      { texte: "Créer un compte", href: "/register" },
      { texte: "Se connecter", href: "/login" },
      { texte: "Conditions & politiques", href: "/terms" },
      { texte: "Politique de confidentialité", href: "/privacy" },
      { texte: "Choix de confidentialité", href: "/privacy-choices" },
      { texte: "Supprimer mon compte", href: "/delete-account" },
    ],
  },
];

/** Racine des démonstrations, servies comme fichiers HTML autonomes.
 *
 * Le dossier `scenes/` a un voisin `commun/` : le socle, la feuille de style
 * et la main y sont chargés UNE fois pour toutes les scènes. Avant ce
 * partage, la même main était recopiée en base64 dans chaque fichier —
 * 1 090 Ko envoyés pour deux images. Les scènes sont produites depuis
 * `animations/` par `outils/publier_animations.py`, qui refuse de publier
 * une scène au-dessus de 80 Ko. */
const DOSSIER_ANIMATIONS = "/accueil-medias/animations/scenes";

/** Au-delà de ce temps hors écran, on relance la démonstration à l'entrée. */
const ABSENCE_AVANT_RELANCE_MS = 20_000;

/**
 * LA GRILLE TARIFAIRE.
 *
 * Elle s'affiche immédiatement avec les plans de repli, puis se corrige avec
 * ceux du serveur dès qu'ils arrivent. Si l'API ne répond pas, la grille reste
 * celle du repli — jamais un trou.
 *
 * Le libellé du bouton dit ce qui MARCHE AUJOURD'HUI, et rien d'autre. Tant
 * que le paiement par carte n'est pas branché, il propose de créer un compte,
 * pas de payer : un bouton « Payer » qui mène à une erreur coûte plus cher
 * qu'un bouton absent. `GET /paiements/etat` donne cette information, et c'est
 * le serveur qui la donne — pas une constante qu'on oubliera de changer.
 */
/**
 * TROIS FAÇONS D'ÉCRIRE, ET LES TROIS MARCHENT.
 *
 * WhatsApp et l'adresse électronique sont des liens directs. Le formulaire
 * poste vers `POST /api/v1/contact`, qui envoie le message par Resend.
 *
 * LA PREMIÈRE VERSION OUVRAIT LE LOGICIEL DE COURRIER, et c'était une erreur.
 * Sur un téléphone Android sans compte de messagerie configuré, il ne se
 * passait rien du tout : le visiteur croyait le bouton cassé. Sur un poste où
 * Gmail vit dans un onglet, il fallait se reconnecter. Personne n'écrit dans
 * ces conditions.
 *
 * Le champ `site_web` est un piège à robots. Il est caché à l'écran et au
 * lecteur d'écran, et laissé vide par un humain. Le serveur répond 200 sans
 * rien envoyer quand il est rempli : un robot qui reçoit une erreur réessaie,
 * un robot qui reçoit un succès passe à autre chose.
 */
function ContactFondateur() {
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [piege, setPiege] = useState("");
  const [envoi, setEnvoi] = useState<"repos" | "en_cours" | "envoye" | "echec">("repos");
  const [erreur, setErreur] = useState("");

  const envoyer = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (envoi === "en_cours") return;
      setEnvoi("en_cours");
      setErreur("");
      try {
        const reponse = await fetch(`${API_BASE}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom,
            message,
            email: email || null,
            site_web: piege || null,
          }),
        });
        if (reponse.ok) {
          setEnvoi("envoye");
          setNom("");
          setEmail("");
          setMessage("");
          return;
        }
        const charge = await reponse.json().catch(() => null);
        setErreur(
          charge?.message ||
            charge?.detail ||
            "Le message n’est pas parti. Écrivez à contact@toumaiai.com.",
        );
        setEnvoi("echec");
      } catch {
        setErreur(
          "Pas de réseau. Réessayez, ou écrivez à contact@toumaiai.com.",
        );
        setEnvoi("echec");
      }
    },
    [nom, email, message, piege, envoi],
  );

  return (
    <div className="fondateur-contact">
      <div className="fondateur-contact-choix">
        <a
          className="button button-dark"
          href="https://wa.me/23591912191"
          target="_blank"
          rel="noopener noreferrer"
        >
          Écrire sur WhatsApp
        </a>
        <a className="button button-quiet" href="mailto:contact@toumaiai.com">
          contact@toumaiai.com
        </a>
        <button
          className="fondateur-bascule"
          type="button"
          aria-expanded={ouvert}
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? "Fermer le formulaire" : "Ou remplir un formulaire"}
        </button>
      </div>

      {ouvert && (
        <form className="fondateur-formulaire" onSubmit={envoyer}>
          <label>
            <span>Votre nom</span>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom et prénom"
              minLength={2}
              required
            />
          </label>
          <label>
            <span>Votre adresse</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </label>
          <label>
            <span>Votre message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Dites-moi ce que vous cherchez à faire."
              minLength={5}
              required
            />
          </label>

          {/* Le piège. `aria-hidden` et `tabIndex` le retirent aussi du
              clavier et des lecteurs d'écran : un champ caché qu'une personne
              aveugle peut remplir par erreur ferait rejeter son message. */}
          <div className="fondateur-piege" aria-hidden="true">
            <label>
              Ne remplissez pas ce champ
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={piege}
                onChange={(e) => setPiege(e.target.value)}
              />
            </label>
          </div>

          <button className="button button-dark" type="submit" disabled={envoi === "en_cours"}>
            {envoi === "en_cours" ? "Envoi…" : "Envoyer"}
          </button>

          {envoi === "envoye" && (
            <p className="fondateur-note fondateur-note-ok" role="status">
              Message reçu. Je vous réponds sous 24 heures.
            </p>
          )}
          {envoi === "echec" && (
            <p className="fondateur-note fondateur-note-erreur" role="alert">
              {erreur}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function SectionTarifs() {
  const [plans, setPlans] = useState<Plan[]>(PLANS_DE_REPLI);
  const [paiementOuvert, setPaiementOuvert] = useState(false);

  useEffect(() => {
    let vivant = true;

    (async () => {
      try {
        const reponse = await fetch(`${API_BASE}/abonnements/plans`);
        if (!reponse.ok) return;
        const charge = await reponse.json();
        const distants: { code: string; nom: string; prix_xaf: number; periode: string }[] =
          charge?.data?.plans ?? [];
        if (!vivant || distants.length === 0) return;

        // On ne remplace QUE ce que le serveur fait autorité : le nom, le prix
        // et la période. Les lignes de capacité restent celles écrites ici,
        // parce qu'elles sont rédigées pour être lues.
        setPlans((actuels) =>
          actuels.map((local) => {
            const distant = distants.find((d) => d.code === local.code);
            return distant
              ? { ...local, nom: distant.nom, prix_xaf: distant.prix_xaf,
                  periode: distant.periode }
              : local;
          }),
        );
      } catch {
        // Hors ligne ou API muette : la grille de repli reste affichée. C'est
        // le comportement voulu, il n'y a rien à signaler.
      }
    })();

    (async () => {
      try {
        const reponse = await fetch(`${API_BASE}/paiements/etat`);
        if (!reponse.ok) return;
        const charge = await reponse.json();
        if (vivant) setPaiementOuvert(Boolean(charge?.data?.moneroo?.configure));
      } catch {
        /* le bouton reste « Créer un compte », qui marche toujours */
      }
    })();

    return () => {
      vivant = false;
    };
  }, []);

  return (
    <section className="pricing shell" id="tarifs">
      <div className="section-heading pricing-heading">
        <div>
          <p className="section-kicker">Des offres lisibles</p>
          <h2>Commencez gratuitement. Payez quand vous en avez besoin.</h2>
        </div>
        <p>
          Les prix sont en francs CFA, sans engagement. Vous changez de plan ou
          vous arrêtez quand vous voulez.
        </p>
      </div>

      <div className="pricing-grid pricing-grid-quatre">
        {plans.map((plan) => (
          <article
            key={plan.code}
            className={[
              "price-card",
              `price-card-${plan.ton}`,
              plan.mis_en_avant ? "price-card-featured" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <p className="plan">{plan.nom}</p>

            <p className="price-montant">
              {plan.code === "entreprise" ? (
                <span className="price-mot">Sur devis</span>
              ) : plan.prix_xaf === 0 ? (
                <span className="price-mot">Gratuit</span>
              ) : (
                <>
                  <span className="price-chiffre">{enFrancs(plan.prix_xaf)}</span>
                  <span className="price-unite">FCFA par mois</span>
                </>
              )}
            </p>

            <p className="price-accroche">{plan.accroche}</p>

            <ul>
              {plan.capacites.map((ligne) => (
                <li key={ligne}>{ligne}</li>
              ))}
            </ul>

            {plan.actuel ? (
              <span className="button button-full price-action price-action-inerte"
                    aria-disabled="true">
                {plan.action.texte}
              </span>
            ) : plan.action.externe ? (
              <a className="button button-full price-action" href={plan.action.href}>
                {plan.action.texte}
              </a>
            ) : (
              // Le libellé ne dépend plus de l'état du paiement. Le lien mène à
              // la création de compte avec le plan retenu, ce qui est la
              // première étape réelle, que la carte soit branchée ou non. La
              // ligne sous la grille dit où en est l'encaissement.
              <Link className="button button-full price-action" href={plan.action.href}>
                {plan.action.texte}
              </Link>
            )}
          </article>
        ))}
      </div>

      <p className="pricing-note">
        {paiementOuvert
          ? "Paiement par carte bancaire (Visa, Mastercard). Airtel Money et Moov Money arrivent."
          : "Le paiement en ligne ouvre bientôt. Créez votre compte : vous garderez vos conversations."}
      </p>
    </section>
  );
}

function CadreAnime({ fichier, resume }: { fichier: string; resume: string }) {
  const cadre = useRef<HTMLIFrameElement>(null);

  /**
   * L'ANIMATION NE DÉMARRE QUE QUAND ELLE EST REGARDÉE.
   *
   * CE QUI NE MARCHAIT PAS, ET POURQUOI ON NE LE VOIT PAS EN LA TESTANT SEULE
   * -------------------------------------------------------------------------
   * Ces démonstrations sont pilotées par `requestAnimationFrame`. Or un
   * navigateur n'accorde aucune image à un cadre hors écran : le rAF n'y bat
   * pas. Avec `loading="lazy"`, le cadre se chargeait jusqu'à 1 250 px avant
   * d'entrer dans la vue — donc la scène démarrait sans jamais être peinte,
   * pendant que ses `setTimeout` continuaient d'avancer. Quand la personne
   * arrivait enfin dessus, elle tombait au milieu d'une pause de deux
   * secondes, ou sur un état intermédiaire figé.
   *
   * Ouverte seule dans un onglet, la même page tourne parfaitement — c'est ce
   * qui rend le défaut si difficile à croire, et pourquoi il valait mieux le
   * supprimer que le discuter.
   *
   * Le `src` n'est donc posé qu'à l'entrée dans la vue. La scène commence à
   * sa première image, sous les yeux de quelqu'un.
   *
   * ET ELLE REPART SI L'ON REVIENT PLUS TARD. Après vingt secondes passées
   * hors écran, on recharge : une personne qui remonte la page retrouve la
   * démonstration au début plutôt qu'à un endroit quelconque de sa boucle.
   * Le seuil existe pour qu'un simple frémissement de défilement ne relance
   * rien.
   */
  useEffect(() => {
    const element = cadre.current;
    if (!element) return;

    const source = `${DOSSIER_ANIMATIONS}/${fichier}`;
    let sortieLe = 0;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            const jamaisChargee = !element.getAttribute("src");
            const absenteLongtemps =
              sortieLe > 0 && Date.now() - sortieLe > ABSENCE_AVANT_RELANCE_MS;
            if (jamaisChargee || absenteLongtemps) element.setAttribute("src", source);
            sortieLe = 0;
          } else if (element.getAttribute("src")) {
            sortieLe = Date.now();
          }
        }
      },
      // Une marge courte : assez pour que le chargement soit fini quand la
      // scène arrive à l'écran, trop courte pour qu'elle joue dans le vide.
      { rootMargin: "120px" },
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [fichier]);

  return (
    <>
      <iframe ref={cadre} title={resume} />
      {/* Sans JavaScript — robot d'indexation, script bloqué — le cadre
          resterait un rectangle vide. On sert alors la scène directement :
          elle est autonome, elle n'a besoin de personne pour se jouer. */}
      <noscript>
        <iframe src={`${DOSSIER_ANIMATIONS}/${fichier}`} title={resume} />
      </noscript>
    </>
  );
}

export function PageAccueil() {
  const router = useRouter();
  const { session, logout } = useAuth();

  /** Un invité n'est pas connecté : lui proposer « Déconnexion » n'aurait
   *  aucun sens. Même règle que la barre du reste du site. */
  const connecte = Boolean(session && !session.is_guest);

  /** Le clic sur la marque recharge la page au lieu de sauter à l'ancre.
   *  Le `href` reste « / » : clic milieu, ouverture dans un onglet et
   *  robots d'indexation ont besoin d'une vraie destination. */
  const rafraichir = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    window.location.reload();
  }, []);

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
          <a
            className="brand"
            href="/"
            aria-label="Toumaï AI, recharger la page d’accueil"
            onClick={rafraichir}
          >
            <Logo size={34} className="brand-logo" />
            <span className="brand-name">
              Toumaï<span className="brand-suffix">AI</span>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Navigation principale">
            {LIENS_NAV.map((l) => (
              <a key={l.href} href={l.href}>
                {l.texte}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            {connecte ? (
              <button
                className="text-link desktop-only"
                type="button"
                onClick={logout}
                style={{ background: "none", border: 0, cursor: "pointer" }}
              >
                Déconnexion
              </button>
            ) : (
              <Link className="text-link desktop-only" href="/login">
                Connexion
              </Link>
            )}
            <Link className="button button-dark" href="/chat">
              {connecte ? "Ouvrir Toumaï" : "Essayer Toumaï"}
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
          {connecte ? (
            <button
              type="button"
              onClick={logout}
              style={{
                width: "100%",
                background: "none",
                border: 0,
                borderBottom: "1px solid var(--line)",
                padding: ".82rem 0",
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              Déconnexion
            </button>
          ) : (
            <Link href="/login">Connexion</Link>
          )}
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
            </div>
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
                /* L'AFFICHE, EN FOND DU CADRE.
                 *
                 * Une scène est une iframe. Si ce document-là n'arrive pas —
                 * réseau coupé, cache partiel —, le cadre restait un
                 * rectangle vide de 900 × 540 à côté d'un texte qui promet
                 * une démonstration. L'affiche est l'état FINAL de la scène,
                 * photographié par `outils/fabriquer_affiches.py` : 8 à 11 Ko
                 * de WebP, recouverts par l'iframe dès qu'elle arrive, et
                 * visibles à sa place quand elle n'arrive pas.
                 *
                 * Elle est posée en style plutôt qu'en feuille pour une seule
                 * raison : le nom du fichier vient de la donnée, pas du CSS. */
                style={{
                  backgroundImage: `url("${DOSSIER_ANIMATIONS}/../commun/affiches/${c.fichier.replace(
                    ".html",
                    ".webp",
                  )}")`,
                }}
              >
                <CadreAnime fichier={c.fichier} resume={c.resume} />
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

        <SectionTarifs />

        {/* LA SECTION FONDATEUR.
          *
          * Elle remplace « Ressources », qui portait quatre liens renvoyant à
          * des ancres de la même page — « Voir les capacités », « Explorer les
          * solutions ». Une section qui renvoie à ce qu'on vient de lire ne
          * fait pas avancer d'un pas : elle occupe de la hauteur.
          *
          * Celle-ci répond à la question qu'un acheteur se pose avant de
          * brancher un logiciel à son courrier et à son agenda : QUI répond si
          * ça casse. C'est la question la plus chère à ne pas traiter quand on
          * vend un abonnement depuis N'Djaména à des gens qui ne nous
          * connaissent pas.
          *
          * Les trois engagements sont vérifiables, et c'est la seule raison
          * pour laquelle ils sont là. La confirmation avant toute action
          * sortante est dans le produit — c'est la cinquième démonstration de
          * cette page. Le numéro est dans le pied de page. Le lieu est dans le
          * copyright. Rien qu'on ne puisse contrôler en trente secondes. */}
        <section className="fondateur" id="fondateur">
          <div className="shell fondateur-inner">
            <figure className="fondateur-portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/accueil-medias/faycal-habib-ahmat.webp"
                alt="Faycal Habib Ahmat, fondateur et CEO de Toumaï AI"
                width={900}
                height={1125}
                loading="lazy"
              />
            </figure>

            <div className="fondateur-mot">
              <p className="section-kicker">Fondateur &amp; CEO</p>
              <h2>Derrière ce logiciel, il y a quelqu’un à qui parler.</h2>
              <p className="fondateur-texte">
                Je m’appelle Faycal. J’ai construit Toumaï pour qu’un Tchadien
                puisse demander de l’aide à une machine dans sa langue, depuis
                son téléphone, sans attendre que quelqu’un ailleurs y pense pour
                lui.
              </p>
              <p className="fondateur-texte">
                Ce qui a commencé dans une chambre à N’Djaména tourne aujourd’hui
                chez des gens que je ne connais pas. C’est la plus belle chose
                qui me soit arrivée, et la plus exigeante : quand vous confiez
                votre travail à Toumaï, vous me faites confiance à moi.
              </p>
              <p className="fondateur-texte">
                Alors écrivez-moi. Une question, une idée, un reproche. Je lis
                tout, et je réponds.
              </p>

              <div className="fondateur-signature">
                <strong>Faycal Habib Ahmat</strong>
                <span>Fondateur &amp; CEO, Toumaï AI</span>
              </div>

              <ContactFondateur />
            </div>
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
          <a
            className="brand footer-brand"
            href="/"
            aria-label="Toumaï AI, recharger la page d’accueil"
            onClick={rafraichir}
          >
            <Logo size={32} className="brand-logo" />
            <span className="brand-name">
              Toumaï<span className="brand-suffix">AI</span>
            </span>
          </a>
        </div>

        <div className="shell footer-links">
          {COLONNES_PIED.map((colonne) => (
            <div key={colonne.titre}>
              <strong>{colonne.titre}</strong>
              {colonne.liens.map((lien) =>
                lien.href.startsWith("http") ? (
                  <a key={lien.href} href={lien.href} target="_blank" rel="noopener noreferrer">
                    {lien.texte}
                  </a>
                ) : (
                  <Link key={lien.href} href={lien.href}>
                    {lien.texte}
                  </Link>
                ),
              )}
            </div>
          ))}
        </div>

        <div className="shell footer-contact">
          {CONTACTS.map((contact) => (
            <a
              key={contact.libelle}
              href={contact.href}
              target={contact.externe ? "_blank" : undefined}
              rel={contact.externe ? "noopener noreferrer" : undefined}
            >
              <span className="footer-contact-icone" aria-hidden="true">
                {contact.icon}
              </span>
              <span className="footer-contact-texte">
                <small>{contact.libelle}</small>
                <strong>{contact.valeur}</strong>
              </span>
            </a>
          ))}
        </div>

        <div className="shell footer-bottom">
          <span>© {new Date().getFullYear()} Toumaï AI. Tous droits réservés.</span>
          <div className="footer-socials">
            {RESEAUX.map((reseau) => (
              <a
                key={reseau.label}
                href={reseau.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={reseau.label}
                title={reseau.label}
              >
                {reseau.icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
