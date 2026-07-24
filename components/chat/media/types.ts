/** Unité de base du système de widgets média — aujourd'hui uniquement des
 * images (générées par l'IA ou trouvées pendant une recherche web), pensée
 * pour être étendue à d'autres types (vidéo, audio, pdf, fichier…) sans
 * changer l'API des composants qui la consomment. */
export interface ChatImage {
  id: string;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  createdAt?: string;
  alt?: string;
  /** Présent pour une image de résultat de recherche web — jamais pour une
   * image générée par l'IA ou déposée par l'utilisateur. */
  sourceUrl?: string;
  sourceTitle?: string;
  /** Vrai uniquement pour une pièce jointe de l'utilisateur — seule ce cas
   * autorise le bouton "Supprimer" dans la toolbar. */
  isUserAttachment?: boolean;
}

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number; // 0-100
  status: UploadStatus;
  error?: string;
  /** Rempli une fois l'upload terminé. */
  result?: ChatImage;
}

/** Point d'extension pour le futur système unifié de "Message Widgets"
 * (vidéo, audio, pdf, graphique, carte…) — un seul discriminant `kind`
 * suffira à ajouter un nouveau composant de rendu sans toucher au reste. */
export type MediaAttachmentKind = "image";

export interface MediaAttachment {
  kind: MediaAttachmentKind;
  image?: ChatImage;
}
