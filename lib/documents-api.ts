import { http, postForm } from "./http";

export interface UploadedDocument {
  doc_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  file_size?: number;
  mime_type?: string;
  preview_text: string;
  storage_url?: string;
  texte_lu?: boolean;
}

/** Upload un fichier (PDF/DOCX/XLSX/image, 10 Mo max) — indexé côté backend
 * pour que le prochain message puisse le référencer via document_id. */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  return postForm<UploadedDocument>("/documents/upload", form);
}


/** Supprime un document privé déjà uploadé mais retiré avant envoi. */
export async function deleteDocument(docId: string): Promise<void> {
  await http.delete<{ doc_id: string }>(`/documents/${encodeURIComponent(docId)}`);
}
