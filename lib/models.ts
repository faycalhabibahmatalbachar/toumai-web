/**
 * Catalogue des modèles Toumaï AI — miroir de
 * `sayibi-ai/lib/features/chat/models/toumai_models.dart`.
 *
 * Mêmes identifiants d'API, mêmes noms, mêmes descriptions que l'app mobile :
 * un utilisateur qui passe du téléphone au web doit retrouver exactement les
 * mêmes modèles, écrits pareil. Les identifiants (`auto`, `sayibi-*`) restent
 * ceux attendus par le backend et ne sont jamais montrés.
 */

export interface ToumaiModel {
  id: string;
  name: string;
  /** Une ligne, affichée sous le nom. */
  tagline: string;
  /** Phrase complète, affichée dans le sélecteur. */
  description: string;
  /** Couleur d'accent, identique à celle du mobile. */
  color: string;
  isNew?: boolean;
}

/** Modèles proposés dans le sélecteur — comme sur mobile, seulement ces deux :
 * les autres sont choisis automatiquement selon la demande (image, code,
 * document…) ou depuis le menu Outils. */
export const SELECTABLE_MODELS: ToumaiModel[] = [
  {
    id: "auto",
    name: "Sao 4",
    tagline: "Code & aide quotidienne",
    description: "Génération de code, débogage, rédaction et questions du quotidien.",
    color: "#D97757",
  },
  {
    id: "sayibi-reflexion",
    name: "Toumaï 5",
    tagline: "Notre modèle le plus puissant",
    description:
      "Réflexion profonde pour les tâches complexes : maths, logique, analyses difficiles.",
    color: "#8B5CF6",
    isNew: true,
  },
];

/** Modèles spécialisés : jamais dans le sélecteur, mais leur nom doit
 * s'afficher correctement quand le backend indique qui a répondu. */
export const SPECIALIZED_MODELS: ToumaiModel[] = [
  {
    id: "sayibi-images",
    name: "Ennedi",
    tagline: "Génération d'images",
    description: "Décrivez la scène, le style et les couleurs souhaités.",
    color: "#EC4899",
  },
  {
    id: "sayibi-nadirx",
    name: "Ouaddaï Pro",
    tagline: "Expert analyse & données",
    description: "Documents complexes, tableaux, contrats — extraction précise.",
    color: "#D9A441",
  },
  {
    id: "sayibi-voix",
    name: "Kanem Flash",
    tagline: "Rapide — conversations vocales",
    description: "Réponses courtes, claires et naturelles.",
    color: "#F59E0B",
  },
  {
    id: "sayibi-code",
    name: "Tibesti Code",
    tagline: "Développeur IA expert",
    description: "Génération, débogage et explication de code.",
    color: "#3B82F6",
  },
  {
    id: "sayibi-creation",
    name: "Chari",
    tagline: "CV, lettres & rapports pro",
    description: "Documents professionnels avec mise en page soignée.",
    color: "#10B981",
  },
];

export const ALL_MODELS = [...SELECTABLE_MODELS, ...SPECIALIZED_MODELS];

export function findModel(id: string | undefined | null): ToumaiModel | undefined {
  if (!id) return undefined;
  return ALL_MODELS.find((m) => m.id === id);
}

/** Nom affichable d'un identifiant de modèle. Renvoie l'identifiant tel quel
 * s'il est inconnu — mieux vaut un identifiant brut qu'un nom inventé. */
export function modelName(id: string | undefined | null): string {
  return findModel(id)?.name ?? id ?? "";
}
