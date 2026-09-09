/**
 * LE MILIEU DE PAGE, MIS AU NIVEAU DU HAUT.
 *
 * Après la Phase 2, la page était hybride : un haut qui montre le produit, et
 * un bas resté brochure. Ces quatre sections comblent l'écart.
 *
 * CE QU'ELLES DISENT, ET QUI EST VRAI
 * ------------------------------------
 * La plateforme énumère ce que Toumaï fait réellement — les neuf entrées se
 * retrouvent dans les offres et dans le pied de page du site. Les connecteurs
 * décrivent le mécanisme réel : le serveur classe chaque action
 * (`core/politique_actions.py`) et n'exige une confirmation que pour ce qui ne
 * se défait pas. L'agent navigateur reprend la boucle réelle de
 * `services/browser_agent_service.py` — plan, action, observation, jusqu'à
 * `done` ou `ask_user`. La confiance ne dit que des choses vérifiables.
 *
 * Aucun badge de certification, aucun logo de client, aucun chiffre d'usage.
 *
 * POURQUOI PAS NEUF CARTES
 * -------------------------
 * Neuf cartes identiques à ombre douce, c'est le réflexe SaaS, et c'est
 * précisément ce que le skill `frontend-design` range parmi les défauts qui
 * apparaissent quel que soit le sujet. Une liste dense se lit plus vite,
 * s'imprime mieux dans la tête, et laisse la fenêtre du produit rester le seul
 * endroit où le regard s'arrête.
 */

import Link from "next/link";

/* ── La plateforme ───────────────────────────────────────────────────────── */

const CAPACITES_PLATEFORME: { nom: string; texte: string }[] = [
  { nom: "Chat", texte: "Poser une question, reprendre le fil, corriger le tir." },
  { nom: "Recherche web", texte: "Chercher, lire, et citer ce qui a été consulté." },
  { nom: "Documents", texte: "Déposer un PDF ou un texte et en tirer l'essentiel." },
  { nom: "Images", texte: "Décrire ce qu'on veut voir, et l'obtenir." },
  { nom: "Voix", texte: "Parler au lieu d'écrire, et se faire lire la réponse." },
  { nom: "Connecteurs", texte: "Relier WhatsApp, la messagerie et l'agenda." },
  { nom: "WhatsApp", texte: "Lire, résumer, préparer une réponse depuis le chat." },
  { nom: "Agent navigateur", texte: "Confier une tâche qui demande de naviguer." },
  { nom: "Automatisations", texte: "Faire répéter à Toumaï ce qui revient chaque semaine." },
];

