import { API_BASE } from "./config";
import { http } from "./http";

export interface GeneratedFile {
  id: string;
  file_type: "cv" | "letter" | "report" | "excel" | "other";
  filename: string;
  storage_path: string;
  prompt_used?: string | null;
  created_at: string;
}

export interface DocumentFile {
  id: string;
  filename: string;
  file_type?: "pdf" | "docx" | "xlsx" | "image" | null;
  file_size?: number | null;
  storage_path: string;
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

/** URL publique d'un fichier stocké sur R2, servi via notre backend. */
export function fileUrl(storagePath: string): string {
  return `${API_BASE}/image/r2/${storagePath}`;
}

export function isImage(fileType?: string | null): boolean {
  return fileType === "image";
}
