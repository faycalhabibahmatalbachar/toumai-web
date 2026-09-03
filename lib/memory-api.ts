import { http } from "./http";

/** Un fait retenu au sujet de l'utilisateur. */
export interface Souvenir {
  id: string;
  category: string;
  key_name: string;
  value: string;
  created_at?: string;
}

export interface MemoireListe {
  facts: Souvenir[];
  by_category: Record<string, Souvenir[]>;
  count: number;
}

export interface MemoireResume {
  /** Vide quand le résumé n'a pas pu être produit — voir `generated`. */
  summary: string;
  count: number;
  enabled: boolean;
  /** `false` = le modèle n'a pas répondu. On NE fabrique PAS un faux résumé
   *  en recollant les faits : ce serait une liste déguisée en phrase, moins
   *  lisible que la liste elle-même, et elle tromperait sur ce que le produit
   *  sait faire. */
  generated: boolean;
}

export function listerSouvenirs(): Promise<MemoireListe> {
  return http.get<MemoireListe>("/memory");
}

export function resumeMemoire(): Promise<MemoireResume> {
  return http.get<MemoireResume>("/memory/summary");
}

export function oublierSouvenir(id: string): Promise<unknown> {
  return http.delete(`/memory/${encodeURIComponent(id)}`);
}

export function toutOublier(): Promise<{ cleared: number }> {
  return http.delete<{ cleared: number }>("/memory");
}

export function corrigerSouvenir(id: string, value: string): Promise<unknown> {
  return http.patch(`/memory/${encodeURIComponent(id)}`, { value });
}

/** Les catégories, dites comme on les dirait à voix haute.
 *
 * Le serveur range les faits par étiquette technique (`personal`, `context`…).
 * Les afficher telles quelles ferait lire « context » à quelqu'un qui veut
 * juste savoir ce qu'on retient de lui. */
export const NOM_CATEGORIE: Record<string, string> = {
  personal: "Vous",
  preference: "Vos préférences",
  context: "Votre contexte",
  work: "Votre travail",
  project: "Vos projets",
  location: "Vos lieux",
};

export function nommerCategorie(cle: string): string {
  return NOM_CATEGORIE[cle] ?? "Autres";
}
