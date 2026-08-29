import { postForm } from "./http";

export interface UploadedDocument {
  doc_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  preview_text: string;
}

/** Upload un fichier (PDF/DOCX/XLSX/image, 10 Mo max) — indexé côté backend
 * pour que le prochain message puisse le référencer via document_id. */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  return postForm<UploadedDocument>("/documents/upload", form);
}