export function Plateforme() {
  return (
    <section className="plateforme shell" id="plateforme" aria-labelledby="plateforme-titre">
      <div className="plateforme-entete">
        <h2 id="plateforme-titre">Une plateforme, plusieurs façons d’avancer.</h2>
        <p>
          Tout part du même endroit. Vous n’avez pas à choisir un outil avant de savoir
          ce que vous cherchez.
        </p>
      </div>

      <ul className="plateforme-liste">
        {CAPACITES_PLATEFORME.map((c) => (
          <li key={c.nom}>
            <span className="plateforme-nom">{c.nom}</span>
            <span className="plateforme-texte">{c.texte}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Les connecteurs ─────────────────────────────────────────────────────── */

const CONNECTEURS = [
  { nom: "WhatsApp", texte: "Vos conversations, lues et résumées depuis Toumaï." },
  { nom: "Messagerie", texte: "Le courrier ouvert, compris, et la réponse écrite." },
  { nom: "Agenda", texte: "Les rendez-vous consultés, déplacés, ajoutés." },
];

/* Un vrai processus en étapes — c'est le seul endroit de la page où une
 * numérotation dit quelque chose. Ailleurs, elle ne faisait que décorer. */
const ETAPES_CONNECTEUR = [
  { n: "1", titre: "Vous reliez", texte: "Une fois, depuis votre téléphone." },
  { n: "2", titre: "Il comprend", texte: "Il lit ce qui arrive et retient le contexte." },
  { n: "3", titre: "Il prépare", texte: "Il rédige, propose, met en forme." },
  { n: "4", titre: "Vous validez", texte: "Rien ne part avant. C’est la règle du produit." },
];

export function Connecteurs() {
  return (
    <section className="connecteurs" id="connecteurs" aria-labelledby="connecteurs-titre">
      <div className="shell">
        <div className="connecteurs-entete">
          <h2 id="connecteurs-titre">Il travaille là où vous travaillez déjà.</h2>
          <p>
            Reliez ce que vous utilisez tous les jours. Toumaï y voit ce que vous y voyez,
            et n’y touche qu’avec votre accord.
          </p>
        </div>

        <ul className="connecteurs-liste">
          {CONNECTEURS.map((c) => (
            <li key={c.nom}>
              <span className="connecteur-nom">{c.nom}</span>
              <span className="connecteur-texte">{c.texte}</span>
            </li>
          ))}
        </ul>

        <ol className="connecteurs-etapes">
          {ETAPES_CONNECTEUR.map((e) => (
            <li key={e.n}>
              <span className="etape-numero" aria-hidden="true">
                {e.n}
              </span>
              <span className="etape-titre">{e.titre}</span>
              <span className="etape-texte">{e.texte}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── L'agent navigateur ──────────────────────────────────────────────────── */

export function AgentNavigateur() {
  return (
    <section className="agent shell" id="agent" aria-labelledby="agent-titre">
      <div className="agent-copy">
        <h2 id="agent-titre">Quand la réponse n’est pas dans une page, il va la chercher.</h2>
        <p>
          Vous donnez un objectif. Toumaï ouvre un vrai navigateur, avance de page en
          page, remplit ce qu’il faut remplir, et revient avec le résultat.
        </p>
        <p className="agent-note">
          Il s’arrête aussi quand il ne sait pas : plutôt que de deviner, il vous pose la
          question et attend.
        </p>
        <Link href="/agent" className="agent-lien">
          Découvrir l’agent navigateur
        </Link>
      </div>

      {/* La boucle réelle du produit — plan, action, observation — répétée
          jusqu'à ce qu'il ait fini ou qu'il doive demander. */}
      <ol className="agent-boucle" aria-label="Comment l’agent procède">
        <li>
          <span className="agent-etiquette">Objectif</span>
          <span className="agent-texte">« Trouve les horaires d’ouverture et note-les. »</span>
        </li>
        <li>
          <span className="agent-etiquette">Il planifie</span>
          <span className="agent-texte">Il décide de la prochaine action à tenter.</span>
        </li>
        <li>
          <span className="agent-etiquette">Il agit</span>
          <span className="agent-texte">Il navigue, clique, saisit, fait défiler.</span>
        </li>
        <li>
          <span className="agent-etiquette">Il observe</span>
          <span className="agent-texte">Il relit la page obtenue, puis recommence.</span>
        </li>
        <li className="agent-fin">
          <span className="agent-etiquette">Résultat</span>
          <span className="agent-texte">Il rend ce qu’il a trouvé, ou il vous demande.</span>
        </li>
      </ol>
    </section>
  );
}

/* ── La confiance ────────────────────────────────────────────────────────── */

const GARANTIES = [
  {
    titre: "Vous gardez la décision",
    texte:
      "Envoyer, supprimer, quitter un groupe : ce qui ne se défait pas vous est demandé avant.",
  },
  {
    titre: "Rien n’est vendu",
    texte:
      "Aucune revente de données, aucun ciblage publicitaire. La mesure d’audience se refuse d’un clic.",
  },
  {
    titre: "Vos conversations vous appartiennent",
    texte:
      "Vous pouvez les supprimer, et supprimer votre compte, depuis l’application.",
  },
  {
    titre: "Une discussion sans trace",
    texte:
      "Le mode éphémère n’enregistre rien : ni la conversation, ni ce qui s’y dit.",
  },
];

export function Confiance() {
  return (
    <section className="confiance" id="confiance" aria-labelledby="confiance-titre">
      <div className="shell">
        <h2 id="confiance-titre">Ce que nous nous engageons à faire.</h2>

        <ul className="confiance-liste">
          {GARANTIES.map((g) => (
            <li key={g.titre}>
              <span className="confiance-titre">{g.titre}</span>
              <span className="confiance-texte">{g.texte}</span>
            </li>
          ))}
        </ul>

        <p className="confiance-liens">
          <Link href="/security/">Sécurité</Link>
          <Link href="/privacy/">Confidentialité</Link>
          <Link href="/terms/">Conditions d’utilisation</Link>
        </p>
      </div>
    </section>
  );
}
