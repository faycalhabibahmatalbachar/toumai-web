import { API_BASE } from "./config";
import { http } from "./http";

export interface GeneratedFile {
  id: string;
  file_type: "cv" | "letter" | "report" | "excel" | "other";
  filename: string;
  storage_path: string;
  prompt_used?: string | null;
  /** Le dossier, ou `null` à la racine.
   *
   * Une étiquette plate, pas une arborescence : un vrai arbre demanderait une
   * table, des parents, des chemins et une interface pour naviguer dedans.
   * Pour quelques dizaines de fichiers, c'est du rangement qui coûte plus cher
   * que le désordre qu'il corrige. */
  folder?: string | null;
  created_at: string;
}

export interface DocumentFile {
  id: string;
  filename: string;
  file_type?: "pdf" | "docx" | "xlsx" | "image" | null;
  file_size?: number | null;
  storage_path: string;
  folder?: string | null;
  created_at: string;
}

export interface LibraryFiles {
  generated: GeneratedFile[];
  documents: DocumentFile[];
}

export function getFiles(): Promise<LibraryFiles> {
  return http.get<LibraryFiles>("/user/files");
}

export interface LibraryImage {
  url: string;
  session_id: string;
  session_title: string;
  created_at?: string | null;
}

/** Images générées dans les conversations — grille façon Gemini. */
export function getChatImages(): Promise<{ images: LibraryImage[] }> {
  return http.get<{ images: LibraryImage[] }>("/user/images");
}

export function deleteFile(id: string): Promise<void> {
  return http.delete(`/user/files/${id}`);
}

/** Renomme et/ou déplace. Les deux champs sont indépendants.
 *
 * `folder: ""` remet le fichier à la racine — c'est pourquoi la chaîne vide
 * est acceptée là où un nom vide serait refusé : « aucun dossier » est un
 * état légitime, « aucun nom » ne l'est pas. */
export function updateFile(
  id: string,
  patch: { filename?: string; folder?: string },
): Promise<unknown> {
  return http.patch(`/user/files/${id}`, patch);
}

/** Les dossiers déjà utilisés, pour les proposer au lieu de les faire retaper.
 *
 * Sans cette liste, une faute de frappe créerait un doublon silencieux —
 * « Factures » et « factures » côte à côte, que rien ne signalerait. */
export async function listFolders(): Promise<string[]> {
  const r = await http.get<{ folders: string[] }>("/user/folders");
  return r?.folders ?? [];
}

/** URL publique d'un fichier stocké sur R2, servi via notre backend. */
export function fileUrl(storagePath: string): string {
  return `${API_BASE}/image/r2/${storagePath}`;
}

export function isImage(fileType?: string | null): boolean {
  return fileType === "image";
}
