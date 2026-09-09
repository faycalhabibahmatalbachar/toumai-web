/**
 * CE QUE LES DÉMONSTRATIONS MONTRENT.
 *
 * UNE RÈGLE, UNE SEULE : RIEN D'INVENTÉ
 * --------------------------------------
 * Chaque étape correspond à un comportement que Toumaï AI a réellement. La
 * recherche web existe (`web_search`, et la rangée de sources du chat). La
 * lecture WhatsApp existe, et la carte de confirmation avant envoi est le
 * mécanisme réel du produit — c'est `politique_actions` côté serveur qui la
 * déclenche. L'analyse de document existe (`3 documents analysés par mois`
 * dans l'offre gratuite).
 *
 * Aucun chiffre d'usage, aucun logo de client, aucune statistique. La preuve
 * est le produit ; s'il faut l'aider avec des nombres inventés, c'est qu'il ne
 * prouve rien.
 *
 * LES SOURCES CITÉES
 * ------------------
 * Ce sont des noms de publications réelles qui couvrent le sujet. Elles
 * illustrent la FORME d'une réponse sourcée — le chat affiche le titre et le
 * domaine de ce qu'il a consulté — sans prétendre rapporter un article précis
 * lu à une date précise. Les pastilles ne sont donc pas des liens : montrer un
 * lien qui ne mène pas à l'article cité serait pire que ne pas en mettre.
 */

import type { Source } from "./primitives";

/** Une étape de la démonstration : ce qui s'ajoute à l'écran, et pendant
 *  combien de temps on la laisse avant la suivante. */
export type Etape =
  | { type: "demande"; texte: string; fichier?: { nom: string; poids: string }; duree: number }
  | { type: "activite"; libelle: string; duree: number }
  | { type: "attente"; duree: number }
  | { type: "sources"; sources: Source[]; duree: number }
  | { type: "reponse"; lignes: string[]; duree: number }
  | { type: "confirmation"; action: string; duree: number }
  | { type: "confirme"; action: string; duree: number }
  | { type: "suite"; texte: string; duree: number };

export interface Scenario {
  cle: string;
  onglet: string;
  titre: string;
  resume: string;
  etapes: Etape[];
}

/** La démonstration du hero : la plus courte de toutes.
 *
 * Elle doit se lire en quelques secondes, au-dessus de la ligne de flottaison,
 * pendant que la personne décide si elle reste. Une seule idée : on demande,
 * Toumaï cherche, il répond en citant ses sources. */
export const SCENARIO_HERO: Scenario = {
  cle: "hero",
  onglet: "Recherche",
  titre: "Recherche web",
  resume: "Toumaï cherche, lit, et répond en citant ce qu'il a consulté.",
  etapes: [
    {
      type: "demande",
      texte:
        "Recherche les dernières actualités sur l'intelligence artificielle en Afrique et résume-moi l'essentiel.",
      duree: 1600,
    },
    { type: "activite", libelle: "Recherche sur le web", duree: 1500 },
    {
      type: "sources",
      sources: [
        { titre: "Jeune Afrique", domaine: "jeuneafrique.com" },
        { titre: "TechCabal", domaine: "techcabal.com" },
        { titre: "UNESCO", domaine: "unesco.org" },
      ],
      duree: 1100,
    },
    {
      type: "reponse",
      lignes: [
        "Les investissements se concentrent sur trois pôles : Lagos, Nairobi et Le Caire.",
        "Les usages qui décollent sont la santé, l'agriculture et les services financiers.",
        "La question des langues locales revient partout : peu de modèles les couvrent.",
      ],
      duree: 2600,
    },
    { type: "suite", texte: "Approfondir un de ces points", duree: 3200 },
  ],
};

/** Les trois cas d'usage de la section preuve.
 *
 * Le premier reprend la recherche, en version longue et centrée sur le Tchad.
 * Le deuxième est le seul que personne d'autre ne peut montrer. Le troisième
 * est court, parce qu'il n'a rien de spectaculaire — et c'est justement ce
 * qu'on veut dire : ça marche, simplement. */
export const SCENARIOS: Scenario[] = [
  {
    cle: "web",
    onglet: "Recherche web",
    titre: "Il cherche, puis il cite",
    resume:
      "Une question d'actualité part sur le web. Toumaï lit, résume, et montre d'où vient chaque élément.",
    etapes: [
      {
        type: "demande",
        texte: "Recherche les derniers développements de l'IA au Tchad.",
        duree: 1500,
      },
      { type: "activite", libelle: "Recherche sur le web", duree: 1600 },
      {
        type: "sources",
        sources: [
          { titre: "Tchadinfos", domaine: "tchadinfos.com" },
          { titre: "Alwihda Info", domaine: "alwihdainfo.com" },
        ],
        duree: 1100,
      },
      {
        type: "reponse",
        lignes: [
          "La formation reste le sujet principal : ateliers universitaires et initiatives privées.",
          "Les projets locaux visent surtout l'arabe tchadien, peu couvert par les grands modèles.",
          "Le déploiement bute sur la connectivité plus que sur la technologie.",
        ],
        duree: 2800,
      },
      { type: "suite", texte: "Préparer une note à partir de ça", duree: 3000 },
    ],
  },
  {
    cle: "whatsapp",
    onglet: "WhatsApp",
    titre: "Il prépare, vous envoyez",
    resume:
      "Toumaï lit vos messages et rédige la réponse. Il s'arrête là : rien ne part sans votre accord.",
    etapes: [
      { type: "demande", texte: "Lis mes nouveaux messages WhatsApp.", duree: 1400 },
      { type: "activite", libelle: "Lecture de la conversation", duree: 1300 },
      {
        type: "reponse",
        lignes: [
          "Un message non lu, de Mahamat : il demande si la réunion de jeudi tient toujours.",
        ],
        duree: 2200,
      },
      { type: "demande", texte: "Prépare une réponse : oui, même heure.", duree: 1600 },
      {
        type: "reponse",
        lignes: [
          "« Bonjour Mahamat, oui la réunion de jeudi est maintenue, même heure. À jeudi. »",
        ],
        duree: 1800,
      },
      { type: "confirmation", action: "Message WhatsApp à Mahamat", duree: 3400 },
      { type: "confirme", action: "Message WhatsApp à Mahamat", duree: 2600 },
    ],
  },
  {
    cle: "document",
    onglet: "Documents",
    titre: "Il lit ce que vous déposez",
    resume: "Un rapport, un contrat, un cours. Toumaï en tire l'essentiel et vous rend la main.",
    etapes: [
      {
        type: "demande",
        texte: "Résume ce document et donne-moi les points importants.",
        fichier: { nom: "rapport-trimestriel.pdf", poids: "1,2 Mo" },
        duree: 1600,
      },
      { type: "activite", libelle: "Lecture du document", duree: 1600 },
      {
        type: "reponse",
        lignes: [
          "Le rapport tient en trois décisions, toutes prises au dernier trimestre.",
          "Deux échéances tombent avant la fin du mois : page 4 et page 11.",
          "Un chiffre est donné sans source à la page 7 — à vérifier avant de le reprendre.",
        ],
        duree: 3000,
      },
      { type: "suite", texte: "Rédiger la note de synthèse", duree: 3000 },
    ],
  },
];
